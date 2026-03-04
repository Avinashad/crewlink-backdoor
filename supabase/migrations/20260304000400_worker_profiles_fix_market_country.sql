-- ============================================
-- MIGRATION: Fix worker_profiles.market_country NOT NULL constraint
-- The new worker onboarding flow no longer collects market_country.
-- Personal profile users adding a worker profile would hit a NOT NULL
-- violation when inserting a new worker_profiles row.
-- Fix: make the column nullable and set a default of 'NZ'.
-- ============================================

ALTER TABLE worker_profiles
  ALTER COLUMN market_country DROP NOT NULL,
  ALTER COLUMN market_country SET DEFAULT 'NZ';

COMMENT ON COLUMN worker_profiles.market_country IS
  'Market country for the worker (NP=Nepal, NZ=New Zealand). Nullable; defaults to NZ. Legacy field — country context is now inferred from user profile.';
