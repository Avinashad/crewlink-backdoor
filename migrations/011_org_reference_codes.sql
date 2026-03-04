-- ============================================
-- MIGRATION 11: org_reference_codes (for worker/client invite by org)
-- ============================================

CREATE TABLE IF NOT EXISTS org_reference_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('worker', 'client')),
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_reference_codes_org_id ON org_reference_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_reference_codes_code ON org_reference_codes(code);
CREATE INDEX IF NOT EXISTS idx_org_reference_codes_active ON org_reference_codes(is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_org_reference_codes_updated_at ON org_reference_codes;
CREATE TRIGGER update_org_reference_codes_updated_at BEFORE UPDATE ON org_reference_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE org_reference_codes ENABLE ROW LEVEL SECURITY;

-- Org owners/admins can manage reference codes for their org
CREATE POLICY "Org members can view reference codes for their org"
  ON org_reference_codes FOR SELECT
  USING (public.is_active_org_member(org_id));

CREATE POLICY "Org owners can insert reference codes"
  ON org_reference_codes FOR INSERT
  WITH CHECK (public.is_active_org_owner(org_id));

CREATE POLICY "Org owners can update reference codes"
  ON org_reference_codes FOR UPDATE
  USING (public.is_active_org_owner(org_id));

-- Allow anyone to look up active code (for validate/claim during signup)
CREATE POLICY "Anyone can read active reference code by code"
  ON org_reference_codes FOR SELECT
  USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
