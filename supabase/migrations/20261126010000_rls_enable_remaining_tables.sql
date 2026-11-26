-- Enable RLS on all public tables that were missing it.
-- Tables with no end-user access path are covered by rls-allowlist.json;
-- this migration enables RLS (which defaults to deny-all) and adds policies
-- only for the tables where users own rows.

-- ============================================================================
-- Internal / ops / admin-only tables: enable RLS (deny-all by design).
-- Access is via service-role edge functions; no end-user policies needed.
-- Each is documented in supabase/rls-allowlist.json.
-- ============================================================================
ALTER TABLE public.analytics_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_media            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridor_analytics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_forecasts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_analytics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities          ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- User-owned tables: enable RLS and add ownership policies.
-- ============================================================================

-- devices: users manage their own registrations.
ALTER TABLE public.devices               ENABLE ROW LEVEL SECURITY;

-- analytics_events: users see their own events (user_id is nullable).
CREATE POLICY analytics_events_select_own ON public.analytics_events
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- devices: users manage their own device registrations.
CREATE POLICY devices_select_own ON public.devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY devices_insert_own ON public.devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY devices_update_own ON public.devices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY devices_delete_own ON public.devices
  FOR DELETE USING (auth.uid() = user_id);

-- loyalty_points: users view their own loyalty balance.
CREATE POLICY loyalty_points_select_own ON public.loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

-- loyalty_transactions: users view their own loyalty history.
CREATE POLICY loyalty_transactions_select_own ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- push_tokens: users manage their own push notification tokens.
CREATE POLICY push_tokens_select_own ON public.push_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY push_tokens_insert_own ON public.push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_tokens_update_own ON public.push_tokens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY push_tokens_delete_own ON public.push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- student_verifications: users view and submit their own verification.
CREATE POLICY student_verifications_select_own ON public.student_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY student_verifications_insert_own ON public.student_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- typing_indicators: users insert and delete their own indicators.
CREATE POLICY typing_indicators_select_own ON public.typing_indicators
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY typing_indicators_insert_own ON public.typing_indicators
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY typing_indicators_delete_own ON public.typing_indicators
  FOR DELETE USING (auth.uid() = user_id);

-- universities: public read-only directory (no user ownership).
CREATE POLICY universities_select_public ON public.universities
  FOR SELECT USING (true);

-- driver_payouts: drivers view their own payout records (read-only).
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

-- driver_status_history: drivers view their own status history (read-only).
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
