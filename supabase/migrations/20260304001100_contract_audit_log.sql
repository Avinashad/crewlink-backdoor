-- ============================================
-- MIGRATION 054: Contract Audit Log
-- NEW: contract_audit_log
-- Append-only event log for compliance and non-repudiation
-- Depends on: migration 053 (issued_contracts)
-- ============================================

CREATE TABLE IF NOT EXISTS contract_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES issued_contracts(id) ON DELETE CASCADE,

  event_type      TEXT NOT NULL,
  -- Allowed values: 'issued', 'viewed', 'signed', 'declined', 'revoked',
  --                 'pdf_generated', 'offer_expired', 'hash_verified'

  actor_user_id   UUID REFERENCES auth.users(id),
  actor_role      TEXT,
  -- 'worker', 'org_admin', 'personal_sender', 'system'

  -- Flexible metadata for the event:
  -- For 'issued': { template_id, job_post_id, document_hash, offer_expiry_at }
  -- For 'viewed': { user_agent, ip }
  -- For 'signed': { user_agent, ip, consent_checkboxes, document_hash }
  -- For 'declined': { user_agent, ip, reason? }
  -- For 'revoked': { reason?, revoked_by_role }
  -- For 'pdf_generated': { pdf_storage_path }
  metadata        JSONB DEFAULT '{}'::jsonb,

  occurred_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- No updated_at — this table is strictly append-only
);

CREATE INDEX IF NOT EXISTS idx_audit_log_contract
  ON contract_audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred
  ON contract_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type
  ON contract_audit_log(event_type);

ALTER TABLE contract_audit_log ENABLE ROW LEVEL SECURITY;

-- Org members can read audit log for their org's contracts
CREATE POLICY "Org members view contract audit log"
  ON contract_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issued_contracts ic
      JOIN org_memberships om ON om.org_id = ic.org_id
      WHERE ic.id = contract_audit_log.contract_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Workers can view audit log for their own contracts
CREATE POLICY "Workers view their own contract audit log"
  ON contract_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issued_contracts ic
      WHERE ic.id = contract_audit_log.contract_id
        AND ic.worker_user_id = auth.uid()
    )
  );

-- Personal senders can view audit log for contracts they issued
CREATE POLICY "Personal sender views own contract audit log"
  ON contract_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM issued_contracts ic
      WHERE ic.id = contract_audit_log.contract_id
        AND ic.sender_user_id = auth.uid()
    )
  );

-- No INSERT via RLS for regular users — service uses service_role client
-- This ensures the audit log can only be written by the backend

COMMENT ON TABLE contract_audit_log IS 'Append-only audit trail for contracts. Backend service inserts only via service role. Never deleted.';
COMMENT ON COLUMN contract_audit_log.event_type IS 'issued|viewed|signed|declined|revoked|pdf_generated|offer_expired|hash_verified';
