-- ============================================
-- MIGRATION 022: Create vetting_tiles table
-- ============================================

-- Vetting tiles table for admin-configured vetting requirements
CREATE TABLE IF NOT EXISTS vetting_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('certification', 'background_check', 'reference', 'custom')),
  config JSONB DEFAULT '{}'::jsonb,
  is_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  country_codes JSONB DEFAULT '[]'::jsonb,
  expertise_codes JSONB DEFAULT '[]'::jsonb,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_code ON vetting_tiles(code);
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_type ON vetting_tiles(type);
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_active ON vetting_tiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_required ON vetting_tiles(is_required) WHERE is_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_display_order ON vetting_tiles(display_order);

-- GIN indexes for JSONB array queries
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_country_codes ON vetting_tiles USING GIN (country_codes);
CREATE INDEX IF NOT EXISTS idx_vetting_tiles_expertise_codes ON vetting_tiles USING GIN (expertise_codes);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_vetting_tiles_updated_at ON vetting_tiles;
CREATE TRIGGER update_vetting_tiles_updated_at 
  BEFORE UPDATE ON vetting_tiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE vetting_tiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vetting tiles" 
  ON vetting_tiles FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage vetting tiles" 
  ON vetting_tiles FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin'));

-- Comment on table
COMMENT ON TABLE vetting_tiles IS 
'Admin-configured vetting requirements (certifications, background checks, references, etc.) filtered by country and expertise';

COMMENT ON COLUMN vetting_tiles.config IS 
'Configuration object with tile-specific settings: { "fields": [], "documentTypes": [], "validations": {} }';

COMMENT ON COLUMN vetting_tiles.country_codes IS 
'Array of country codes this vetting tile applies to (empty = all countries)';

COMMENT ON COLUMN vetting_tiles.expertise_codes IS 
'Array of expertise codes this vetting tile applies to (empty = all expertise)';
