-- ============================================
-- MIGRATION: Fix organizations table schema
-- ADD description column (was missing from original migration)
-- Make country_code nullable (not required at org creation time)
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE organizations
  ALTER COLUMN country_code DROP NOT NULL;

COMMENT ON COLUMN organizations.description IS 'Optional description of the organisation';
COMMENT ON COLUMN organizations.country_code IS 'Primary country of operation (nullable — can be set during onboarding)';
