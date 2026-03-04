-- ============================================
-- MIGRATION 053: Organizations — Business details
-- ADD business_email, business_phone,
--     business_registration_id
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_email TEXT,
  ADD COLUMN IF NOT EXISTS business_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_registration_id TEXT;

COMMENT ON COLUMN organizations.business_email IS 'Official business contact email (separate from the creating user''s email)';
COMMENT ON COLUMN organizations.business_phone IS 'Official business phone number';
COMMENT ON COLUMN organizations.business_registration_id IS 'Business/company registration number (e.g. NZ Companies Office number)';
