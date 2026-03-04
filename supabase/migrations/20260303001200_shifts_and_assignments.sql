-- ============================================
-- MIGRATION 036: Shift & Roster Management
-- NEW: shifts, shift_assignments
-- Depends on: migration 030 (job_posts.start_date exists)
-- ============================================

-- Shifts table: one shift = one scheduled work block for a job post
CREATE TABLE IF NOT EXISTS shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id     UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT,
  shift_date      DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   INTEGER DEFAULT 0,
  location_note   TEXT,
  workers_needed  INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  pay_rate        NUMERIC(10,2),
  pay_rate_type   TEXT CHECK (pay_rate_type IN ('hourly', 'fixed')) DEFAULT 'hourly',
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shift assignments: one row per worker assigned to a shift
CREATE TABLE IF NOT EXISTS shift_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id        UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  worker_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'assigned'
                  CHECK (status IN ('assigned', 'confirmed', 'declined', 'no_show', 'completed')),
  confirmed_at    TIMESTAMP WITH TIME ZONE,
  check_in_at     TIMESTAMP WITH TIME ZONE,
  check_out_at    TIMESTAMP WITH TIME ZONE,
  actual_minutes  INTEGER,
  notes           TEXT,
  assigned_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (shift_id, worker_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_job_post ON shifts(job_post_id);
CREATE INDEX IF NOT EXISTS idx_shifts_org ON shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_worker ON shift_assignments(worker_user_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_status ON shift_assignments(status);

-- Triggers
DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shift_assignments_updated_at ON shift_assignments;
CREATE TRIGGER update_shift_assignments_updated_at
  BEFORE UPDATE ON shift_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

-- Org members can view/manage shifts for their org
CREATE POLICY "Org members can view shifts"
  ON shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = shifts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can create shifts"
  ON shifts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = shifts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "Org members can update shifts"
  ON shifts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = shifts.org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Workers can view their own shift assignments
CREATE POLICY "Workers can view their own assignments"
  ON shift_assignments FOR SELECT
  USING (worker_user_id = auth.uid());

-- Org members can view assignments for their shifts
CREATE POLICY "Org members can view shift assignments"
  ON shift_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN org_memberships om ON om.org_id = s.org_id
      WHERE s.id = shift_assignments.shift_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Org members can create/update assignments
CREATE POLICY "Org members can manage shift assignments"
  ON shift_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN org_memberships om ON om.org_id = s.org_id
      WHERE s.id = shift_assignments.shift_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Workers can update their own assignment (confirm/decline)
CREATE POLICY "Workers can update their own assignment status"
  ON shift_assignments FOR UPDATE
  USING (worker_user_id = auth.uid());

COMMENT ON TABLE shifts IS 'Individual scheduled work blocks associated with a job post';
COMMENT ON TABLE shift_assignments IS 'Per-worker assignment records for a shift. Workers confirm/decline here.';
