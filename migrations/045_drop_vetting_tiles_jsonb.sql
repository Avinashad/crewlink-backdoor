-- ============================================
-- MIGRATION 045: Drop vetting_tiles JSONB arrays
-- PREREQUISITE: Migration 035 must be run AND all backend code updated.
-- ============================================

ALTER TABLE vetting_tiles DROP COLUMN IF EXISTS expertise_codes;
ALTER TABLE vetting_tiles DROP COLUMN IF EXISTS country_codes;

COMMENT ON TABLE vetting_tiles IS
'Vetting tile reference data. Expertise and country associations are in vetting_tile_expertise and vetting_tile_countries junction tables.';
