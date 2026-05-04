-- ==================== WASEL PRODUCTION SCHEMA MIGRATION ====================
-- Migration: KV Store → Real PostgreSQL Schema
-- Date: 2026-02-23
-- Description: Creates production-ready tables with RLS, indexes, and constraints

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==================== PROFILES TABLE ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  
  -- Trip statistics
  total_trips INTEGER DEFAULT 0 CHECK (total_trips >= 0),
  trips_as_driver INTEGER DEFAULT 0 CHECK (trips_as_driver >= 0),
  trips_as_passenger INTEGER DEFAULT 0 CHECK (trips_as_passenger >= 0),
  
  -- Ratings
  rating_as_driver NUMERIC(3,2) DEFAULT 0.00 CHECK (rating_as_driver >= 0 AND rating_as_driver <= 5),
  rating_as_passenger NUMERIC(3,2) DEFAULT 0.00 CHECK (rating_as_passenger >= 0 AND rating_as_passenger <= 5),
  total_ratings_received INTEGER DEFAULT 0 CHECK (total_ratings_received >= 0),
  
  -- Preferences
  smoking_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  music_allowed BOOLEAN DEFAULT TRUE,
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  currency TEXT DEFAULT 'JOD' CHECK (currency IN ('JOD', 'USD', 'EUR', 'SAR', 'AED')),
  
  -- Wallet
  wallet_balance NUMERIC(10,2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
  total_earned NUMERIC(10,2) DEFAULT 0.00 CHECK (total_earned >= 0),
  total_spent NUMERIC(10,2) DEFAULT 0.00 CHECK (total_spent >= 0),
  
  -- Notifications
  notification_enabled BOOLEAN DEFAULT TRUE,
  location_sharing_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')),
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'premium', 'enterprise')),
  subscription_ends_at TIMESTAMPTZ,
  
  -- Verification
  id_verified BOOLEAN DEFAULT FALSE,
  driver_license_verified BOOLEAN DEFAULT FALSE,
  background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public can view basic profile info (for driver details in trips)
CREATE POLICY "Public can view basic profiles"
  ON public.profiles FOR SELECT
  USING (TRUE);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON public.profiles(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_stripe_customer ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_subscription_status ON public.profiles(subscription_status) WHERE subscription_status = 'active';
CREATE INDEX idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at DESC);

-- ==================== TRIPS TABLE ====================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Route information
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_lat NUMERIC(10,8),
  from_lng NUMERIC(11,8),
  to_lat NUMERIC(10,8),
  to_lng NUMERIC(11,8),
  distance_km NUMERIC(8,2),
  route_polyline TEXT,
  
  -- Schedule
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  estimated_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  
  -- Capacity
  total_seats INTEGER NOT NULL CHECK (total_seats > 0 AND total_seats <= 8),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  
  -- Pricing
  price_per_seat NUMERIC(8,2) NOT NULL CHECK (price_per_seat >= 0),
  currency TEXT DEFAULT 'JOD' CHECK (currency IN ('JOD', 'USD', 'EUR', 'SAR', 'AED')),
  
  -- Status
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  
  -- Preferences
  smoking_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  music_allowed BOOLEAN DEFAULT TRUE,
  luggage_space TEXT CHECK (luggage_space IN ('none', 'small', 'medium', 'large')),
  
  -- Vehicle info
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_plate TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT valid_seats CHECK (available_seats <= total_seats),
  CONSTRAINT future_departure CHECK (departure_date >= CURRENT_DATE OR status != 'published')
);

-- RLS Policies for trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Everyone can view published trips
CREATE POLICY "Published trips are viewable by all"
  ON public.trips FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

-- Drivers can view their own trips (any status)
CREATE POLICY "Drivers can view own trips"
  ON public.trips FOR SELECT
  USING (driver_id = auth.uid());

-- Drivers can create trips
CREATE POLICY "Drivers can create trips"
  ON public.trips FOR INSERT
  WITH CHECK (driver_id = auth.uid());

-- Drivers can update their own trips
CREATE POLICY "Drivers can update own trips"
  ON public.trips FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Drivers can soft delete their own trips
CREATE POLICY "Drivers can delete own trips"
  ON public.trips FOR UPDATE
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid() AND deleted_at IS NOT NULL);

