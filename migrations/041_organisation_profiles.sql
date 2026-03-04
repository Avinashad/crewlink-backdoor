-- ============================================
-- MIGRATION 041: Organisation Profiles Bridge Table
-- Links "User X has an org-mode profile for Org Y"
-- Distinct from org_memberships (staff role) — this is about profile ownership/switching
-- ============================================

CREATE TABLE IF NOT EXISTS organisation_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name    TEXT,
  profile_image_url TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_profiles_user ON organisation_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_org_profiles_org ON organisation_profiles(org_id);

-- Trigger
DROP TRIGGER IF EXISTS update_organisation_profiles_updated_at ON organisation_profiles;
CREATE TRIGGER update_organisation_profiles_updated_at
  BEFORE UPDATE ON organisation_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE organisation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org profiles"
  ON organisation_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own org profiles"
  ON organisation_profiles FOR ALL
  USING (user_id = auth.uid());

-- Org members can view profiles for their org
CREATE POLICY "Org members can view org profiles"
  ON organisation_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = organisation_profiles.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

COMMENT ON TABLE organisation_profiles IS 'Lightweight bridge: User X has an org-mode profile for Org Y. Distinct from org_memberships (staff role). Used for profile switching.';
