-- Fix infinite recursion in org_memberships RLS policies.
-- The policies referenced org_memberships in a subquery, causing recursion.
-- Use SECURITY DEFINER helpers (is_active_org_member, is_active_org_owner) which bypass RLS.

-- Drop existing recursive policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON org_memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" ON org_memberships;

-- Recreate using helper functions (no self-reference, no recursion)
CREATE POLICY "Users can view memberships in their organizations"
  ON org_memberships FOR SELECT
  USING ((SELECT is_active_org_member(org_id)));

CREATE POLICY "Owners can manage memberships"
  ON org_memberships FOR ALL
  USING ((SELECT is_active_org_owner(org_id)));
