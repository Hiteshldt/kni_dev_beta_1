import { Logger } from '@nestjs/common';
import {
  CaptureResult, CreateIntentInput, IntentResult, PaymentProvider,
  PayoutInput, PayoutResult, RefundResult,
} from './payment-provider';

/**
 * Razorpay (payments) + RazorpayX (payouts) adapter.
 *
 * Real-world flow note: the buyer app creates the Order via the client SDK using
 * the id from `createIntent`, completes checkout, and the authoritative capture
 * arrives via webhook. Calling capture/refund/payout inline (as the services do
 * today) is fine for the mock; in production move them to a worker that reacts to
 * webhooks so the gateway is never called inside a DB transaction.
 *
 * Requires: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (+ RAZORPAYX_ACCOUNT for payouts).
 */
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly log = new Logger('Razorpay');
  private readonly base = 'https://api.razorpay.com/v1';

  constructor(
    private readonly keyId: string,
    private readonly keySecret: string,
    private readonly xAccount?: string,
  ) {}

  private auth() {
    const token = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
  }

  private async call(method: string, path: string, body?: unknown): Promise<any> {
    const fetchFn: any = (globalThis as any).fetch;
    const res = await fetchFn(`${this.base}${path}`, {
      method,
      headers: this.auth(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.description ?? `HTTP ${res.status}`;
      throw new Error(`Razorpay ${method} ${path} failed: ${msg}`);
    }
    return json;
  }

  private paise(rupees: number) {
    return Math.round(rupees * 100);
  }

  async createIntent(input: CreateIntentInput): Promise<IntentResult> {
    const order = await this.call('POST', '/orders', {
      amount: this.paise(input.amount),
      currency: 'INR',
      receipt: input.orderId,
      notes: { buyer_id: input.buyerId },
    });
    return { ref: order.id, gateway: this.name };
  }

  async capture(intentRef: string, amount: number): Promise<CaptureResult> {
    // intentRef is a payment id (pay_…) once the buyer has paid; orders auto-capture
    // when configured, so treat a non-payment ref as already settled.
    if (!intentRef.startsWith('pay_')) {
      this.log.warn(`capture: ${intentRef} is not a payment id; assuming auto-capture`);
      return { ref: intentRef };
    }
    const r = await this.call('POST', `/payments/${intentRef}/capture`, {
      amount: this.paise(amount),
      currency: 'INR',
    });
    return { ref: r.id };
  }

  async refund(intentRef: string, amount: number): Promise<RefundResult> {
    const r = await this.call('POST', `/payments/${intentRef}/refund`, {
      amount: this.paise(amount),
    });
    return { ref: r.id };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    if (!this.xAccount) {
      return { ref: '', status: 'failed', failureReason: 'RAZORPAYX_ACCOUNT not configured' };
    }
    try {
      // Assumes a fund account already exists for the payee (created at onboarding/KYC).
      const r = await this.call('POST', '/payouts', {
        account_number: this.xAccount,
        amount: this.paise(input.amount),
        currency: 'INR',
        mode: 'UPI',
        purpose: 'payout',
        reference_id: input.payoutId,
        notes: { payee_id: input.payeeId, payee_type: input.payeeType },
      });
      return { ref: r.id, status: r.status === 'rejected' ? 'failed' : 'paid' };
    } catch (e: any) {
      return { ref: '', status: 'failed', failureReason: e.message };
    }
  }
}
