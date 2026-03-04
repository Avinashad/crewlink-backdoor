-- MIGRATION: Platform Fee Tiers
-- Tiered platform fee percentages based on total hours booked.
-- Separate employer and worker fee percentages per tier.

CREATE TABLE IF NOT EXISTS platform_fee_tiers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  min_hours            NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_hours            NUMERIC(10,2),  -- NULL = unlimited (top tier)
  employer_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  worker_fee_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platform_fee_tiers_updated_at ON platform_fee_tiers;
CREATE TRIGGER update_platform_fee_tiers_updated_at
  BEFORE UPDATE ON platform_fee_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: everyone can read active tiers (needed for budget preview)
ALTER TABLE platform_fee_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fee tiers"
  ON platform_fee_tiers FOR SELECT
  USING (is_active = TRUE);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_fee_tiers_active
  ON platform_fee_tiers(is_active, sort_order);

COMMENT ON TABLE platform_fee_tiers IS 'Tiered platform fee percentages based on total hours booked';
COMMENT ON COLUMN platform_fee_tiers.min_hours IS 'Lower bound of hours for this tier (inclusive)';
COMMENT ON COLUMN platform_fee_tiers.max_hours IS 'Upper bound of hours (exclusive). NULL means unlimited.';
COMMENT ON COLUMN platform_fee_tiers.employer_fee_percent IS 'Platform fee charged to the employer (e.g. 12.00 = 12%)';
COMMENT ON COLUMN platform_fee_tiers.worker_fee_percent IS 'Platform fee charged to the worker (e.g. 5.00 = 5%)';

-- Seed initial tiers
INSERT INTO platform_fee_tiers (name, min_hours, max_hours, employer_fee_percent, worker_fee_percent, sort_order)
VALUES
  ('Standard',   0,    40,   12.00, 5.00, 1),
  ('Volume',     40,   160,  10.00, 4.00, 2),
  ('Enterprise', 160,  NULL, 8.00,  3.00, 3);
