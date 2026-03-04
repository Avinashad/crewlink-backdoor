-- ============================================
-- MIGRATION 053: Issued Contracts
-- NEW: issued_contracts
-- One row per contract sent to a worker for signing
-- Includes offer settings + pre-send checklist
-- Depends on: migration 052 (contract_templates)
-- ============================================

CREATE TABLE IF NOT EXISTS issued_contracts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender identity
  org_id                      UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  sender_user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sender_type                 TEXT NOT NULL CHECK (sender_type IN ('org', 'personal')),

  template_id                 UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  job_post_id                 UUID REFERENCES job_posts(id) ON DELETE SET NULL,
  application_id              UUID REFERENCES job_applications(id) ON DELETE SET NULL,
  worker_user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issued_by                   UUID NOT NULL REFERENCES auth.users(id),

  -- Immutable content snapshot (never modified after creation)
  blocks_snapshot             JSONB NOT NULL,
  resolved_variables          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- PDF stored in Supabase Storage (private bucket 'contracts')
  pdf_storage_path            TEXT,

  -- SHA-256 hex of JSON.stringify(blocks_snapshot) — document integrity
  document_hash               TEXT,

  -- ── Offer settings ──────────────────────────────────────────────────────────
  offer_expiry_at             TIMESTAMP WITH TIME ZONE,
  offer_note                  TEXT,

  -- Pre-send checklist ticked by the issuer before sending
  sender_checklist            JSONB DEFAULT '{}'::jsonb,
  -- { worker_eligible: bool, pay_rate_confirmed: bool, terms_accurate: bool, authority_confirmed: bool }
  sender_checklist_confirmed_at TIMESTAMP WITH TIME ZONE,

  -- ── Contract lifecycle ───────────────────────────────────────────────────────
  status                      TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'viewed', 'signed', 'declined', 'expired', 'revoked')),
  issued_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  viewed_at                   TIMESTAMP WITH TIME ZONE,
  signed_at                   TIMESTAMP WITH TIME ZONE,
  declined_at                 TIMESTAMP WITH TIME ZONE,
  revoked_at                  TIMESTAMP WITH TIME ZONE,
  revoked_by                  UUID REFERENCES auth.users(id),

  -- ── Worker consent (captured at signing) ────────────────────────────────────
  consent_checkboxes          JSONB DEFAULT '{}'::jsonb,
  -- { electronic_sig: bool, electronic_delivery: bool, withdrawal_right: bool, accessibility: bool }
  consent_given_at            TIMESTAMP WITH TIME ZONE,
  signer_user_agent           TEXT,
  signer_ip                   TEXT,

  -- TRUE after signed or declined — backend rejects any further content changes
  is_locked                   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issued_contracts_org
  ON issued_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_worker
  ON issued_contracts(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_sender
  ON issued_contracts(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_job
  ON issued_contracts(job_post_id);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_application
  ON issued_contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_status
  ON issued_contracts(status);
CREATE INDEX IF NOT EXISTS idx_issued_contracts_template
  ON issued_contracts(template_id);

DROP TRIGGER IF EXISTS update_issued_contracts_updated_at ON issued_contracts;
CREATE TRIGGER update_issued_contracts_updated_at
  BEFORE UPDATE ON issued_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE issued_contracts ENABLE ROW LEVEL SECURITY;

-- Workers can view their own contracts
CREATE POLICY "Workers view their own contracts"
  ON issued_contracts FOR SELECT
  USING (worker_user_id = auth.uid());

-- Org members can view their org's issued contracts
CREATE POLICY "Org members view org issued contracts"
  ON issued_contracts FOR SELECT
  USING (
    sender_type = 'org'
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = issued_contracts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Personal sender can view contracts they sent
CREATE POLICY "Personal sender views own issued contracts"
  ON issued_contracts FOR SELECT
  USING (sender_type = 'personal' AND sender_user_id = auth.uid());

-- Workers can update their own contracts (sign/decline — backend enforces is_locked)
CREATE POLICY "Workers update their own contracts"
  ON issued_contracts FOR UPDATE
  USING (worker_user_id = auth.uid());

-- Org admins can update contracts (revoke, etc.)
CREATE POLICY "Org admins update issued contracts"
  ON issued_contracts FOR UPDATE
  USING (
    sender_type = 'org'
    AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = issued_contracts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'recruiter')
    )
  );

-- Personal sender can update (revoke) their own contracts
CREATE POLICY "Personal sender updates own contracts"
  ON issued_contracts FOR UPDATE
  USING (sender_type = 'personal' AND sender_user_id = auth.uid());

-- Org admins and personal senders can insert
CREATE POLICY "Authorized users can issue contracts"
  ON issued_contracts FOR INSERT
  WITH CHECK (
    (sender_type = 'org' AND EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = issued_contracts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'recruiter')
    ))
    OR
    (sender_type = 'personal' AND sender_user_id = auth.uid())
  );

COMMENT ON TABLE issued_contracts IS 'One row per contract instance sent to a worker. Immutable after signing (is_locked=TRUE). Includes offer expiry, note, and pre-send checklist.';
COMMENT ON COLUMN issued_contracts.blocks_snapshot IS 'Full block content at issuance time. Never modified after creation.';
COMMENT ON COLUMN issued_contracts.document_hash IS 'SHA-256 hex of JSON.stringify(blocks_snapshot). Used for integrity verification.';
COMMENT ON COLUMN issued_contracts.is_locked IS 'TRUE after signed or declined. Backend rejects any content updates.';
COMMENT ON COLUMN issued_contracts.sender_checklist IS 'Proof that sender ticked all pre-send checklist items: worker_eligible, pay_rate_confirmed, terms_accurate, authority_confirmed.';
