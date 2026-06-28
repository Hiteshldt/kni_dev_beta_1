-- Store the free-text review alongside the star score (shown on listing detail).
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS comment text;
