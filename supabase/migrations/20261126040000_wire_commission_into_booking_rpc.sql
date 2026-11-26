-- =============================================================================
-- Migration: Wire commission into app_create_ride_booking
-- Date:      2026-11-26
-- Depends:   20261126030000_commission_model.sql
--
-- Purpose
-- -------
-- Redefine app_create_ride_booking so every new booking row is written with
-- the correct platform_fee and driver_earning derived from the trip's
-- commission_rate_pct.  The function signature is unchanged so the edge
-- handler in bookings.ts (which calls this RPC) needs no modification.
--
-- Idempotency: CREATE OR REPLACE preserves the existing function in-place.
-- Skipped entirely if the trips or bookings tables do not yet exist on the
-- target database.
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trips')
  OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bookings') THEN
    RAISE NOTICE 'Skipping app_create_ride_booking: trips or bookings table not found on this database.';
    RETURN;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.app_create_ride_booking(
  p_trip_id        uuid,
  p_passenger_id   uuid,
  p_seats_requested integer,
  p_pickup         text     DEFAULT NULL,
  p_dropoff        text     DEFAULT NULL,
  p_booking_status text     DEFAULT 'pending_driver',
  p_total_price    numeric  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trip              RECORD;
  v_passenger         RECORD;
  v_wallet            RECORD;
  v_seat_number       integer;
  v_amount            numeric(14,2);
  v_rate_pct          numeric(5,2);
  v_platform_fee      numeric(14,3);
  v_driver_earning    numeric(14,3);
  v_booking_id        uuid;
  v_now               timestamptz := timezone('utc', now());
BEGIN
  IF p_seats_requested IS NULL OR p_seats_requested < 1 OR p_seats_requested > 8 THEN
    RAISE EXCEPTION 'invalid booking request: seats must be 1-8' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_trip
    FROM public.trips
   WHERE trip_id = p_trip_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'trip not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.trip_status NOT IN ('open', 'draft') THEN
    RAISE EXCEPTION 'trip is not available for booking' USING ERRCODE = 'P0001';
  END IF;

  IF v_trip.available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'not enough seats available' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE trip_id = p_trip_id
       AND passenger_id = p_passenger_id
       AND booking_status NOT IN ('cancelled', 'refunded')
  ) THEN
    RAISE EXCEPTION 'active booking already exists for this passenger on this trip'
      USING ERRCODE = '23505';
  END IF;

  v_amount := ROUND(v_trip.price_per_seat * p_seats_requested, 2);

  v_rate_pct := COALESCE(
    v_trip.commission_rate_pct,
    (
      SELECT c.rate_pct
        FROM public.commission_config c
       WHERE c.route_key = 'default'
       ORDER BY c.effective_from DESC
       LIMIT 1
    ),
    12.00
  );

  v_platform_fee   := ROUND(v_amount * v_rate_pct / 100.0, 3);
  v_driver_earning := v_amount - v_platform_fee;

  SELECT COALESCE(MIN(s.n), 1)
    INTO v_seat_number
    FROM generate_series(1, v_trip.available_seats + p_seats_requested) AS s(n)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.bookings b
      WHERE b.trip_id = p_trip_id
        AND b.seat_number = s.n
        AND b.booking_status NOT IN ('cancelled', 'refunded')
   )
   LIMIT 1;

  INSERT INTO public.bookings (
    trip_id,
    passenger_id,
    seat_number,
    booking_status,
    amount,
    platform_fee,
    driver_earning,
    created_at,
    updated_at
  )
  VALUES (
    p_trip_id,
    p_passenger_id,
    v_seat_number,
    p_booking_status::booking_status_v2,
    v_amount,
    v_platform_fee,
    v_driver_earning,
    v_now,
    v_now
  )
  RETURNING booking_id INTO v_booking_id;

  UPDATE public.trips
     SET available_seats = available_seats - p_seats_requested,
         updated_at      = v_now
   WHERE trip_id = p_trip_id;

  RETURN jsonb_build_object(
    'booking_id',      v_booking_id,
    'trip_id',         p_trip_id,
    'passenger_id',    p_passenger_id,
    'seat_number',     v_seat_number,
    'amount',          v_amount,
    'platform_fee',    v_platform_fee,
    'driver_earning',  v_driver_earning,
    'commission_rate', v_rate_pct,
    'booking_status',  p_booking_status,
    'created_at',      v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.app_create_ride_booking(uuid, uuid, integer, text, text, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_ride_booking(uuid, uuid, integer, text, text, text, numeric)
  TO service_role;

COMMENT ON FUNCTION public.app_create_ride_booking IS
  'Atomic ride-booking creation. Locks the trip row, checks capacity, derives '
  'fare and commission split server-side, inserts the booking, and decrements '
  'available_seats -- all in one transaction. Called exclusively by the Edge '
  'Function via service_role; never directly by authenticated clients.';
