import {
  CaptureResult, CreateIntentInput, IntentResult, PaymentProvider,
  PayoutInput, PayoutResult, RefundResult,
} from './payment-provider';

/**
 * Deterministic in-process provider for dev/tests. No network, always succeeds,
 * returns traceable fake references. This is the default unless PAYMENT_PROVIDER
 * is set to a real gateway with credentials.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  private ref(prefix: string, seed: string) {
    return `${prefix}_${seed.replace(/-/g, '').slice(0, 10)}_${Date.now().toString(36)}`;
  }

  async createIntent(input: CreateIntentInput): Promise<IntentResult> {
    return { ref: this.ref('mockint', input.orderId), gateway: this.name };
  }

  async capture(intentRef: string): Promise<CaptureResult> {
    return { ref: this.ref('mockcap', intentRef) };
  }

  async refund(intentRef: string): Promise<RefundResult> {
    return { ref: this.ref('mockrfnd', intentRef) };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    return { ref: this.ref('mockpout', input.payoutId), status: 'paid' };
  }
}
