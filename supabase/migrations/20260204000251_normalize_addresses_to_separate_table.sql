-- ============================================
-- Migration: Normalize addresses to separate table
-- ============================================

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'home' CHECK (type IN ('home', 'work', 'billing', 'shipping')),
  
  -- Address components
  unit TEXT,
  street_address TEXT,
  suburb TEXT,
  province TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country_code TEXT,
  
  -- Full address line (for autocomplete or simple entry)
  address_line1 TEXT,
  address_line2 TEXT,
  
  -- Geographic coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  approximate_latitude DECIMAL(10, 8),
  approximate_longitude DECIMAL(11, 8),
  
  -- Metadata
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON addresses(type);
CREATE INDEX IF NOT EXISTS idx_addresses_is_primary ON addresses(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_addresses_coordinates ON addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Unique constraint: Each user can have only one primary address of each type
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_address_per_user_type 
ON addresses(user_id, type) 
WHERE is_primary = true;

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own addresses"
  ON addresses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own addresses"
  ON addresses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own addresses"
  ON addresses FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own addresses"
  ON addresses FOR DELETE
  USING (user_id = auth.uid());

-- Migrate existing data from personal_profiles to addresses
INSERT INTO addresses (
  user_id,
  type,
  address_line1,
  address_line2,
  city,
  postal_code,
  country_code,
  latitude,
  longitude,
  approximate_latitude,
  approximate_longitude,
  is_primary
)
SELECT 
  user_id,
  'home',
  address_line1,
  address_line2,
  city,
  postal_code,
  country_code,
  latitude,
  longitude,
  approximate_latitude,
  approximate_longitude,
  true
FROM personal_profiles
WHERE address_line1 IS NOT NULL OR city IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop address-related columns from personal_profiles
ALTER TABLE personal_profiles
DROP COLUMN IF EXISTS address_line1,
DROP COLUMN IF EXISTS address_line2,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude,
DROP COLUMN IF EXISTS approximate_latitude,
DROP COLUMN IF EXISTS approximate_longitude;

-- ============================================
-- Migration Complete
-- ============================================
