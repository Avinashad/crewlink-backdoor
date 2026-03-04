-- Phase 1e: Consolidate worker_categories into expertise
-- 1. Add missing expertise for worker_categories
INSERT INTO expertise (code, name, display_order) VALUES
  ('hosp', 'Hospitality', -1)
ON CONFLICT (code) DO NOTHING;

-- 2. Migrate existing category_key values to expertise codes
UPDATE onboarding_steps SET category_key = 
  CASE category_key WHEN 'hospitality' THEN 'hosp' WHEN 'hotel' THEN 'htl' WHEN 'restaurant' THEN 'rst' WHEN 'care' THEN 'care' ELSE category_key END
WHERE category_key IS NOT NULL;

UPDATE worker_profiles SET active_category_key = 
  CASE active_category_key WHEN 'hospitality' THEN 'hosp' WHEN 'hotel' THEN 'htl' WHEN 'restaurant' THEN 'rst' WHEN 'care' THEN 'care' ELSE active_category_key END
WHERE active_category_key IS NOT NULL;

UPDATE worker_category_profiles SET category_key = 
  CASE category_key WHEN 'hospitality' THEN 'hosp' WHEN 'hotel' THEN 'htl' WHEN 'restaurant' THEN 'rst' WHEN 'care' THEN 'care' ELSE category_key END
WHERE category_key IS NOT NULL;

UPDATE worker_onboarding_responses SET category_key = 
  CASE category_key WHEN 'hospitality' THEN 'hosp' WHEN 'hotel' THEN 'htl' WHEN 'restaurant' THEN 'rst' WHEN 'care' THEN 'care' ELSE category_key END
WHERE category_key IS NOT NULL;

-- 3. Drop FK constraints
ALTER TABLE onboarding_steps DROP CONSTRAINT IF EXISTS onboarding_steps_category_key_fkey;
ALTER TABLE worker_profiles DROP CONSTRAINT IF EXISTS worker_profiles_active_category_key_fkey;
ALTER TABLE worker_category_profiles DROP CONSTRAINT IF EXISTS worker_category_profiles_category_key_fkey;
ALTER TABLE worker_onboarding_responses DROP CONSTRAINT IF EXISTS worker_onboarding_responses_category_key_fkey;

-- 4. Drop worker_categories table (CASCADE drops dependent objects)
DROP TABLE IF EXISTS worker_categories CASCADE;

-- 5. Add FK constraints to expertise(code)
ALTER TABLE onboarding_steps 
  ADD CONSTRAINT onboarding_steps_category_key_fkey 
  FOREIGN KEY (category_key) REFERENCES expertise(code) ON DELETE SET NULL;

ALTER TABLE worker_profiles 
  ADD CONSTRAINT worker_profiles_active_category_key_fkey 
  FOREIGN KEY (active_category_key) REFERENCES expertise(code) ON DELETE SET NULL;

ALTER TABLE worker_category_profiles 
  ADD CONSTRAINT worker_category_profiles_category_key_fkey 
  FOREIGN KEY (category_key) REFERENCES expertise(code) ON DELETE CASCADE;

ALTER TABLE worker_onboarding_responses 
  ADD CONSTRAINT worker_onboarding_responses_category_key_fkey 
  FOREIGN KEY (category_key) REFERENCES expertise(code) ON DELETE SET NULL;

-- 6. Create view for backward compatibility (SELECT key, display_name, etc.)
CREATE VIEW worker_categories AS
SELECT code AS key, name AS display_name, NULL::text AS description, display_order, is_active, created_at
FROM expertise
WHERE code IN ('hosp', 'htl', 'rst', 'care', 'home', 'it', 'tution')
ORDER BY display_order;
