CREATE OR REPLACE FUNCTION app_create_ride_booking(
  p_trip_id uuid,
  p_passenger_id uuid,
  p_seats_requested int,
  p_pickup text,
  p_dropoff text,
  p_booking_status text,
  p_total_price numeric
) RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip trips%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_seat_number int;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE trip_id = p_trip_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  IF p_booking_status <> 'pending_driver' AND v_trip.available_seats < p_seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  SELECT COALESCE(MAX(seat_number), 0) + 1 INTO v_seat_number
  FROM bookings
  WHERE trip_id = p_trip_id AND booking_status <> 'cancelled';

  INSERT INTO bookings (
    trip_id, passenger_id, seat_number, booking_status, status, confirmed_by_driver, amount,
    pickup_location, dropoff_location, seats_requested, total_price
  ) VALUES (
    p_trip_id, p_passenger_id, v_seat_number, p_booking_status, p_booking_status,
    p_booking_status <> 'pending_driver', p_total_price,
    p_pickup, p_dropoff, p_seats_requested, p_total_price
  )
  RETURNING * INTO v_booking;

  IF p_booking_status <> 'pending_driver' THEN
    UPDATE trips
    SET available_seats = available_seats - p_seats_requested,
        trip_status = CASE
          WHEN available_seats - p_seats_requested <= 0 THEN 'booked'
          ELSE trip_status
        END
    WHERE trip_id = p_trip_id;
  END IF;

  RETURN v_booking;
END;
$$;

CREATE OR REPLACE FUNCTION app_update_booking_status(
  p_booking_id uuid,
  p_new_status text
) RETURNS bookings
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_trip trips%ROWTYPE;
  v_seats int;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE booking_id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  SELECT * INTO v_trip FROM trips WHERE trip_id = v_booking.trip_id FOR UPDATE;
  v_seats := GREATEST(1, COALESCE(v_booking.seats_requested, 1));

  IF p_new_status = 'confirmed' AND v_booking.booking_status = 'pending_driver' THEN
    IF v_trip.available_seats < v_seats THEN
      RAISE EXCEPTION 'Not enough seats available';
    END IF;
    UPDATE trips
    SET available_seats = available_seats - v_seats,
        trip_status = CASE WHEN available_seats - v_seats <= 0 THEN 'booked' ELSE trip_status END
    WHERE trip_id = v_trip.trip_id;
  ELSIF p_new_status IN ('cancelled', 'rejected') AND v_booking.booking_status = 'confirmed' THEN
    UPDATE trips
    SET available_seats = available_seats + v_seats, trip_status = 'open'
    WHERE trip_id = v_trip.trip_id;
  END IF;

  UPDATE bookings
  SET booking_status = p_new_status,
      status = p_new_status,
      confirmed_by_driver = (p_new_status = 'confirmed')
  WHERE booking_id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION app_create_ride_booking TO authenticated;
GRANT EXECUTE ON FUNCTION app_update_booking_status TO authenticated;