-- Indexes for trips
CREATE INDEX idx_trips_driver ON public.trips(driver_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_status ON public.trips(status) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_trips_departure ON public.trips(departure_date, departure_time) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_available_seats ON public.trips(available_seats) WHERE available_seats > 0 AND deleted_at IS NULL;

-- Composite index for search optimization
CREATE INDEX idx_trips_search ON public.trips(from_location, to_location, departure_date, available_seats) 
  WHERE status = 'published' AND deleted_at IS NULL;

-- GIN index for full-text search on locations
CREATE INDEX idx_trips_locations_gin ON public.trips USING GIN (to_tsvector('english', from_location || ' ' || to_location));

-- ==================== BOOKINGS TABLE ====================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Booking details
  seats_requested INTEGER NOT NULL CHECK (seats_requested > 0 AND seats_requested <= 8),
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_lat NUMERIC(10,8),
  pickup_lng NUMERIC(11,8),
  dropoff_lat NUMERIC(10,8),
  dropoff_lng NUMERIC(11,8),
  
  -- Pricing (frozen at booking time)
  price_per_seat NUMERIC(8,2) NOT NULL CHECK (price_per_seat >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  currency TEXT DEFAULT 'JOD',
  platform_fee NUMERIC(10,2) DEFAULT 0.00,
  driver_earnings NUMERIC(10,2),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'no_show')),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT CHECK (payment_method IN ('wallet', 'card', 'cash', 'stripe')),
  stripe_payment_intent_id TEXT UNIQUE,
  
  -- Ratings
  passenger_rating INTEGER CHECK (passenger_rating >= 1 AND passenger_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  passenger_feedback TEXT,
  driver_feedback TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  CONSTRAINT no_self_booking CHECK (
    passenger_id != (SELECT driver_id FROM public.trips WHERE id = trip_id)
  ),
  CONSTRAINT unique_active_booking UNIQUE(trip_id, passenger_id) DEFERRABLE INITIALLY DEFERRED
);

-- RLS Policies for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Passengers can view their own bookings
CREATE POLICY "Passengers can view own bookings"
  ON public.bookings FOR SELECT
  USING (passenger_id = auth.uid());

-- Drivers can view bookings for their trips
CREATE POLICY "Drivers can view trip bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = bookings.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

-- Passengers can create bookings
CREATE POLICY "Passengers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (passenger_id = auth.uid());

-- Passengers and drivers can update bookings (status changes)
CREATE POLICY "Bookings updatable by passenger or driver"
  ON public.bookings FOR UPDATE
  USING (
    passenger_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = bookings.trip_id
      AND trips.driver_id = auth.uid()
    )
  );

-- Indexes for bookings
CREATE INDEX idx_bookings_trip ON public.bookings(trip_id);
CREATE INDEX idx_bookings_passenger ON public.bookings(passenger_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_payment_intent ON public.bookings(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_bookings_payment_status ON public.bookings(payment_status) WHERE payment_status IN ('pending', 'failed');

-- ==================== SUBSCRIPTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  stripe_product_id TEXT,
  
  -- Subscription details
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium', 'enterprise')),
  
  -- Billing
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON public.subscriptions(current_period_end) WHERE status IN ('active', 'trialing');

-- ==================== STRIPE EVENTS TABLE (Idempotency) ====================
CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event.id
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL,
  processing_duration_ms INTEGER,
  
  CONSTRAINT event_id_format CHECK (id ~ '^evt_')
);

-- Index for cleanup
CREATE INDEX idx_stripe_events_processed_at ON public.processed_stripe_events(processed_at);

-- Auto-cleanup old events (>90 days) - requires pg_cron
-- SELECT cron.schedule('cleanup-old-stripe-events', '0 3 * * 0', 
--   'DELETE FROM public.processed_stripe_events WHERE processed_at < NOW() - INTERVAL ''90 days''');

-- ==================== WALLET TRANSACTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  amount NUMERIC(10,2) NOT NULL, -- Positive = credit, Negative = debit
  balance_before NUMERIC(10,2) NOT NULL CHECK (balance_before >= 0),
  balance_after NUMERIC(10,2) NOT NULL CHECK (balance_after >= 0),
  currency TEXT DEFAULT 'JOD',
  
  type TEXT NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'trip_payment', 'trip_earning', 
    'refund', 'bonus', 'subscription_payment', 'platform_fee'
  )),
  description TEXT,
  
  -- References
  related_booking_id UUID REFERENCES public.bookings(id),
  related_trip_id UUID REFERENCES public.trips(id),
  related_subscription_id UUID REFERENCES public.subscriptions(id),
  
  -- Payment gateway reference
  external_transaction_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_balance_change CHECK (
    (amount > 0 AND balance_after = balance_before + amount) OR
    (amount < 0 AND balance_after = balance_before + amount)
  )
);

-- RLS for wallet transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type, created_at DESC);
CREATE INDEX idx_wallet_transactions_booking ON public.wallet_transactions(related_booking_id) WHERE related_booking_id IS NOT NULL;

-- ==================== NOTIFICATIONS TABLE ====================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN (
    'booking_request', 'booking_confirmed', 'booking_cancelled',
    'trip_reminder', 'payment_received', 'payment_failed',
    'rating_received', 'message_received', 'system_announcement'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Links
  action_url TEXT,
  related_booking_id UUID REFERENCES public.bookings(id),
  related_trip_id UUID REFERENCES public.trips(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_notifications_expires ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ==================== RATINGS TABLE ====================
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  tags TEXT[], -- e.g., ['punctual', 'friendly', 'clean_car']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_rating UNIQUE(booking_id, from_user_id),
  CONSTRAINT no_self_rating CHECK (from_user_id != to_user_id)
);

-- RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings about them"
  ON public.ratings FOR SELECT
  USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

CREATE POLICY "Users can create ratings for completed bookings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    from_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND status = 'completed'
      AND (passenger_id = auth.uid() OR trip_id IN (
        SELECT id FROM public.trips WHERE driver_id = auth.uid()
      ))
    )
  );

