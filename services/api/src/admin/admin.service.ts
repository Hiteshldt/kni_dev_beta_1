import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { ReviewListingDto } from './admin.dto';
import { computeBuyerPrice } from '../common/pricing';
import { NotificationsService } from '../notifications/notifications.service';
import { cancelOrderTx } from '../common/order-cancel';
import { PAYMENT_PROVIDER, PaymentProvider } from '../payments/provider/payment-provider';
import { refundPayment } from '../payments/payout-runner';

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Platform settings (auto-approve + default pricing). Single row. */
  async getSettings() {
    return this.db.one('SELECT auto_approve, default_margin_pct, default_flat_fee FROM platform_settings WHERE id = 1');
  }

  async updateSettings(dto: {
    autoApprove?: boolean;
    defaultMarginPct?: number;
    defaultFlatFee?: number;
  }) {
    return this.db.one(
      `UPDATE platform_settings SET
         auto_approve = COALESCE($1, auto_approve),
         default_margin_pct = COALESCE($2, default_margin_pct),
         default_flat_fee = COALESCE($3, default_flat_fee),
         updated_at = now()
       WHERE id = 1
       RETURNING auto_approve, default_margin_pct, default_flat_fee`,
      [dto.autoApprove ?? null, dto.defaultMarginPct ?? null, dto.defaultFlatFee ?? null],
    );
  }

  /** Operational snapshot for the admin dashboard (counts + money flows). */
  async stats() {
    return this.db.one(
      `SELECT
         (SELECT count(*) FROM listings WHERE status = 'pending')::int           AS pending_listings,
         (SELECT count(*) FROM driver_profiles WHERE verify_status = 'pending')::int AS pending_drivers,
         (SELECT count(*) FROM listings WHERE status = 'live')::int              AS live_listings,
         (SELECT count(*) FROM orders)::int                                      AS total_orders,
         (SELECT count(*) FROM orders WHERE status = 'delivered')::int           AS delivered_orders,
         (SELECT count(*) FROM orders
            WHERE status NOT IN ('delivered','cancelled'))::int                  AS active_orders,
         (SELECT count(*) FROM orders WHERE status = 'cancelled')::int           AS cancelled_orders,
         (SELECT COALESCE(sum(total),0) FROM orders WHERE status <> 'cancelled') AS gmv,
         (SELECT COALESCE(sum(kanni_margin),0) FROM settlements WHERE status = 'settled') AS kanni_revenue,
         (SELECT COALESCE(sum(farmer_payout),0) FROM settlements WHERE status = 'settled') AS farmer_paid,
         (SELECT COALESCE(sum(driver_earning),0) FROM settlements WHERE status = 'settled') AS driver_paid`,
    );
  }

  /** Recent orders with buyer, payment and settlement state for the console. */
  async recentOrders(limit = 50) {
    const rows = await this.db.query(
      `SELECT o.id, o.status, o.total, o.created_at, o.cancel_reason,
              b.business_name AS buyer_name,
              p.status        AS payment_status,
              s.status        AS settlement_status,
              s.kanni_margin
         FROM orders o
         LEFT JOIN buyer_profiles b ON b.user_id = o.buyer_id
         LEFT JOIN payments p        ON p.order_id = o.id
         LEFT JOIN settlements s     ON s.order_id = o.id
        ORDER BY o.created_at DESC
        LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    // A refund is possible pre-pickup (held escrow) or post-delivery (captured,
    // not already refunded). Mirrors refundOrder's own guards below.
    return rows.map((o: any) => ({
      ...o,
      refundable:
        o.settlement_status !== 'refunded' &&
        ((o.payment_status === 'held' &&
          ['created', 'paid', 'pickup_assigned'].includes(o.status)) ||
          (o.payment_status === 'captured' && o.status === 'delivered')),
    }));
  }

  /** Pending driver onboarding submissions awaiting verification. */
  async pendingDrivers() {
    return this.db.query(
      `SELECT d.user_id, u.phone, d.vehicle_type, d.capacity_kg, d.verify_status
         FROM driver_profiles d JOIN users u ON u.id = d.user_id
        WHERE d.verify_status = 'pending'
        ORDER BY u.created_at ASC`,
    );
  }

  async verifyDriver(driverUserId: string, approve: boolean) {
    const d = await this.db.one('SELECT 1 FROM driver_profiles WHERE user_id = $1', [driverUserId]);
    if (!d) throw new NotFoundException('Driver not found');
    return this.db.one(
      `UPDATE driver_profiles SET verify_status = $2 WHERE user_id = $1 RETURNING user_id, verify_status`,
      [driverUserId, approve ? 'verified' : 'rejected'],
    );
  }

  async reviewQueue() {
    return this.db.query(
      `SELECT l.*, c.names AS produce_names, c.slug AS produce_slug,
              s.name AS seller_name
         FROM listings l
         JOIN produce_catalog c ON c.id = l.catalog_id
         LEFT JOIN seller_profiles s ON s.user_id = l.seller_id
        WHERE l.status = 'pending'
        ORDER BY l.created_at ASC`,
    );
  }

  /** Approve (set grade + margin/fee, compute buyer price, go live) or reject. */
  async review(adminId: string, listingId: string, dto: ReviewListingDto) {
    const listing = await this.db.one<{
      status: string; payout_price: string; seller_id: string; produce_names: any; slug: string;
    }>(
      `SELECT l.status, l.payout_price, l.seller_id, c.names AS produce_names, c.slug
         FROM listings l JOIN produce_catalog c ON c.id = l.catalog_id
        WHERE l.id = $1`,
      [listingId],
    );
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'pending') {
      throw new BadRequestException(`Listing is '${listing.status}', not pending`);
    }
    const produce = listing.produce_names?.en ?? listing.slug;

    if (dto.action === 'reject') {
      const rejected = await this.db.one(
        `UPDATE listings SET status = 'rejected', reject_reason = $2 WHERE id = $1 RETURNING *`,
        [listingId, dto.rejectReason ?? 'Not specified'],
      );
      await this.notifications.notify(listing.seller_id, 'listing_rejected', {
        produce, reason: dto.rejectReason ?? '',
      });
      return rejected;
    }

    // approve
    const marginPct = dto.marginPct ?? 0;
    const flatFee = dto.flatFee ?? 0;
    const payout = Number(listing.payout_price);
    const buyerPrice = computeBuyerPrice(payout, marginPct, flatFee);

    return this.db.tx(async (client) => {
      await client.query(
        `INSERT INTO pricing (listing_id, margin_pct, flat_fee, buyer_price, reviewed_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (listing_id) DO UPDATE SET
           margin_pct = EXCLUDED.margin_pct, flat_fee = EXCLUDED.flat_fee,
           buyer_price = EXCLUDED.buyer_price, reviewed_by = EXCLUDED.reviewed_by,
           reviewed_at = now()`,
        [listingId, marginPct, flatFee, buyerPrice, adminId],
      );
      const updated = await client.query(
        `UPDATE listings SET status = 'live', grade = COALESCE($2, grade)
         WHERE id = $1 RETURNING *`,
        [listingId, dto.grade ?? null],
      );
      await this.notifications.notify(
        listing.seller_id, 'listing_live', { produce, price: buyerPrice }, client,
      );
      return { ...updated.rows[0], buyer_price: buyerPrice, margin_pct: marginPct, flat_fee: flatFee };
    });
  }

  /**
   * Admin-triggered refund / cancellation (dispute resolution, G4). Pre-pickup
   * orders are cancelled + restocked + refunded. A delivered order can still be
   * refunded (money already captured) — payment + settlement flip to 'refunded'.
   */
  async refundOrder(orderId: string, reason: string) {
    return this.db.tx(async (client) => {
      const order = (await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId])).rows[0];
      if (!order) throw new NotFoundException('Order not found');

      if (order.status === 'delivered') {
        // Post-delivery refund: reverse captured funds, mark settlement refunded.
        const pay = (await client.query('SELECT * FROM payments WHERE order_id = $1', [orderId])).rows[0];
        if (!pay || pay.status !== 'captured') {
          throw new BadRequestException('No captured payment to refund for this order');
        }
        await refundPayment(client, this.provider, orderId, Number(pay.amount), pay.pg_ref);
        await client.query(`UPDATE settlements SET status = 'refunded' WHERE order_id = $1`, [orderId]);
        await client.query(`UPDATE orders SET cancel_reason = $2 WHERE id = $1`, [orderId, reason]);

        const orderShort = orderId.slice(0, 8);
        await this.notifications.notify(
          order.buyer_id, 'refund_issued', { orderShort, amount: Number(pay.amount) }, client,
        );
        return { order_id: orderId, refunded: true, post_delivery: true, amount: Number(pay.amount) };
      }

      // Otherwise treat as a normal pre-pickup cancellation + refund.
      return cancelOrderTx(client, this.notifications, this.provider, orderId, reason);
    });
  }
}
