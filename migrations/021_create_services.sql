-- ============================================
-- MIGRATION 021: Create services table
-- ============================================

-- Services table for worker service offerings
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  expertise_codes JSONB DEFAULT '[]'::jsonb,
  country_codes JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_services_display_order ON services(display_order);

-- GIN indexes for JSONB array queries
CREATE INDEX IF NOT EXISTS idx_services_expertise_codes ON services USING GIN (expertise_codes);
CREATE INDEX IF NOT EXISTS idx_services_country_codes ON services USING GIN (country_codes);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services" 
  ON services FOR SELECT 
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage services" 
  ON services FOR ALL 
  USING (auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin'));

-- Comment on table
COMMENT ON TABLE services IS 
'Admin-configurable services that workers can offer, filtered by country and expertise';

COMMENT ON COLUMN services.expertise_codes IS 
'Array of expertise codes this service is relevant to (empty = all)';

COMMENT ON COLUMN services.country_codes IS 
'Array of country codes this service is available in (empty = all)';
