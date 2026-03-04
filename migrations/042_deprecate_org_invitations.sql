-- ============================================
-- MIGRATION 042: Deprecate org_invitations table
-- org_reference_codes is the canonical invite system.
-- org_invitations is legacy — add deprecation comment, plan eventual DROP.
-- ============================================

-- Mark the table as deprecated
COMMENT ON TABLE org_invitations IS
'DEPRECATED: Use org_reference_codes instead. This table will be dropped in a future migration once all clients have migrated.';

-- Add a deprecated_at timestamp column to signal when the table was deprecated
ALTER TABLE org_invitations
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update all existing rows to mark as deprecated
UPDATE org_invitations SET deprecated_at = NOW() WHERE deprecated_at IS NULL;
