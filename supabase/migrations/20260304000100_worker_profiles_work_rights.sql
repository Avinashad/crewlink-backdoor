-- ============================================
-- MIGRATION 051: Worker profiles — Work Rights
-- ADD visa_type, weekly_hours_limit, is_holiday_mode,
--     holiday_start_date, holiday_expiry_date
-- ============================================

ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS visa_type TEXT
    CHECK (visa_type IN (
      'nz_citizen',
      'permanent_resident',
      'student_visa',
      'open_work_visa',
      'employer_sponsored',
      'holiday_visa',
      'other'
    )),
  ADD COLUMN IF NOT EXISTS weekly_hours_limit INTEGER,
  ADD COLUMN IF NOT EXISTS is_holiday_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_start_date DATE,
  ADD COLUMN IF NOT EXISTS holiday_expiry_date DATE;

COMMENT ON COLUMN worker_profiles.visa_type IS 'NZ visa/residency type that determines work eligibility';
COMMENT ON COLUMN worker_profiles.weekly_hours_limit IS 'Max hours per week allowed by visa (e.g. 20 for student visa)';
COMMENT ON COLUMN worker_profiles.is_holiday_mode IS 'True when student visa holder is in a holiday period and can work full-time';
COMMENT ON COLUMN worker_profiles.holiday_start_date IS 'Start date of the student holiday period';
COMMENT ON COLUMN worker_profiles.holiday_expiry_date IS 'End date of the student holiday period — application layer resets is_holiday_mode when this date passes';

-- Auto-reset holiday mode via a function the service calls after reading
-- NOTE: Real-time expiry is handled in the backend service (mapRow) and via
-- a periodic Supabase Edge Function or pg_cron job if needed.
