/**
 * Payment-provider seam. The rest of the app talks to this interface, never to
 * Razorpay directly, so the gateway can be swapped (or mocked in dev/tests).
 *
 * Money is held in escrow at pay time, captured on delivery, refunded on cancel,
 * and paid out to sellers/drivers via RazorpayX. Amounts are in rupees (₹);
 * adapters convert to the gateway's unit (paise) internally.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreateIntentInput {
  orderId: string;
  amount: number; // ₹
  buyerId: string;
}
export interface IntentResult {
  ref: string;      // gateway order/intent id we persist as payments.pg_ref
  gateway: string;
}
export interface CaptureResult { ref: string }
export interface RefundResult { ref: string }

export interface PayoutInput {
  payoutId: string;            // our payouts.id (idempotency key)
  payeeId: string;
  payeeType: 'seller' | 'driver';
  amount: number;              // ₹
  destination?: string | null; // UPI id / bank account for traceability
}
export interface PayoutResult {
  ref: string;
  status: 'paid' | 'failed';
  failureReason?: string;
}

export interface PaymentProvider {
  readonly name: string;
  /** Create an escrow hold / gateway order. */
  createIntent(input: CreateIntentInput): Promise<IntentResult>;
  /** Capture a held amount on delivery. */
  capture(intentRef: string, amount: number): Promise<CaptureResult>;
  /** Refund a held or captured amount on cancellation. */
  refund(intentRef: string, amount: number): Promise<RefundResult>;
  /** Pay a seller or driver (RazorpayX). */
  payout(input: PayoutInput): Promise<PayoutResult>;
}
