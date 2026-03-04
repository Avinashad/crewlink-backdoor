-- ============================================
-- MIGRATION 043: Defer drop of worker_profiles.expertise_codes
-- The worker_search_mv materialized view depends on this column.
-- Column drop is deferred until the materialized view is rebuilt
-- to join against worker_profile_expertise junction table instead.
-- For now: add a deprecation comment only.
-- ============================================

DO $$
BEGIN
  -- Only comment if the column still exists (it might already be dropped)
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'worker_profiles'
      AND column_name = 'expertise_codes'
  ) THEN
    RAISE NOTICE 'expertise_codes column retained — worker_search_mv depends on it. Use worker_profile_expertise junction table for new writes.';
  ELSE
    RAISE NOTICE 'expertise_codes column already removed from worker_profiles';
  END IF;
END
$$;
