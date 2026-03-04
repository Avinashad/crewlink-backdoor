-- RPC for worker search with PostGIS radius filter.
-- When radius_km, lat, lng are provided, filters workers within that radius.
-- Returns same shape as worker_search_mv + distance_km.
CREATE OR REPLACE FUNCTION search_workers_nearby(
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
  p_wage_max numeric DEFAULT NULL,
  p_preferred_nationality_codes text[] DEFAULT NULL,
  p_sort_by text DEFAULT 'rating_avg',
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  profile_image_url text,
  nationality_code text,
  market_country text,
  expertise_codes text[],
  available_days text[],
  wage_min numeric,
  wage_max numeric,
  wage_currency text,
  work_visa_type text,
  work_visa_expiry date,
  work_visa_verified boolean,
  verification_level text,
  badge_codes text[],
  rating_avg numeric,
  rating_count integer,
  total_experience_years integer,
  total_jobs_completed integer,
  location geography,
  profile_completeness integer,
  city text,
  state text,
  postal_code text,
  address_country text,
  past_org_ids uuid[],
  language_codes text[],
  distance_km double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_point geography;
BEGIN
  IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    m.first_name,
    m.last_name,
    m.display_name,
    m.profile_image_url,
    m.nationality_code,
    m.market_country,
    m.expertise_codes,
    m.available_days,
    m.wage_min,
    m.wage_max,
    m.wage_currency,
    m.work_visa_type,
    m.work_visa_expiry,
    m.work_visa_verified,
    m.verification_level,
    m.badge_codes,
    m.rating_avg,
    m.rating_count,
    m.total_experience_years,
    m.total_jobs_completed,
    m.location,
    m.profile_completeness,
    m.city,
    m.state,
    m.postal_code,
    m.address_country,
    m.past_org_ids,
    m.language_codes,
    CASE WHEN v_point IS NOT NULL AND m.location IS NOT NULL
      THEN (ST_Distance(m.location, v_point) / 1000.0)::double precision
      ELSE NULL
    END AS distance_km
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
    AND (p_wage_max IS NULL OR m.wage_min IS NULL OR m.wage_min <= p_wage_max)
  ORDER BY
    CASE WHEN p_sort_by = 'distance' AND v_point IS NOT NULL AND m.location IS NOT NULL
      THEN ST_Distance(m.location, v_point)
      ELSE NULL
    END NULLS LAST,
    CASE WHEN p_sort_by = 'distance' THEN NULL ELSE 1 END,
    CASE WHEN p_sort_by = 'completeness' THEN m.profile_completeness ELSE NULL END DESC NULLS LAST,
    m.rating_avg DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
