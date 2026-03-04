-- ============================================
-- MIGRATION 6: Conversations and Messages System
-- ============================================
-- This migration creates tables for real-time chat between
-- job applicants and organizations after an application is submitted.
-- Part of Sprint 5: Real-time Chat and Analytics

-- Create conversations table
-- Each conversation is linked to a job application
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(application_id) -- One conversation per application
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_application_id ON conversations(application_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Create updated_at triggers
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at when a new message is created
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation's last_message_at when a message is inserted
DROP TRIGGER IF EXISTS update_conversation_on_new_message ON messages;
CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Applicants can view conversations for their own applications
CREATE POLICY "Applicants can view their conversation"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_applications ja
      WHERE ja.id = conversations.application_id
      AND ja.applicant_id = auth.uid()
    )
  );

-- Org members can view conversations for applications to their organization's jobs
CREATE POLICY "Org members can view conversations for their jobs"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_applications ja
      JOIN job_posts jp ON jp.id = ja.job_post_id
      JOIN org_memberships om ON om.org_id = jp.org_id
      WHERE ja.id = conversations.application_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- System can create conversations (via trigger or application acceptance)
-- We'll allow applicants and org members to create conversations
-- when an application status changes to accepted or shortlisted
CREATE POLICY "Users can create conversations for accepted applications"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_applications ja
      WHERE ja.id = conversations.application_id
      AND (
        -- Applicant can create if application is accepted/shortlisted
        (ja.applicant_id = auth.uid() AND ja.status IN ('accepted', 'shortlisted'))
        OR
        -- Org member can create if application is accepted/shortlisted
        EXISTS (
          SELECT 1 FROM job_posts jp
          JOIN org_memberships om ON om.org_id = jp.org_id
          WHERE jp.id = ja.job_post_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
          AND ja.status IN ('accepted', 'shortlisted')
        )
      )
    )
  );

-- RLS Policies for messages
-- Users can view messages in conversations they have access to
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN job_applications ja ON ja.id = c.application_id
      WHERE c.id = messages.conversation_id
      AND (
        -- Applicant can view
        ja.applicant_id = auth.uid()
        OR
        -- Org member can view
        EXISTS (
          SELECT 1 FROM job_posts jp
          JOIN org_memberships om ON om.org_id = jp.org_id
          WHERE jp.id = ja.job_post_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- Users can create messages in conversations they have access to
CREATE POLICY "Users can create messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      JOIN job_applications ja ON ja.id = c.application_id
      WHERE c.id = messages.conversation_id
      AND (
        -- Applicant can send
        ja.applicant_id = auth.uid()
        OR
        -- Org member can send
        EXISTS (
          SELECT 1 FROM job_posts jp
          JOIN org_memberships om ON om.org_id = jp.org_id
          WHERE jp.id = ja.job_post_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- Users can update their own messages (for editing)
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      JOIN job_applications ja ON ja.id = c.application_id
      WHERE c.id = messages.conversation_id
      AND (
        ja.applicant_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM job_posts jp
          JOIN org_memberships om ON om.org_id = jp.org_id
          WHERE jp.id = ja.job_post_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
        )
      )
    )
  );

-- ============================================
-- Migration Complete!
-- ============================================
-- Next steps:
-- 1. Enable Supabase Realtime for these tables:
--    - ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
--    - ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- 2. Implement real-time chat UI in the frontend
-- 3. Set up push notifications for new messages
