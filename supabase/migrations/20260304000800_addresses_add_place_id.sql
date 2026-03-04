-- ============================================
-- MIGRATION 051: Add Google Places ID to addresses
-- ============================================

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS place_id TEXT;

COMMENT ON COLUMN addresses.place_id IS 'Google Places ID for geocoding reference and enrichment';
