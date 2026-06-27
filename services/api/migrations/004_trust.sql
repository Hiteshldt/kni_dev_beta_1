-- Sprint 7 (notifications, ratings, refunds, settlement records).

-- Allow shipments to be cancelled (buyer/admin cancellation before pickup).
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_status_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_status_check
  CHECK (status IN ('unassigned','assigned','picked_up','in_transit','delivered','failed','cancelled'));

-- Per-user preferred language drives vernacular notifications (the USP).
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_lang text NOT NULL DEFAULT 'en'
  CHECK (preferred_lang IN ('en','ta','ml'));

-- Cancellation bookkeeping on orders.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- In-app notifications. We store a structured event (type + payload) plus a
-- rendered title/body so the app can show it offline and re-render per language.
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  type        text NOT NULL,                 -- order_paid, picked_up, delivered, payout_released, ...
  title       text NOT NULL,
  body        text NOT NULL,
  lang        text NOT NULL DEFAULT 'en',
  channel     text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','sms','push')),
  payload     jsonb,                         -- template variables + ids for client-side re-render
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- Per-order settlement record: the full money split at delivery (PRD §7.6 / G5).
CREATE TABLE IF NOT EXISTS settlements (
  order_id        uuid PRIMARY KEY REFERENCES orders(id),
  gross_amount    numeric(14,2) NOT NULL,    -- what the buyer paid
  farmer_payout   numeric(14,2) NOT NULL,    -- to seller(s)
  flat_fee        numeric(14,2) NOT NULL DEFAULT 0,
  driver_earning  numeric(14,2) NOT NULL,    -- to driver
  kanni_margin    numeric(14,2) NOT NULL,    -- platform take, net of driver = gross - farmer - driver
  status          text NOT NULL DEFAULT 'settled' CHECK (status IN ('settled','refunded')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
