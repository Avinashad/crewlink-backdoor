-- ============================================
-- MIGRATION 032: user_active_profile table
-- SQL-queryable active profile type per user
-- Replaces user_metadata.active_profile_type JSONB
-- ============================================

CREATE TABLE IF NOT EXISTS user_active_profile (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('worker', 'personal', 'organisation')),
  org_id       UUID REFERENCES organizations(id) ON DELETE SET NULL,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION _update_user_active_profile_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_active_profile_ts ON user_active_profile;
CREATE TRIGGER trg_user_active_profile_ts
  BEFORE UPDATE ON user_active_profile
  FOR EACH ROW EXECUTE FUNCTION _update_user_active_profile_ts();

-- RLS
ALTER TABLE user_active_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active profile"
  ON user_active_profile FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own active profile"
  ON user_active_profile FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own active profile"
  ON user_active_profile FOR UPDATE
  USING (user_id = auth.uid());

COMMENT ON TABLE user_active_profile IS
'Stores the currently active profile mode per user. SQL-queryable alternative to user_metadata JSONB. Upserted by PUT /users/me/active-profile.';
COMMENT ON COLUMN user_active_profile.profile_type IS 'Active mode: worker, personal, or organisation';
COMMENT ON COLUMN user_active_profile.org_id       IS 'When profile_type=organisation, the currently active org UUID';
