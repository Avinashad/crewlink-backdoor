-- ============================================
-- MIGRATION 4: Organizations and Job Posting System
-- ============================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_type TEXT CHECK (org_type IN ('hotel', 'restaurant', 'oldage_care')) NOT NULL,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create org_memberships table
CREATE TABLE IF NOT EXISTS org_memberships (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'recruiter')) NOT NULL DEFAULT 'recruiter',
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- Create job_templates table
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_key TEXT, -- References expertise.code
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create job_posts table
CREATE TABLE IF NOT EXISTS job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  category_key TEXT NOT NULL, -- References expertise.code
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  status TEXT CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country_code);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON org_memberships(status);

CREATE INDEX IF NOT EXISTS idx_job_templates_org_id ON job_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_job_templates_category ON job_templates(category_key);
CREATE INDEX IF NOT EXISTS idx_job_templates_deleted_at ON job_templates(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_posts_org_id ON job_posts(org_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_country ON job_posts(country_code);
CREATE INDEX IF NOT EXISTS idx_job_posts_category ON job_posts(category_key);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_published ON job_posts(status, published_at) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_posts_deleted_at ON job_posts(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_templates_updated_at ON job_templates;
CREATE TRIGGER update_job_templates_updated_at BEFORE UPDATE ON job_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_posts_updated_at ON job_posts;
CREATE TRIGGER update_job_posts_updated_at BEFORE UPDATE ON job_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = organizations.id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
    OR created_by = auth.uid()
  );

-- Users can create organizations
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update organizations they own or are owners of
CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = organizations.id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.role = 'owner'
      AND org_memberships.status = 'active'
    )
  );

-- RLS Policies for org_memberships
CREATE POLICY "Users can view memberships in their organizations"
  ON org_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_memberships.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Owners can manage memberships
CREATE POLICY "Owners can manage memberships"
  ON org_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_memberships.org_id
      AND om.user_id = auth.uid()
      AND om.role = 'owner'
      AND om.status = 'active'
    )
  );

-- RLS Policies for job_templates
CREATE POLICY "Users can view templates in their organizations"
  ON job_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_templates.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Org members can create templates"
  ON job_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_templates.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org members can update templates"
  ON job_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_templates.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
    AND deleted_at IS NULL
  );

-- RLS Policies for job_posts
-- Published jobs are viewable by everyone (for job browsing)
CREATE POLICY "Published jobs are public"
  ON job_posts FOR SELECT
  USING (
    status = 'published'
    AND deleted_at IS NULL
  );

-- Org members can view all jobs in their organizations
CREATE POLICY "Org members can view their organization jobs"
  ON job_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_posts.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Org members can create job posts"
  ON job_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_posts.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
  );

CREATE POLICY "Org members can update job posts"
  ON job_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_memberships.org_id = job_posts.org_id
      AND org_memberships.user_id = auth.uid()
      AND org_memberships.status = 'active'
    )
    AND deleted_at IS NULL
  );

-- ============================================
-- Migration Complete!
-- ============================================
