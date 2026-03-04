-- ============================================
-- MIGRATION 047: Training Module Items
-- NEW: training_module_items table
-- Ordered content blocks within a training module
-- Depends on: migration 046 (training_modules)
-- ============================================

CREATE TABLE IF NOT EXISTS training_module_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('video', 'quiz', 'document', 'declaration')),
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  -- Type-specific content stored as JSONB:
  -- video:       { url, duration_seconds, thumbnail_url }
  -- quiz:        { questions:[{id,text,type,options:[{id,text}],correct_option_id,points}], pass_threshold }
  -- document:    { file_url, file_name, file_size_bytes, must_download }
  -- declaration: { text, require_signature, fields:[{key,label,type,required}] }
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tmi_module    ON training_module_items(module_id);
CREATE INDEX IF NOT EXISTS idx_tmi_sort      ON training_module_items(module_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_tmi_type      ON training_module_items(item_type);

-- Trigger
DROP TRIGGER IF EXISTS update_training_module_items_updated_at ON training_module_items;
CREATE TRIGGER update_training_module_items_updated_at
  BEFORE UPDATE ON training_module_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE training_module_items ENABLE ROW LEVEL SECURITY;

-- NOTE: "Workers can view invited module items" policy added in migration 049
-- (after module_invitations table is created)

-- Org members can view items in their org's modules
CREATE POLICY "Org members can view module items"
  ON training_module_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_modules tm
      JOIN org_memberships om ON om.org_id = tm.org_id
      WHERE tm.id = training_module_items.module_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM training_modules tm
      WHERE tm.id = training_module_items.module_id
        AND tm.is_platform = TRUE
    )
  );

-- Org admins can manage module items
CREATE POLICY "Org admins can manage module items"
  ON training_module_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM training_modules tm
      JOIN org_memberships om ON om.org_id = tm.org_id
      WHERE tm.id = training_module_items.module_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin')
    )
  );

COMMENT ON TABLE training_module_items IS 'Ordered content blocks within a training module. Each item has a type-specific content JSONB payload.';
COMMENT ON COLUMN training_module_items.item_type IS 'Content type: video, quiz, document, or declaration';
COMMENT ON COLUMN training_module_items.content   IS
'Type-specific payload:
  video:       { url, duration_seconds, thumbnail_url }
  quiz:        { questions:[{id,text,type,options,correct_option_id,points}], pass_threshold }
  document:    { file_url, file_name, file_size_bytes, must_download }
  declaration: { text, require_signature, fields:[{key,label,type,required}] }';
