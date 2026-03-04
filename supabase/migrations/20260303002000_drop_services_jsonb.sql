-- ============================================
-- MIGRATION 044: Drop services JSONB arrays (if services table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN
    ALTER TABLE services DROP COLUMN IF EXISTS expertise_codes;
    ALTER TABLE services DROP COLUMN IF EXISTS country_codes;
    RAISE NOTICE 'Dropped expertise_codes and country_codes from services';
  ELSE
    RAISE NOTICE 'services table does not exist, skipping column drops';
  END IF;
END
$$;