-- Indexes
CREATE INDEX idx_ratings_to_user ON public.ratings(to_user_id, created_at DESC);
CREATE INDEX idx_ratings_from_user ON public.ratings(from_user_id, created_at DESC);
CREATE INDEX idx_ratings_booking ON public.ratings(booking_id);

-- ==================== FUNCTIONS ====================

-- Function to update profile stats after trip completion
CREATE OR REPLACE FUNCTION update_profile_stats_on_trip_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update driver stats
    UPDATE public.profiles
    SET 
      total_trips = total_trips + 1,
      trips_as_driver = trips_as_driver + 1,
      updated_at = NOW()
    WHERE id = (SELECT driver_id FROM public.trips WHERE id = NEW.trip_id);
    
    -- Update passenger stats
    UPDATE public.profiles
    SET 
      total_trips = total_trips + 1,
      trips_as_passenger = trips_as_passenger + 1,
      updated_at = NOW()
    WHERE id = NEW.passenger_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_stats
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_stats_on_trip_completion();

-- Function to update profile rating after new rating
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  rating_count INTEGER;
BEGIN
  -- Calculate new average rating for the user being rated
  SELECT 
    AVG(rating)::NUMERIC(3,2),
    COUNT(*)
  INTO avg_rating, rating_count
  FROM public.ratings
  WHERE to_user_id = NEW.to_user_id;
  
  -- Determine if this is driver or passenger rating
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.trips t ON b.trip_id = t.id
    WHERE b.id = NEW.booking_id
    AND t.driver_id = NEW.to_user_id
  ) THEN
    -- Update driver rating
    UPDATE public.profiles
    SET 
      rating_as_driver = avg_rating,
      total_ratings_received = rating_count,
      updated_at = NOW()
    WHERE id = NEW.to_user_id;
  ELSE
    -- Update passenger rating
    UPDATE public.profiles
    SET 
      rating_as_passenger = avg_rating,
      total_ratings_received = rating_count,
      updated_at = NOW()
    WHERE id = NEW.to_user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_rating
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();

-- Function to update wallet balance
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    wallet_balance = NEW.balance_after,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_balance
  AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== MATERIALIZED VIEW FOR TRIP SEARCH ====================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.trip_search_cache AS
SELECT 
  t.id,
  t.driver_id,
  t.from_location,
  t.to_location,
  t.departure_date,
  t.departure_time,
  t.available_seats,
  t.total_seats,
  t.price_per_seat,
  t.currency,
  t.status,
  t.distance_km,
  t.smoking_allowed,
  t.pets_allowed,
  t.music_allowed,
  p.full_name AS driver_name,
  p.rating_as_driver AS driver_rating,
  p.trips_as_driver AS driver_trip_count,
  p.avatar_url AS driver_avatar,
  p.phone_verified AS driver_phone_verified,
  p.id_verified AS driver_id_verified
FROM public.trips t
JOIN public.profiles p ON t.driver_id = p.id
WHERE t.status = 'published' 
  AND t.available_seats > 0
  AND t.deleted_at IS NULL
  AND t.departure_date >= CURRENT_DATE;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_trip_search_cache_id ON public.trip_search_cache(id);

-- Composite indexes for search
CREATE INDEX idx_trip_search_cache_route ON public.trip_search_cache(from_location, to_location, departure_date);
CREATE INDEX idx_trip_search_cache_date ON public.trip_search_cache(departure_date, departure_time);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_trip_search_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.trip_search_cache;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 5 minutes (requires pg_cron extension)
-- SELECT cron.schedule('refresh-trip-search-cache', '*/5 * * * *', 'SELECT refresh_trip_search_cache();');

-- ==================== GRANT PERMISSIONS ====================
-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT SELECT ON public.trip_search_cache TO authenticated;
GRANT SELECT ON public.trip_search_cache TO anon;

-- Grant service role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ==================== COMMENTS ====================
COMMENT ON TABLE public.profiles IS 'User profiles with wallet, preferences, and subscription info';
COMMENT ON TABLE public.trips IS 'Trip listings created by drivers';
COMMENT ON TABLE public.bookings IS 'Passenger bookings for trips';
COMMENT ON TABLE public.subscriptions IS 'Stripe subscription records';
COMMENT ON TABLE public.processed_stripe_events IS 'Idempotency table for Stripe webhooks';
COMMENT ON TABLE public.wallet_transactions IS 'All wallet balance changes';
COMMENT ON TABLE public.notifications IS 'In-app notifications';
COMMENT ON TABLE public.ratings IS 'Driver and passenger ratings';
COMMENT ON MATERIALIZED VIEW public.trip_search_cache IS 'Optimized view for trip search (refreshed every 5 min)';

-- ==================== MIGRATION COMPLETE ====================
-- Next steps:
-- 1. Run this migration: supabase db reset (dev) or supabase migration up (prod)
-- 2. Migrate existing KV data using scripts/migrate-kv-to-postgres.ts
-- 3. Update Edge Functions to use new tables instead of KV store
-- 4. Test RLS policies thoroughly
