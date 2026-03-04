CREATE OR REPLACE FUNCTION sync_worker_badge_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_codes text[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  SELECT COALESCE(array_agg(vbc.badge_key) FILTER (WHERE vbc.badge_key IS NOT NULL), '{}')
  INTO v_codes
  FROM user_badges ub
  JOIN verification_badge_configs vbc ON vbc.id = ub.badge_config_id
  WHERE ub.user_id = v_user_id
    AND ub.is_active = true
    AND (ub.expires_at IS NULL OR ub.expires_at > CURRENT_TIMESTAMP)
    AND vbc.is_active = true;

  UPDATE worker_profiles
  SET badge_codes = COALESCE(v_codes, '{}')
  WHERE user_id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_user_badges_sync_worker_badge_codes
  AFTER INSERT OR UPDATE OF is_active, expires_at OR DELETE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION sync_worker_badge_codes();
