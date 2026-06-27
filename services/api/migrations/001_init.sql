-- KANNI Phase 1 schema.
-- Geo uses plain lat/lng doubles + haversine in SQL so there is NO PostGIS
-- dependency. When PostGIS is provisioned (prod), swap distance_km() for a
-- geography column + ST_DistanceSphere and add a GIST index. See ENGINEERING_PLAN.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL UNIQUE,
  role        text CHECK (role IN ('seller','buyer','admin','driver')),
  language    text NOT NULL DEFAULT 'ta' CHECK (language IN ('ta','ml','hi','en')),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- OTP store (dev: code is returned in API response; prod: send via MSG91).
CREATE TABLE IF NOT EXISTS otp_codes (
  phone       text PRIMARY KEY,
  code        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name               text NOT NULL,
  photo_url          text,
  farm_lat           double precision,
  farm_lng           double precision,
  upi_id             text,
  payout_kyc_status  text NOT NULL DEFAULT 'none'
                     CHECK (payout_kyc_status IN ('none','pending','verified','rejected'))
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name  text NOT NULL,
  gst            text,
  delivery_lat   double precision,
  delivery_lng   double precision,
  verify_status  text NOT NULL DEFAULT 'none'
                 CHECK (verify_status IN ('none','pending','verified','rejected'))
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  license_url    text,
  rc_url         text,
  vehicle_type   text CHECK (vehicle_type IN ('tempo','mini_truck','truck')),
  capacity_kg    numeric(10,2) NOT NULL DEFAULT 0,
  bank_account   text,
  verify_status  text NOT NULL DEFAULT 'pending'
                 CHECK (verify_status IN ('pending','verified','rejected'))
);

-- ---------------------------------------------------------------------------
-- Catalog & listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produce_catalog (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  names             jsonb NOT NULL,        -- {"en":"Tomato","ta":"தக்காளி","ml":"തക്കാളി"}
  category          text NOT NULL,         -- veg | fruit | grain | other
  default_unit      text NOT NULL DEFAULT 'kg' CHECK (default_unit IN ('kg','quintal','crate','dozen')),
  default_moq       numeric(10,2) NOT NULL DEFAULT 10,
  perishability_days int NOT NULL DEFAULT 3,
  image_url         text
);

CREATE TABLE IF NOT EXISTS listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id      uuid NOT NULL REFERENCES produce_catalog(id),
  qty             numeric(12,2) NOT NULL CHECK (qty > 0),
  qty_remaining   numeric(12,2) NOT NULL CHECK (qty_remaining >= 0),
  unit            text NOT NULL CHECK (unit IN ('kg','quintal','crate','dozen')),
  payout_price    numeric(12,2) NOT NULL CHECK (payout_price > 0), -- per unit, what farmer receives
  moq             numeric(12,2) NOT NULL CHECK (moq > 0),
  grade           text CHECK (grade IN ('A','B','C')),
  photos          jsonb NOT NULL DEFAULT '[]',
  pickup_lat      double precision,
  pickup_lng      double precision,
  available_from  date,
  available_to    date,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('draft','pending','live','sold','expired','rejected')),
  reject_reason   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);

-- Admin-set pricing per listing. buyer_price = payout + margin + flat fee.
CREATE TABLE IF NOT EXISTS pricing (
  listing_id     uuid PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
  margin_pct     numeric(5,2) NOT NULL DEFAULT 0,    -- e.g. 8.00 == 8%
  flat_fee       numeric(12,2) NOT NULL DEFAULT 0,   -- per unit
  buyer_price    numeric(12,2) NOT NULL,             -- computed, per unit
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id       uuid NOT NULL REFERENCES users(id),
  status         text NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created','paid','pickup_assigned','picked_up','in_transit','delivered','cancelled')),
  delivery_lat   double precision,
  delivery_lng   double precision,
  subtotal       numeric(14,2) NOT NULL DEFAULT 0,
  fee            numeric(14,2) NOT NULL DEFAULT 0,
  tax            numeric(14,2) NOT NULL DEFAULT 0,
  total          numeric(14,2) NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id    uuid NOT NULL REFERENCES listings(id),
  qty           numeric(12,2) NOT NULL CHECK (qty > 0),
  unit_price    numeric(12,2) NOT NULL,  -- buyer price per unit at time of order
  payout_price  numeric(12,2) NOT NULL   -- farmer payout per unit at time of order
);

-- ---------------------------------------------------------------------------
-- Fulfillment & payments (schema now; endpoints in later sprints)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mode           text NOT NULL DEFAULT 'direct' CHECK (mode IN ('direct','batch')),
  driver_id      uuid REFERENCES users(id),
  pickup_code    text,
  drop_otp       text,
  status         text NOT NULL DEFAULT 'unassigned'
                 CHECK (status IN ('unassigned','assigned','picked_up','in_transit','delivered','failed')),
  picked_at      timestamptz,
  delivered_at   timestamptz,
  proof_url      text
);

CREATE TABLE IF NOT EXISTS payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pg_ref      text,
  amount      numeric(14,2) NOT NULL,
  status      text NOT NULL DEFAULT 'held' CHECK (status IN ('held','captured','refunded','failed'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user   uuid NOT NULL REFERENCES users(id),
  to_user     uuid NOT NULL REFERENCES users(id),
  score       int NOT NULL CHECK (score BETWEEN 1 AND 5),
  context     text,
  order_id    uuid REFERENCES orders(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
