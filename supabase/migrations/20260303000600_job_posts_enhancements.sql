-- ============================================
-- MIGRATION 030: Enhance job_posts
-- ADD: start_date, end_date, workers_needed, pay_rate, pay_rate_type, is_recurring
-- Extend status CHECK to include 'filled'
-- ============================================

ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS start_date     DATE,
  ADD COLUMN IF NOT EXISTS end_date       DATE,
  ADD COLUMN IF NOT EXISTS workers_needed INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pay_rate       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pay_rate_type  TEXT DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS is_recurring   BOOLEAN DEFAULT FALSE;

-- Add CHECK for pay_rate_type
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_pay_rate_type_check
  CHECK (pay_rate_type IN ('hourly', 'daily', 'weekly', 'fixed'));

-- Extend status CHECK (drop old, add new)
ALTER TABLE job_posts DROP CONSTRAINT IF EXISTS job_posts_status_check;
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_status_check
  CHECK (status IN ('draft', 'published', 'closed', 'filled'));

COMMENT ON COLUMN job_posts.start_date     IS 'When the job / engagement is expected to start';
COMMENT ON COLUMN job_posts.end_date       IS 'When the job ends (NULL = ongoing or until filled)';
COMMENT ON COLUMN job_posts.workers_needed IS 'Number of workers required for this job post';
COMMENT ON COLUMN job_posts.pay_rate       IS 'Advertised pay rate';
COMMENT ON COLUMN job_posts.pay_rate_type  IS 'Rate type: hourly, daily, weekly, or fixed';
COMMENT ON COLUMN job_posts.is_recurring   IS 'True if this job repeats on a schedule (shifts will be created)';
