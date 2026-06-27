import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateRatingDto } from './ratings.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly db: DbService) {}

  /** Buyer rates the seller or driver for a delivered order. One rating per (order, target). */
  async rate(buyerId: string, dto: CreateRatingDto) {
    const order = await this.db.one<{ id: string; status: string }>(
      'SELECT id, status FROM orders WHERE id = $1 AND buyer_id = $2',
      [dto.orderId, buyerId],
    );
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'delivered') {
      throw new BadRequestException('You can rate only after the order is delivered');
    }

    const toUser = await this.resolveTarget(dto, buyerId);

    const dup = await this.db.one(
      `SELECT 1 FROM ratings WHERE from_user = $1 AND order_id = $2 AND context = $3`,
      [buyerId, dto.orderId, dto.target],
    );
    if (dup) throw new ConflictException(`You have already rated the ${dto.target} for this order`);

    return this.db.one(
      `INSERT INTO ratings (from_user, to_user, score, context, order_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, to_user, score, context, order_id, created_at`,
      [buyerId, toUser, dto.score, dto.target, dto.orderId],
    );
  }

  /** Find the seller/driver user being rated for this order. */
  private async resolveTarget(dto: CreateRatingDto, buyerId: string): Promise<string> {
    let candidates: string[];
    if (dto.target === 'seller') {
      const rows = await this.db.query<{ seller_id: string }>(
        `SELECT DISTINCT l.seller_id
           FROM order_items oi JOIN listings l ON l.id = oi.listing_id
          WHERE oi.order_id = $1`,
        [dto.orderId],
      );
      candidates = rows.map((r) => r.seller_id).filter(Boolean);
    } else {
      const rows = await this.db.query<{ driver_id: string }>(
        `SELECT DISTINCT driver_id FROM shipments WHERE order_id = $1 AND driver_id IS NOT NULL`,
        [dto.orderId],
      );
      candidates = rows.map((r) => r.driver_id).filter(Boolean);
    }

    if (candidates.length === 0) throw new BadRequestException(`No ${dto.target} found for this order`);
    if (dto.toUserId) {
      if (!candidates.includes(dto.toUserId)) {
        throw new BadRequestException(`That ${dto.target} is not part of this order`);
      }
      return dto.toUserId;
    }
    if (candidates.length > 1) {
      throw new BadRequestException(
        `This order has multiple ${dto.target}s — pass toUserId to choose one`,
      );
    }
    return candidates[0];
  }

  /**
   * Reputation for a user (seller or driver): average stars + count, plus a
   * fulfilment-aware reliability score (0–100) combining ratings with how many
   * of their orders actually reached 'delivered'.
   */
  async reputation(userId: string) {
    const r = await this.db.one<{ avg: string | null; n: string }>(
      `SELECT AVG(score)::numeric(3,2) AS avg, COUNT(*) AS n FROM ratings WHERE to_user = $1`,
      [userId],
    );
    const avg = r?.avg != null ? Number(r.avg) : null;
    const count = Number(r?.n ?? 0);

    // Fulfilment: share of this user's involved orders that were delivered.
    const fulfil = await this.db.one<{ delivered: string; total: string }>(
      `WITH involved AS (
         SELECT DISTINCT o.id, o.status FROM orders o
           JOIN order_items oi ON oi.order_id = o.id
           JOIN listings l ON l.id = oi.listing_id
          WHERE l.seller_id = $1
         UNION
         SELECT DISTINCT o.id, o.status FROM orders o
           JOIN shipments s ON s.order_id = o.id
          WHERE s.driver_id = $1
       )
       SELECT COUNT(*) FILTER (WHERE status = 'delivered') AS delivered, COUNT(*) AS total
         FROM involved`,
      [userId],
    );
    const delivered = Number(fulfil?.delivered ?? 0);
    const total = Number(fulfil?.total ?? 0);
    const fulfilmentPct = total > 0 ? delivered / total : 1;

    // Reliability = 70% ratings (default-neutral 3.5/5 until rated) + 30% fulfilment.
    const ratingComponent = (avg ?? 3.5) / 5;
    const reliability = Math.round((0.7 * ratingComponent + 0.3 * fulfilmentPct) * 100);

    return {
      user_id: userId,
      avg_stars: avg,
      ratings_count: count,
      delivered_orders: delivered,
      total_orders: total,
      reliability_score: reliability, // 0–100
    };
  }
}
