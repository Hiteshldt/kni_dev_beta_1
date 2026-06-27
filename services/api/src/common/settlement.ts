import { PoolClient } from 'pg';

/**
 * Record the per-order money split at delivery (PRD §7.6 / ticket G5):
 *   gross (buyer paid) = farmer_payout + driver_earning + kanni_margin
 * flat_fee is broken out for analytics (it's already inside the buyer price).
 */
export async function recordSettlement(
  client: PoolClient,
  orderId: string,
  farmerPayout: number,
  driverEarning: number,
) {
  const order = (await client.query('SELECT total FROM orders WHERE id = $1', [orderId])).rows[0];
  const gross = Number(order?.total ?? 0);

  const feeRow = (
    await client.query(
      `SELECT COALESCE(SUM(p.flat_fee * oi.qty), 0)::numeric(14,2) AS fee
         FROM order_items oi JOIN pricing p ON p.listing_id = oi.listing_id
        WHERE oi.order_id = $1`,
      [orderId],
    )
  ).rows[0];
  const flatFee = Number(feeRow?.fee ?? 0);

  const margin = Math.round((gross - farmerPayout - driverEarning) * 100) / 100;

  await client.query(
    `INSERT INTO settlements (order_id, gross_amount, farmer_payout, flat_fee, driver_earning, kanni_margin, status)
     VALUES ($1,$2,$3,$4,$5,$6,'settled')
     ON CONFLICT (order_id) DO NOTHING`,
    [orderId, gross, farmerPayout, flatFee, driverEarning, margin],
  );

  return { gross, farmer_payout: farmerPayout, flat_fee: flatFee, driver_earning: driverEarning, kanni_margin: margin };
}
