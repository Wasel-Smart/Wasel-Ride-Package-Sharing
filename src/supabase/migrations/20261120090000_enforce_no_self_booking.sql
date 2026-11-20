-- Enforce booking ownership at write time.
-- Historical migrations used a subquery inside a CHECK constraint, which
-- PostgreSQL does not support. This forward migration replaces that rule
-- without rewriting already-applied historical migrations.

BEGIN;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS no_self_booking;

CREATE OR REPLACE FUNCTION public.prevent_self_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  trip_driver_id UUID;
BEGIN
  SELECT driver_id
    INTO trip_driver_id
    FROM public.trips
   WHERE id = NEW.trip_id
   FOR UPDATE;

  IF trip_driver_id IS NULL THEN
    -- Let the bookings.trip_id foreign key report a missing trip.
    RETURN NEW;
  END IF;

  IF trip_driver_id = NEW.passenger_id THEN
    RAISE EXCEPTION 'A driver cannot book their own trip'
      USING ERRCODE = '23514',
            CONSTRAINT = 'no_self_booking';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_booking ON public.bookings;

CREATE TRIGGER prevent_self_booking
BEFORE INSERT OR UPDATE OF trip_id, passenger_id
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_booking();

REVOKE ALL ON FUNCTION public.prevent_self_booking() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.prevent_self_booking() IS
  'Rejects bookings where the passenger is the trip owner; locks the trip row during validation.';

COMMIT;
