-- ============================================
-- Migration 13: Contact Information table
-- Types: emergency, guardian (personal); organisation_contact (organisation, requires organisation_id)
-- ============================================

CREATE TABLE IF NOT EXISTS contact_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('emergency', 'guardian', 'organisation_contact')),
  -- Personal contacts: owned by user_id; organisation_contact: linked to organisation_id
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  -- Contact details
  name TEXT,
  phone TEXT,
  email TEXT,
  relationship TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Constraints: personal types require user_id and no org; organisation_contact requires organisation_id
  CONSTRAINT chk_contact_ownership CHECK (
    (type IN ('emergency', 'guardian') AND user_id IS NOT NULL AND organisation_id IS NULL)
    OR
    (type = 'organisation_contact' AND organisation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_contact_information_user_id ON contact_information(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_information_organisation_id ON contact_information(organisation_id);
CREATE INDEX IF NOT EXISTS idx_contact_information_type ON contact_information(type);

DROP TRIGGER IF EXISTS update_contact_information_updated_at ON contact_information;
CREATE TRIGGER update_contact_information_updated_at
  BEFORE UPDATE ON contact_information
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE contact_information ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view and manage their own personal contacts (emergency, guardian).
CREATE POLICY "Users can view their own personal contacts"
  ON contact_information FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own personal contacts"
  ON contact_information FOR INSERT
  WITH CHECK (user_id = auth.uid() AND type IN ('emergency', 'guardian') AND organisation_id IS NULL);

CREATE POLICY "Users can update their own personal contacts"
  ON contact_information FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own personal contacts"
  ON contact_information FOR DELETE
  USING (user_id = auth.uid());

-- RLS: Org members can view and manage organisation_contact rows for their organisation.
CREATE POLICY "Org members can view organisation contacts"
  ON contact_information FOR SELECT
  USING (
    type = 'organisation_contact'
    AND organisation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = contact_information.organisation_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org members can insert organisation contacts"
  ON contact_information FOR INSERT
  WITH CHECK (
    type = 'organisation_contact'
    AND organisation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = contact_information.organisation_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org members can update organisation contacts"
  ON contact_information FOR UPDATE
  USING (
    type = 'organisation_contact'
    AND organisation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = contact_information.organisation_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org members can delete organisation contacts"
  ON contact_information FOR DELETE
  USING (
    type = 'organisation_contact'
    AND organisation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = contact_information.organisation_id
        AND org_memberships.user_id = auth.uid()
        AND org_memberships.status = 'active'
    )
  );

-- ============================================
-- Migration Complete
-- ============================================
