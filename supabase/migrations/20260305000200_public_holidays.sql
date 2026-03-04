-- MIGRATION: Public Holidays
-- Stores public holiday dates per country/region with rate multipliers.
-- Used for holiday detection when creating jobs/shifts.

CREATE TABLE IF NOT EXISTS public_holidays (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    TEXT NOT NULL,
  region_code     TEXT,  -- NULL = nationwide holiday
  name            TEXT NOT NULL,
  holiday_date    DATE NOT NULL,
  rate_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.50,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one holiday per country + region + date
-- For region-specific holidays
ALTER TABLE public_holidays
  ADD CONSTRAINT uq_public_holidays_country_region_date
  UNIQUE (country_code, region_code, holiday_date);

-- For nationwide holidays (region_code IS NULL), the above UNIQUE won't catch duplicates
-- so we need a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_holidays_unique_nationwide
  ON public_holidays(country_code, holiday_date)
  WHERE region_code IS NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_public_holidays_updated_at ON public_holidays;
CREATE TRIGGER update_public_holidays_updated_at
  BEFORE UPDATE ON public_holidays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: everyone can read active holidays
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active holidays"
  ON public_holidays FOR SELECT
  USING (is_active = TRUE);

-- Index for date range lookups
CREATE INDEX IF NOT EXISTS idx_public_holidays_country_date
  ON public_holidays(country_code, holiday_date);

COMMENT ON TABLE public_holidays IS 'Public holiday dates per country/region with rate multipliers for pay calculations';
COMMENT ON COLUMN public_holidays.region_code IS 'Region/state code. NULL means the holiday is nationwide.';
COMMENT ON COLUMN public_holidays.rate_multiplier IS 'Pay rate multiplier for this holiday (e.g. 1.50 = time and a half)';

-- Seed NZ 2026 public holidays (nationwide)
INSERT INTO public_holidays (country_code, name, holiday_date, rate_multiplier)
VALUES
  ('NZ', 'New Year''s Day',          '2026-01-01', 1.50),
  ('NZ', 'Day after New Year''s',    '2026-01-02', 1.50),
  ('NZ', 'Waitangi Day',             '2026-02-06', 1.50),
  ('NZ', 'Good Friday',              '2026-04-03', 1.50),
  ('NZ', 'Easter Monday',            '2026-04-06', 1.50),
  ('NZ', 'ANZAC Day',                '2026-04-25', 1.50),
  ('NZ', 'King''s Birthday',         '2026-06-01', 1.50),
  ('NZ', 'Matariki',                 '2026-07-10', 1.50),
  ('NZ', 'Labour Day',               '2026-10-26', 1.50),
  ('NZ', 'Christmas Day',            '2026-12-25', 1.50),
  ('NZ', 'Boxing Day',               '2026-12-26', 1.50);
