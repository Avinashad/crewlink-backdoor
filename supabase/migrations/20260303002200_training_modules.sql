-- ============================================
-- MIGRATION 046: Training Modules
-- NEW: training_modules table
-- ============================================

CREATE TABLE IF NOT EXISTS training_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  -- NULL org_id = platform-wide module (created by admins)
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  -- Validity: NULL = never expires; N = expires after N days
  validity_days   INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  is_platform     BOOLEAN DEFAULT FALSE,
  -- is_platform=TRUE means created by platform admins, available to all orgs
  thumbnail_url   TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_modules_org     ON training_modules(org_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_active  ON training_modules(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_training_modules_platform ON training_modules(is_platform) WHERE is_platform = TRUE;

-- Trigger
DROP TRIGGER IF EXISTS update_training_modules_updated_at ON training_modules;
CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

-- Platform modules are visible to all authenticated users
CREATE POLICY "Platform modules visible to all"
  ON training_modules FOR SELECT
  USING (is_platform = TRUE AND is_active = TRUE);

-- Org members can view their org's modules
CREATE POLICY "Org members can view their modules"
  ON training_modules FOR SELECT
  USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = training_modules.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Org owners/admins can create and manage modules
CREATE POLICY "Org admins can manage modules"
  ON training_modules FOR ALL
  USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = training_modules.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE training_modules IS 'Pre-employment training and compliance module definitions. Can be org-specific or platform-wide.';
COMMENT ON COLUMN training_modules.validity_days IS 'NULL = completed forever; N = completion expires after N days and must be redone';
COMMENT ON COLUMN training_modules.is_platform   IS 'TRUE = created by platform admins, available to all organisations';
