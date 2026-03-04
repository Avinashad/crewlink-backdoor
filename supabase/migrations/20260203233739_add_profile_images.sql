-- ============================================
-- Migration: Add profile image support
-- ============================================

-- Add profile_image_url to personal_profiles table
ALTER TABLE personal_profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Create storage bucket for profile images if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Migration Complete
-- Note: Storage policies should be configured via Supabase Dashboard
-- ============================================
