-- ============================================
-- MIGRATION 040: Guardian Relationships
-- NEW: guardian_relationships table + is_guardian_of() RLS helper
-- ============================================

CREATE TABLE IF NOT EXISTS guardian_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            UUID REFERENCES organizations(id) ON DELETE SET NULL,
  -- Status lifecycle: pending → approved | rejected
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  relationship_type TEXT,  -- e.g. 'parent', 'spouse', 'sibling', 'friend', 'carer'
  notes             TEXT,
  approved_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (guardian_user_id, client_user_id, org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guardian_guardian ON guardian_relationships(guardian_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_client ON guardian_relationships(client_user_id);
CREATE INDEX IF NOT EXISTS idx_guardian_org ON guardian_relationships(org_id);
CREATE INDEX IF NOT EXISTS idx_guardian_status ON guardian_relationships(status);

-- Trigger
DROP TRIGGER IF EXISTS update_guardian_relationships_updated_at ON guardian_relationships;
CREATE TRIGGER update_guardian_relationships_updated_at
  BEFORE UPDATE ON guardian_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS helper function
CREATE OR REPLACE FUNCTION is_guardian_of(_client_user_id UUID, _org_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM guardian_relationships gr
    WHERE gr.guardian_user_id = auth.uid()
      AND gr.client_user_id   = _client_user_id
      AND gr.status           = 'approved'
      AND (
        _org_id IS NULL
        OR gr.org_id IS NULL
        OR gr.org_id = _org_id
      )
  );
$$;

COMMENT ON FUNCTION is_guardian_of IS
'Returns TRUE if the current authenticated user is an approved guardian of _client_user_id (optionally within _org_id context).';

-- RLS
ALTER TABLE guardian_relationships ENABLE ROW LEVEL SECURITY;

-- Guardians can see their own relationships
CREATE POLICY "Guardians can view their own relationships"
  ON guardian_relationships FOR SELECT
  USING (guardian_user_id = auth.uid() OR client_user_id = auth.uid());

-- Guardians can create relationship requests
CREATE POLICY "Anyone can request a guardian relationship"
  ON guardian_relationships FOR INSERT
  WITH CHECK (guardian_user_id = auth.uid());

-- Org members can view and approve guardian relationships for their org
CREATE POLICY "Org members can view guardian relationships"
  ON guardian_relationships FOR SELECT
  USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = guardian_relationships.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can update guardian relationship status"
  ON guardian_relationships FOR UPDATE
  USING (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = guardian_relationships.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE guardian_relationships IS 'Links guardian/family users to client users within an org context. Approved guardians can view client care activities.';
