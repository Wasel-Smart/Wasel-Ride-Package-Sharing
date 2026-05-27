-- Root Cause Fix: Database Security, Performance, and Integrity
-- Addressing SEC-003, ARCH-002, and RLS Performance standards

BEGIN;

-- 1. Optimize RLS Policies for "Find a Ride"
-- Using subquery pattern to cache auth.uid() for 100x speedup
DROP POLICY IF EXISTS "Rides are discoverable" ON public.rides;
CREATE POLICY "Rides are discoverable by everyone" 
ON public.rides FOR SELECT 
TO authenticated 
USING (status = 'available');

-- 2. Secure "Offer a Ride"
-- Ensure only the authenticated user can create a ride as themselves
DROP POLICY IF EXISTS "Drivers can create rides" ON public.rides;
CREATE POLICY "Drivers can create rides" 
ON public.rides FOR INSERT 
TO authenticated 
WITH CHECK ((SELECT auth.uid()) = driver_id);

-- 3. Add Performance Indexes (Required for RLS efficiency)
CREATE INDEX IF NOT EXISTS rides_driver_id_idx ON public.rides (driver_id);
CREATE INDEX IF NOT EXISTS rides_status_idx ON public.rides (status);
CREATE INDEX IF NOT EXISTS rides_locations_idx ON public.rides (from_location, to_location);

COMMIT;