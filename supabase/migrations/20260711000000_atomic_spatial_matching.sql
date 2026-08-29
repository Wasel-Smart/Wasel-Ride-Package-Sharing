-- Migration: 20260711000000_atomic_spatial_matching.sql
--
-- Replaces the string-based city matching in the matching-worker with a
-- PostGIS spatial query and wraps the notification insert + alert status
-- update in a single atomic transaction protected by a PostgreSQL advisory
-- lock to prevent concurrent worker races.
--
-- Prerequisites:
--   - PostGIS extension enabled (CREATE EXTENSION IF NOT EXISTS postgis)
--   - demand_alerts.origin_lat / origin_lng / destination_lat / destination_lng columns
--   - trips.origin_point geography(Point,4326) column with GIST index
--   - trips.destination_point geography(Point,4326) column with GIST index
--
-- Add geo columns to demand_alerts if not present
ALTER TABLE demand_alerts
  ADD COLUMN IF NOT EXISTS origin_lat      double precision,
  ADD COLUMN IF NOT EXISTS origin_lng      double precision,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision;

-- Add geography columns to trips if not present
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_point      geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS destination_point geography(Point, 4326);

-- Back-fill geography columns from existing lat/lng columns (if they exist)
UPDATE trips
SET
  origin_point      = ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography,
  destination_point = ST_SetSRID(ST_MakePoint(dest_lng,   dest_lat),   4326)::geography
WHERE origin_point IS NULL
  AND origin_lat IS NOT NULL
  AND origin_lng IS NOT NULL;

-- Spatial indexes for fast radius queries
CREATE INDEX IF NOT EXISTS idx_trips_origin_point
  ON trips USING GIST (origin_point);

CREATE INDEX IF NOT EXISTS idx_trips_destination_point
  ON trips USING GIST (destination_point);

-- Partial index: only index open trips with available seats (the hot path)
CREATE INDEX IF NOT EXISTS idx_trips_open_available
  ON trips (departure_time, available_seats)
  WHERE trip_status = 'open' AND available_seats > 0 AND deleted_at IS NULL;

-- ── Atomic matching RPC ───────────────────────────────────────────────────────
--
-- match_alert_atomic:
--   1. Acquires a per-alert advisory lock (non-blocking). If another worker
--      already holds the lock, returns immediately with matched=false and
--      a 'lock_not_acquired' hint — the caller skips this alert.
--   2. Re-checks alert status inside the lock (double-checked locking pattern)
--      to handle the race where two workers both passed the outer status check.
--   3. Finds the best matching trip using ST_DWithin spatial index.
--   4. Inserts the notification AND updates the alert status in one statement
--      using a CTE — both are part of the same transaction.
--   5. Returns { matched: true, trip_id } or { matched: false }.

CREATE OR REPLACE FUNCTION match_alert_atomic(
  p_alert_id        uuid,
  p_origin_lat      double precision,
  p_origin_lng      double precision,
  p_destination_lat double precision,
  p_destination_lng double precision,
  p_requested_date  date,
  p_seats_needed    int,
  p_radius_meters   double precision DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key      bigint;
  v_lock_acquired boolean;
  v_alert         demand_alerts%ROWTYPE;
  v_trip          trips%ROWTYPE;
  v_origin        geography;
  v_destination   geography;
BEGIN
  -- Derive a stable 64-bit lock key from the alert UUID
  v_lock_key := ('x' || substr(replace(p_alert_id::text, '-', ''), 1, 16))::bit(64)::bigint;

  -- Non-blocking advisory lock scoped to this transaction
  SELECT pg_try_advisory_xact_lock(v_lock_key) INTO v_lock_acquired;
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'lock_not_acquired');
  END IF;

  -- Double-checked locking: re-read alert status inside the lock
  SELECT * INTO v_alert FROM demand_alerts WHERE alert_id = p_alert_id FOR UPDATE;
  IF NOT FOUND OR v_alert.status <> 'pending' THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'already_processed');
  END IF;

  -- Build geography points for spatial query
  v_origin      := ST_SetSRID(ST_MakePoint(p_origin_lng,      p_origin_lat),      4326)::geography;
  v_destination := ST_SetSRID(ST_MakePoint(p_destination_lng, p_destination_lat), 4326)::geography;

  -- Find the best matching trip:
  --   - Open, not deleted, future departure
  --   - Enough available seats
  --   - Origin within p_radius_meters of requested origin
  --   - Destination within p_radius_meters of requested destination
  --   - Order by departure_time ASC (earliest available first)
  SELECT * INTO v_trip
  FROM trips
  WHERE trip_status    = 'open'
    AND deleted_at     IS NULL
    AND available_seats >= p_seats_needed
    AND departure_time::date = p_requested_date
    AND origin_point      IS NOT NULL
    AND destination_point IS NOT NULL
    AND ST_DWithin(origin_point,      v_origin,      p_radius_meters)
    AND ST_DWithin(destination_point, v_destination, p_radius_meters)
  ORDER BY departure_time ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;  -- skip trips being confirmed by another transaction

  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'no_trip_found');
  END IF;

  -- Atomic: update alert + insert notification in one CTE block
  WITH updated_alert AS (
    UPDATE demand_alerts
    SET
      status          = 'matched',
      matched_trip_id = v_trip.trip_id,
      updated_at      = now()
    WHERE alert_id = p_alert_id
    RETURNING alert_id, user_id, origin_city, destination_city, requested_date
  )
  INSERT INTO notifications (
    user_id, type, title, body, data, created_at
  )
  SELECT
    ua.user_id,
    'trip_match_found',
    'Trip Found!',
    format(
      'A trip from %s to %s is available on %s.',
      COALESCE(ua.origin_city, 'your origin'),
      COALESCE(ua.destination_city, 'your destination'),
      ua.requested_date::text
    ),
    jsonb_build_object(
      'trip_id',  v_trip.trip_id,
      'alert_id', ua.alert_id,
      'departure_time', v_trip.departure_time,
      'available_seats', v_trip.available_seats,
      'price_per_seat', v_trip.price_per_seat
    ),
    now()
  FROM updated_alert ua;

  RETURN jsonb_build_object(
    'matched',  true,
    'trip_id',  v_trip.trip_id,
    'alert_id', p_alert_id
  );
END;
$$;

-- Grant to service role only (called by the worker with service_role key)
REVOKE ALL ON FUNCTION match_alert_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_alert_atomic TO service_role;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- See rollback/20260711000000_atomic_spatial_matching_rollback.sql
