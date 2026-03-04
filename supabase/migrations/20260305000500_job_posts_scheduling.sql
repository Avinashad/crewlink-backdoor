-- MIGRATION: Add job_type and scheduling columns to job_posts
-- Supports three job types: single_shift, recurring, long_term

ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS job_type              TEXT DEFAULT 'single_shift',
  ADD COLUMN IF NOT EXISTS shift_start_time      TIME,
  ADD COLUMN IF NOT EXISTS shift_end_time        TIME,
  ADD COLUMN IF NOT EXISTS break_minutes         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_days           TEXT[],
  ADD COLUMN IF NOT EXISTS hours_per_week        NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS apply_holiday_rate    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS holiday_rate_multiplier NUMERIC(3,2);

-- Add constraint for job_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_posts_job_type_check'
  ) THEN
    ALTER TABLE job_posts
      ADD CONSTRAINT job_posts_job_type_check
      CHECK (job_type IN ('single_shift', 'recurring', 'long_term'));
  END IF;
END $$;

COMMENT ON COLUMN job_posts.job_type IS 'Type of job: single_shift, recurring, or long_term';
COMMENT ON COLUMN job_posts.shift_start_time IS 'Start time for the shift (single_shift and recurring types)';
COMMENT ON COLUMN job_posts.shift_end_time IS 'End time for the shift (single_shift and recurring types)';
COMMENT ON COLUMN job_posts.break_minutes IS 'Unpaid break duration in minutes, deducted from total hours';
COMMENT ON COLUMN job_posts.active_days IS 'Recurring schedule active days array, e.g. {monday,wednesday,friday}';
COMMENT ON COLUMN job_posts.hours_per_week IS 'Expected hours per week (long_term type)';
COMMENT ON COLUMN job_posts.apply_holiday_rate IS 'Whether holiday rate multiplier should be applied to shifts on public holidays';
COMMENT ON COLUMN job_posts.holiday_rate_multiplier IS 'Holiday rate multiplier override (e.g. 1.5 for time and a half)';
