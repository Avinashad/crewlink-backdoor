-- ============================================
-- MIGRATION 035: Junction tables for vetting_tiles
-- Replaces vetting_tiles.expertise_codes and vetting_tiles.country_codes JSONB arrays
-- ============================================

-- Junction: vetting_tiles ↔ expertise
CREATE TABLE IF NOT EXISTS vetting_tile_expertise (
  vetting_tile_id UUID NOT NULL REFERENCES vetting_tiles(id) ON DELETE CASCADE,
  expertise_code  TEXT NOT NULL REFERENCES expertise(code) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (vetting_tile_id, expertise_code)
);

CREATE INDEX IF NOT EXISTS idx_vte_tile      ON vetting_tile_expertise(vetting_tile_id);
CREATE INDEX IF NOT EXISTS idx_vte_expertise ON vetting_tile_expertise(expertise_code);

-- Junction: vetting_tiles ↔ countries
CREATE TABLE IF NOT EXISTS vetting_tile_countries (
  vetting_tile_id UUID NOT NULL REFERENCES vetting_tiles(id) ON DELETE CASCADE,
  country_code    TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (vetting_tile_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_vtc_tile    ON vetting_tile_countries(vetting_tile_id);
CREATE INDEX IF NOT EXISTS idx_vtc_country ON vetting_tile_countries(country_code);

-- Backfill vetting_tile_expertise from vetting_tiles.expertise_codes JSONB
INSERT INTO vetting_tile_expertise (vetting_tile_id, expertise_code)
SELECT
  vt.id,
  code_val::TEXT
FROM vetting_tiles vt,
     jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(vt.expertise_codes) = 'array' THEN vt.expertise_codes ELSE '[]'::jsonb END
     ) AS code_val
WHERE vt.expertise_codes IS NOT NULL
  AND jsonb_typeof(vt.expertise_codes) = 'array'
ON CONFLICT DO NOTHING;

-- Backfill vetting_tile_countries from vetting_tiles.country_codes JSONB
INSERT INTO vetting_tile_countries (vetting_tile_id, country_code)
SELECT
  vt.id,
  code_val::TEXT
FROM vetting_tiles vt,
     jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(vt.country_codes) = 'array' THEN vt.country_codes ELSE '[]'::jsonb END
     ) AS code_val
WHERE vt.country_codes IS NOT NULL
  AND jsonb_typeof(vt.country_codes) = 'array'
ON CONFLICT DO NOTHING;

-- RLS (public read — vetting tiles are reference data)
ALTER TABLE vetting_tile_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetting_tile_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vetting tile expertise" ON vetting_tile_expertise FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can view vetting tile countries" ON vetting_tile_countries FOR SELECT USING (TRUE);

COMMENT ON TABLE vetting_tile_expertise IS 'Junction: vetting_tiles ↔ expertise codes. Replaces expertise_codes JSONB in vetting_tiles.';
COMMENT ON TABLE vetting_tile_countries IS 'Junction: vetting_tiles ↔ country codes. Replaces country_codes JSONB in vetting_tiles.';
