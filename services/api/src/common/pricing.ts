/**
 * Buyer price = farmer payout + KANNI margin% + flat fee (all per unit).
 * Single source of truth for the pricing stack (PRD §7.4).
 */
export function computeBuyerPrice(
  payoutPrice: number,
  marginPct: number,
  flatFee: number,
): number {
  const price = payoutPrice * (1 + marginPct / 100) + flatFee;
  return Math.round(price * 100) / 100; // 2 dp
}
