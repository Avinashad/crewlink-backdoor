-- ============================================
-- MIGRATION 055: Contract Clause Library + job_posts integration
-- NEW: contract_clause_library (seed data)
-- ALTER: job_posts.contract_template_id
-- ============================================

-- Standard clause library — system-level, read-only for all authenticated users
CREATE TABLE IF NOT EXISTS contract_clause_library (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  category      TEXT NOT NULL,
  -- 'safety' | 'policy' | 'legal' | 'leave'
  country_code  TEXT,
  -- NULL = universal; 'NZ', 'AU', etc. for jurisdiction-specific clauses
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER DEFAULT 0
);

-- Seed with standard clauses
INSERT INTO contract_clause_library (key, title, body, category, sort_order) VALUES

  ('health_safety',
   'Health & Safety',
   'The Worker agrees to comply with all applicable health and safety legislation, the Organisation''s health and safety policy, and any site-specific safety requirements. The Worker must report any hazards, incidents, or near-misses to their supervisor immediately. Failure to comply with health and safety protocols may result in immediate termination of this agreement.',
   'safety', 1),

  ('uniform_policy',
   'Uniform Policy',
   'The Worker is required to wear the Organisation''s approved uniform at all times while on duty. The uniform must be clean, well-maintained, and presented in a professional manner. The Worker must not alter the uniform without prior written approval. Failure to comply with uniform standards may result in the Worker being asked to leave the premises without pay for that shift.',
   'policy', 2),

  ('confidentiality',
   'Confidentiality (NDA)',
   'The Worker acknowledges that during the course of their engagement they may have access to confidential information belonging to the Organisation, its clients, and associated parties. The Worker agrees not to disclose, reproduce, or use any such confidential information for any purpose other than fulfilling their duties under this agreement. This obligation survives the termination of this agreement.',
   'legal', 3),

  ('termination_rights',
   'Termination Rights',
   'Either party may terminate this agreement by providing written notice as specified herein. The Organisation reserves the right to terminate immediately and without notice in cases of serious misconduct, breach of policy, or wilful neglect of duties. The Worker may resign at any time with appropriate notice. Upon termination, the Worker must return any Organisation property in their possession.',
   'legal', 4),

  ('leave_policy',
   'Leave Policy',
   'Leave entitlements are provided in accordance with applicable employment legislation. Annual leave, sick leave, bereavement leave, and public holidays will be administered per the relevant statutory requirements of the jurisdiction in which the Worker is engaged. The Worker must provide reasonable advance notice when requesting annual leave and a medical certificate for sick leave exceeding three consecutive days.',
   'leave', 5),

  ('drug_alcohol',
   'Drug & Alcohol Policy',
   'The Worker must not report to work under the influence of alcohol or any non-prescribed or illegal drugs. The Worker must not consume alcohol or use drugs while on duty or on Organisation premises. The Organisation reserves the right to conduct lawful drug and alcohol testing in accordance with its policy. Breach of this clause may result in immediate termination without notice.',
   'safety', 6),

  ('intellectual_property',
   'Intellectual Property',
   'Any work product, inventions, developments, or materials created by the Worker in the course of or in connection with their engagement under this agreement shall be the sole and exclusive property of the Organisation. The Worker hereby assigns all intellectual property rights, including copyright, in such work product to the Organisation, and agrees to execute any further documents reasonably required to give effect to this assignment.',
   'legal', 7),

  ('dispute_resolution',
   'Dispute Resolution',
   'In the event of a dispute arising out of or in connection with this agreement, the parties agree to first attempt to resolve the matter informally through good-faith discussion. If the dispute is not resolved within 14 days, either party may refer the matter to mediation. The costs of mediation shall be shared equally unless otherwise agreed. Nothing in this clause prevents either party from seeking urgent injunctive relief.',
   'legal', 8)

ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE contract_clause_library ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active clauses
CREATE POLICY "Authenticated users can read clause library"
  ON contract_clause_library FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = TRUE);

COMMENT ON TABLE contract_clause_library IS 'System-level standard clause library. Users drag these into their contract templates. Read-only for regular users.';

-- ── Link job_posts to a contract template ───────────────────────────────────
ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS contract_template_id UUID
    REFERENCES contract_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN job_posts.contract_template_id IS 'Optional contract template attached to this job. When an applicant is accepted, this template is pre-filled in the offer modal.';
