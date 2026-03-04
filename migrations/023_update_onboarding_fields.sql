-- ============================================
-- MIGRATION 023: Update onboarding system for field mapping and skippable steps
-- ============================================

-- Add is_skippable column to onboarding_steps
ALTER TABLE onboarding_steps 
  ADD COLUMN IF NOT EXISTS is_skippable BOOLEAN DEFAULT FALSE;

-- Add index for frequently queried skippable steps
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_skippable 
  ON onboarding_steps(is_skippable) 
  WHERE is_skippable = TRUE;

-- Add field_mapping configuration to onboarding_field_definitions
ALTER TABLE onboarding_field_definitions 
  ADD COLUMN IF NOT EXISTS field_mapping JSONB DEFAULT NULL;

ALTER TABLE onboarding_field_definitions 
  ADD COLUMN IF NOT EXISTS validation_rules JSONB DEFAULT NULL;

ALTER TABLE onboarding_field_definitions 
  ADD COLUMN IF NOT EXISTS transform_function TEXT DEFAULT NULL;

-- Add index for fields with mappings
CREATE INDEX IF NOT EXISTS idx_onboarding_fields_has_mapping 
  ON onboarding_field_definitions(field_mapping) 
  WHERE field_mapping IS NOT NULL;

-- Add comments to explain field_mapping structure
COMMENT ON COLUMN onboarding_field_definitions.field_mapping IS 
'JSON configuration for mapping field responses to database tables/columns.
Example direct mapping: {"target": {"table": "worker_profiles", "column": "worker_bio"}, "type": "direct", "dataType": "text"}
Example array mapping: {"target": {"table": "worker_profiles", "column": "expertise_codes"}, "type": "array", "dataType": "jsonb"}
If null, stores in profile_onboarding.onboarding_data JSONB';

COMMENT ON COLUMN onboarding_field_definitions.validation_rules IS 
'JSON array of validation rules: [{"type": "minLength", "value": 50, "message": "..."}, {"type": "pattern", "value": "regex", "message": "..."}]';

COMMENT ON COLUMN onboarding_field_definitions.transform_function IS 
'Optional transformation function name to apply before saving (e.g., "toJsonbArray", "toLowerCase", "trim")';

COMMENT ON COLUMN onboarding_steps.is_skippable IS 
'If true, users can skip this step without answering. Skip button will appear in UI alongside Agree/Disagree';
