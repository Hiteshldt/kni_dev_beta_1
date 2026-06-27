import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Gateway webhook sink (no auth — authenticated by signature). In prod this is
 * the authoritative source for capture/refund/payout status transitions. Here we
 * verify the Razorpay signature when a secret is configured and log the event;
 * full event→state handling is the next step once a real account is connected.
 */
@Controller('payments/webhook')
export class WebhookController {
  private readonly log = new Logger('PaymentsWebhook');

  @Post()
  @HttpCode(200)
  handle(@Headers('x-razorpay-signature') signature: string | undefined, @Body() body: any) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const expected = createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
      const ok =
        !!signature &&
        signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!ok) {
        this.log.warn('Rejected webhook: bad signature');
        return { ok: false, reason: 'invalid signature' };
      }
    }
    this.log.log(`Webhook received: ${body?.event ?? 'unknown event'}`);
    // TODO: route body.event → capture/refund/payout reconciliation.
    return { ok: true };
  }
}
