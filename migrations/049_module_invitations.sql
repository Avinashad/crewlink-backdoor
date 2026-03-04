-- ============================================
-- MIGRATION 049: Module Invitations
-- NEW: module_invitations table
-- Per-worker invitation to complete a training module (with deadline)
-- Depends on: migration 048 (job_module_requirements)
-- ============================================

CREATE TABLE IF NOT EXISTS module_invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id  UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  module_id           UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  worker_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'revoked')),
  deadline_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at          TIMESTAMP WITH TIME ZONE,
  completed_at        TIMESTAMP WITH TIME ZONE,
  -- Final score if the module has a quiz
  score               NUMERIC(5,2),
  pass_threshold      NUMERIC(5,2),
  passed              BOOLEAN,
  notes               TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One invitation per worker per module per application
  UNIQUE (job_application_id, module_id, worker_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mi_application ON module_invitations(job_application_id);
CREATE INDEX IF NOT EXISTS idx_mi_worker      ON module_invitations(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_mi_module      ON module_invitations(module_id);
CREATE INDEX IF NOT EXISTS idx_mi_status      ON module_invitations(status);
CREATE INDEX IF NOT EXISTS idx_mi_deadline    ON module_invitations(deadline_at);

-- Trigger
DROP TRIGGER IF EXISTS update_module_invitations_updated_at ON module_invitations;
CREATE TRIGGER update_module_invitations_updated_at
  BEFORE UPDATE ON module_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE module_invitations ENABLE ROW LEVEL SECURITY;

-- Workers can view their own invitations
CREATE POLICY "Workers can view their own module invitations"
  ON module_invitations FOR SELECT
  USING (worker_user_id = auth.uid());

-- Workers can update their own invitations (start, progress)
CREATE POLICY "Workers can update their own module invitations"
  ON module_invitations FOR UPDATE
  USING (worker_user_id = auth.uid());

-- Org members can view invitations for their org
CREATE POLICY "Org members can view module invitations"
  ON module_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = module_invitations.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Org recruiters+ can create and manage invitations
CREATE POLICY "Org recruiters can manage module invitations"
  ON module_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = module_invitations.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'recruiter')
    )
  );

COMMENT ON TABLE module_invitations IS 'Per-worker invitation to complete a training module, with deadline. Created when org shortlists a worker and sends modules.';
COMMENT ON COLUMN module_invitations.status IS 'Lifecycle: pending → in_progress → completed | expired | revoked';
COMMENT ON COLUMN module_invitations.passed  IS 'TRUE if worker met the pass threshold (for quiz modules); NULL for non-scored modules';
