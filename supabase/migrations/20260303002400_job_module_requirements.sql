-- ============================================
-- MIGRATION 048: Job Module Requirements
-- NEW: job_module_requirements table
-- Links required training modules to job posts
-- Depends on: migration 046 (training_modules), migration 030 (job_posts enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS job_module_requirements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT TRUE,
  -- Deadline offset in days from when the invitation is sent
  deadline_days INTEGER DEFAULT 7,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (job_post_id, module_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jmr_job_post ON job_module_requirements(job_post_id);
CREATE INDEX IF NOT EXISTS idx_jmr_module   ON job_module_requirements(module_id);

-- RLS
ALTER TABLE job_module_requirements ENABLE ROW LEVEL SECURITY;

-- Org members can view requirements for their job posts
CREATE POLICY "Org members can view job module requirements"
  ON job_module_requirements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_module_requirements.job_post_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Workers can see requirements for published jobs they've applied to
CREATE POLICY "Workers can view requirements for applied jobs"
  ON job_module_requirements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = job_module_requirements.job_post_id
        AND jp.status = 'published'
    )
    OR EXISTS (
      SELECT 1 FROM job_applications ja
      WHERE ja.job_post_id = job_module_requirements.job_post_id
        AND ja.applicant_id = auth.uid()
    )
  );

-- Org admins/recruiters can manage requirements
CREATE POLICY "Org recruiters can manage job module requirements"
  ON job_module_requirements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_module_requirements.job_post_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'recruiter')
    )
  );

COMMENT ON TABLE job_module_requirements IS 'Training modules required for a specific job post. Used to generate module invitations when a worker is shortlisted.';
COMMENT ON COLUMN job_module_requirements.deadline_days IS 'Days from invitation send date by which the worker must complete the module';
