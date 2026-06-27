-- Phase 2 (batch pickup): multi-stop consolidation + route optimization.

-- A batch is a driver's multi-shipment run, holding the optimized route + schedule.
CREATE TABLE IF NOT EXISTS batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid NOT NULL REFERENCES users(id),
  status        text NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning','accepted','in_progress','completed','cancelled')),
  scheduled_for date,
  started_at    timestamptz,
  completed_at  timestamptz,
  route_plan    jsonb,           -- [{stop_idx, shipment_id, order_id, pickup_lat, pickup_lng, drop_lat, drop_lng, ...}]
  total_km      numeric(10,2),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batches_driver ON batches(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_scheduled ON batches(scheduled_for);

-- Link shipments to batches (batches are multi-shipment runs; direct goes direct via shipment only).
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

-- Scoring/metrics for batch efficiency (computed at route planning time, stored for analytics).
CREATE TABLE IF NOT EXISTS batch_metrics (
  batch_id      uuid PRIMARY KEY REFERENCES batches(id) ON DELETE CASCADE,
  weight_kg     numeric(12,2),
  distance_km   numeric(10,2),
  num_stops     int,
  est_earnings  numeric(14,2),
  utilization   numeric(5,2)     -- % of driver capacity used
);
