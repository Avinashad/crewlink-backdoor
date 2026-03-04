-- ============================================
-- MIGRATION 031: Fix profile_onboarding
-- ADD profile_type column
-- Change UNIQUE from (user_id) to (user_id, profile_type)
-- ADD current_step, completed_steps
-- ============================================

-- Add profile_type column (default 'worker' for existing rows)
ALTER TABLE profile_onboarding
  ADD COLUMN IF NOT EXISTS profile_type TEXT
  CHECK (profile_type IN ('worker', 'personal', 'organisation'))
  DEFAULT 'worker';

-- Update existing NULL rows
UPDATE profile_onboarding SET profile_type = 'worker' WHERE profile_type IS NULL;

-- Make NOT NULL
ALTER TABLE profile_onboarding ALTER COLUMN profile_type SET NOT NULL;

-- Drop old unique constraint (user_id alone)
ALTER TABLE profile_onboarding DROP CONSTRAINT IF EXISTS profile_onboarding_user_id_key;

-- Add new composite unique constraint
ALTER TABLE profile_onboarding
  ADD CONSTRAINT profile_onboarding_user_profile_type_key
  UNIQUE (user_id, profile_type);

-- Add progress tracking columns
ALTER TABLE profile_onboarding
  ADD COLUMN IF NOT EXISTS current_step    INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS completed_steps INTEGER[] DEFAULT '{}';

-- Index on profile_type
CREATE INDEX IF NOT EXISTS idx_profile_onboarding_profile_type
  ON profile_onboarding(profile_type);

COMMENT ON COLUMN profile_onboarding.profile_type     IS 'Which profile type this onboarding relates to: worker, personal, or organisation';
COMMENT ON COLUMN profile_onboarding.current_step     IS 'The step the user is currently on (1-based index)';
COMMENT ON COLUMN profile_onboarding.completed_steps  IS 'Array of completed step numbers';
COMMENT ON TABLE  profile_onboarding                  IS 'Tracks onboarding progress per user per profile type. One row per (user_id, profile_type) pair.';
