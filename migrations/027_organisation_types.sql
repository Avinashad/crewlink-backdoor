-- ============================================
-- MIGRATION 027: Create organisation_types reference table
-- Replace hardcoded CHECK constraint on organizations.org_type
-- RENAME organizations.org_type → org_type_code (FK)
-- ============================================

-- Create reference table
CREATE TABLE IF NOT EXISTS organisation_types (
  code        VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial types (covers existing hardcoded values + new ones)
INSERT INTO organisation_types (code, name, sort_order) VALUES
  ('hotel',          'Hotel & Accommodation',   1),
  ('restaurant',     'Restaurant & Hospitality', 2),
  ('oldage_care',    'Aged Care Facility',       3),
  ('hospital',       'Hospital & Healthcare',    4),
  ('logistics',      'Logistics & Transport',    5),
  ('retail',         'Retail',                  6),
  ('construction',   'Construction',             7),
  ('education',      'Education',               8),
  ('corporate',      'Corporate Services',      9),
  ('other',          'Other',                   99)
ON CONFLICT (code) DO NOTHING;

-- Add org_type_code FK column (nullable during backfill)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS org_type_code VARCHAR(50)
  REFERENCES organisation_types(code) ON UPDATE CASCADE;

-- Backfill org_type_code from existing org_type
UPDATE organizations SET org_type_code = org_type WHERE org_type_code IS NULL AND org_type IS NOT NULL;

-- Drop old CHECK constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_org_type_check;

-- Drop old org_type column
ALTER TABLE organizations DROP COLUMN IF EXISTS org_type;

-- Make org_type_code NOT NULL now that data is backfilled
ALTER TABLE organizations ALTER COLUMN org_type_code SET NOT NULL;

-- RLS for organisation_types (public read)
ALTER TABLE organisation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active organisation types"
  ON organisation_types FOR SELECT
  USING (is_active = TRUE);

COMMENT ON TABLE organisation_types IS 'Reference table for organisation type codes. Replaces hardcoded CHECK on organizations.org_type.';
COMMENT ON COLUMN organizations.org_type_code IS 'FK to organisation_types.code';
