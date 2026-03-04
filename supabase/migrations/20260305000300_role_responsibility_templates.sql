-- MIGRATION: Role Responsibility Templates
-- Admin-managed templates of responsibilities per expertise category.
-- When a job creator selects a category, the system auto-suggests relevant responsibilities.

CREATE TABLE IF NOT EXISTS role_responsibility_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expertise_code  TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,  -- e.g. 'core_duty', 'safety', 'customer_service', 'admin'
  is_default      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_role_responsibility_templates_updated_at ON role_responsibility_templates;
CREATE TRIGGER update_role_responsibility_templates_updated_at
  BEFORE UPDATE ON role_responsibility_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: everyone can read active templates
ALTER TABLE role_responsibility_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active responsibility templates"
  ON role_responsibility_templates FOR SELECT
  USING (is_active = TRUE);

-- Index for fast lookups by expertise code
CREATE INDEX IF NOT EXISTS idx_role_resp_templates_expertise
  ON role_responsibility_templates(expertise_code, is_active, sort_order);

COMMENT ON TABLE role_responsibility_templates IS 'Admin-managed responsibility templates per expertise category for job creation auto-suggest';
COMMENT ON COLUMN role_responsibility_templates.expertise_code IS 'References expertise.code (e.g. waiter, housekeeping)';
COMMENT ON COLUMN role_responsibility_templates.is_default IS 'If true, auto-checked when the category is selected during job creation';
COMMENT ON COLUMN role_responsibility_templates.category IS 'Grouping: core_duty, safety, customer_service, admin';
