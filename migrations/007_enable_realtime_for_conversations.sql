-- ============================================
-- MIGRATION 7: Enable Supabase Realtime for Conversations and Messages
-- ============================================
-- This migration enables real-time subscriptions for the conversations
-- and messages tables to support live chat functionality.
-- Part of Sprint 5: Real-time Chat and Analytics

-- Enable Realtime for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- Migration Complete!
-- ============================================
-- Next steps:
-- 1. Implement real-time chat UI in the frontend using Supabase Realtime subscriptions
-- 2. Set up push notifications for new messages
-- 3. Test real-time functionality with multiple users
