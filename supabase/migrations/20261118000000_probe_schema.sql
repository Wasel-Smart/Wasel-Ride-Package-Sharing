-- Temporary probe: verify objects required by pending migrations
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name='app_private') THEN
    missing := missing || 'app_private schema';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    missing := missing || 'public.users table';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='id' AND data_type='uuid') THEN
      missing := missing || 'users.id uuid column';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_admin') THEN
    missing := missing || 'public.is_admin()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='cleanup_api_rate_limits') THEN
    missing := missing || 'public.cleanup_api_rate_limits()';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='packages') THEN
    missing := missing || 'public.packages table';
  END IF;
  IF array_length(missing,1) > 0 THEN
    RAISE EXCEPTION 'PROBE MISSING: %', array_to_string(missing, '; ');
  END IF;
  RAISE NOTICE 'PROBE OK: all required objects exist';
END $$;
