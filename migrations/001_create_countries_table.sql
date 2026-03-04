-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- Insert initial countries data
INSERT INTO countries (code, name) VALUES
  ('GB', 'United Kingdom'),
  ('DE', 'Germany'),
  ('FR', 'France'),
  ('PL', 'Poland'),
  ('ES', 'Spain'),
  ('IT', 'Italy'),
  ('NL', 'Netherlands'),
  ('BE', 'Belgium'),
  ('PT', 'Portugal'),
  ('AT', 'Austria'),
  ('SE', 'Sweden'),
  ('DK', 'Denmark'),
  ('NO', 'Norway'),
  ('FI', 'Finland'),
  ('IE', 'Ireland'),
  ('CH', 'Switzerland'),
  ('CZ', 'Czech Republic'),
  ('RO', 'Romania'),
  ('HU', 'Hungary'),
  ('GR', 'Greece')
ON CONFLICT (code) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
