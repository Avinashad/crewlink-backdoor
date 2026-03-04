-- ============================================
-- MIGRATION 025: Fix personal_profiles table
-- DROP worker_bio, worker_experience_years (these belong in worker_profiles)
-- RENAME client_notes → care_notes
-- ============================================

-- Drop legacy worker columns (they live in worker_profiles)
ALTER TABLE personal_profiles DROP COLUMN IF EXISTS worker_bio;
ALTER TABLE personal_profiles DROP COLUMN IF EXISTS worker_experience_years;

-- Rename client_notes to care_notes (clearer terminology)
ALTER TABLE personal_profiles RENAME COLUMN client_notes TO care_notes;

-- Add profile_image_url if not already present
ALTER TABLE personal_profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

COMMENT ON COLUMN personal_profiles.care_notes IS 'Notes about care arrangements for personal/guardian profile';
COMMENT ON TABLE personal_profiles IS 'Personal profile for workers and care clients. Worker bio and experience live in worker_profiles.';
