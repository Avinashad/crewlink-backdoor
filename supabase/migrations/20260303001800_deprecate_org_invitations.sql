-- ============================================
-- MIGRATION 042: Deprecate org_invitations table (if it exists)
-- org_reference_codes is the canonical invite system.
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'org_invitations') THEN
    -- Mark as deprecated
    EXECUTE $comment$
      COMMENT ON TABLE org_invitations IS
      'DEPRECATED: Use org_reference_codes instead. This table will be dropped in a future migration once all clients have migrated.'
    $comment$;

    -- Add deprecated_at column if not already there
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'org_invitations' AND column_name = 'deprecated_at'
    ) THEN
      ALTER TABLE org_invitations
        ADD COLUMN deprecated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    RAISE NOTICE 'org_invitations marked as deprecated';
  ELSE
    RAISE NOTICE 'org_invitations table does not exist, skipping deprecation';
  END IF;
END
$$;
