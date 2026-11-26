-- =============================================================================
-- Rollback: 20261126040000_wire_commission_into_booking_rpc
-- Effect:   Reverts app_create_ride_booking to the pre-commission version:
--           platform_fee and driver_earning will be written as 0.000.
--
-- This is a CREATE OR REPLACE to the previous function body.
-- The commission columns are NOT dropped here (that is 20261126030000's rollback).
-- After running this, platform_fee and driver_earning on new bookings will be 0.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.app_create_ride_booking(
  p_trip_id          uuid,
  p_passenger_id     uuid,
  p_seats_requested  int,
  p_pickup           text,
  p_dropoff          text,
  p_booking_status   text DEFAULT 'pending',
  p_total_price      numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip          public.trips%ROWTYPE;
  v_booking_id    uuid;
  v_amount        numeric;
  v_result        jsonb;
BEGIN
  -- Lock trip row
  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'trip_not_found');
  END IF;

  IF v_trip.available_seats < p_seats_requested THEN
    RETURN jsonb_build_object('error', 'insufficient_seats');
  END IF;

  -- Derive amount from locked trip (no commission calculation)
  v_amount := v_trip.price_per_seat * p_seats_requested;

  -- Deduct seats
  UPDATE public.trips
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_trip_id;

  -- Insert booking (platform_fee and driver_earning default to 0.000)
  INSERT INTO public.bookings (
    trip_id,
    passenger_id,
    seats_reserved,
    pickup_location,
    dropoff_location,
    booking_status,
    amount,
    platform_fee,
    driver_earning
  ) VALUES (
    p_trip_id,
    p_passenger_id,
    p_seats_requested,
    p_pickup,
    p_dropoff,
    p_booking_status,
    v_amount,
    0.000,
    v_amount
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'booking_id',    v_booking_id,
    'amount',        v_amount,
    'platform_fee',  0.000,
    'driver_earning', v_amount,
    'status',        p_booking_status
  );
END;
$$;

COMMENT ON FUNCTION public.app_create_ride_booking IS
  'Pre-commission version: platform_fee is always 0. '
  'Re-apply 20261126040000 to restore commission calculation.';
