-- ============================================
-- MIGRATION 8: Personal Profiles, References, and Client Moderation
-- ============================================

-- Personal profiles separate auth identity from richer worker/client details.
CREATE TABLE IF NOT EXISTS personal_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic personal info (can be extended over time)
  display_name TEXT,
  date_of_birth DATE,
  country_code TEXT,
  city TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  -- Worker-facing fields
  worker_bio TEXT,
  worker_experience_years INTEGER,
  -- Client-facing fields
  client_notes TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_profiles_user_id ON personal_profiles(user_id);

DROP TRIGGER IF EXISTS update_personal_profiles_updated_at ON personal_profiles;
CREATE TRIGGER update_personal_profiles_updated_at BEFORE UPDATE ON personal_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reference requests for workers or clients.
CREATE TABLE IF NOT EXISTS reference_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- person being referenced
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL, -- optional org context
  requested_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'completed', 'rejected')) DEFAULT 'pending',
  relationship TEXT, -- how the referee knows the user
  questions JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reference_requests_user_id ON reference_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_requests_org_id ON reference_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_reference_requests_status ON reference_requests(status);

DROP TRIGGER IF EXISTS update_reference_requests_updated_at ON reference_requests;
CREATE TRIGGER update_reference_requests_updated_at BEFORE UPDATE ON reference_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Concrete references provided in response to requests.
CREATE TABLE IF NOT EXISTS user_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_request_id UUID REFERENCES reference_requests(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- person being referenced
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  provided_by_name TEXT NOT NULL,
  provided_by_contact TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_references_user_id ON user_references(user_id);
CREATE INDEX IF NOT EXISTS idx_user_references_org_id ON user_references(organization_id);

DROP TRIGGER IF EXISTS update_user_references_updated_at ON user_references;
CREATE TRIGGER update_user_references_updated_at BEFORE UPDATE ON user_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Client moderation records track approvals, flags, and blocks at org level.
CREATE TABLE IF NOT EXISTS client_moderation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- client user
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  decision TEXT CHECK (decision IN ('approved', 'blocked', 'flagged')) NOT NULL,
  reason TEXT,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_moderation_user_id ON client_moderation_records(user_id);
CREATE INDEX IF NOT EXISTS idx_client_moderation_org_id ON client_moderation_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_moderation_decision ON client_moderation_records(decision);

-- Enable Row Level Security
ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_moderation_records ENABLE ROW LEVEL SECURITY;

-- RLS for personal_profiles:
-- Users can view and manage their own personal profile.
CREATE POLICY "Users can view their own personal profile"
  ON personal_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert their own personal profile"
  ON personal_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own personal profile"
  ON personal_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- RLS for reference_requests:
-- Org members (active) and the subject user can view relevant requests.
CREATE POLICY "Subject user can view their reference requests"
  ON reference_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view reference requests for their organization"
  ON reference_requests FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = reference_requests.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- Only org members or platform admins (via service role) should create requests; enforce org membership.
CREATE POLICY "Org members can create reference requests"
  ON reference_requests FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = reference_requests.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- RLS for user_references:
-- Subject user can view references about themselves; org members can view for their org.
CREATE POLICY "Subject user can view their references"
  ON user_references FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view references in their organization"
  ON user_references FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = user_references.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- Public submission of references is handled via service role or edge function; no direct INSERT RLS policy here.

-- RLS for client_moderation_records:
-- Only org members (typically admins/owners, enforced at service level) can see moderation for their org.
CREATE POLICY "Org members can view client moderation records for their organization"
  ON client_moderation_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = client_moderation_records.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

-- Creation of moderation records will be done via backend with service role; no direct INSERT policy is defined.

-- ============================================
-- Migration Complete!
-- ============================================

