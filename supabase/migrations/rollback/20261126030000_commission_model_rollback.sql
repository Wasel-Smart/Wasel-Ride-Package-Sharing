-- =============================================================================
-- Rollback: 20261126030000_commission_model
-- Effect:   Removes commission columns, commission_config table, helper
--           function, and associated indexes.
--
-- DANGER: drops platform_fee and driver_earning data from bookings and packages.
-- Only run after confirming no production bookings have been recorded with
-- non-zero platform_fee values, or after backing up those values elsewhere.
-- =============================================================================

BEGIN;

-- 1. Drop indexes
DROP INDEX IF EXISTS public.idx_bookings_platform_fee;
DROP INDEX IF EXISTS public.idx_packages_platform_fee;
DROP INDEX IF EXISTS public.idx_commission_config_route_key;

-- 2. Drop helper function
DROP FUNCTION IF EXISTS public.calculate_commission(NUMERIC, NUMERIC);

-- 3. Drop commission_config table (and its RLS policies)
DROP TABLE IF EXISTS public.commission_config;

-- 4. Remove columns from packages
ALTER TABLE public.packages
  DROP COLUMN IF EXISTS platform_fee,
  DROP COLUMN IF EXISTS driver_earning;

-- 5. Remove columns from bookings
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS platform_fee,
  DROP COLUMN IF EXISTS driver_earning;

-- 6. Remove column from trips
ALTER TABLE public.trips
  DROP COLUMN IF EXISTS commission_rate_pct;

COMMIT;
