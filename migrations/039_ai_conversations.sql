-- ============================================
-- MIGRATION 039: AI Assistant Chat
-- NEW: ai_conversations, ai_messages
-- Completely separate from job conversations/messages
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  context     JSONB DEFAULT '{}'::jsonb,
  -- e.g. { "profile_type": "worker", "org_id": null, "intent": "find_job" }
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content             TEXT NOT NULL,
  -- Structured actions the AI took or requested
  actions             JSONB DEFAULT '[]'::jsonb,
  -- e.g. [{ "type": "find_jobs", "params": { "category": "construction" } }]
  metadata            JSONB DEFAULT '{}'::jsonb,
  tokens_used         INTEGER,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_active ON ai_conversations(user_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_messages(conversation_id, created_at);

-- Trigger
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view messages in their AI conversations"
  ON ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
        AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their AI conversations"
  ON ai_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations ac
      WHERE ac.id = ai_messages.conversation_id
        AND ac.user_id = auth.uid()
    )
  );

COMMENT ON TABLE ai_conversations IS 'AI assistant chat sessions. SEPARATE from job conversations/messages.';
COMMENT ON TABLE ai_messages IS 'Individual messages within an AI assistant conversation.';
COMMENT ON COLUMN ai_messages.actions IS 'Structured actions taken by the AI (job search, shift booking, etc.)';
