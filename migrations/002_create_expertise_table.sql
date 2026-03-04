-- Create expertise table
CREATE TABLE IF NOT EXISTS expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  icon_name VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_expertise_code ON expertise(code);
CREATE INDEX IF NOT EXISTS idx_expertise_active ON expertise(is_active);

-- Insert initial expertise data
INSERT INTO expertise (code, name, icon_name, display_order) VALUES
  ('construction', 'Construction', 'Wrench', 1),
  ('logistics', 'Logistics', 'Truck', 2),
  ('it-tech', 'IT & Tech', 'Monitor', 3),
  ('healthcare', 'Healthcare', 'Cross', 4),
  ('energy', 'Energy', 'Zap', 5),
  ('agriculture', 'Agriculture', 'Tractor', 6)
ON CONFLICT (code) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_expertise_updated_at BEFORE UPDATE ON expertise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
