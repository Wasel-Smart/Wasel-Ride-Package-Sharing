ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.trips.notes IS 'Optional notes for the trip, visible to passenger and driver.';