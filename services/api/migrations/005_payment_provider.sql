-- Sprint 8: real payment-provider seam. Track the gateway and its references so
-- holds/captures/refunds/payouts are reconcilable against Razorpay / RazorpayX.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway     text NOT NULL DEFAULT 'mock';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS capture_ref text;   -- gateway capture id
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_ref  text;   -- gateway refund id

ALTER TABLE payouts  ADD COLUMN IF NOT EXISTS gateway     text NOT NULL DEFAULT 'mock';
ALTER TABLE payouts  ADD COLUMN IF NOT EXISTS gateway_ref text;   -- RazorpayX payout id
ALTER TABLE payouts  ADD COLUMN IF NOT EXISTS failure_reason text;
