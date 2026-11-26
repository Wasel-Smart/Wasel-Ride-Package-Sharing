-- Enable RLS on all public tables that were missing it.
-- Tables with no end-user access path are covered by rls-allowlist.json;
-- this migration enables RLS (which defaults to deny-all) and adds policies
-- only for the tables where users own rows.
-- All statements are wrapped in DO blocks to skip gracefully if a table does
-- not yet exist on the target database.

DO $$ BEGIN
  -- ============================================================================
  -- Internal / ops / admin-only tables: enable RLS (deny-all by design).
  -- Access is via service-role edge functions; no end-user policies needed.
  -- ============================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='api_logs') THEN
    ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='backup_logs') THEN
    ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='business_accounts') THEN
    ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='campaigns') THEN
    ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_media') THEN
    ALTER TABLE public.chat_media ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='corridor_analytics') THEN
    ALTER TABLE public.corridor_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='demand_forecasts') THEN
    ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='disputes') THEN
    ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_payouts') THEN
    ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_status_history') THEN
    ALTER TABLE public.driver_status_history ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='error_logs') THEN
    ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='health_checks') THEN
    ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loyalty_points') THEN
    ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loyalty_transactions') THEN
    ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pricing_rules') THEN
    ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='processed_stripe_events') THEN
    ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='promo_codes') THEN
    ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='push_tokens') THEN
    ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='referrals') THEN
    ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_verifications') THEN
    ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_alerts') THEN
    ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trip_analytics') THEN
    ALTER TABLE public.trip_analytics ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='typing_indicators') THEN
    ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='universities') THEN
    ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================================================
-- User-owned tables: enable RLS and add ownership policies.
-- Each block skips if the table or policy already exists.
-- ============================================================================

-- analytics_events: users see their own events (user_id is nullable).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='analytics_events') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analytics_events' AND policyname='analytics_events_select_own') THEN
      CREATE POLICY analytics_events_select_own ON public.analytics_events
        FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- devices: users manage their own device registrations.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='devices') THEN
    ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='devices_select_own') THEN
      CREATE POLICY devices_select_own ON public.devices
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='devices_insert_own') THEN
      CREATE POLICY devices_insert_own ON public.devices
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='devices_update_own') THEN
      CREATE POLICY devices_update_own ON public.devices
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='devices' AND policyname='devices_delete_own') THEN
      CREATE POLICY devices_delete_own ON public.devices
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- loyalty_points: users view their own loyalty balance.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loyalty_points') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_points' AND policyname='loyalty_points_select_own') THEN
      CREATE POLICY loyalty_points_select_own ON public.loyalty_points
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- loyalty_transactions: users view their own loyalty history.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loyalty_transactions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_transactions' AND policyname='loyalty_transactions_select_own') THEN
      CREATE POLICY loyalty_transactions_select_own ON public.loyalty_transactions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- push_tokens: users manage their own push notification tokens.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='push_tokens') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_tokens' AND policyname='push_tokens_select_own') THEN
      CREATE POLICY push_tokens_select_own ON public.push_tokens
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_tokens' AND policyname='push_tokens_insert_own') THEN
      CREATE POLICY push_tokens_insert_own ON public.push_tokens
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_tokens' AND policyname='push_tokens_update_own') THEN
      CREATE POLICY push_tokens_update_own ON public.push_tokens
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='push_tokens' AND policyname='push_tokens_delete_own') THEN
      CREATE POLICY push_tokens_delete_own ON public.push_tokens
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- student_verifications: users view and submit their own verification.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='student_verifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_verifications' AND policyname='student_verifications_select_own') THEN
      CREATE POLICY student_verifications_select_own ON public.student_verifications
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='student_verifications' AND policyname='student_verifications_insert_own') THEN
      CREATE POLICY student_verifications_insert_own ON public.student_verifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- typing_indicators: users insert and delete their own indicators.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='typing_indicators') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='typing_indicators' AND policyname='typing_indicators_select_own') THEN
      CREATE POLICY typing_indicators_select_own ON public.typing_indicators
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='typing_indicators' AND policyname='typing_indicators_insert_own') THEN
      CREATE POLICY typing_indicators_insert_own ON public.typing_indicators
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='typing_indicators' AND policyname='typing_indicators_delete_own') THEN
      CREATE POLICY typing_indicators_delete_own ON public.typing_indicators
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- universities: public read-only directory (no user ownership).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='universities') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='universities' AND policyname='universities_select_public') THEN
      CREATE POLICY universities_select_public ON public.universities
        FOR SELECT USING (true);
    END IF;
  END IF;
END $$;

-- driver_payouts: drivers view their own payout records (read-only).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_payouts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_payouts' AND policyname='driver_payouts_select_own') THEN
      CREATE POLICY driver_payouts_select_own ON public.driver_payouts
        FOR SELECT
        USING (
          auth.uid() = (
            SELECT p.id FROM public.profiles p
            JOIN public.drivers d ON d.profile_id = p.id
            WHERE d.id = driver_payouts.driver_id
            LIMIT 1
          )
        );
    END IF;
  END IF;
END $$;

-- driver_status_history: drivers view their own status history (read-only).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='driver_status_history') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='driver_status_history' AND policyname='driver_status_history_select_own') THEN
      CREATE POLICY driver_status_history_select_own ON public.driver_status_history
        FOR SELECT
        USING (
          auth.uid() = (
            SELECT p.id FROM public.profiles p
            JOIN public.drivers d ON d.profile_id = p.id
            WHERE d.id = driver_status_history.driver_id
            LIMIT 1
          )
        );
    END IF;
  END IF;
END $$;
