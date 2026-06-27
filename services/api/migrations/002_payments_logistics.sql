-- Sprint 5 (payments/escrow) + Sprint 6 (driver direct pickup) additions.

-- Denormalize shipment geo + weight so driver job matching and earnings don't
-- need to re-join order_items every time. Populated when the order is paid.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS weight_kg  numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_lat double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_lng double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS drop_lat   double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS drop_lng   double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS seller_id  uuid REFERENCES users(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS distance_km numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_driver ON shipments(driver_id);

-- Settlement ledger: a row per payee (seller or driver) per order.
CREATE TABLE IF NOT EXISTS payouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_id    uuid NOT NULL REFERENCES users(id),
  payee_type  text NOT NULL CHECK (payee_type IN ('seller','driver')),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount      numeric(14,2) NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payouts_payee ON payouts(payee_id);
