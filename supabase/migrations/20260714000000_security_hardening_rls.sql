-- 20260714000000_security_hardening_rls.sql
-- Security hardening: enable RLS where it was missing and lock down privileged
-- writes / PII reads. The edge function uses the service_role key, which bypasses
-- RLS entirely, so these policies govern the direct client (anon/authenticated)
-- path only. All app reads/writes should flow through the edge function, which
-- enforces authorization in application code.

-- ---------------------------------------------------------------------------
-- 1) Bus / Corporate tables had NO row level security at all.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS bus_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bus_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS corporate_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;

-- Catalog tables are readable by any authenticated user; writes happen only via
-- the service_role edge function (no authenticated write policies are granted).
CREATE POLICY IF NOT EXISTS bus_operators_read ON bus_operators
  FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS bus_routes_read ON bus_routes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS bus_schedules_read ON bus_schedules
  FOR SELECT TO authenticated USING (true);

-- Bookings / organizations / members are owner-scoped.
CREATE POLICY IF NOT EXISTS bus_bookings_owner ON bus_bookings
  FOR ALL TO authenticated
  USING (passenger_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (passenger_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS organizations_owner ON organizations
  FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS organization_members_member ON organization_members
  FOR ALL TO authenticated
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR organization_id IN (
      SELECT id FROM public.organizations
      WHERE owner_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS corporate_credits_owner ON corporate_credits
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT id FROM public.organizations
    WHERE owner_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY IF NOT EXISTS invoices_owner ON invoices
  FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT id FROM public.organizations
    WHERE owner_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- 2) Wallets: owner can READ, but NEVER write via the client. Balance changes
--    must originate from verified payment webhooks / atomic wallet RPCs invoked
--    by the service_role edge function. No INSERT/UPDATE/DELETE policies are
--    granted to authenticated/anon, so direct self-crediting is impossible.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS wallets_owner_read ON wallets
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Restrict direct-client PII reads. The app fetches profiles/driver/review
--    data through the service_role edge function; the anon/authenticated client
--    must not be able to dump the whole user base. We add RESTRICTIVE policies
--    (Postgres 15+) that AND with any existing permissive policy, so anon loses
--    all access and authenticated users see only their own row (admins see all).
--    Tables are guarded by to_regclass so this never fails on a missing table.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'profiles', 'drivers', 'driver_profiles', 'reviews', 'ratings']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t
      );
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I;', t || '_restrict_read', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated
           USING (
             id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
             OR role = ''admin''
           );',
        t || '_restrict_read', t
      );
    END IF;
  END LOOP;
END $$;
