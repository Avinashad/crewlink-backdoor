-- ============================================
-- MIGRATION 043: Drop worker_profiles.expertise_codes JSONB
-- PREREQUISITE: Migration 033 must be run AND all backend code updated
--               to write to worker_profile_expertise junction table.
-- ============================================

-- Drop the now-redundant JSONB column (data is in worker_profile_expertise)
ALTER TABLE worker_profiles DROP COLUMN IF EXISTS expertise_codes;

COMMENT ON TABLE worker_profiles IS
'Worker profile. Expertise data is now stored in worker_profile_expertise junction table.';
