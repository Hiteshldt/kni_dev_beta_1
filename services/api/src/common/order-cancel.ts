import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentProvider } from '../payments/provider/payment-provider';
import { refundPayment } from '../payments/payout-runner';

const CANCELLABLE = ['created', 'paid', 'pickup_assigned'];

/**
 * Cancel an order that hasn't been picked up yet, inside an existing transaction.
 * Restocks listings, refunds a held payment via the gateway, cancels the
 * shipment, and notifies the buyer + seller(s). Shared by buyer + admin cancel.
 */
export async function cancelOrderTx(
  client: PoolClient,
  notifications: NotificationsService,
  provider: PaymentProvider,
  orderId: string,
  reason: string,
  opts: { buyerId?: string } = {},
) {
  const order = (await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId])).rows[0];
  if (!order) throw new NotFoundException('Order not found');
  if (opts.buyerId && order.buyer_id !== opts.buyerId) throw new ForbiddenException('Not your order');
  if (!CANCELLABLE.includes(order.status)) {
    throw new BadRequestException(`Order is '${order.status}' and can no longer be cancelled`);
  }

  // Restock each line item; a sold-out listing becomes live again.
  const items = (
    await client.query('SELECT listing_id, qty FROM order_items WHERE order_id = $1', [orderId])
  ).rows;
  for (const it of items) {
    await client.query(
      `UPDATE listings
          SET qty_remaining = qty_remaining + $2,
              status = CASE WHEN status = 'sold' THEN 'live' ELSE status END
        WHERE id = $1`,
      [it.listing_id, it.qty],
    );
  }

  // Refund a held (escrow) payment through the gateway.
  const pay = (await client.query('SELECT * FROM payments WHERE order_id = $1', [orderId])).rows[0];
  let refundAmount = 0;
  if (pay && pay.status === 'held') {
    await refundPayment(client, provider, orderId, Number(pay.amount), pay.pg_ref);
    refundAmount = Number(pay.amount);
  }

  // Cancel any in-flight shipment(s).
  await client.query(
    `UPDATE shipments SET status = 'cancelled'
      WHERE order_id = $1 AND status NOT IN ('delivered','cancelled')`,
    [orderId],
  );

  await client.query(
    `UPDATE orders SET status = 'cancelled', cancel_reason = $2, cancelled_at = now() WHERE id = $1`,
    [orderId, reason],
  );

  // Notify buyer + sellers (joins this transaction).
  const orderShort = orderId.slice(0, 8);
  await notifications.notify(order.buyer_id, 'order_cancelled', { orderShort }, client);
  if (refundAmount > 0) {
    await notifications.notify(order.buyer_id, 'refund_issued', { orderShort, amount: refundAmount }, client);
  }
  const sellers = (
    await client.query(
      `SELECT DISTINCT l.seller_id FROM order_items oi JOIN listings l ON l.id = oi.listing_id
        WHERE oi.order_id = $1`,
      [orderId],
    )
  ).rows;
  for (const s of sellers) {
    if (s.seller_id) await notifications.notify(s.seller_id, 'order_cancelled', { orderShort }, client);
  }

  return { order_id: orderId, status: 'cancelled', refund_amount: refundAmount, restocked: items.length };
}
