-- ============================================
-- MIGRATION 12: Fix org_memberships RLS infinite recursion (bypass in helpers)
-- ============================================
--
-- Problem:
-- Policies on org_memberships use is_active_org_member() and is_active_org_owner().
-- Those functions SELECT from org_memberships, which triggers RLS again → infinite recursion.
--
-- Fix:
-- Recreate the helper functions with SET row_security = off so they bypass RLS when
-- reading org_memberships. (PostgreSQL 15+; on older versions this option is ignored
-- but the migration still runs. If recursion persists, use a service role for the query.)

-- Helper: is the current user an active member of an org? (bypasses RLS when reading org_memberships)
CREATE OR REPLACE FUNCTION public.is_active_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_memberships
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND COALESCE(status, 'active') = 'active'
  );
$$;

-- Helper: is the current user an active owner of an org? (bypasses RLS when reading org_memberships)
CREATE OR REPLACE FUNCTION public.is_active_org_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
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
