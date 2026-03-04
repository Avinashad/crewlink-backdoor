-- MIGRATION: Rename platform_fee_tiers hours columns to workers
-- Fee tiers are based on number of workers needed, not hours.

ALTER TABLE platform_fee_tiers RENAME COLUMN min_hours TO min_workers;
ALTER TABLE platform_fee_tiers RENAME COLUMN max_hours TO max_workers;

-- Change type from NUMERIC(10,2) to INTEGER (workers are whole numbers)
ALTER TABLE platform_fee_tiers ALTER COLUMN min_workers TYPE INTEGER USING min_workers::INTEGER;
ALTER TABLE platform_fee_tiers ALTER COLUMN max_workers TYPE INTEGER USING max_workers::INTEGER;

-- Update comments
COMMENT ON TABLE platform_fee_tiers IS 'Tiered platform fee percentages based on number of workers needed';
COMMENT ON COLUMN platform_fee_tiers.min_workers IS 'Lower bound of workers for this tier (inclusive)';
COMMENT ON COLUMN platform_fee_tiers.max_workers IS 'Upper bound of workers (exclusive). NULL means unlimited.';

-- Update seed data to use worker-count-based tiers
UPDATE platform_fee_tiers SET min_workers = 1,  max_workers = 10  WHERE name = 'Standard';
UPDATE platform_fee_tiers SET min_workers = 10, max_workers = 50  WHERE name = 'Volume';
UPDATE platform_fee_tiers SET min_workers = 50, max_workers = NULL WHERE name = 'Enterprise';
