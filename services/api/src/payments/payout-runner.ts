import { PoolClient } from 'pg';
import { PaymentProvider } from './provider/payment-provider';

/**
 * Capture the held escrow for an order through the gateway and record the ref.
 * (Inline for the mock; in prod this is driven by a webhook worker — see
 * RazorpayProvider's note.)
 */
export async function capturePayment(client: PoolClient, provider: PaymentProvider, orderId: string) {
  const pay = (await client.query('SELECT pg_ref, amount FROM payments WHERE order_id = $1', [orderId])).rows[0];
  if (!pay) return null;
  const cap = await provider.capture(pay.pg_ref, Number(pay.amount));
  await client.query(
    `UPDATE payments SET status = 'captured', capture_ref = $2, gateway = $3 WHERE order_id = $1`,
    [orderId, cap.ref, provider.name],
  );
  return cap;
}

/** Refund a held/captured payment through the gateway and record the ref. */
export async function refundPayment(
  client: PoolClient,
  provider: PaymentProvider,
  orderId: string,
  amount: number,
  intentRef: string,
) {
  const r = await provider.refund(intentRef, amount);
  await client.query(
    `UPDATE payments SET status = 'refunded', refund_ref = $2, gateway = $3 WHERE order_id = $1`,
    [orderId, r.ref, provider.name],
  );
  return r;
}

/**
 * Create a payout row, push it to the gateway (RazorpayX), and reconcile its
 * status. Returns the final row state. The payouts.id is the idempotency key.
 */
export async function runPayout(
  client: PoolClient,
  provider: PaymentProvider,
  p: {
    payeeId: string;
    payeeType: 'seller' | 'driver';
    orderId: string;
    amount: number;
    destination?: string | null;
  },
) {
  const row = (
    await client.query(
      `INSERT INTO payouts (payee_id, payee_type, order_id, amount, status, gateway)
       VALUES ($1,$2,$3,$4,'pending',$5) RETURNING id`,
      [p.payeeId, p.payeeType, p.orderId, p.amount, provider.name],
    )
  ).rows[0];

  const res = await provider.payout({
    payoutId: row.id,
    payeeId: p.payeeId,
    payeeType: p.payeeType,
    amount: Number(p.amount),
    destination: p.destination ?? null,
  });

  await client.query(
    `UPDATE payouts SET status = $2, gateway_ref = $3, failure_reason = $4 WHERE id = $1`,
    [row.id, res.status, res.ref || null, res.failureReason ?? null],
  );

  return { id: row.id, amount: Number(p.amount), ...res };
}
