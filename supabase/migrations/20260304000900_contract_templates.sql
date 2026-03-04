-- ============================================
-- MIGRATION 052: Contract Templates
-- NEW: contract_templates
-- Supports both org-owned and personal-user-owned templates
-- ============================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner: either org_id OR personal_user_id must be set (enforced by constraint)
  org_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  personal_user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_type        TEXT NOT NULL CHECK (owner_type IN ('org', 'personal')),

  name              TEXT NOT NULL,
  description       TEXT,

  -- Array of content blocks: { id, type, content, metadata }
  -- type: 'heading' | 'paragraph' | 'clause' | 'divider'
  -- metadata: { clauseKey?, bold?, italic?, list? }
  blocks            JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Denormalised snapshot of {{token}} variables found in blocks (for quick display)
  variables_used    TEXT[] DEFAULT '{}',

  -- TRUE = system-provided starter template (read-only for orgs, they copy it)
  is_predefined     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,

  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at        TIMESTAMP WITH TIME ZONE,
  deleted_by        UUID REFERENCES auth.users(id),

  CONSTRAINT chk_contract_template_owner CHECK (
    (owner_type = 'org' AND org_id IS NOT NULL AND personal_user_id IS NULL)
    OR
    (owner_type = 'personal' AND personal_user_id IS NOT NULL AND org_id IS NULL)
    OR
    (is_predefined = TRUE AND org_id IS NULL AND personal_user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_org
  ON contract_templates(org_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_templates_personal
  ON contract_templates(personal_user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contract_templates_predefined
  ON contract_templates(is_predefined) WHERE is_predefined = TRUE AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS update_contract_templates_updated_at ON contract_templates;
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's templates
CREATE POLICY "Org members view contract templates"
  ON contract_templates FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Predefined templates visible to all authenticated users
      is_predefined = TRUE
      -- Org-owned: check membership
      OR (owner_type = 'org' AND EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = contract_templates.org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
      ))
      -- Personal: only the owner
      OR (owner_type = 'personal' AND personal_user_id = auth.uid())
    )
  );

-- Org admins/owners/recruiters can create templates
CREATE POLICY "Org admins insert contract templates"
  ON contract_templates FOR INSERT
  WITH CHECK (
    (owner_type = 'org' AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = contract_templates.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'recruiter')
    ))
    OR
    (owner_type = 'personal' AND personal_user_id = auth.uid())
  );

-- Org admins/owners/recruiters or personal owner can update templates
CREATE POLICY "Org admins update contract templates"
  ON contract_templates FOR UPDATE
  USING (
    is_predefined = FALSE
    AND (
      (owner_type = 'org' AND EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = contract_templates.org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
          AND om.role IN ('owner', 'admin', 'recruiter')
      ))
      OR
      (owner_type = 'personal' AND personal_user_id = auth.uid())
    )
  );

-- Same for delete
CREATE POLICY "Org admins delete contract templates"
  ON contract_templates FOR DELETE
  USING (
    is_predefined = FALSE
    AND (
      (owner_type = 'org' AND EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = contract_templates.org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
          AND om.role IN ('owner', 'admin', 'recruiter')
      ))
      OR
      (owner_type = 'personal' AND personal_user_id = auth.uid())
    )
  );

COMMENT ON TABLE contract_templates IS 'Block-based contract templates. owner_type=org for organization templates, owner_type=personal for care client templates. is_predefined=TRUE for system starter templates.';
COMMENT ON COLUMN contract_templates.blocks IS 'Array of content blocks: [{id, type, content, metadata}]. type: heading|paragraph|clause|divider.';
COMMENT ON COLUMN contract_templates.variables_used IS 'Denormalised list of {{token}} variables in the template blocks.';
