-- ============================================
-- MIGRATION 029: Normalize org_memberships.role
-- Expand from ('owner','recruiter') to ('owner','admin','recruiter','viewer')
-- ============================================

-- Drop old CHECK constraint
ALTER TABLE org_memberships DROP CONSTRAINT IF EXISTS org_memberships_role_check;

-- Re-add with full role set
ALTER TABLE org_memberships
  ADD CONSTRAINT org_memberships_role_check
  CHECK (role IN ('owner', 'admin', 'recruiter', 'viewer'));

COMMENT ON COLUMN org_memberships.role IS
'Member role:
  owner     - Full org control (billing, delete org, manage all)
  admin     - Manage members, jobs, applications (no billing/delete)
  recruiter - Post jobs, manage applications, view workers
  viewer    - Read-only access to org data';
