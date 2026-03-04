-- ============================================
-- MIGRATION 037: Worker Ratings & Reviews
-- NEW: worker_ratings table + worker_rating_summary VIEW
-- Depends on: migration 036 (shift_assignments)
-- ============================================

CREATE TABLE IF NOT EXISTS worker_ratings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
  shift_id            UUID REFERENCES shifts(id) ON DELETE SET NULL,
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_by_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Rating dimensions (1–5 each)
  rating_punctuality  SMALLINT CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_attitude     SMALLINT CHECK (rating_attitude BETWEEN 1 AND 5),
  rating_skills       SMALLINT CHECK (rating_skills BETWEEN 1 AND 5),
  rating_overall      SMALLINT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  -- Text feedback
  feedback            TEXT,
  is_public           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate ratings for same shift assignment
  UNIQUE (shift_assignment_id, rated_by_user_id)
);

-- Aggregate summary view
CREATE OR REPLACE VIEW worker_rating_summary AS
SELECT
  worker_user_id,
  COUNT(*)                                     AS total_ratings,
  ROUND(AVG(rating_overall)::NUMERIC, 2)       AS avg_overall,
  ROUND(AVG(rating_punctuality)::NUMERIC, 2)   AS avg_punctuality,
  ROUND(AVG(rating_attitude)::NUMERIC, 2)      AS avg_attitude,
  ROUND(AVG(rating_skills)::NUMERIC, 2)        AS avg_skills,
  COUNT(*) FILTER (WHERE rating_overall = 5)   AS five_star_count,
  COUNT(*) FILTER (WHERE rating_overall >= 4)  AS four_plus_count
FROM worker_ratings
WHERE is_public = TRUE
GROUP BY worker_user_id;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_worker_ratings_worker ON worker_ratings(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_worker_ratings_org ON worker_ratings(org_id);
CREATE INDEX IF NOT EXISTS idx_worker_ratings_shift ON worker_ratings(shift_id);

-- Trigger
DROP TRIGGER IF EXISTS update_worker_ratings_updated_at ON worker_ratings;
CREATE TRIGGER update_worker_ratings_updated_at
  BEFORE UPDATE ON worker_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE worker_ratings ENABLE ROW LEVEL SECURITY;

-- Workers can view their own ratings
CREATE POLICY "Workers can view their own ratings"
  ON worker_ratings FOR SELECT
  USING (worker_user_id = auth.uid() OR is_public = TRUE);

-- Org members can create and view ratings for their org
CREATE POLICY "Org members can create ratings"
  ON worker_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = worker_ratings.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    AND rated_by_user_id = auth.uid()
  );

CREATE POLICY "Org members can view ratings they created"
  ON worker_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = worker_ratings.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

COMMENT ON TABLE worker_ratings IS 'Post-shift ratings given by org members about workers';
COMMENT ON VIEW worker_rating_summary IS 'Aggregate rating stats per worker across all public ratings';
