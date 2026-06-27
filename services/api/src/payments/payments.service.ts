import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { distanceKm, toKg } from '../common/logistics';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, PaymentProvider } from './provider/payment-provider';

function code4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /**
   * Buyer pays for a 'created' order. In dev this is mocked as an escrow HOLD
   * (no real PG). On success the order becomes 'paid' and a direct shipment is
   * created (unassigned) for drivers to pick up. Funds are captured on delivery.
   *
   * NOTE (Phase 2): an order spanning multiple sellers should split into one
   * shipment per seller/pickup. For now we create a single shipment keyed to the
   * first line item's seller and aggregate weight.
   */
  async payOrder(buyerId: string, orderId: string, pgRef?: string) {
    return this.db.tx(async (client) => {
      const order = (
        await client.query(
          `SELECT * FROM orders WHERE id = $1 AND buyer_id = $2 FOR UPDATE`,
          [orderId, buyerId],
        )
      ).rows[0];
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'created') {
        throw new BadRequestException(`Order is '${order.status}', cannot pay`);
      }

      // Already-held guard (idempotency-ish).
      const existing = await client.query('SELECT 1 FROM payments WHERE order_id = $1', [orderId]);
      if (existing.rowCount) throw new BadRequestException('Payment already exists for this order');

      // Aggregate shipment geo + weight from the order's line items.
      const items = (
        await client.query(
          `SELECT oi.qty, l.unit, l.seller_id, l.pickup_lat, l.pickup_lng, c.slug AS produce
             FROM order_items oi
             JOIN listings l ON l.id = oi.listing_id
             JOIN produce_catalog c ON c.id = l.catalog_id
            WHERE oi.order_id = $1`,
          [orderId],
        )
      ).rows;

      const weightKg = items.reduce((sum, it) => sum + toKg(Number(it.qty), it.unit), 0);
      const first = items[0];
      const pickupLat = first?.pickup_lat ?? null;
      const pickupLng = first?.pickup_lng ?? null;
      const dropLat = order.delivery_lat;
      const dropLng = order.delivery_lng;
      const dist =
        pickupLat != null && dropLat != null
          ? distanceKm(pickupLat, pickupLng, dropLat, dropLng)
          : null;

      // Escrow hold via the payment gateway. If the client already paid (real
      // Razorpay checkout), it passes the payment id as pgRef; otherwise we open
      // an intent through the provider (the mock just returns a ref).
      const intent = pgRef
        ? { ref: pgRef, gateway: this.provider.name }
        : await this.provider.createIntent({ orderId, amount: Number(order.total), buyerId });
      const payment = (
        await client.query(
          `INSERT INTO payments (order_id, pg_ref, amount, status, gateway)
           VALUES ($1, $2, $3, 'held', $4) RETURNING *`,
          [orderId, intent.ref, order.total, intent.gateway],
        )
      ).rows[0];

      await client.query(`UPDATE orders SET status = 'paid' WHERE id = $1`, [orderId]);

      const shipment = (
        await client.query(
          `INSERT INTO shipments
             (order_id, mode, status, pickup_code, drop_otp, weight_kg,
              pickup_lat, pickup_lng, drop_lat, drop_lng, seller_id, distance_km)
           VALUES ($1,'direct','unassigned',$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING *`,
          [
            orderId, code4(), code4(), Math.round(weightKg * 100) / 100,
            pickupLat, pickupLng, dropLat, dropLng, first?.seller_id ?? null, dist,
          ],
        )
      ).rows[0];

      // Notify buyer (order confirmed) + seller (prepare produce, pickup code).
      await this.notifications.notify(buyerId, 'order_paid', { amount: order.total }, client);
      if (first?.seller_id) {
        await this.notifications.notify(
          first.seller_id,
          'new_pickup',
          { qty: Number(first.qty), produce: first.produce, code: shipment.pickup_code },
          client,
        );
      }

      return {
        payment: { id: payment.id, status: payment.status, amount: payment.amount },
        order_status: 'paid',
        shipment: {
          id: shipment.id,
          status: shipment.status,
          weight_kg: shipment.weight_kg,
          distance_km: shipment.distance_km,
          // pickup_code is shared with the seller; drop_otp with the buyer.
          pickup_code: shipment.pickup_code,
          drop_otp: shipment.drop_otp,
        },
      };
    });
  }
}
