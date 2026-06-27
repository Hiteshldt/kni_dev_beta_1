import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateListingDto, UpsertSellerProfileDto } from './seller.dto';
import { computeBuyerPrice } from '../common/pricing';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SellerService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
  ) {}

  async upsertProfile(userId: string, dto: UpsertSellerProfileDto) {
    return this.db.one(
      `INSERT INTO seller_profiles (user_id, name, photo_url, farm_lat, farm_lng, upi_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET
         name = EXCLUDED.name, photo_url = EXCLUDED.photo_url,
         farm_lat = EXCLUDED.farm_lat, farm_lng = EXCLUDED.farm_lng,
         upi_id = EXCLUDED.upi_id
       RETURNING *`,
      [userId, dto.name, dto.photoUrl ?? null, dto.farmLat ?? null, dto.farmLng ?? null, dto.upiId ?? null],
    );
  }

  async getProfile(userId: string) {
    const p = await this.db.one('SELECT * FROM seller_profiles WHERE user_id = $1', [userId]);
    if (!p) throw new NotFoundException('Complete your seller profile first');
    return p;
  }

  /** Create a listing in `pending` state for admin review. Pickup defaults to farm. */
  async createListing(userId: string, dto: CreateListingDto) {
    const profile = await this.db.one<{ farm_lat: number | null; farm_lng: number | null }>(
      'SELECT farm_lat, farm_lng FROM seller_profiles WHERE user_id = $1',
      [userId],
    );
    if (!profile) throw new BadRequestException('Create your seller profile before listing');

    const catalog = await this.db.one<{ id: string; names: any; slug: string }>(
      'SELECT id, names, slug FROM produce_catalog WHERE id = $1',
      [dto.catalogId],
    );
    if (!catalog) throw new BadRequestException('Unknown produce item');

    if (dto.moq > dto.qty) {
      throw new BadRequestException('MOQ cannot exceed the available quantity');
    }

    const pickupLat = dto.pickupLat ?? profile.farm_lat;
    const pickupLng = dto.pickupLng ?? profile.farm_lng;

    // If admin enabled auto-approve, the listing skips the review queue and goes
    // live immediately with the default margin/fee applied.
    const settings = await this.db.one<{
      auto_approve: boolean;
      default_margin_pct: string;
      default_flat_fee: string;
    }>('SELECT auto_approve, default_margin_pct, default_flat_fee FROM platform_settings WHERE id = 1');
    const autoApprove = !!settings?.auto_approve;

    return this.db.tx(async (client) => {
      const listing = (
        await client.query(
          `INSERT INTO listings
             (seller_id, catalog_id, qty, qty_remaining, unit, payout_price, moq, grade,
              photos, pickup_lat, pickup_lng, available_from, available_to, status)
           VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING *`,
          [
            userId, dto.catalogId, dto.qty, dto.unit, dto.payoutPrice, dto.moq,
            dto.grade ?? null, JSON.stringify(dto.photos ?? []),
            pickupLat, pickupLng, dto.availableFrom ?? null, dto.availableTo ?? null,
            autoApprove ? 'live' : 'pending',
          ],
        )
      ).rows[0];

      if (!autoApprove) return listing;

      const margin = Number(settings!.default_margin_pct);
      const fee = Number(settings!.default_flat_fee);
      const buyerPrice = computeBuyerPrice(Number(dto.payoutPrice), margin, fee);
      await client.query(
        `INSERT INTO pricing (listing_id, margin_pct, flat_fee, buyer_price, reviewed_by)
         VALUES ($1,$2,$3,$4,NULL)
         ON CONFLICT (listing_id) DO UPDATE SET
           margin_pct = EXCLUDED.margin_pct, flat_fee = EXCLUDED.flat_fee,
           buyer_price = EXCLUDED.buyer_price, reviewed_at = now()`,
        [listing.id, margin, fee, buyerPrice],
      );
      await this.notifications.notify(
        userId, 'listing_live',
        { produce: catalog.names?.en ?? catalog.slug, price: buyerPrice }, client,
      );
      return { ...listing, buyer_price: buyerPrice, margin_pct: margin, flat_fee: fee, auto_approved: true };
    });
  }

  async myListings(userId: string) {
    return this.db.query(
      `SELECT l.*, c.names AS produce_names, c.slug AS produce_slug,
              p.margin_pct, p.flat_fee, p.buyer_price
         FROM listings l
         JOIN produce_catalog c ON c.id = l.catalog_id
         LEFT JOIN pricing p ON p.listing_id = l.id
        WHERE l.seller_id = $1
        ORDER BY l.created_at DESC`,
      [userId],
    );
  }
}
