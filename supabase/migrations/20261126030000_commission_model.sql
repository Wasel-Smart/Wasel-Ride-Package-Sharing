-- =============================================================================
-- Migration: Commission & Platform Fee Model
-- Date:      2026-11-26
-- Purpose:   Add the take-rate columns that allow Wasel to earn revenue
--            on every ride and parcel booking.
--
-- Design
-- ------
--  trips.commission_rate_pct  -- configurable per-trip rate (default 12.0%)
--  bookings.platform_fee      -- absolute fee captured at booking time
--  bookings.driver_earning    -- amount remitted to the driver
--  packages.platform_fee      -- same for parcel deliveries
--  packages.driver_earning    -- parcel earnings remitted to the driver
--
-- All columns are ADD COLUMN IF NOT EXISTS (safe to run against a live DB).
-- No existing rows are modified; defaults apply only to new inserts.
-- A CHECK constraint keeps rates sane (0 – 100).
--
-- Commission flow (enforced in application layer, documented here):
--   1. Rider pays `amount` on booking.
--   2. platform_fee = ROUND(amount * commission_rate_pct / 100, 3)
--   3. driver_earning = amount - platform_fee
--   4. At trip completion: driver wallet credited `driver_earning`,
--      Wasel ledger credited `platform_fee`.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. trips: add configurable commission rate
-- ---------------------------------------------------------------------------
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC(5,2)
    NOT NULL DEFAULT 12.00
    CHECK (commission_rate_pct >= 0 AND commission_rate_pct <= 100);

COMMENT ON COLUMN public.trips.commission_rate_pct IS
  'Platform take-rate for this trip, in percent (e.g. 12.00 = 12%). '
  'Captured at trip creation; not changed after a booking is confirmed.';

-- ---------------------------------------------------------------------------
-- 2. bookings: add fee split columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(14,3)
    NOT NULL DEFAULT 0.000
    CHECK (platform_fee >= 0),
  ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(14,3)
    NOT NULL DEFAULT 0.000
    CHECK (driver_earning >= 0);

COMMENT ON COLUMN public.bookings.platform_fee IS
  'Wasel revenue portion of this booking: amount * commission_rate_pct / 100.';
COMMENT ON COLUMN public.bookings.driver_earning IS
  'Amount remitted to the driver: amount - platform_fee.';

-- ---------------------------------------------------------------------------
-- 3. packages: add fee split columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(14,3)
    NOT NULL DEFAULT 0.000
    CHECK (platform_fee >= 0),
  ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(14,3)
    NOT NULL DEFAULT 0.000
    CHECK (driver_earning >= 0);

COMMENT ON COLUMN public.packages.platform_fee IS
  'Wasel revenue portion of this parcel delivery fee.';
COMMENT ON COLUMN public.packages.driver_earning IS
  'Amount remitted to the driver for carrying this parcel.';

-- ---------------------------------------------------------------------------
-- 4. commission_config: central rate table (admin-editable, auditable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_config (
  config_id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_key     text        NOT NULL DEFAULT 'default',
  rate_pct      NUMERIC(5,2) NOT NULL DEFAULT 12.00
                  CHECK (rate_pct >= 0 AND rate_pct <= 100),
  effective_from timestamptz NOT NULL DEFAULT timezone('utc', now()),
  set_by        uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.commission_config IS
  'Admin-managed commission rates. route_key = ''default'' applies to all routes '
  'unless a more specific key (e.g. ''amman-aqaba'') overrides it. '
  'History is append-only; never DELETE rows.';

-- Seed the default rate so the table is never empty
INSERT INTO public.commission_config (route_key, rate_pct, note)
VALUES ('default', 12.00, 'Initial platform rate — 12%')
ON CONFLICT DO NOTHING;

-- Index for fast lookup by route
CREATE INDEX IF NOT EXISTS idx_commission_config_route_key
  ON public.commission_config (route_key, effective_from DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS: commission_config is admin-read-only for everyone else
-- ---------------------------------------------------------------------------
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;

-- Admins can read and insert; no UPDATE/DELETE (append-only audit trail)
CREATE POLICY IF NOT EXISTS "admin_select_commission_config"
  ON public.commission_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "admin_insert_commission_config"
  ON public.commission_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Helper function: calculate_commission(amount, rate_pct)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_commission(
  p_amount       NUMERIC,
  p_rate_pct     NUMERIC
)
RETURNS TABLE (platform_fee NUMERIC, driver_earning NUMERIC)
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(p_amount * p_rate_pct / 100.0, 3)               AS platform_fee,
    p_amount - ROUND(p_amount * p_rate_pct / 100.0, 3)    AS driver_earning;
$$;

COMMENT ON FUNCTION public.calculate_commission IS
  'Pure function: given a booking amount and a rate, returns the fee split. '
  'Call this from the booking service before inserting a booking row.';

-- ---------------------------------------------------------------------------
-- 7. Indexes on the new columns (support reconciliation queries)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_platform_fee
  ON public.bookings (platform_fee)
  WHERE booking_status IN ('confirmed', 'completed');

CREATE INDEX IF NOT EXISTS idx_packages_platform_fee
  ON public.packages (platform_fee)
  WHERE package_status IN ('in_transit', 'delivered');
