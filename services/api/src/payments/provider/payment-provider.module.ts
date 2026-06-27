import { Global, Logger, Module } from '@nestjs/common';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { MockPaymentProvider } from './mock.provider';
import { RazorpayProvider } from './razorpay.provider';

/**
 * Provides the active PaymentProvider app-wide. Selection by PAYMENT_PROVIDER env
 * (default 'mock'). 'razorpay' requires keys; if absent we warn and fall back to
 * mock so dev never breaks.
 */
@Global()
@Module({
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (): PaymentProvider => {
        const log = new Logger('PaymentProvider');
        const choice = (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();
        if (choice === 'razorpay') {
          const id = process.env.RAZORPAY_KEY_ID;
          const secret = process.env.RAZORPAY_KEY_SECRET;
          if (id && secret) {
            log.log('Using Razorpay payment provider');
            return new RazorpayProvider(id, secret, process.env.RAZORPAYX_ACCOUNT);
          }
          log.warn('PAYMENT_PROVIDER=razorpay but keys missing — falling back to mock');
        }
        log.log('Using mock payment provider');
        return new MockPaymentProvider();
      },
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentProviderModule {}
