-- Sprint 0-2: Configurable Onboarding System
-- Admin-configurable onboarding steps and fields

-- Onboarding steps configuration (admin-managed)
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_key TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    category_key TEXT REFERENCES worker_categories(key), -- NULL = applies to all categories
    country_code TEXT, -- NULL = applies to all countries
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Onboarding field definitions (what fields to show in each step)
CREATE TABLE IF NOT EXISTS onboarding_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT CHECK (field_type IN ('text', 'email', 'number', 'select', 'multiselect', 'checkbox', 'radio', 'textarea', 'date')) NOT NULL,
    field_options JSONB DEFAULT '[]', -- For select/radio/multiselect: [{value: "x", label: "Y"}]
    placeholder TEXT,
    help_text TEXT,
    is_required BOOLEAN DEFAULT false,
    field_order INTEGER NOT NULL,
    validation_rules JSONB DEFAULT '{}', -- {minLength: 5, maxLength: 100, pattern: "regex"}
    country_specific BOOLEAN DEFAULT false, -- If true, only shown for specific country
    country_code TEXT, -- Which country this field is for
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (step_id, field_key)
);
-- Worker onboarding responses (stores user's answers)
CREATE TABLE IF NOT EXISTS worker_onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category_key TEXT REFERENCES worker_categories(key),
    field_definition_id UUID REFERENCES onboarding_field_definitions(id),
    field_key TEXT NOT NULL,
    field_value TEXT, -- Stores JSON for complex values (arrays, objects)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, category_key, field_key)
);
-- Enable RLS
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_onboarding_responses ENABLE ROW LEVEL SECURITY;
-- RLS Policies for onboarding_steps (public read for active steps)
CREATE POLICY "Anyone can view active onboarding steps"
    ON onboarding_steps FOR SELECT
    USING (is_active = true);
-- RLS Policies for onboarding_field_definitions (public read)
CREATE POLICY "Anyone can view field definitions"
    ON onboarding_field_definitions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM onboarding_steps 
            WHERE onboarding_steps.id = onboarding_field_definitions.step_id 
            AND onboarding_steps.is_active = true
        )
    );
-- RLS Policies for worker_onboarding_responses
CREATE POLICY "Users can view own responses"
    ON worker_onboarding_responses FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses"
    ON worker_onboarding_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses"
    ON worker_onboarding_responses FOR UPDATE
    USING (auth.uid() = user_id);
-- Triggers for updated_at
CREATE TRIGGER update_onboarding_steps_updated_at
    BEFORE UPDATE ON onboarding_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_field_definitions_updated_at
    BEFORE UPDATE ON onboarding_field_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_worker_onboarding_responses_updated_at
    BEFORE UPDATE ON worker_onboarding_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Insert default onboarding steps
INSERT INTO onboarding_steps (step_key, display_name, description, step_order, category_key, country_code) VALUES
    ('basic_info', 'Basic Information', 'Tell us about yourself', 1, NULL, NULL),
    ('work_preferences', 'Work Preferences', 'Your availability and shift preferences', 2, NULL, NULL),
    ('right_to_work', 'Right to Work', 'Confirm your eligibility to work', 3, NULL, NULL)
ON CONFLICT (step_key) DO NOTHING;
-- Insert default field definitions for basic_info step
INSERT INTO onboarding_field_definitions (step_id, field_key, field_label, field_type, placeholder, help_text, is_required, field_order, validation_rules)
SELECT 
    s.id,
    'market_country',
    'Market Country',
    'select',
    'Select country',
    'Choose the country where you want to work',
    true,
    1,
    '{}'::jsonb
FROM onboarding_steps s WHERE s.step_key = 'basic_info'
ON CONFLICT (step_id, field_key) DO NOTHING;
-- Add country options to market_country field
UPDATE onboarding_field_definitions 
SET field_options = '[
    {"value": "NP", "label": "Nepal (NP)"},
    {"value": "NZ", "label": "New Zealand (NZ)"}
]'::jsonb
WHERE field_key = 'market_country';
INSERT INTO onboarding_field_definitions (step_id, field_key, field_label, field_type, placeholder, help_text, is_required, field_order, validation_rules)
SELECT 
    s.id,
    'category_key',
    'Work Category',
    'select',
    'Select category',
    'Choose your primary work category',
    true,
    2,
    '{}'::jsonb
