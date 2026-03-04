-- ============================================
-- MIGRATION 050: Module Item Responses + worker_module_completions VIEW
-- NEW: module_item_responses table
-- Stores worker answers/confirmations per item per invitation
-- Depends on: migration 049 (module_invitations), 047 (training_module_items)
-- ============================================

CREATE TABLE IF NOT EXISTS module_item_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id       UUID NOT NULL REFERENCES module_invitations(id) ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES training_module_items(id) ON DELETE CASCADE,
  worker_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Response payload (type-specific):
  -- video:       { watched: true, watched_at: "ISO" }
  -- quiz:        { answers: [{question_id, selected_option_id}], score, passed }
  -- document:    { acknowledged: true, acknowledged_at: "ISO", downloaded: false }
  -- declaration: { field_values: {key: value}, signature_data: "base64|null", signed_at: "ISO" }
  response            JSONB NOT NULL DEFAULT '{}'::jsonb,
  score               NUMERIC(5,2),
  passed              BOOLEAN,
  completed_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (invitation_id, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mir_invitation ON module_item_responses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_mir_item       ON module_item_responses(item_id);
CREATE INDEX IF NOT EXISTS idx_mir_worker     ON module_item_responses(worker_user_id);

-- Worker Module Completions view
-- Shows per-worker per-module completion status across all invitations
CREATE OR REPLACE VIEW worker_module_completions AS
SELECT
  mi.worker_user_id,
  mi.module_id,
  mi.id                            AS invitation_id,
  mi.job_application_id,
  mi.org_id,
  mi.status                        AS invitation_status,
  mi.deadline_at,
  mi.completed_at,
  mi.passed,
  mi.score,
  -- is_valid: completed and not expired (based on module validity_days)
  CASE
    WHEN mi.status = 'completed'
     AND mi.completed_at IS NOT NULL
     AND (
       tm.validity_days IS NULL
       OR mi.completed_at + (tm.validity_days || ' days')::INTERVAL > NOW()
     )
    THEN TRUE
    ELSE FALSE
  END                              AS is_valid,
  -- Days remaining before completion expires
  CASE
    WHEN mi.status = 'completed' AND tm.validity_days IS NOT NULL
    THEN EXTRACT(DAY FROM (mi.completed_at + (tm.validity_days || ' days')::INTERVAL - NOW()))::INTEGER
    ELSE NULL
  END                              AS days_until_expiry,
  tm.title                         AS module_title,
  tm.validity_days
FROM module_invitations mi
JOIN training_modules tm ON tm.id = mi.module_id;

-- RLS
ALTER TABLE module_item_responses ENABLE ROW LEVEL SECURITY;

-- Workers can view and insert their own responses
CREATE POLICY "Workers can manage their own item responses"
  ON module_item_responses FOR ALL
  USING (worker_user_id = auth.uid());

-- Org members can view responses for their invitations
CREATE POLICY "Org members can view module item responses"
  ON module_item_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM module_invitations mi
      JOIN org_memberships om ON om.org_id = mi.org_id
      WHERE mi.id = module_item_responses.invitation_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

COMMENT ON TABLE module_item_responses IS 'Worker responses/completions for individual training module items within an invitation.';
COMMENT ON VIEW  worker_module_completions IS 'Per-worker per-module completion summary. is_valid=TRUE means completed and not expired.';
COMMENT ON COLUMN module_item_responses.response IS
'Type-specific response payload:
  video:       { watched: bool, watched_at: ISO }
  quiz:        { answers: [{question_id, selected_option_id}], score, passed }
  document:    { acknowledged: bool, downloaded: bool, acknowledged_at: ISO }
  declaration: { field_values: {key:val}, signature_data: "base64|null", signed_at: ISO }';
