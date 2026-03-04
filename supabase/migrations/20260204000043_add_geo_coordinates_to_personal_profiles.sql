-- ============================================
-- Migration: Add geographic coordinates to personal_profiles
-- ============================================

-- Add primary (exact) geo coordinates
ALTER TABLE personal_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add approximate geo coordinates (for privacy/general area)
ALTER TABLE personal_profiles
ADD COLUMN IF NOT EXISTS approximate_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS approximate_longitude DECIMAL(11, 8);

-- Create index for geo queries (if needed for nearby searches later)
CREATE INDEX IF NOT EXISTS idx_personal_profiles_coordinates 
ON personal_profiles(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_personal_profiles_approximate_coordinates 
ON personal_profiles(approximate_latitude, approximate_longitude) 
WHERE approximate_latitude IS NOT NULL AND approximate_longitude IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN personal_profiles.latitude IS 'Exact latitude of user address';
COMMENT ON COLUMN personal_profiles.longitude IS 'Exact longitude of user address';
COMMENT ON COLUMN personal_profiles.approximate_latitude IS 'Approximate latitude for privacy (e.g., city center)';
COMMENT ON COLUMN personal_profiles.approximate_longitude IS 'Approximate longitude for privacy (e.g., city center)';

-- ============================================
-- Migration Complete
-- ============================================
