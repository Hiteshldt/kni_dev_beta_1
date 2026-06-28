-- Admin-managed catalog hierarchy: Categories (e.g. "Onion") → produce_catalog
-- items/types inside them. Categories carry an image + vernacular name; the
-- per-listing photo still comes from the seller.
CREATE TABLE IF NOT EXISTS categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        jsonb NOT NULL,                 -- {"en":..,"ta":..,"ml":..}
  image_url   text,
  sort_order  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE produce_catalog
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE produce_catalog
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
