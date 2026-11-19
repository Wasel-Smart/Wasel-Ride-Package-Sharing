-- Authoritative RLS / exposure gate. Run against a database that has all
-- migrations applied:
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -v allow="$(jq -r 'keys|join(",")' supabase/rls-allowlist.json)" \
--        -f supabase/tests/rls_coverage.sql
--
-- Exits non-zero (RAISE EXCEPTION) listing every problem it finds.
-- Allowlisted names (supabase/rls-allowlist.json) are skipped; each entry must
-- carry a written reason in that file.

SELECT set_config('app.rls_allow', :'allow', false);

DO $$
DECLARE
  allow   text[] := string_to_array(coalesce(nullif(current_setting('app.rls_allow', true), ''), ''), ',');
  r       record;
  problems text[] := '{}';
BEGIN
  -- 1. Tables without RLS (extension-owned tables such as PostGIS' spatial_ref_sys are ignored)
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
      )
    ORDER BY c.relname
  LOOP
    IF r.relname = ANY (allow) THEN CONTINUE; END IF;
    problems := problems || format('table public.%I has ROW LEVEL SECURITY disabled', r.relname);
  END LOOP;

  -- 2. RLS enabled but zero policies (deny-all: usually a forgotten policy)
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
    ORDER BY c.relname
  LOOP
    IF r.relname = ANY (allow) THEN CONTINUE; END IF;
    problems := problems || format('table public.%I has RLS enabled but no policies', r.relname);
  END LOOP;

  -- 3. Views that bypass the caller's RLS (must be security_invoker = true)
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=true'], false)
      AND NOT coalesce(c.reloptions @> ARRAY['security_invoker=on'], false)
    ORDER BY c.relname
  LOOP
    IF r.relname = ANY (allow) THEN CONTINUE; END IF;
    problems := problems || format('view public.%I is not security_invoker (bypasses RLS)', r.relname);
  END LOOP;

  -- 4. SECURITY DEFINER functions without a pinned search_path (privilege-escalation risk)
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
      )
    ORDER BY p.proname
  LOOP
    IF r.proname = ANY (allow) THEN CONTINUE; END IF;
    problems := problems || format('function public.%I(%s) is SECURITY DEFINER without a fixed search_path', r.proname, r.args);
  END LOOP;

  -- 5. Write policies that let anyone write: USING (true) / WITH CHECK (true)
  --    granted to anon, authenticated or PUBLIC. Policies scoped TO service_role are fine.
  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd <> 'SELECT'
      AND roles && ARRAY['anon', 'authenticated', 'public']::name[]
      AND (btrim(coalesce(qual, '')) IN ('true', '(true)') OR btrim(coalesce(with_check, '')) IN ('true', '(true)'))
    ORDER BY tablename, policyname
  LOOP
    IF r.tablename = ANY (allow) THEN CONTINUE; END IF;
    problems := problems || format('policy "%s" on public.%I allows unrestricted %s for non-service roles', r.policyname, r.tablename, r.cmd);
  END LOOP;

  -- 6. The legacy profiles table contains email/phone, wallet, verification,
  -- and payment-provider fields. RLS alone is not column-level security, so
  -- profile access must remain server-only for both anonymous and signed-in
  -- Data API roles.
  IF has_table_privilege('anon', 'public.profiles', 'SELECT')
     OR has_any_column_privilege('anon', 'public.profiles', 'SELECT') THEN
    problems := problems || 'anon has direct SELECT access to public.profiles';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     OR has_any_column_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    problems := problems || 'authenticated has direct SELECT access to public.profiles';
  END IF;
  IF has_table_privilege('anon', 'public.profiles', 'INSERT,UPDATE')
     OR has_any_column_privilege('anon', 'public.profiles', 'INSERT')
     OR has_any_column_privilege('anon', 'public.profiles', 'UPDATE') THEN
    problems := problems || 'anon has direct write access to public.profiles';
  END IF;
  IF has_table_privilege('authenticated', 'public.profiles', 'INSERT,UPDATE')
     OR has_any_column_privilege('authenticated', 'public.profiles', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.profiles', 'UPDATE') THEN
    problems := problems || 'authenticated has direct write access to public.profiles';
  END IF;

  -- 7. Privileged-column guards must exist: RLS self-update policies are not
  -- column-level, so without these triggers a user could set their own role.
  IF to_regclass('public.users') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.users'::regclass
      AND tgname = 'trg_guard_users_privileged_columns' AND NOT tgisinternal
  ) THEN
    problems := problems || 'public.users is missing trg_guard_users_privileged_columns';
  END IF;
  IF to_regclass('public.drivers') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.drivers'::regclass
      AND tgname = 'trg_guard_drivers_privileged_columns' AND NOT tgisinternal
  ) THEN
    problems := problems || 'public.drivers is missing trg_guard_drivers_privileged_columns';
  END IF;
  IF to_regclass('public.wallets') IS NOT NULL AND (
    has_table_privilege('authenticated', 'public.wallets', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.wallets', 'INSERT')
  ) THEN
    problems := problems || 'authenticated can write public.wallets directly';
  END IF;

  IF array_length(problems, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'RLS coverage check failed (% problem(s)):\n  - %',
      array_length(problems, 1), array_to_string(problems, E'\n  - ');
  END IF;

  RAISE NOTICE 'RLS coverage check passed.';
END
$$;
