-- MIGRATION: Job Post Responsibilities
-- Stores the responsibilities selected/customized for each job post.
-- Linked to templates when possible, or custom-entered by the job creator.

CREATE TABLE IF NOT EXISTS job_post_responsibilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id   UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  template_id   UUID REFERENCES role_responsibility_templates(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by job post
CREATE INDEX IF NOT EXISTS idx_job_post_responsibilities_job
  ON job_post_responsibilities(job_post_id, sort_order);

-- RLS
ALTER TABLE job_post_responsibilities ENABLE ROW LEVEL SECURITY;

-- Published job responsibilities are visible to everyone
CREATE POLICY "Anyone can view responsibilities of published jobs"
  ON job_post_responsibilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      WHERE jp.id = job_post_responsibilities.job_post_id
        AND jp.status = 'published'
        AND jp.deleted_at IS NULL
    )
  );

-- Org members can view all responsibilities for their jobs
CREATE POLICY "Org members can view own job responsibilities"
  ON job_post_responsibilities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_post_responsibilities.job_post_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Org members can insert/update/delete responsibilities for their jobs
CREATE POLICY "Org members can manage own job responsibilities"
  ON job_post_responsibilities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM job_posts jp
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE jp.id = job_post_responsibilities.job_post_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

COMMENT ON TABLE job_post_responsibilities IS 'Responsibilities selected or customized for each job post';
COMMENT ON COLUMN job_post_responsibilities.template_id IS 'Reference to the template used. NULL if custom-entered.';
