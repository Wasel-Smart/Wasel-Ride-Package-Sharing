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
-- Commission flow
-- --------------
--   1. Lock the trip row (FOR UPDATE) to prevent seat oversell.
--   2. Derive the fare from the locked trip, never the client.
--   3. Look up the commission rate: trip's own rate if set, else the current
--      default from commission_config.
--   4. Split: platform_fee = ROUND(amount * rate / 100, 3)
--             driver_earning = amount - platform_fee
--   5. Write both columns with the booking INSERT.
--
-- Idempotency
-- -----------
-- CREATE OR REPLACE preserves the existing function in-place.
-- The function is NOT backwards-incompatible: the two new output columns are
-- present in the return value as named fields; callers that ignore unknown
-- fields are unaffected.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.app_create_ride_booking(
  p_trip_id        uuid,
  p_passenger_id   uuid,
  p_seats_requested integer,
  p_pickup         text     DEFAULT NULL,
  p_dropoff        text     DEFAULT NULL,
  p_booking_status text     DEFAULT 'pending_driver',
  p_total_price    numeric  DEFAULT 0   -- legacy param; derived server-side
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
  -- ------------------------------------------------------------------ guards
  IF p_seats_requested IS NULL OR p_seats_requested < 1 OR p_seats_requested > 8 THEN
    RAISE EXCEPTION 'invalid booking request: seats must be 1-8' USING ERRCODE = '22023';
  END IF;

  -- ------------------------------------------------------------------ lock trip
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

  -- ------------------------------------------------------------------ duplicate guard
  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE trip_id = p_trip_id
       AND passenger_id = p_passenger_id
       AND booking_status NOT IN ('cancelled', 'refunded')
  ) THEN
    RAISE EXCEPTION 'active booking already exists for this passenger on this trip'
      USING ERRCODE = '23505';
  END IF;

  -- ------------------------------------------------------------------ self-booking guard
  IF EXISTS (
    SELECT 1 FROM public.drivers d
     WHERE d.driver_id = v_trip.driver_id
       AND d.user_id   = p_passenger_id
  ) THEN
    RAISE EXCEPTION 'drivers cannot book their own trip' USING ERRCODE = '23000';
  END IF;

  -- ------------------------------------------------------------------ phone verification
  SELECT *
    INTO v_passenger
    FROM public.users
   WHERE id = p_passenger_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid booking request: passenger not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_passenger.phone_verified_at IS NULL THEN
    RAISE EXCEPTION 'verified phone number required before booking' USING ERRCODE = '28000';
  END IF;

  -- ------------------------------------------------------------------ wallet standing
  SELECT *
    INTO v_wallet
    FROM public.wallets
   WHERE user_id = p_passenger_id;

  IF FOUND AND v_wallet.wallet_status NOT IN ('active') THEN
    RAISE EXCEPTION 'wallet standing needs review before booking' USING ERRCODE = '28000';
  END IF;

  -- ------------------------------------------------------------------ derive fare server-side
  -- price_per_seat is the per-seat fare; total = seats * price.
  v_amount := ROUND(v_trip.price_per_seat * p_seats_requested, 2);

  -- ------------------------------------------------------------------ commission split
  -- Use the trip's own rate.  If the column is NULL (pre-migration rows)
  -- fall back to the current default in commission_config.
  v_rate_pct := COALESCE(
    v_trip.commission_rate_pct,
    (
      SELECT c.rate_pct
        FROM public.commission_config c
       WHERE c.route_key = 'default'
       ORDER BY c.effective_from DESC
       LIMIT 1
    ),
    12.00  -- hard fallback if the table is somehow empty
  );

  v_platform_fee   := ROUND(v_amount * v_rate_pct / 100.0, 3);
  v_driver_earning := v_amount - v_platform_fee;

  -- ------------------------------------------------------------------ assign seat number
  -- Pick the lowest free seat number on this trip.
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

  -- ------------------------------------------------------------------ insert booking
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

  -- ------------------------------------------------------------------ decrement available seats
  UPDATE public.trips
     SET available_seats = available_seats - p_seats_requested,
         updated_at      = v_now
   WHERE trip_id = p_trip_id;

  -- ------------------------------------------------------------------ return
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

-- Service-role only; the edge function authenticates the caller before invoking.
REVOKE ALL ON FUNCTION public.app_create_ride_booking(uuid, uuid, integer, text, text, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_ride_booking(uuid, uuid, integer, text, text, text, numeric)
  TO service_role;

COMMENT ON FUNCTION public.app_create_ride_booking IS
  'Atomic ride-booking creation. Locks the trip row, checks capacity, derives '
  'fare and commission split server-side, inserts the booking, and decrements '
  'available_seats — all in one transaction. Called exclusively by the Edge '
  'Function via service_role; never directly by authenticated clients.';
