-- Function to return all public tables and columns for profile config mapping
CREATE OR REPLACE FUNCTION get_profile_config_schema()
RETURNS TABLE (table_name text, column_name text, data_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.table_name::text,
    c.column_name::text,
    c.data_type::text
  FROM information_schema.tables t
  JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'spatial_%'
    AND t.table_name NOT IN ('schema_migrations')
  ORDER BY t.table_name, c.ordinal_position;
$$;

-- Sections within a tab (e.g. Guardian, Emergency contacts)
CREATE TABLE IF NOT EXISTS profile_section_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES profile_tab_configs(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  section_order INTEGER NOT NULL DEFAULT 0,
  max_items INTEGER NOT NULL DEFAULT 1,
  contact_type_filter TEXT,
  maps_to_table TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tab_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_profile_section_configs_tab_id ON profile_section_configs(tab_id);

ALTER TABLE profile_field_configs
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES profile_section_configs(id) ON DELETE SET NULL;
