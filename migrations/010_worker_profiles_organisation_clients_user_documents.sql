-- ============================================
-- MIGRATION 10: worker_profiles, organisation_clients, user_documents
-- No redundancy: basic info shared via auth.users + personal_profiles; role/link tables reference user_id only.
-- Traceable: created_at, requested_at, verified_at, verified_by.
-- ============================================

-- worker_profiles: one row per user who is a worker; only worker-specific fields
CREATE TABLE IF NOT EXISTS worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_bio TEXT,
  worker_experience_years INTEGER,
  availability JSONB DEFAULT '{}'::jsonb,
  expertise_codes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_created_at ON worker_profiles(created_at);

DROP TRIGGER IF EXISTS update_worker_profiles_updated_at ON worker_profiles;
CREATE TRIGGER update_worker_profiles_updated_at BEFORE UPDATE ON worker_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- organisation_clients: link user to org as client; status + timestamps (no copy of name/address)
CREATE TABLE IF NOT EXISTS organisation_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'blocked')) DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  org_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_clients_user_id ON organisation_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_clients_org_id ON organisation_clients(org_id);
CREATE INDEX IF NOT EXISTS idx_organisation_clients_status ON organisation_clients(status);
CREATE INDEX IF NOT EXISTS idx_organisation_clients_requested_at ON organisation_clients(requested_at);

DROP TRIGGER IF EXISTS update_organisation_clients_updated_at ON organisation_clients;
CREATE TRIGGER update_organisation_clients_updated_at BEFORE UPDATE ON organisation_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- user_documents: shareable assets (document, invoice, job, contract) linked to account
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('document', 'invoice', 'job', 'contract')),
  file_path TEXT NOT NULL,
  file_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(type);
CREATE INDEX IF NOT EXISTS idx_user_documents_created_at ON user_documents(created_at);

-- Enable RLS
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

-- RLS: worker_profiles – user can manage own row
CREATE POLICY "Users can view their own worker profile"
  ON worker_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own worker profile"
  ON worker_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own worker profile"
  ON worker_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- RLS: organisation_clients – user sees own; org members see/update for their org
CREATE POLICY "Users can view their own organisation client rows"
  ON organisation_clients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own organisation client (pending)"
  ON organisation_clients FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Org members can view organisation clients for their org"
  ON organisation_clients FOR SELECT
  USING (public.is_active_org_member(org_id));

CREATE POLICY "Org owners can update organisation clients for their org"
  ON organisation_clients FOR UPDATE
  USING (public.is_active_org_owner(org_id));

-- RLS: user_documents – user owns their documents
CREATE POLICY "Users can view their own documents"
  ON user_documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own documents"
  ON user_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON user_documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON user_documents FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Migration Complete!
-- ============================================
