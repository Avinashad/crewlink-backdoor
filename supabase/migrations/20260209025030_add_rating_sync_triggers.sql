CREATE OR REPLACE FUNCTION sync_worker_rating_from_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_avg numeric;
  v_cnt bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.reviewee_user_id;
  ELSE
    v_user_id := NEW.reviewee_user_id;
  END IF;

  IF v_user_id IS NULL OR (TG_OP IN ('INSERT','UPDATE') AND NEW.reviewee_type != 'worker') OR (TG_OP = 'DELETE' AND OLD.reviewee_type != 'worker') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT AVG(rating)::numeric, COUNT(*)
  INTO v_avg, v_cnt
  FROM reviews
  WHERE reviewee_type = 'worker' AND reviewee_user_id = v_user_id AND is_public IS NOT FALSE;

  UPDATE worker_profiles
  SET rating_avg = COALESCE(v_avg, 0),
      rating_count = COALESCE(v_cnt::int, 0)
  WHERE user_id = v_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION sync_org_rating_from_reviews()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_avg numeric;
  v_cnt bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.reviewee_org_id;
  ELSE
    v_org_id := NEW.reviewee_org_id;
  END IF;

  IF v_org_id IS NULL OR (TG_OP IN ('INSERT','UPDATE') AND NEW.reviewee_type != 'organization') OR (TG_OP = 'DELETE' AND OLD.reviewee_type != 'organization') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT AVG(rating)::numeric, COUNT(*)
  INTO v_avg, v_cnt
  FROM reviews
  WHERE reviewee_type = 'organization' AND reviewee_org_id = v_org_id AND is_public IS NOT FALSE;

  UPDATE organizations
  SET rating_avg = COALESCE(v_avg, 0),
      rating_count = COALESCE(v_cnt::int, 0)
  WHERE id = v_org_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_reviews_sync_worker_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_worker_rating_from_reviews();

CREATE TRIGGER trg_reviews_sync_org_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION sync_org_rating_from_reviews();
