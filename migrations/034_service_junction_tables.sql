-- ============================================
-- MIGRATION 034: Junction tables for services
-- Replaces services.expertise_codes and services.country_codes JSONB arrays
-- ============================================

-- Junction: services ↔ expertise
CREATE TABLE IF NOT EXISTS service_expertise (
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  expertise_code TEXT NOT NULL REFERENCES expertise(code) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (service_id, expertise_code)
);

CREATE INDEX IF NOT EXISTS idx_se_service   ON service_expertise(service_id);
CREATE INDEX IF NOT EXISTS idx_se_expertise ON service_expertise(expertise_code);

-- Junction: services ↔ countries
CREATE TABLE IF NOT EXISTS service_countries (
  service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (service_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_sc_service ON service_countries(service_id);
CREATE INDEX IF NOT EXISTS idx_sc_country ON service_countries(country_code);

-- Backfill service_expertise from services.expertise_codes JSONB
INSERT INTO service_expertise (service_id, expertise_code)
SELECT
  s.id,
  code_val::TEXT
FROM services s,
     jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(s.expertise_codes) = 'array' THEN s.expertise_codes ELSE '[]'::jsonb END
     ) AS code_val
WHERE s.expertise_codes IS NOT NULL
  AND jsonb_typeof(s.expertise_codes) = 'array'
ON CONFLICT DO NOTHING;

-- Backfill service_countries from services.country_codes JSONB
INSERT INTO service_countries (service_id, country_code)
SELECT
  s.id,
  code_val::TEXT
FROM services s,
     jsonb_array_elements_text(
       CASE WHEN jsonb_typeof(s.country_codes) = 'array' THEN s.country_codes ELSE '[]'::jsonb END
     ) AS code_val
WHERE s.country_codes IS NOT NULL
  AND jsonb_typeof(s.country_codes) = 'array'
ON CONFLICT DO NOTHING;

-- RLS (public read — services are reference data)
ALTER TABLE service_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service expertise" ON service_expertise FOR SELECT USING (TRUE);
CREATE POLICY "Anyone can view service countries" ON service_countries FOR SELECT USING (TRUE);

COMMENT ON TABLE service_expertise IS 'Junction: services ↔ expertise codes. Replaces expertise_codes JSONB in services.';
COMMENT ON TABLE service_countries IS 'Junction: services ↔ country codes. Replaces country_codes JSONB in services.';
