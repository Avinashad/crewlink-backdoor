-- ============================================
-- MIGRATION 045: Drop vetting_tiles JSONB arrays (if vetting_tiles table exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vetting_tiles') THEN
    ALTER TABLE vetting_tiles DROP COLUMN IF EXISTS expertise_codes;
    ALTER TABLE vetting_tiles DROP COLUMN IF EXISTS country_codes;
    RAISE NOTICE 'Dropped expertise_codes and country_codes from vetting_tiles';
  ELSE
    RAISE NOTICE 'vetting_tiles table does not exist, skipping column drops';
  END IF;
END
$$;
