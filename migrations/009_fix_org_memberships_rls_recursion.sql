-- ============================================
-- MIGRATION 9: Fix org_memberships RLS recursion
-- ============================================
--
-- Problem:
-- Existing RLS policies on org_memberships reference org_memberships inside the policy,
-- which can cause: "infinite recursion detected in policy for relation \"org_memberships\""
--
-- Fix:
-- 1) Drop the recursive policies
-- 2) Add SECURITY DEFINER helper functions
-- 3) Recreate non-recursive policies using those functions

-- Drop known recursive policies (may exist from earlier migrations)
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON org_memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" ON org_memberships;
DROP POLICY IF EXISTS "Organization owners/admins can manage memberships" ON org_memberships;

-- Helper: is the current user an active member of an org?
CREATE OR REPLACE FUNCTION public.is_active_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND COALESCE(status, 'active') = 'active'
  );
$$;

-- Helper: is the current user an active owner of an org?
CREATE OR REPLACE FUNCTION public.is_active_org_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND role = 'owner'
      AND COALESCE(status, 'active') = 'active'
  );
$$;

-- Read memberships:
-- - Any user can see their own rows
-- - Any active member can see all memberships of that org
CREATE POLICY "Org members can read memberships"
  ON org_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_active_org_member(org_id)
  );

-- Allow workers to create a pending association request for themselves.
-- (Backend currently uses service role, but this makes behavior consistent if called via user JWT)
CREATE POLICY "Users can request org membership"
  ON org_memberships FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND COALESCE(status, 'pending') = 'pending'
  );

-- Owners can approve/reject/update memberships in their org.
CREATE POLICY "Org owners can manage memberships"
  ON org_memberships FOR UPDATE
  USING (public.is_active_org_owner(org_id))
  WITH CHECK (public.is_active_org_owner(org_id));

CREATE POLICY "Org owners can delete memberships"
  ON org_memberships FOR DELETE
  USING (public.is_active_org_owner(org_id));

-- ============================================
-- Migration Complete!
-- ============================================

