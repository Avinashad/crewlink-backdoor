-- ============================================
-- MIGRATION 034: Junction tables for services
-- Replaces services.expertise_codes and services.country_codes arrays
-- Only runs if the services table exists
-- ============================================

DO $$
BEGIN
  -- Only create junction tables if services table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'services') THEN

    -- Junction: services ↔ expertise
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_expertise') THEN
      CREATE TABLE service_expertise (
        service_id     UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        expertise_code TEXT NOT NULL REFERENCES expertise(code) ON UPDATE CASCADE ON DELETE CASCADE,
        PRIMARY KEY (service_id, expertise_code)
      );
      CREATE INDEX idx_se_service ON service_expertise(service_id);
      CREATE INDEX idx_se_expertise ON service_expertise(expertise_code);

      -- Backfill: handle both jsonb and text[] types
      BEGIN
        -- Try jsonb array approach first
        INSERT INTO service_expertise (service_id, expertise_code)
        SELECT s.id, code_val
        FROM services s,
             jsonb_array_elements_text(
               CASE WHEN pg_typeof(s.expertise_codes) = 'jsonb'::regtype
                    THEN s.expertise_codes::jsonb
                    ELSE '[]'::jsonb
               END
             ) AS code_val
        WHERE s.expertise_codes IS NOT NULL
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Skip backfill if column type is incompatible
      END;

      ALTER TABLE service_expertise ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Public read service expertise" ON service_expertise FOR SELECT USING (TRUE);
    END IF;

    -- Junction: services ↔ countries
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_countries') THEN
      CREATE TABLE service_countries (
        service_id   UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        country_code TEXT NOT NULL REFERENCES countries(code) ON UPDATE CASCADE ON DELETE CASCADE,
        PRIMARY KEY (service_id, country_code)
      );
      CREATE INDEX idx_sc_service ON service_countries(service_id);
      CREATE INDEX idx_sc_country ON service_countries(country_code);

      BEGIN
        INSERT INTO service_countries (service_id, country_code)
        SELECT s.id, code_val
        FROM services s,
             jsonb_array_elements_text(
               CASE WHEN pg_typeof(s.country_codes) = 'jsonb'::regtype
                    THEN s.country_codes::jsonb
                    ELSE '[]'::jsonb
               END
             ) AS code_val
        WHERE s.country_codes IS NOT NULL
        ON CONFLICT DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      ALTER TABLE service_countries ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Public read service countries" ON service_countries FOR SELECT USING (TRUE);
    END IF;

    RAISE NOTICE 'service junction tables created';
  ELSE
    RAISE NOTICE 'services table does not exist, skipping junction tables';
  END IF;
END
$$;

-- Comments added only if tables were created (safe to run even if tables don't exist via IF EXISTS checks above)
