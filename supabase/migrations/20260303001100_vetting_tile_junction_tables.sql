-- ============================================
-- MIGRATION 035: Junction tables for vetting_tiles
-- Replaces vetting_tiles.expertise_codes and vetting_tiles.country_codes arrays
-- Only runs if vetting_tiles table exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vetting_tiles') THEN

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vetting_tile_expertise') THEN
      CREATE TABLE vetting_tile_expertise (
        vetting_tile_id UUID NOT NULL REFERENCES vetting_tiles(id) ON DELETE CASCADE,
        expertise_code  TEXT NOT NULL REFERENCES expertise(code) ON UPDATE CASCADE ON DELETE CASCADE,
        PRIMARY KEY (vetting_tile_id, expertise_code)
      );
      CREATE INDEX idx_vte_tile      ON vetting_tile_expertise(vetting_tile_id);
      CREATE INDEX idx_vte_expertise ON vetting_tile_expertise(expertise_code);
      ALTER TABLE vetting_tile_expertise ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Anyone can view vetting tile expertise" ON vetting_tile_expertise FOR SELECT USING (TRUE);
    END IF;

    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vetting_tile_countries') THEN
      CREATE TABLE vetting_tile_countries (
        vetting_tile_id UUID NOT NULL REFERENCES vetting_tiles(id) ON DELETE CASCADE,
        country_code    TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE ON DELETE CASCADE,
        PRIMARY KEY (vetting_tile_id, country_code)
      );
      CREATE INDEX idx_vtc_tile    ON vetting_tile_countries(vetting_tile_id);
      CREATE INDEX idx_vtc_country ON vetting_tile_countries(country_code);
      ALTER TABLE vetting_tile_countries ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Anyone can view vetting tile countries" ON vetting_tile_countries FOR SELECT USING (TRUE);
    END IF;

    -- Backfill: try to copy from existing array columns (handle both jsonb and text[])
    BEGIN
      -- For expertise_codes (jsonb)
      INSERT INTO vetting_tile_expertise (vetting_tile_id, expertise_code)
      SELECT vt.id, code_val
      FROM vetting_tiles vt,
           jsonb_array_elements_text(vt.expertise_codes) AS code_val
      WHERE vt.expertise_codes IS NOT NULL
        AND vt.expertise_codes != 'null'::jsonb
        AND jsonb_array_length(vt.expertise_codes) > 0
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      -- For country_codes (jsonb)
      INSERT INTO vetting_tile_countries (vetting_tile_id, country_code)
      SELECT vt.id, code_val
      FROM vetting_tiles vt,
           jsonb_array_elements_text(vt.country_codes) AS code_val
      WHERE vt.country_codes IS NOT NULL
        AND vt.country_codes != 'null'::jsonb
        AND jsonb_array_length(vt.country_codes) > 0
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RAISE NOTICE 'vetting_tile junction tables created';
  ELSE
    RAISE NOTICE 'vetting_tiles table does not exist, skipping junction tables';
  END IF;
END
$$;
