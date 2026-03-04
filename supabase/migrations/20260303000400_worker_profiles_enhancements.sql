-- ============================================
-- MIGRATION 028: Enhance worker_profiles
-- ADD: hourly_rate_min, hourly_rate_max, is_available, availability_note
-- ============================================

ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate_min   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hourly_rate_max   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_available      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS availability_note TEXT;

COMMENT ON COLUMN worker_profiles.hourly_rate_min   IS 'Minimum acceptable hourly rate (worker preference)';
COMMENT ON COLUMN worker_profiles.hourly_rate_max   IS 'Maximum hourly rate worker is willing to work for';
COMMENT ON COLUMN worker_profiles.is_available      IS 'Quick toggle: is the worker currently available for work?';
COMMENT ON COLUMN worker_profiles.availability_note IS 'Free-text note about availability (e.g. "Weekdays only after 2pm")';
