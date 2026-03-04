CREATE OR REPLACE FUNCTION search_workers_nearby_count(
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT NULL,
  p_expertise_codes text[] DEFAULT NULL,
  p_available_days text[] DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_worked_for_org_id uuid DEFAULT NULL,
  p_verification_levels text[] DEFAULT NULL,
  p_required_badge_codes text[] DEFAULT NULL,
  p_visa_type text DEFAULT NULL,
  p_visa_valid boolean DEFAULT NULL,
  p_wage_min numeric DEFAULT NULL,
  p_wage_max numeric DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point geography;
  v_count bigint;
BEGIN
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM worker_search_mv m
  WHERE
    (v_point IS NULL OR p_radius_km IS NULL OR m.location IS NULL OR
     ST_DWithin(m.location, v_point, p_radius_km * 1000.0))
    AND (p_expertise_codes IS NULL OR m.expertise_codes && p_expertise_codes)
    AND (p_available_days IS NULL OR m.available_days && p_available_days)
    AND (p_min_rating IS NULL OR m.rating_avg >= p_min_rating)
    AND (p_worked_for_org_id IS NULL OR p_worked_for_org_id = ANY(m.past_org_ids))
    AND (p_verification_levels IS NULL OR m.verification_level = ANY(p_verification_levels))
    AND (p_required_badge_codes IS NULL OR m.badge_codes @> p_required_badge_codes)
    AND (p_visa_type IS NULL OR m.work_visa_type = p_visa_type)
    AND (p_visa_valid IS NULL OR NOT p_visa_valid OR (m.work_visa_expiry IS NOT NULL AND m.work_visa_expiry > CURRENT_DATE))
    AND (p_wage_min IS NULL OR m.wage_max IS NULL OR m.wage_max >= p_wage_min)
    AND (p_wage_max IS NULL OR m.wage_min IS NULL OR m.wage_min <= p_wage_max);

  RETURN v_count;
END;
$$;
