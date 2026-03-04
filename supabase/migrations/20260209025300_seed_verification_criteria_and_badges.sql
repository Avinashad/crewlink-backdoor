-- Seed initial verification criteria (worker profile verification checks)
INSERT INTO verification_criteria (
  criteria_key,
  display_name,
  description,
  profile_type,
  criteria_type,
  required_document_keys,
  instructions,
  is_active,
  display_order
) VALUES
  ('id_verified', 'ID Verified', 'Government-issued ID has been verified', 'worker', 'identity_check', ARRAY['id_proof'], 'Upload a valid government-issued ID', true, 1),
  ('police_check', 'Police Check', 'Clear police clearance certificate', 'worker', 'document_check', ARRAY['police_check'], 'Upload a recent police clearance certificate', true, 2),
  ('right_to_work', 'Right to Work', 'Valid work authorization (visa/residency)', 'worker', 'document_check', ARRAY['id_proof'], 'Provide proof of right to work', true, 3),
  ('first_aid_cert', 'First Aid Certified', 'Valid first aid certificate', 'worker', 'certification_check', ARRAY['first_aid'], 'Upload current first aid certificate', true, 4),
  ('food_safety_cert', 'Food Safety Certified', 'Valid food safety certificate', 'worker', 'certification_check', ARRAY['food_safety'], 'Upload food safety certificate (for food service roles)', true, 5)
ON CONFLICT DO NOTHING;

-- Seed initial verification badges (tiers: basic, enhanced, premium)
INSERT INTO verification_badge_configs (
  badge_key,
  display_name,
  description,
  profile_type,
  required_criteria_keys,
  tier,
  icon,
  color,
  is_active,
  display_order
) VALUES
  ('basic_verified', 'Basic Verified', 'ID verified, basic checks complete', 'worker', ARRAY['id_verified'], 'basic', 'shield-check', '#22c55e', true, 1),
  ('enhanced_verified', 'Enhanced Verified', 'ID + Police check + Right to work', 'worker', ARRAY['id_verified', 'police_check', 'right_to_work'], 'enhanced', 'shield-star', '#3b82f6', true, 2),
  ('premium_verified', 'Premium Verified', 'All core checks + certifications', 'worker', ARRAY['id_verified', 'police_check', 'right_to_work', 'first_aid_cert'], 'premium', 'shield', '#8b5cf6', true, 3)
ON CONFLICT (badge_key) DO NOTHING;
