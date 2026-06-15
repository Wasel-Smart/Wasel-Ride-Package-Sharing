-- ═══════════════════════════════════════════════════════════
-- Wasel | واصل — PostGIS Functions & Stored Procedures
-- Version: 1.0.0
-- Date: February 24, 2026
-- ═══════════════════════════════════════════════════════════

-- Run this after the main schema migration

-- ─────────────────────────────────────────────────────────────
-- 🗺️ Geolocation Functions
-- ─────────────────────────────────────────────────────────────

/**
 * Find nearby drivers within a radius
 * Used by ride matching algorithm
 */
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_km FLOAT DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  vehicle_id UUID,
  distance_km FLOAT,
  rating DECIMAL,
  total_trips INTEGER,
  vehicle_type TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  license_plate TEXT,
  current_lat FLOAT,
  current_lng FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS driver_id,
    d.vehicle_id,
    ST_Distance(
      d.current_location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 AS distance_km,
    d.rating,
    d.total_trips,
    v.vehicle_type,
    v.make AS vehicle_make,
    v.model AS vehicle_model,
    v.color AS vehicle_color,
    v.license_plate,
    ST_Y(d.current_location::geometry) AS current_lat,
    ST_X(d.current_location::geometry) AS current_lng
  FROM drivers d
  INNER JOIN vehicles v ON v.id = d.vehicle_id
  WHERE 
    d.status = 'online'
    AND d.is_available = true
    AND v.is_active = true
    AND d.current_location IS NOT NULL
    AND d.last_location_update > NOW() - INTERVAL '5 minutes'
    AND ST_DWithin(
      d.current_location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Update driver location
 * Called frequently by driver apps
 */
CREATE OR REPLACE FUNCTION update_driver_location(
  p_driver_id UUID,
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_heading FLOAT DEFAULT NULL,
  p_speed FLOAT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE drivers
  SET 
    current_location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    last_location_update = NOW()
  WHERE id = p_driver_id;
  
  -- Also update driver_locations table for trip tracking
  INSERT INTO driver_locations (driver_id, location, heading, speed, updated_at)
  VALUES (
    p_driver_id,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_heading,
    p_speed,
    NOW()
  )
  ON CONFLICT (driver_id) 
  DO UPDATE SET
    location = EXCLUDED.location,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

/**
 * Get drivers in a bounding box (for map display)
 */
CREATE OR REPLACE FUNCTION get_drivers_in_bounds(
  min_lat FLOAT,
  max_lat FLOAT,
  min_lng FLOAT,
  max_lng FLOAT
)
RETURNS TABLE (
  driver_id UUID,
  latitude FLOAT,
  longitude FLOAT,
  heading FLOAT,
  vehicle_type TEXT,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS driver_id,
    ST_Y(d.current_location::geometry) AS latitude,
    ST_X(d.current_location::geometry) AS longitude,
    dl.heading,
    v.vehicle_type,
    d.rating
  FROM drivers d
  LEFT JOIN driver_locations dl ON dl.driver_id = d.id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
  WHERE 
    d.status = 'online'
    AND d.is_available = true
    AND d.current_location IS NOT NULL
    AND ST_Y(d.current_location::geometry) BETWEEN min_lat AND max_lat
    AND ST_X(d.current_location::geometry) BETWEEN min_lng AND max_lng
    AND d.last_location_update > NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 💰 Pricing & Promo Functions
-- ─────────────────────────────────────────────────────────────

/**
 * Increment promo code usage count
 */
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Check if user can use promo code
 */
CREATE OR REPLACE FUNCTION can_use_promo_code(
  p_user_id UUID,
  p_promo_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  promo RECORD;
  user_usage_count INTEGER;
BEGIN
  -- Get promo code details
  SELECT * INTO promo
  FROM promo_codes
  WHERE code = UPPER(p_promo_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW());
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check global usage limit
  IF promo.usage_limit IS NOT NULL AND promo.usage_count >= promo.usage_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Check per-user limit
  SELECT COUNT(*) INTO user_usage_count
  FROM promo_code_usage
  WHERE promo_code_id = promo.id AND user_id = p_user_id;
  
  IF user_usage_count >= promo.per_user_limit THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 📊 Analytics & Reports
-- ─────────────────────────────────────────────────────────────

/**
 * Get driver earnings for a period
 */
CREATE OR REPLACE FUNCTION get_driver_earnings(
  p_driver_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_trips INTEGER,
  total_earnings DECIMAL,
  total_commission DECIMAL,
  net_earnings DECIMAL,
  average_rating DECIMAL,
  total_distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_trips,
    COALESCE(SUM(driver_earnings), 0) AS total_earnings,
    COALESCE(SUM(commission), 0) AS total_commission,
    COALESCE(SUM(driver_earnings) - SUM(commission), 0) AS net_earnings,
    COALESCE(AVG(driver_rating), 0) AS average_rating,
    COALESCE(SUM(distance_km), 0) AS total_distance_km
  FROM trips
  WHERE driver_id = p_driver_id
    AND status = 'completed'
    AND completed_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get platform statistics for admin dashboard
 */
CREATE OR REPLACE FUNCTION get_platform_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_trips INTEGER,
  completed_trips INTEGER,
  cancelled_trips INTEGER,
  total_revenue DECIMAL,
  total_commission DECIMAL,
  average_trip_fare DECIMAL,
  average_trip_distance DECIMAL,
  active_drivers INTEGER,
  active_riders INTEGER,
  average_driver_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_trips,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_trips,
    COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER AS cancelled_trips,
    COALESCE(SUM(total_fare) FILTER (WHERE status = 'completed'), 0) AS total_revenue,
    COALESCE(SUM(commission) FILTER (WHERE status = 'completed'), 0) AS total_commission,
    COALESCE(AVG(total_fare) FILTER (WHERE status = 'completed'), 0) AS average_trip_fare,
    COALESCE(AVG(distance_km) FILTER (WHERE status = 'completed'), 0) AS average_trip_distance,
    (SELECT COUNT(DISTINCT driver_id)::INTEGER FROM trips WHERE created_at BETWEEN p_start_date AND p_end_date) AS active_drivers,
    (SELECT COUNT(DISTINCT rider_id)::INTEGER FROM trips WHERE created_at BETWEEN p_start_date AND p_end_date) AS active_riders,
    COALESCE((SELECT AVG(rating) FROM drivers), 0) AS average_driver_rating
  FROM trips
  WHERE created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get surge pricing data for a location
 */
CREATE OR REPLACE FUNCTION get_surge_data(
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_radius_km FLOAT DEFAULT 5
)
RETURNS TABLE (
  pending_trips INTEGER,
  available_drivers INTEGER,
  demand_supply_ratio FLOAT,
  recommended_surge DECIMAL
) AS $$
DECLARE
  pending INTEGER;
  available INTEGER;
  ratio FLOAT;
  surge DECIMAL;
BEGIN
  -- Count pending trips in area (last 5 minutes)
  SELECT COUNT(*) INTO pending
  FROM trips
  WHERE status = 'pending'
    AND created_at > NOW() - INTERVAL '5 minutes'
    AND ST_DWithin(
      pickup_location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    );
  
  -- Count available drivers in area
  SELECT COUNT(*) INTO available
  FROM drivers
  WHERE status = 'online'
    AND is_available = true
    AND current_location IS NOT NULL
    AND ST_DWithin(
      current_location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    );
  
  -- Calculate ratio
  IF available > 0 THEN
    ratio := pending::FLOAT / available::FLOAT;
  ELSE
    ratio := pending::FLOAT;
  END IF;
  
  -- Determine surge multiplier
  IF ratio >= 3.0 THEN
    surge := 2.0;
  ELSIF ratio >= 2.0 THEN
    surge := 1.5;
  ELSIF ratio >= 1.5 THEN
    surge := 1.3;
  ELSE
    surge := 1.0;
  END IF;
  
  RETURN QUERY SELECT pending, available, ratio, surge;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─────────────────────────────────────────────────────────────
-- 🏆 Loyalty & Gamification
-- ─────────────────────────────────────────────────────────────

/**
 * Award loyalty points for a trip
 */
CREATE OR REPLACE FUNCTION award_trip_points(
  p_user_id UUID,
  p_trip_id UUID,
  p_trip_fare DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
  points_earned INTEGER;
  current_tier TEXT;
BEGIN
  -- Calculate points (1 point per 1 JOD spent)
  points_earned := FLOOR(p_trip_fare);
  
  -- Get current tier
  SELECT tier INTO current_tier
  FROM loyalty_points
  WHERE user_id = p_user_id;
  
  -- Bonus points based on tier
  IF current_tier = 'platinum' THEN
    points_earned := FLOOR(points_earned * 1.5);
  ELSIF current_tier = 'gold' THEN
    points_earned := FLOOR(points_earned * 1.3);
  ELSIF current_tier = 'silver' THEN
    points_earned := FLOOR(points_earned * 1.1);
  END IF;
  
  -- Update loyalty points
  INSERT INTO loyalty_points (user_id, points, lifetime_points, created_at, updated_at)
  VALUES (p_user_id, points_earned, points_earned, NOW(), NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET
    points = loyalty_points.points + points_earned,
    lifetime_points = loyalty_points.lifetime_points + points_earned,
    updated_at = NOW();
  
  -- Record transaction
  INSERT INTO loyalty_transactions (user_id, trip_id, points, type, description, created_at)
  VALUES (p_user_id, p_trip_id, points_earned, 'earned', 'Trip completed', NOW());
  
  -- Update tier if needed
  PERFORM update_loyalty_tier(p_user_id);
  
  RETURN points_earned;
END;
$$ LANGUAGE plpgsql;

/**
 * Update user's loyalty tier based on lifetime points
 */
CREATE OR REPLACE FUNCTION update_loyalty_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  lifetime_pts INTEGER;
  new_tier TEXT;
BEGIN
  SELECT lifetime_points INTO lifetime_pts
  FROM loyalty_points
  WHERE user_id = p_user_id;
  
  IF lifetime_pts >= 10000 THEN
    new_tier := 'platinum';
  ELSIF lifetime_pts >= 5000 THEN
    new_tier := 'gold';
  ELSIF lifetime_pts >= 2000 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  UPDATE loyalty_points
  SET tier = new_tier, updated_at = NOW()
  WHERE user_id = p_user_id AND tier != new_tier;
  
  RETURN new_tier;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 🔔 Notification Functions
-- ─────────────────────────────────────────────────────────────

/**
 * Create notification for user
 */
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data, created_at)
  VALUES (p_user_id, p_title, p_message, p_type, p_data, NOW())
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Mark notifications as read
 */
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    -- Mark all as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific notifications as read
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id 
      AND id = ANY(p_notification_ids)
      AND is_read = false;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 🔐 Security & Audit
-- ─────────────────────────────────────────────────────────────

/**
 * Log API request
 */
CREATE OR REPLACE FUNCTION log_api_request(
  p_endpoint TEXT,
  p_method TEXT,
  p_status_code INTEGER,
  p_response_time INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO api_logs (
    endpoint, method, status_code, response_time, 
    user_id, ip_address, user_agent, created_at
  )
  VALUES (
    p_endpoint, p_method, p_status_code, p_response_time,
    p_user_id, p_ip_address, p_user_agent, NOW()
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Log error
 */
CREATE OR REPLACE FUNCTION log_error(
  p_message TEXT,
  p_stack TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error',
  p_context JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO error_logs (message, stack, severity, context, user_id, created_at)
  VALUES (p_message, p_stack, p_severity, p_context, p_user_id, NOW());
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 📈 Performance Indexes
-- ─────────────────────────────────────────────────────────────

-- Geospatial indexes
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_trips_pickup_location ON trips USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_trips_dropoff_location ON trips USING GIST(dropoff_location);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_drivers_status_available ON drivers(status, is_available) WHERE status = 'online' AND is_available = true;
CREATE INDEX IF NOT EXISTS idx_trips_status_created ON trips(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING GIN(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trips_pickup_address_trgm ON trips USING GIN(pickup_address gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════
-- End of PostGIS Functions
-- ═══════════════════════════════════════════════════════════
