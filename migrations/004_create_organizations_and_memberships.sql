-- ============================================
-- MIGRATION 4: Organizations, Memberships, and Invitations
-- ============================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  description TEXT,
  created_by UUID NOT NULL, -- References auth.users(id) from Supabase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT organizations_name_type_unique UNIQUE (name, type)
);

-- Create org_memberships table
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References auth.users(id) from Supabase
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID, -- References auth.users(id) from Supabase
  PRIMARY KEY (organization_id, user_id)
);

-- Create org_invitations table with invite codes
CREATE TABLE IF NOT EXISTS org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invite_code VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255), -- Optional: specific email invitation
  role VARCHAR(50) DEFAULT 'member', -- Role to assign when accepted
  created_by UUID NOT NULL, -- References auth.users(id) from Supabase
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 1, -- How many times this code can be used
  uses_count INTEGER DEFAULT 0, -- How many times it's been used
  is_active BOOLEAN DEFAULT TRUE,
  accepted_by UUID, -- References auth.users(id) from Supabase (for single-use invitations)
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON org_memberships(role);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON org_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_code ON org_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON org_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_active ON org_invitations(is_active);

-- Create updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_invitations_updated_at BEFORE UPDATE ON org_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    code := '';
    FOR i IN 1..8 LOOP
      code := code || SUBSTRING(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM org_invitations WHERE invite_code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Users can view organizations they are members of
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.organization_id = organizations.id
      AND org_memberships.user_id = auth.uid()
    )
  );

-- Organization owners/admins can update their organizations
CREATE POLICY "Organization owners/admins can update"
  ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.organization_id = organizations.id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for org_memberships
-- Users can view memberships in organizations they belong to
CREATE POLICY "Users can view memberships in their organizations"
  ON org_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.organization_id = org_memberships.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Organization owners/admins can manage memberships
CREATE POLICY "Organization owners/admins can manage memberships"
  ON org_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.organization_id = org_memberships.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for org_invitations
-- Users can view invitations for organizations they belong to (as admin/owner)
CREATE POLICY "Organization admins can view invitations"
  ON org_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.organization_id = org_invitations.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can create invitations
CREATE POLICY "Organization owners/admins can create invitations"
  ON org_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.organization_id = org_invitations.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Organization owners/admins can update/delete invitations
CREATE POLICY "Organization owners/admins can manage invitations"
  ON org_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.organization_id = org_invitations.organization_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role IN ('owner', 'admin')
    )
  );

-- Anyone can view active invitations by invite code (for joining)
CREATE POLICY "Anyone can view active invitations by code"
  ON org_invitations FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
