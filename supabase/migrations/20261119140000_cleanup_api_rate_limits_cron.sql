-- Migration: 20261119140000_cleanup_api_rate_limits_cron.sql
-- Schedules the cleanup_api_rate_limits() housekeeping function via pg_cron.
-- Without this schedule the api_rate_limits table grows unbounded; buckets
-- whose window ended more than a day ago accumulate silently and inflate query
-- plans against the idx_api_rate_limits_window_start index.
--
-- Schedule: daily at 03:15 UTC (off-peak for the Jordan/Iraq timezone band).
-- The function already exists and is SECURITY DEFINER / service_role-only
-- (defined in 20261009030910_api_rate_limits.sql).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any stale schedule first so this migration is idempotent.
    BEGIN
      PERFORM cron.unschedule('cleanup-api-rate-limits');
    EXCEPTION WHEN OTHERS THEN
      -- Job did not exist; ignore.
      NULL;
    END;

    PERFORM cron.schedule(
      'cleanup-api-rate-limits',
      '15 3 * * *',
      'SELECT public.cleanup_api_rate_limits()'
    );

    RAISE NOTICE '✅ pg_cron job "cleanup-api-rate-limits" scheduled (daily 03:15 UTC).';
  ELSE
    RAISE NOTICE 'ℹ️  pg_cron not available; cleanup-api-rate-limits job not scheduled.';
    RAISE NOTICE '   Run manually: SELECT public.cleanup_api_rate_limits();';
    RAISE NOTICE '   Or enable pg_cron in the Supabase dashboard under Database → Extensions.';
  END IF;
END;
$$;
