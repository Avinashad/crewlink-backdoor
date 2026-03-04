-- ============================================
-- MIGRATION: SECURITY DEFINER function to bootstrap the first org owner
-- The shared Supabase client may have a user JWT set (from auth.signInWithPassword),
-- so the RLS policy "Owners can manage memberships" fails when no owner exists yet.
-- This function runs as the definer (postgres), bypassing RLS entirely.
-- ============================================

CREATE OR REPLACE FUNCTION add_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO org_memberships (org_id, user_id, role, status)
  VALUES (p_org_id, p_user_id, 'owner', 'active')
  ON CONFLICT (org_id, user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION add_org_owner IS
  'Bootstrap the initial owner membership for a newly created organisation. Runs SECURITY DEFINER to bypass RLS.';
