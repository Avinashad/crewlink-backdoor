-- ============================================
-- MIGRATION: Make org_type_code nullable
-- Allows organisations to be created without a type (set during onboarding)
-- ============================================

ALTER TABLE organizations
  ALTER COLUMN org_type_code DROP NOT NULL;

COMMENT ON COLUMN organizations.org_type_code IS
  'FK to organisation_types.code. Nullable — set during onboarding.';
