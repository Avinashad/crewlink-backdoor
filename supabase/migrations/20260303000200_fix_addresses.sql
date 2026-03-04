-- ============================================
-- MIGRATION 026: Fix addresses table
-- Backfill address_line1 from street_address (unit + street_address)
-- Backfill address_line2 from suburb/province
-- DROP legacy columns: street_address, suburb, province, unit
-- ADD generated formatted_address column
-- ============================================

-- Backfill address_line1 from legacy columns where not already set
UPDATE addresses
SET address_line1 = TRIM(
  COALESCE(unit || ' ', '') ||
  COALESCE(street_address, '')
)
WHERE address_line1 IS NULL
  AND (street_address IS NOT NULL OR unit IS NOT NULL);

-- Backfill address_line2 from suburb/province where not already set
UPDATE addresses
SET address_line2 = TRIM(
  COALESCE(suburb, '') ||
  CASE WHEN suburb IS NOT NULL AND province IS NOT NULL THEN ', ' ELSE '' END ||
  COALESCE(province, '')
)
WHERE address_line2 IS NULL
  AND (suburb IS NOT NULL OR province IS NOT NULL);

-- Drop legacy columns
ALTER TABLE addresses DROP COLUMN IF EXISTS street_address;
ALTER TABLE addresses DROP COLUMN IF EXISTS suburb;
ALTER TABLE addresses DROP COLUMN IF EXISTS province;
ALTER TABLE addresses DROP COLUMN IF EXISTS unit;

-- Add formatted_address as a generated stored column
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS formatted_address TEXT
  GENERATED ALWAYS AS (
    TRIM(
      COALESCE(address_line1 || ', ', '') ||
      COALESCE(address_line2 || ', ', '') ||
      COALESCE(city || ', ', '') ||
      COALESCE(state || ', ', '') ||
      COALESCE(postal_code || ' ', '') ||
      COALESCE(country_code, '')
    )
  ) STORED;

COMMENT ON COLUMN addresses.formatted_address IS 'Auto-generated full address string for display purposes';
COMMENT ON COLUMN addresses.address_line1 IS 'Primary street address (e.g. "12 Example St" or "Unit 3, 12 Example St")';
COMMENT ON COLUMN addresses.address_line2 IS 'Secondary line (suburb, building name, etc.)';
