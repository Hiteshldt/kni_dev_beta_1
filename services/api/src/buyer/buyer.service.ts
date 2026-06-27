import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateOrderDto, UpsertBuyerProfileDto } from './buyer.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { cancelOrderTx } from '../common/order-cancel';
import { PAYMENT_PROVIDER, PaymentProvider } from '../payments/provider/payment-provider';

// Haversine distance (km) between a fixed point and each listing's pickup.
const DISTANCE_KM = `
  (6371 * acos(
     LEAST(1, cos(radians($LAT)) * cos(radians(l.pickup_lat)) *
              cos(radians(l.pickup_lng) - radians($LNG)) +
              sin(radians($LAT)) * sin(radians(l.pickup_lat)))
  ))`;

@Injectable()
export class BuyerService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async upsertProfile(userId: string, dto: UpsertBuyerProfileDto) {
    return this.db.one(
      `INSERT INTO buyer_profiles (user_id, business_name, gst, delivery_lat, delivery_lng)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name, gst = EXCLUDED.gst,
         delivery_lat = EXCLUDED.delivery_lat, delivery_lng = EXCLUDED.delivery_lng
       RETURNING *`,
      [userId, dto.businessName, dto.gst ?? null, dto.deliveryLat ?? null, dto.deliveryLng ?? null],
    );
  }

  /** Returns the buyer's profile or null (used for first-run onboarding). */
  async getProfile(userId: string) {
    return (await this.db.one('SELECT * FROM buyer_profiles WHERE user_id = $1', [userId])) ?? null;
  }

  /** Browse live listings. If lat/lng given, annotate + sort by distance. */
  async browse(opts: { lang: string; category?: string; lat?: number; lng?: number; sort?: string }) {
    const hasGeo = opts.lat != null && opts.lng != null;
    const distanceExpr = hasGeo
      ? DISTANCE_KM.replace(/\$LAT/g, '$3').replace(/\$LNG/g, '$4')
      : 'NULL::double precision';
    const orderBy =
      hasGeo && opts.sort !== 'price' ? 'distance_km ASC NULLS LAST' : 'p.buyer_price ASC';

    const params: any[] = [opts.lang, opts.category ?? null];
    if (hasGeo) params.push(opts.lat, opts.lng);

    const rows = await this.db.query(
      `SELECT l.id, l.qty_remaining, l.unit, l.moq, l.grade, l.photos,
              l.pickup_lat, l.pickup_lng, l.available_from, l.available_to,
              c.slug AS produce_slug, c.names AS produce_names,
              c.names->>$1 AS produce_name, c.category,
              p.buyer_price, p.margin_pct, p.flat_fee, l.payout_price,
              s.name AS seller_name,
              ${distanceExpr} AS distance_km
         FROM listings l
         JOIN produce_catalog c ON c.id = l.catalog_id
         JOIN pricing p ON p.listing_id = l.id
         LEFT JOIN seller_profiles s ON s.user_id = l.seller_id
        WHERE l.status = 'live' AND l.qty_remaining > 0
          AND ($2::text IS NULL OR c.category = $2)
        ORDER BY ${orderBy}`,
      params,
    );
    return rows.map((r) => ({
      ...r,
      distance_km: r.distance_km != null ? Math.round(r.distance_km * 10) / 10 : null,
      price_breakdown: {
        farmer_payout: Number(r.payout_price),
        kanni_margin: Math.round((Number(r.buyer_price) - Number(r.payout_price) - Number(r.flat_fee)) * 100) / 100,
        flat_fee: Number(r.flat_fee),
        buyer_price: Number(r.buyer_price),
      },
    }));
  }

  async listingDetail(id: string, lang: string) {
    const r = await this.db.one(
      `SELECT l.*, c.names AS produce_names, c.names->>$2 AS produce_name, c.category,
              p.buyer_price, p.margin_pct, p.flat_fee, s.name AS seller_name
         FROM listings l
         JOIN produce_catalog c ON c.id = l.catalog_id
         JOIN pricing p ON p.listing_id = l.id
         LEFT JOIN seller_profiles s ON s.user_id = l.seller_id
        WHERE l.id = $1 AND l.status = 'live'`,
      [id, lang],
    );
    if (!r) throw new NotFoundException('Listing not available');
    return r;
  }

  /**
   * Create an order. Enforces MOQ and available stock per item, computes totals
   * from admin-set buyer prices, and decrements stock atomically.
   * (Payment + shipment assignment are later sprints — order lands in 'created'.)
   */
  async createOrder(buyerId: string, dto: CreateOrderDto) {
    return this.db.tx(async (client) => {
      let subtotal = 0;
      const lineItems: { listingId: string; qty: number; unitPrice: number; payout: number }[] = [];

      for (const item of dto.items) {
        const { rows } = await client.query(
          `SELECT l.id, l.status, l.qty_remaining, l.moq, l.payout_price, p.buyer_price
             FROM listings l JOIN pricing p ON p.listing_id = l.id
            WHERE l.id = $1 FOR UPDATE OF l`,
          [item.listingId],
        );
        const listing = rows[0];
        if (!listing || listing.status !== 'live') {
          throw new BadRequestException(`Listing ${item.listingId} is not available`);
        }
        if (item.qty < Number(listing.moq)) {
          throw new BadRequestException(
            `Minimum order for this item is ${listing.moq} (you ordered ${item.qty})`,
          );
        }
        if (item.qty > Number(listing.qty_remaining)) {
          throw new BadRequestException(
            `Only ${listing.qty_remaining} left for listing ${item.listingId}`,
          );
        }
        const unitPrice = Number(listing.buyer_price);
        subtotal += unitPrice * item.qty;
        lineItems.push({
          listingId: listing.id,
          qty: item.qty,
          unitPrice,
          payout: Number(listing.payout_price),
        });
      }

      subtotal = Math.round(subtotal * 100) / 100;
      // TODO(sprint 5): logistics fee from distance+weight; tax via GST rules.
      const fee = 0;
      const tax = 0;
      const total = subtotal + fee + tax;

      const order = (
        await client.query(
          `INSERT INTO orders (buyer_id, status, delivery_lat, delivery_lng, subtotal, fee, tax, total)
           VALUES ($1,'created',$2,$3,$4,$5,$6,$7) RETURNING *`,
          [buyerId, dto.deliveryLat ?? null, dto.deliveryLng ?? null, subtotal, fee, tax, total],
        )
      ).rows[0];

      for (const li of lineItems) {
        await client.query(
          `INSERT INTO order_items (order_id, listing_id, qty, unit_price, payout_price)
           VALUES ($1,$2,$3,$4,$5)`,
          [order.id, li.listingId, li.qty, li.unitPrice, li.payout],
        );
        await client.query(
          `UPDATE listings
              SET qty_remaining = qty_remaining - $2,
                  status = CASE WHEN qty_remaining - $2 <= 0 THEN 'sold' ELSE status END
            WHERE id = $1`,
          [li.listingId, li.qty],
        );
      }

      return { ...order, items: lineItems };
    });
  }

  /** Buyer cancels their own order (only before pickup). Restocks + refunds. */
  async cancelOrder(buyerId: string, orderId: string, reason?: string) {
    return this.db.tx((client) =>
      cancelOrderTx(client, this.notifications, this.provider, orderId, reason ?? 'Cancelled by buyer', {
        buyerId,
      }),
    );
  }

  async myOrders(buyerId: string) {
    return this.db.query(
      `SELECT o.*,
              json_agg(json_build_object(
                'listing_id', oi.listing_id, 'qty', oi.qty,
                'unit_price', oi.unit_price, 'produce', c.slug
              )) AS items
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN listings l ON l.id = oi.listing_id
         JOIN produce_catalog c ON c.id = l.catalog_id
        WHERE o.buyer_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC`,
      [buyerId],
    );
  }
}
