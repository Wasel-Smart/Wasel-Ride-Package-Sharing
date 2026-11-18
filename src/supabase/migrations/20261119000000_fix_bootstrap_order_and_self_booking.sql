-- P0 #242: Fix invalid self-booking CHECK and ensure race-safe prevention

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'no_self_booking'
      AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT no_self_booking;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION prevent_self_booking()
RETURNS TRIGGER AS $$
DECLARE
  trip_driver_id UUID;
BEGIN
  SELECT driver_id INTO trip_driver_id
  FROM trips
  WHERE id = NEW.trip_id
  FOR UPDATE;

  IF trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip % does not exist', NEW.trip_id;
  END IF;

  IF NEW.passenger_id = trip_driver_id THEN
    RAISE EXCEPTION 'Drivers cannot book their own trip';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_self_booking ON bookings;

CREATE TRIGGER trg_prevent_self_booking
  BEFORE INSERT OR UPDATE OF passenger_id, trip_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_booking();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'trips_recurring_trip_id_fkey'
      AND table_name = 'trips'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_trips') THEN
      ALTER TABLE trips
        ADD CONSTRAINT trips_recurring_trip_id_fkey
        FOREIGN KEY (recurring_trip_id) REFERENCES recurring_trips(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add trips_recurring_trip_id_fkey: %', SQLERRM;
END $$;

COMMENT ON FUNCTION prevent_self_booking() IS 'P0 #242: Prevents drivers from booking their own trips. Replaces invalid subquery CHECK.';
