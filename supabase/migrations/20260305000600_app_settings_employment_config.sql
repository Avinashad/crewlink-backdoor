-- MIGRATION: Seed app_settings.config with employment/tax defaults
-- Uses jsonb || merge so existing config keys are preserved.
-- These values are used by the frontend budget calculator.

UPDATE app_settings
SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object(
  'minimum_wage', 23.15,
  'gst_rate', 15.0,
  'acc_levy_rate', 1.39,
  'holiday_pay_rate', 8.0,
  'default_holiday_rate_multiplier', 1.5
)
WHERE id = 1;

COMMENT ON TABLE app_settings IS 'Application-wide settings. config JSONB includes employment/tax fields: minimum_wage, gst_rate, acc_levy_rate, holiday_pay_rate, default_holiday_rate_multiplier';
