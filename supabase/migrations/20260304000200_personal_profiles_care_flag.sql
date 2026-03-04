-- ============================================
-- MIGRATION 052: Personal profiles — Care flag
-- ADD is_care_profile to distinguish care-seeking
-- clients from general personal profile users
-- ============================================

ALTER TABLE personal_profiles
  ADD COLUMN IF NOT EXISTS is_care_profile BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN personal_profiles.is_care_profile IS 'True if this personal profile was created for care support purposes. Unlocks care-specific fields (care preferences, medical info, guardian relationship).';
