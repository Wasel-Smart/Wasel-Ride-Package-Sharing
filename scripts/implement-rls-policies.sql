-- RLS Policy Implementation Template
-- Apply these policies to ensure all sensitive tables are protected

-- ============================================================================
-- USERS TABLE
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Users can update their own data
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- WALLETS TABLE
-- ============================================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own" ON public.wallets
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "wallets_update_own" ON public.wallets
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM wallets WHERE wallet_id = transactions.wallet_id)
    )
  );

-- Transactions are insert-only for users
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM wallets WHERE wallet_id = transactions.wallet_id)
    )
  );

-- ============================================================================
-- PAYMENT_METHODS TABLE
-- ============================================================================
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own" ON public.payment_methods
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "payment_methods_insert_own" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "payment_methods_update_own" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "payment_methods_delete_own" ON public.payment_methods
  FOR DELETE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- ============================================================================
-- TRIPS TABLE
-- ============================================================================
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Passengers can see their trips
CREATE POLICY "trips_select_passenger" ON public.trips
  FOR SELECT USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = passenger_id)
  );

-- Drivers can see their assigned trips
CREATE POLICY "trips_select_driver" ON public.trips
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM drivers WHERE driver_id = trips.driver_id)
    )
  );

-- Drivers can update their assigned trips
CREATE POLICY "trips_update_driver" ON public.trips
  FOR UPDATE USING (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM drivers WHERE driver_id = trips.driver_id)
    )
  );

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Senders can see their packages
CREATE POLICY "packages_select_sender" ON public.packages
  FOR SELECT USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = sender_id)
  );

-- Receivers can see their packages
CREATE POLICY "packages_select_receiver" ON public.packages
  FOR SELECT USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = receiver_id)
  );

-- Carriers can see assigned packages
CREATE POLICY "packages_select_carrier" ON public.packages
  FOR SELECT USING (
    auth.uid() = (SELECT auth_user_id FROM users WHERE id = carrier_id)
  );

-- ============================================================================
-- DRIVERS TABLE
-- ============================================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_own" ON public.drivers
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "drivers_update_own" ON public.drivers
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- ============================================================================
-- VEHICLES TABLE
-- ============================================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_own" ON public.vehicles
  FOR SELECT USING (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM drivers WHERE driver_id = vehicles.driver_id)
    )
  );

CREATE POLICY "vehicles_update_own" ON public.vehicles
  FOR UPDATE USING (
    auth.uid() = (
      SELECT auth_user_id FROM users 
      WHERE id = (SELECT user_id FROM drivers WHERE driver_id = vehicles.driver_id)
    )
  );

-- ============================================================================
-- USER_VERIFICATION TABLE
-- ============================================================================
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_verification_select_own" ON public.user_verification
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "user_verification_update_own" ON public.user_verification
  FOR UPDATE USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- ============================================================================
-- GDPR_REQUESTS TABLE
-- ============================================================================
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gdpr_requests_select_own" ON public.gdpr_requests
  FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

CREATE POLICY "gdpr_requests_insert_own" ON public.gdpr_requests
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_user_id FROM users WHERE id = user_id));

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- System can insert audit logs
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- VERIFICATION COMPLETE
-- ============================================================================

-- Run this query to verify all tables have RLS enabled:
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'profiles', 'wallets', 'transactions', 'payment_methods',
    'trips', 'packages', 'drivers', 'vehicles', 'user_verification',
    'gdpr_requests', 'audit_logs'
  )
ORDER BY tablename;
