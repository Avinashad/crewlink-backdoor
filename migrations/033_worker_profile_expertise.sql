-- ============================================
-- MIGRATION 033: worker_profile_expertise junction table
-- Replaces worker_profiles.expertise_codes JSONB array
-- worker_profiles uses user_id as primary key (not id)
-- ============================================

CREATE TABLE IF NOT EXISTS worker_profile_expertise (
  worker_user_id UUID NOT NULL REFERENCES worker_profiles(user_id) ON DELETE CASCADE,
  expertise_code TEXT NOT NULL REFERENCES expertise(code) ON UPDATE CASCADE ON DELETE CASCADE,
  is_primary     BOOLEAN DEFAULT FALSE,
  added_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (worker_user_id, expertise_code)
);

CREATE INDEX IF NOT EXISTS idx_wpe_worker_user ON worker_profile_expertise(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_wpe_expertise_code ON worker_profile_expertise(expertise_code);

-- Backfill from existing JSONB expertise_codes array
INSERT INTO worker_profile_expertise (worker_user_id, expertise_code)
SELECT
  wp.user_id,
  code_val::TEXT
FROM worker_profiles wp,
     jsonb_array_elements_text(
       CASE
         WHEN jsonb_typeof(wp.expertise_codes) = 'array' THEN wp.expertise_codes
         ELSE '[]'::jsonb
       END
     ) AS code_val
WHERE wp.expertise_codes IS NOT NULL
  AND jsonb_typeof(wp.expertise_codes) = 'array'
  AND jsonb_array_length(wp.expertise_codes) > 0
ON CONFLICT (worker_user_id, expertise_code) DO NOTHING;

-- RLS
ALTER TABLE worker_profile_expertise ENABLE ROW LEVEL SECURITY;

-- Workers manage their own expertise
CREATE POLICY "Workers can manage their own expertise"
  ON worker_profile_expertise FOR ALL
  USING (worker_user_id = auth.uid());

-- Public read (for job matching, search)
CREATE POLICY "Anyone can view worker expertise"
  ON worker_profile_expertise FOR SELECT
  USING (TRUE);

COMMENT ON TABLE worker_profile_expertise IS
'Junction: worker profiles ↔ expertise codes. Replaces expertise_codes JSONB array in worker_profiles.';
COMMENT ON COLUMN worker_profile_expertise.is_primary IS 'True if this is the worker primary/main expertise area';
