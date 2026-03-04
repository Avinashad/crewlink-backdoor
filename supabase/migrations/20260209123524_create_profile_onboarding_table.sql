-- Profile onboarding table to store worker onboarding data
CREATE TABLE IF NOT EXISTS profile_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  onboarding_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_onboarding_user_id ON profile_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_onboarding_status ON profile_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_profile_onboarding_submitted_at ON profile_onboarding(submitted_at);

DROP TRIGGER IF EXISTS update_profile_onboarding_updated_at ON profile_onboarding;
CREATE TRIGGER update_profile_onboarding_updated_at 
  BEFORE UPDATE ON profile_onboarding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE profile_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding" 
  ON profile_onboarding FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding" 
  ON profile_onboarding FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding" 
  ON profile_onboarding FOR UPDATE 
  USING (user_id = auth.uid());

COMMENT ON TABLE profile_onboarding IS 
'Stores worker onboarding data including countries, expertise, questions/answers, services, and vetting information in JSONB format';

COMMENT ON COLUMN profile_onboarding.onboarding_data IS 
'JSONB structure containing: countries[], expertiseCodes[], questions[], services{preSelected[], manual[]}, vetting[]';
