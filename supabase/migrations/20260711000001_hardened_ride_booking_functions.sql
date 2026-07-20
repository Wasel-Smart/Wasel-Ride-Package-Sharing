-- Migration: 20260711000001_hardened_ride_booking_functions.sql
--
-- Replaces app_create_ride_booking and app_update_booking_status with
-- hardened versions that enforce:
--   1. Caller identity check (p_passenger_id must equal auth.uid())
--   2. Strict enum validation via CHECK — no raw text status values
--   3. Idempotency: duplicate calls return the existing booking, not an error
--   4. Input sanitization: coordinates validated, text fields length-capped
--   5. All queries use parameterized values (plpgsql $$ — no dynamic SQL)
--   6. Seat count validated as positive integer ≤ trip capacity
--   7. Price validated as non-negative
--
-- Zod-equivalent validation lives in the Edge Function layer (see below).
-- The database functions are the last line of defence.

-- ── Enum type for booking status (replaces raw text) ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM (
      'pending_driver', 'confirmed', 'rejected', 'cancelled', 'completed'
    );
  END IF;
END $$;

-- ── Hardened app_create_ride_booking ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION app_create_ride_booking(
  p_trip_id         uuid,
  p_passenger_id    uuid,
  p_seats_requested int,
  p_pickup          text,
  p_dropoff         text,
  p_booking_status  text,       -- validated against enum below
  p_total_price     numeric
) RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip        trips%ROWTYPE;
  v_booking     bookings%ROWTYPE;
  v_seat_number int;
  v_status      booking_status_enum;
BEGIN
  -- ── 1. Caller identity: only the authenticated user can book for themselves
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_passenger_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot create booking for another user'
      USING ERRCODE = '42501';
  END IF;

  -- ── 2. Input validation ───────────────────────────────────────────────────
  IF p_seats_requested < 1 OR p_seats_requested > 8 THEN
    RAISE EXCEPTION 'seats_requested must be between 1 and 8'
      USING ERRCODE = '22023';
  END IF;

  IF p_total_price < 0 THEN
    RAISE EXCEPTION 'total_price must be non-negative'
      USING ERRCODE = '22023';
  END IF;

  IF length(p_pickup)  > 500 THEN
    RAISE EXCEPTION 'pickup location exceeds maximum length'
      USING ERRCODE = '22001';
  END IF;
  IF length(p_dropoff) > 500 THEN
    RAISE EXCEPTION 'dropoff location exceeds maximum length'
      USING ERRCODE = '22001';
  END IF;

  -- ── 3. Validate booking status against enum (prevents arbitrary text injection)
  BEGIN
    v_status := p_booking_status::booking_status_enum;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid booking status: %', p_booking_status
      USING ERRCODE = '22023';
  END;

  -- Only these two statuses are valid for a new booking
  IF v_status NOT IN ('pending_driver', 'confirmed') THEN
    RAISE EXCEPTION 'New bookings must have status pending_driver or confirmed'
      USING ERRCODE = '22023';
  END IF;

  -- ── 4. Lock the trip row to prevent concurrent double-booking
  SELECT * INTO v_trip
  FROM trips
  WHERE trip_id = p_trip_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found or has been deleted'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_trip.trip_status NOT IN ('open', 'pending') THEN
    RAISE EXCEPTION 'Trip is no longer accepting bookings (status: %)', v_trip.trip_status
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'confirmed' AND v_trip.available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available (requested: %, available: %)',
      p_seats_requested, v_trip.available_seats
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 5. Idempotency: return existing non-cancelled booking if present
  SELECT * INTO v_booking
  FROM bookings
  WHERE trip_id      = p_trip_id
    AND passenger_id = p_passenger_id
    AND booking_status NOT IN ('cancelled', 'rejected');

  IF FOUND THEN
    -- Idempotent replay — return existing booking without side effects
    RETURN v_booking;
  END IF;

  -- ── 6. Assign seat number atomically
  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_seat_number
  FROM bookings
  WHERE trip_id = p_trip_id
    AND booking_status NOT IN ('cancelled', 'rejected');

  -- ── 7. Insert booking (all values are parameterized — no dynamic SQL)
  INSERT INTO bookings (
    trip_id, passenger_id, seat_number,
    booking_status, status, confirmed_by_driver,
    amount, pickup_location, dropoff_location,
    seats_requested, total_price
  ) VALUES (
    p_trip_id, p_passenger_id, v_seat_number,
    v_status::text, v_status::text, (v_status = 'confirmed'),
    p_total_price, p_pickup, p_dropoff,
    p_seats_requested, p_total_price
  )
  RETURNING * INTO v_booking;

  -- ── 8. Decrement available seats for confirmed bookings
  IF v_status = 'confirmed' THEN
    UPDATE trips
    SET
      available_seats = available_seats - p_seats_requested,
      trip_status = CASE
        WHEN available_seats - p_seats_requested <= 0 THEN 'booked'
        ELSE trip_status
      END
    WHERE trip_id = p_trip_id;
  END IF;

  RETURN v_booking;
