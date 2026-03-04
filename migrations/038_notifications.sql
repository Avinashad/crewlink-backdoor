-- ============================================
-- MIGRATION 038: Notifications
-- NEW: notifications table with Supabase Realtime support
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  -- e.g. 'shift_assigned', 'application_accepted', 'module_invite',
  --      'new_message', 'rating_received', 'application_shortlisted'
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}'::jsonb,
  -- Links to relevant entities
  ref_type        TEXT,  -- 'shift', 'job_application', 'module_invitation', 'conversation', etc.
  ref_id          UUID,
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable Realtime replication for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Backend service role inserts notifications; no direct INSERT policy for users
-- (Backend uses service role to create notifications)

COMMENT ON TABLE notifications IS 'In-app notification inbox. Supabase Realtime enabled for push delivery.';
COMMENT ON COLUMN notifications.type IS 'Notification type slug: shift_assigned, application_accepted, module_invite, new_message, rating_received, etc.';
COMMENT ON COLUMN notifications.data IS 'Arbitrary payload for the notification (e.g. shift details, org name)';
COMMENT ON COLUMN notifications.ref_type IS 'Entity type this notification relates to';
COMMENT ON COLUMN notifications.ref_id IS 'UUID of the referenced entity';
