-- ============================================
-- MIGRATION 024: Add conditional logic and templates support
-- ============================================

-- 1. Add conditional_logic column to onboarding_field_definitions
ALTER TABLE onboarding_field_definitions 
  ADD COLUMN IF NOT EXISTS conditional_logic JSONB DEFAULT NULL;

-- Add index for fields with conditional logic
CREATE INDEX IF NOT EXISTS idx_onboarding_fields_has_logic 
  ON onboarding_field_definitions(conditional_logic) 
  WHERE conditional_logic IS NOT NULL;

-- Add comment explaining conditional logic structure
COMMENT ON COLUMN onboarding_field_definitions.conditional_logic IS 
'Conditional logic rules in format:
{
  "conditions": [
    {
      "field_id": "uuid",
      "operator": "equals|not_equals|contains|greater_than|less_than",
      "value": "comparison_value"
    }
  ],
  "logic": "AND|OR",
  "action": {
    "type": "show|hide|require|disable",
    "target_field_id": "uuid"
  }
}';

-- 2. Add field_config column to onboarding_field_definitions
ALTER TABLE onboarding_field_definitions 
  ADD COLUMN IF NOT EXISTS field_config JSONB DEFAULT '{}';

-- Add comment explaining field_config structure
COMMENT ON COLUMN onboarding_field_definitions.field_config IS 
'Field-specific configuration:
- File upload: {"acceptedTypes": ["pdf", "jpg"], "maxSize": 5}
- Text input: {"minLength": 10, "maxLength": 500, "pattern": "regex"}
- Dropdown: {"options": [{"label": "...", "value": "..."}]}
- Date: {"minDate": "2020-01-01", "maxDate": "2030-12-31"}';

-- 3. Create onboarding_templates table
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  country_code VARCHAR(10),
  thumbnail_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX idx_templates_industry ON onboarding_templates(industry);
CREATE INDEX idx_templates_country ON onboarding_templates(country_code);
CREATE INDEX idx_templates_featured ON onboarding_templates(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_templates_active ON onboarding_templates(is_active) WHERE is_active = TRUE;

-- RLS Policies for templates
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;

-- Admins can view all active templates
CREATE POLICY "Admins can view active templates" ON onboarding_templates
  FOR SELECT
  USING (is_active = TRUE);

-- Only admins can insert/update/delete templates (handled by backend auth)
CREATE POLICY "Admins can manage templates" ON onboarding_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Add icon column to onboarding_steps for visual builder
ALTER TABLE onboarding_steps 
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'article';

COMMENT ON COLUMN onboarding_steps.icon IS 
'Material Symbols icon name for visual builder (e.g., fingerprint, health_and_safety, checklist)';

-- 5. Add display settings to onboarding_steps
ALTER TABLE onboarding_steps 
  ADD COLUMN IF NOT EXISTS is_collapsible BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN onboarding_steps.is_collapsible IS 
'If true, step can be collapsed in visual builder and worker UI';
