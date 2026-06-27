-- Platform settings (single row) — admin-controlled knobs.
-- auto_approve: when on, new listings skip the review queue and go live with the
-- default margin/fee applied automatically.
CREATE TABLE IF NOT EXISTS platform_settings (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auto_approve       boolean NOT NULL DEFAULT false,
  default_margin_pct numeric(5,2) NOT NULL DEFAULT 10,
  default_flat_fee   numeric(12,2) NOT NULL DEFAULT 0,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