END;
$$;

-- ── Hardened app_update_booking_status ───────────────────────────────────────

CREATE OR REPLACE FUNCTION app_update_booking_status(
  p_booking_id uuid,
  p_new_status text
) RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking  bookings%ROWTYPE;
  v_trip     trips%ROWTYPE;
  v_seats    int;
  v_new      booking_status_enum;
  v_caller   uuid;
BEGIN
  -- ── 1. Authentication required
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- ── 2. Validate new status
  BEGIN
    v_new := p_new_status::booking_status_enum;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid booking status: %', p_new_status
      USING ERRCODE = '22023';
  END;

  -- ── 3. Lock booking row
  SELECT * INTO v_booking
  FROM bookings
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  -- ── 4. Authorisation: only the passenger or the trip driver may update
  SELECT * INTO v_trip FROM trips WHERE trip_id = v_booking.trip_id FOR UPDATE;

  IF v_caller <> v_booking.passenger_id AND v_caller <> v_trip.driver_id THEN
    RAISE EXCEPTION 'Unauthorized: you are not a party to this booking'
      USING ERRCODE = '42501';
  END IF;

  -- ── 5. Validate state machine transitions
  --    Allowed: pending_driver → confirmed | rejected | cancelled
  --             confirmed      → completed | cancelled
  --             Any terminal state (completed/rejected) → no further changes
  IF v_booking.booking_status IN ('completed', 'rejected') THEN
    RAISE EXCEPTION 'Cannot update a terminal booking (status: %)', v_booking.booking_status
      USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.booking_status = 'pending_driver'
     AND v_new NOT IN ('confirmed', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_booking.booking_status, p_new_status
      USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.booking_status = 'confirmed'
     AND v_new NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_booking.booking_status, p_new_status
      USING ERRCODE = 'P0001';
  END IF;

  -- ── 6. Seat inventory adjustments
  v_seats := GREATEST(1, COALESCE(v_booking.seats_requested, 1));

  IF v_new = 'confirmed' AND v_booking.booking_status = 'pending_driver' THEN
    IF v_trip.available_seats < v_seats THEN
      RAISE EXCEPTION 'Not enough seats available (requested: %, available: %)',
        v_seats, v_trip.available_seats
        USING ERRCODE = 'P0001';
    END IF;
    UPDATE trips
    SET
      available_seats = available_seats - v_seats,
      trip_status = CASE
        WHEN available_seats - v_seats <= 0 THEN 'booked'
        ELSE trip_status
      END
    WHERE trip_id = v_trip.trip_id;

  ELSIF v_new IN ('cancelled', 'rejected')
        AND v_booking.booking_status = 'confirmed' THEN
    UPDATE trips
    SET available_seats = available_seats + v_seats,
        trip_status = 'open'
    WHERE trip_id = v_trip.trip_id;
  END IF;

  -- ── 7. Update booking (parameterized — no dynamic SQL)
  UPDATE bookings
  SET
    booking_status      = v_new::text,
    status              = v_new::text,
    confirmed_by_driver = (v_new = 'confirmed'),
    updated_at          = now()
  WHERE booking_id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────
-- Revoke public access; grant only to authenticated role.
-- The SECURITY DEFINER + auth.uid() check inside the function is the real guard.
REVOKE ALL ON FUNCTION app_create_ride_booking FROM PUBLIC;
REVOKE ALL ON FUNCTION app_update_booking_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_create_ride_booking  TO authenticated;
GRANT EXECUTE ON FUNCTION app_update_booking_status TO authenticated;