FROM onboarding_steps s WHERE s.step_key = 'basic_info'
ON CONFLICT (step_id, field_key) DO NOTHING;
-- Add category options to category_key field
UPDATE onboarding_field_definitions 
SET field_options = '[
    {"value": "hospitality", "label": "Hospitality"},
    {"value": "hotel", "label": "Hotel Services"},
    {"value": "restaurant", "label": "Restaurant & Food Service"},
    {"value": "care", "label": "Care Work"}
]'::jsonb
WHERE field_key = 'category_key';
-- Insert default field definitions for work_preferences step
INSERT INTO onboarding_field_definitions (step_id, field_key, field_label, field_type, placeholder, help_text, is_required, field_order, validation_rules)
SELECT 
    s.id,
    'availability_type',
    'Availability Type',
    'radio',
    NULL,
    'Select your preferred work arrangement',
    true,
    1,
    '{}'::jsonb
FROM onboarding_steps s WHERE s.step_key = 'work_preferences'
ON CONFLICT (step_id, field_key) DO NOTHING;
-- Add availability options
UPDATE onboarding_field_definitions 
SET field_options = '[
    {"value": "full_time", "label": "Full Time"},
    {"value": "part_time", "label": "Part Time"},
    {"value": "casual", "label": "Casual"},
    {"value": "on_call", "label": "On Call"}
]'::jsonb
WHERE field_key = 'availability_type';
INSERT INTO onboarding_field_definitions (step_id, field_key, field_label, field_type, placeholder, help_text, is_required, field_order, validation_rules)
SELECT 
    s.id,
    'shift_preferences',
    'Shift Preferences',
    'multiselect',
    NULL,
    'Select all shift times you are available for',
    false,
    2,
    '{}'::jsonb
FROM onboarding_steps s WHERE s.step_key = 'work_preferences'
ON CONFLICT (step_id, field_key) DO NOTHING;
-- Add shift preference options
UPDATE onboarding_field_definitions 
SET field_options = '[
    {"value": "morning", "label": "Morning"},
    {"value": "afternoon", "label": "Afternoon"},
    {"value": "evening", "label": "Evening"},
    {"value": "night", "label": "Night"},
    {"value": "weekend", "label": "Weekend"}
]'::jsonb
WHERE field_key = 'shift_preferences';
-- Insert default field definitions for right_to_work step
INSERT INTO onboarding_field_definitions (step_id, field_key, field_label, field_type, placeholder, help_text, is_required, field_order, validation_rules)
SELECT 
    s.id,
    'right_to_work_attested',
    'Right to Work Confirmation',
    'checkbox',
    NULL,
    'You may be asked to provide documentation to verify this later',
    true,
    1,
    '{}'::jsonb
FROM onboarding_steps s WHERE s.step_key = 'right_to_work'
ON CONFLICT (step_id, field_key) DO NOTHING;
-- Function to get onboarding steps for a specific country and category
CREATE OR REPLACE FUNCTION get_onboarding_steps_for_worker(
    p_country_code TEXT,
    p_category_key TEXT
)
RETURNS TABLE (
    step_id UUID,
    step_key TEXT,
    display_name TEXT,
    description TEXT,
    step_order INTEGER,
    fields JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as step_id,
        s.step_key,
        s.display_name,
        s.description,
        s.step_order,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', f.id,
                    'field_key', f.field_key,
                    'field_label', f.field_label,
                    'field_type', f.field_type,
                    'field_options', f.field_options,
                    'placeholder', f.placeholder,
                    'help_text', f.help_text,
                    'is_required', f.is_required,
                    'field_order', f.field_order,
                    'validation_rules', f.validation_rules
                ) ORDER BY f.field_order
            ),
            '[]'::jsonb
        ) as fields
    FROM onboarding_steps s
    LEFT JOIN onboarding_field_definitions f ON f.step_id = s.id
    WHERE s.is_active = true
        AND (s.country_code IS NULL OR s.country_code = p_country_code)
        AND (s.category_key IS NULL OR s.category_key = p_category_key)
        AND (f.id IS NULL OR 
             (NOT f.country_specific OR f.country_code = p_country_code))
    GROUP BY s.id, s.step_key, s.display_name, s.description, s.step_order
    ORDER BY s.step_order;
END;
$$;
