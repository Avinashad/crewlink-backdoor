-- ============================================
-- MIGRATION 044: Drop services JSONB arrays
-- PREREQUISITE: Migration 034 must be run AND all backend code updated.
-- ============================================

ALTER TABLE services DROP COLUMN IF EXISTS expertise_codes;
ALTER TABLE services DROP COLUMN IF EXISTS country_codes;

COMMENT ON TABLE services IS
'Services reference data. Expertise and country associations are in service_expertise and service_countries junction tables.';
