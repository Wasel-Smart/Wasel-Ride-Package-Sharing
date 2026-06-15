-- =====================================================
-- W Mobility Platform - Complete Database Schema
-- =====================================================
-- Version: 4.0 (Unified Mobility OS - Hybrid Model)
-- Date: March 20, 2026
-- Description: Production-ready schema for carpooling + on-demand + package delivery
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'both', 'admin');
CREATE TYPE trip_mode AS ENUM ('carpooling', 'on_demand', 'scheduled', 'package', 'return');
CREATE TYPE trip_status AS ENUM (
  'posted', 'requested', 'matched', 'accepted', 'booked', 'confirmed',
  'pickup', 'in_progress', 'completed', 'cancelled', 'disputed'
);
CREATE TYPE gender AS ENUM ('male', 'female', 'unspecified');
CREATE TYPE gender_preference AS ENUM ('mixed', 'women_only', 'men_only', 'family_only');
CREATE TYPE vehicle_type AS ENUM ('economy', 'comfort', 'premium', 'van', 'suv');
CREATE TYPE package_size AS ENUM ('small', 'medium', 'large', 'extra_large');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'apple_pay', 'google_pay', 'split');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'busy', 'in_trip');
CREATE TYPE notification_type AS ENUM (
  'trip_request', 'trip_matched', 'trip_accepted', 'trip_cancelled',
  'payment_received', 'rating_received', 'message_received',
  'safety_alert', 'promotion', 'system'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (both passengers and drivers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'passenger',
  gender gender DEFAULT 'unspecified',
  date_of_birth DATE,
  language TEXT DEFAULT 'ar', -- 'ar' or 'en'
  
  -- Verification
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  identity_verified verification_status DEFAULT 'unverified',
  sanad_verified BOOLEAN DEFAULT false, -- Jordan National ID verification
  
  -- Trust & Safety
  trust_score DECIMAL(3,2) DEFAULT 0.0 CHECK (trust_score >= 0 AND trust_score <= 5.0),
  total_trips INTEGER DEFAULT 0,
  total_trips_as_driver INTEGER DEFAULT 0,
  total_trips_as_passenger INTEGER DEFAULT 0,
  
  -- Preferences
  gender_preference gender_preference DEFAULT 'mixed',
  prayer_stops_enabled BOOLEAN DEFAULT true,
  ramadan_mode_enabled BOOLEAN DEFAULT false,
  hijab_privacy_enabled BOOLEAN DEFAULT false,
  
  -- Wallet & Earnings
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  lifetime_earnings DECIMAL(10,2) DEFAULT 0.00,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_banned BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver profiles (extended info for drivers)
CREATE TABLE driver_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Vehicle information
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_plate TEXT UNIQUE,
  vehicle_type vehicle_type DEFAULT 'economy',
  seats_available INTEGER CHECK (seats_available >= 1 AND seats_available <= 8),
  
  -- Documents
  license_number TEXT,
  license_expiry DATE,
  license_verified BOOLEAN DEFAULT false,
  insurance_number TEXT,
  insurance_expiry DATE,
  insurance_verified BOOLEAN DEFAULT false,
  vehicle_registration_verified BOOLEAN DEFAULT false,
  
  -- Driver status
  status driver_status DEFAULT 'offline',
  current_location GEOGRAPHY(Point, 4326),
  heading DECIMAL(5,2), -- 0-360 degrees
  
  -- Performance metrics
  acceptance_rate DECIMAL(5,2) DEFAULT 100.00,
  cancellation_rate DECIMAL(5,2) DEFAULT 0.00,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  total_ratings INTEGER DEFAULT 0,
  
  -- Earnings
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  this_month_earnings DECIMAL(10,2) DEFAULT 0.00,
  last_payout_at TIMESTAMPTZ,
  
  -- Settings
  auto_accept_enabled BOOLEAN DEFAULT false,
  max_pickup_distance_km INTEGER DEFAULT 5,
  preferred_corridors TEXT[], -- Array of route IDs
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trips table (unified for carpooling + on-demand)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Trip type
  mode trip_mode NOT NULL,
  status trip_status DEFAULT 'posted',
  
  -- Participants
  driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  
  -- Route information
  origin_name TEXT NOT NULL,
  origin_location GEOGRAPHY(Point, 4326) NOT NULL,
  destination_name TEXT NOT NULL,
  destination_location GEOGRAPHY(Point, 4326) NOT NULL,
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  route_polyline TEXT, -- Encoded polyline
  
  -- Timing
  departure_time TIMESTAMPTZ,
  scheduled_pickup_time TIMESTAMPTZ,
  actual_pickup_time TIMESTAMPTZ,
  actual_dropoff_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Capacity & Pricing
  total_seats INTEGER DEFAULT 1,
  available_seats INTEGER DEFAULT 1,
  price_per_seat DECIMAL(10,2),
  total_price DECIMAL(10,2),
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Cultural features
  gender_preference gender_preference DEFAULT 'mixed',
  prayer_stop_enabled BOOLEAN DEFAULT false,
  prayer_stop_location GEOGRAPHY(Point, 4326),
  prayer_stop_duration_min INTEGER DEFAULT 20,
  
  -- Package delivery
  allows_packages BOOLEAN DEFAULT false,
  package_capacity_kg DECIMAL(5,2),
  
  -- AI & Optimization
  predicted_demand DECIMAL(5,2),
  corridor_id TEXT, -- e.g., 'amman-aqaba'
  cluster_id UUID, -- For multi-service clustering
  
  -- Metadata
  notes TEXT,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip bookings (passenger reservations)
CREATE TABLE trip_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Booking details
  seats_booked INTEGER DEFAULT 1,
  price_paid DECIMAL(10,2) NOT NULL,
  
  -- Pickup/Dropoff (may differ from trip origin/destination)
  pickup_location GEOGRAPHY(Point, 4326),
  pickup_name TEXT,
  dropoff_location GEOGRAPHY(Point, 4326),
  dropoff_name TEXT,
  
  -- Status
  status trip_status DEFAULT 'booked',
  confirmed_by_driver BOOLEAN DEFAULT false,
  
  -- Ratings & Reviews
  driver_rating DECIMAL(3,2) CHECK (driver_rating >= 0 AND driver_rating <= 5),
  passenger_rating DECIMAL(3,2) CHECK (passenger_rating >= 0 AND passenger_rating <= 5),
  driver_review TEXT,
  passenger_review TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id, passenger_id)
);

-- Package deliveries
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Package details
  tracking_number TEXT UNIQUE NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  
  -- Sender & Receiver
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  
  -- Route
  origin_name TEXT NOT NULL,
  origin_location GEOGRAPHY(Point, 4326) NOT NULL,
  destination_name TEXT NOT NULL,
  destination_location GEOGRAPHY(Point, 4326) NOT NULL,
  
  -- Package info
  size package_size NOT NULL,
  weight_kg DECIMAL(5,2),
  description TEXT,
  declared_value DECIMAL(10,2),
  fragile BOOLEAN DEFAULT false,
  
  -- Trip assignment
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  carrier_id UUID REFERENCES users(id), -- Driver carrying the package
  
  -- Pricing
  delivery_fee DECIMAL(10,2) NOT NULL,
  insurance_fee DECIMAL(10,2) DEFAULT 0.50,
  
  -- Status
  status trip_status DEFAULT 'posted',
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Verification
  pickup_verified BOOLEAN DEFAULT false,
  dropoff_verified BOOLEAN DEFAULT false,
  pickup_signature TEXT,
  dropoff_signature TEXT,
  
  -- Raje3 (e-commerce returns)
  is_return BOOLEAN DEFAULT false,
  ecommerce_order_id TEXT,
  return_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time driver locations (for on-demand matching)
CREATE TABLE driver_locations (
  driver_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  heading DECIMAL(5,2), -- Direction in degrees
  speed_kmh DECIMAL(5,2),
  accuracy_meters DECIMAL(6,2),
  status driver_status DEFAULT 'online',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Related entities
  trip_id UUID REFERENCES trips(id),
  package_id UUID REFERENCES packages(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'JOD',
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  
  -- Platform fees
  platform_commission DECIMAL(10,2),
  commission_rate DECIMAL(5,2), -- Percentage
  
  -- Gateway info
  gateway_transaction_id TEXT,
  gateway_name TEXT, -- 'stripe', 'cliq', 'cash'
  
  -- Refunds
  refunded_amount DECIMAL(10,2) DEFAULT 0.00,
  refund_reason TEXT,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing rules (dynamic pricing configuration)
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Rule details
  name TEXT NOT NULL,
  mode trip_mode NOT NULL,
  
  -- Base pricing
  base_fare_jod DECIMAL(10,2) DEFAULT 0.00,
  per_km_jod DECIMAL(10,2) DEFAULT 0.50,
  per_minute_jod DECIMAL(10,2) DEFAULT 0.10,
  
  -- Surge pricing
  surge_enabled BOOLEAN DEFAULT true,
  min_surge DECIMAL(3,2) DEFAULT 1.0,
  max_surge DECIMAL(3,2) DEFAULT 3.0,
  
  -- Conditions
  corridor TEXT, -- Specific route (e.g., 'amman-aqaba')
  day_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  time_of_day_start TIME,
  time_of_day_end TIME,
  
  -- Weather & Events
  weather_multiplier DECIMAL(3,2) DEFAULT 1.0,
  event_multiplier DECIMAL(3,2) DEFAULT 1.0,
  
  -- Active status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority = applied first
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demand forecasting (AI predictions)
CREATE TABLE demand_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Forecast details
  corridor TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_hour INTEGER CHECK (forecast_hour >= 0 AND forecast_hour <= 23),
  
  -- Predictions
  predicted_demand INTEGER NOT NULL,
  predicted_supply INTEGER NOT NULL,
  predicted_surge DECIMAL(3,2) DEFAULT 1.0,
  confidence_score DECIMAL(5,2), -- 0-100%
  
  -- Recommendations
  recommended_drivers_needed INTEGER,
  recommended_incentive_jod DECIMAL(10,2),
  
  -- Metadata
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(corridor, forecast_date, forecast_hour)
);

-- Corridor analytics (route performance tracking)
CREATE TABLE corridor_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Corridor info
  corridor TEXT NOT NULL,
  date DATE NOT NULL,
  
  -- Trip metrics
  total_trips INTEGER DEFAULT 0,
  carpooling_trips INTEGER DEFAULT 0,
  on_demand_trips INTEGER DEFAULT 0,
  package_deliveries INTEGER DEFAULT 0,
  
  -- Revenue
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  average_price_per_trip DECIMAL(10,2),
  
  -- Supply & Demand
  average_demand INTEGER,
  average_supply INTEGER,
  average_surge DECIMAL(3,2),
  
  -- Performance
  average_wait_time_min INTEGER,
  match_success_rate DECIMAL(5,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(corridor, date)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  
  -- Related entities
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Delivery
  push_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (chat between users)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  
  -- Message content
  message TEXT NOT NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews & Ratings
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  
  -- Reviewer & Reviewee
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rating & Review
  rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review TEXT,
  
  -- Categories (optional detailed ratings)
  punctuality_rating DECIMAL(3,2) CHECK (punctuality_rating >= 0 AND punctuality_rating <= 5),
  cleanliness_rating DECIMAL(3,2) CHECK (cleanliness_rating >= 0 AND cleanliness_rating <= 5),
  communication_rating DECIMAL(3,2) CHECK (communication_rating >= 0 AND communication_rating <= 5),
  safety_rating DECIMAL(3,2) CHECK (safety_rating >= 0 AND safety_rating <= 5),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id, reviewer_id, reviewee_id)
);

-- Safety incidents
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Incident details
  trip_id UUID REFERENCES trips(id),
  reported_by UUID REFERENCES users(id) NOT NULL,
  reported_against UUID REFERENCES users(id),
  
  -- Incident info
  type TEXT NOT NULL, -- 'harassment', 'unsafe_driving', 'fraud', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'dismissed'
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  
  -- Actions taken
  user_warned BOOLEAN DEFAULT false,
  user_suspended BOOLEAN DEFAULT false,
  user_banned BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Reward tracking
  referrer_reward_jod DECIMAL(10,2) DEFAULT 10.00,
  referee_reward_jod DECIMAL(10,2) DEFAULT 10.00,
  referrer_rewarded BOOLEAN DEFAULT false,
  referee_rewarded BOOLEAN DEFAULT false,
  
  -- Conditions
  referee_completed_first_trip BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(referrer_id, referee_id)
);

-- Promo codes
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  
  -- Discount details
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  max_discount_jod DECIMAL(10,2),
  
  -- Usage limits
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Restrictions
  min_trip_amount DECIMAL(10,2),
  mode trip_mode, -- NULL = all modes
  first_trip_only BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo code usage
CREATE TABLE promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  
  discount_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(promo_code_id, trip_id)
);

-- =====================================================
-- INDEXES (Performance Optimization)
-- =====================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- Driver profiles
CREATE INDEX idx_driver_status ON driver_profiles(status);
CREATE INDEX idx_driver_location ON driver_profiles USING GIST(current_location);

-- Trips
CREATE INDEX idx_trips_mode ON trips(mode);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_created_by ON trips(created_by);
CREATE INDEX idx_trips_departure ON trips(departure_time);
CREATE INDEX idx_trips_corridor ON trips(corridor_id);
CREATE INDEX idx_trips_origin ON trips USING GIST(origin_location);
CREATE INDEX idx_trips_destination ON trips USING GIST(destination_location);
CREATE INDEX idx_trips_created_at ON trips(created_at);

-- Trip bookings
CREATE INDEX idx_bookings_trip ON trip_bookings(trip_id);
CREATE INDEX idx_bookings_passenger ON trip_bookings(passenger_id);
CREATE INDEX idx_bookings_status ON trip_bookings(status);

-- Packages
CREATE INDEX idx_packages_tracking ON packages(tracking_number);
CREATE INDEX idx_packages_sender ON packages(sender_id);
CREATE INDEX idx_packages_trip ON packages(trip_id);
CREATE INDEX idx_packages_status ON packages(status);

-- Driver locations
CREATE INDEX idx_driver_locations ON driver_locations USING GIST(location);
CREATE INDEX idx_driver_locations_updated ON driver_locations(updated_at);

-- Payments
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_trip ON payments(trip_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Messages
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_trip ON messages(trip_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Reviews
CREATE INDEX idx_reviews_trip ON reviews(trip_id);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_MakePoint(lon1, lat1)::geography,
    ST_MakePoint(lon2, lat2)::geography
  ) / 1000.0;
END;
$$ LANGUAGE plpgsql;

-- Find nearby drivers
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  user_lat DECIMAL,
  user_lon DECIMAL,
  max_distance_km INTEGER DEFAULT 10,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  driver_id UUID,
  distance_km DECIMAL,
  driver_name TEXT,
  vehicle_type vehicle_type,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.driver_id,
    (ST_Distance(
      dl.location,
      ST_MakePoint(user_lon, user_lat)::geography
    ) / 1000.0)::DECIMAL AS distance_km,
    u.full_name,
    dp.vehicle_type,
    dp.average_rating
  FROM driver_locations dl
  JOIN users u ON dl.driver_id = u.id
  JOIN driver_profiles dp ON dl.driver_id = dp.user_id
  WHERE
    dl.status = 'online'
    AND ST_DWithin(
      dl.location,
      ST_MakePoint(user_lon, user_lat)::geography,
      max_distance_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Calculate dynamic price
CREATE OR REPLACE FUNCTION calculate_dynamic_price(
  p_mode trip_mode,
  p_distance_km DECIMAL,
  p_duration_min INTEGER,
  p_corridor TEXT,
  p_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  v_base_fare DECIMAL := 0.00;
  v_per_km DECIMAL := 0.50;
  v_per_min DECIMAL := 0.10;
  v_surge DECIMAL := 1.0;
  v_total DECIMAL;
BEGIN
  -- Get pricing rule
  SELECT
    COALESCE(pr.base_fare_jod, 0.00),
    COALESCE(pr.per_km_jod, 0.50),
    COALESCE(pr.per_minute_jod, 0.10)
  INTO v_base_fare, v_per_km, v_per_min
  FROM pricing_rules pr
  WHERE
    pr.mode = p_mode
    AND pr.is_active = true
    AND (pr.corridor IS NULL OR pr.corridor = p_corridor)
  ORDER BY pr.priority DESC
  LIMIT 1;
  
  -- Calculate base price
  v_total := v_base_fare + (p_distance_km * v_per_km) + (p_duration_min * v_per_min);
  
  -- Apply surge (simplified - would use real demand data in production)
  v_surge := 1.0; -- TODO: Calculate from demand_forecasts table
  
  RETURN jsonb_build_object(
    'base_price', v_total,
    'surge_multiplier', v_surge,
    'final_price', v_total * v_surge,
    'breakdown', jsonb_build_object(
      'base_fare', v_base_fare,
      'distance_charge', p_distance_km * v_per_km,
      'time_charge', p_duration_min * v_per_min
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON driver_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_bookings_updated_at BEFORE UPDATE ON trip_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- Users: Can view own profile, admins can view all
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (auth.uid() = id);

-- Driver profiles: Public read, driver can update own
CREATE POLICY driver_profiles_select_all ON driver_profiles
  FOR SELECT USING (true);

CREATE POLICY driver_profiles_update_own ON driver_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Trips: Public read for available trips, participants can view their trips
CREATE POLICY trips_select_available ON trips
  FOR SELECT USING (
    status IN ('posted', 'requested') OR
    driver_id = auth.uid() OR
    created_by = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY trips_insert_own ON trips
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY trips_update_own ON trips
  FOR UPDATE USING (
    driver_id = auth.uid() OR
    created_by = auth.uid()
  );

-- Trip bookings: Users can view their own bookings
CREATE POLICY bookings_select_own ON trip_bookings
  FOR SELECT USING (
    passenger_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid())
  );

CREATE POLICY bookings_insert_own ON trip_bookings
  FOR INSERT WITH CHECK (passenger_id = auth.uid());

-- Packages: Sender and carrier can view
CREATE POLICY packages_select_own ON packages
  FOR SELECT USING (
    sender_id = auth.uid() OR
    carrier_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY packages_insert_own ON packages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Driver locations: Public read, driver can update own
CREATE POLICY driver_locations_select_all ON driver_locations
  FOR SELECT USING (true);

CREATE POLICY driver_locations_upsert_own ON driver_locations
  FOR ALL USING (auth.uid() = driver_id);

-- Payments: Users can view their own payments
CREATE POLICY payments_select_own ON payments
  FOR SELECT USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Notifications: Users can view their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Messages: Users can view their own messages
CREATE POLICY messages_select_own ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR
    receiver_id = auth.uid()
  );

CREATE POLICY messages_insert_own ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Reviews: Public read, users can create reviews for trips they participated in
CREATE POLICY reviews_select_all ON reviews
  FOR SELECT USING (true);

CREATE POLICY reviews_insert_own ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Safety incidents: Users can report incidents
CREATE POLICY incidents_select_own ON safety_incidents
  FOR SELECT USING (
    reported_by = auth.uid() OR
    reported_against = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY incidents_insert_own ON safety_incidents
  FOR INSERT WITH CHECK (reported_by = auth.uid());

-- =====================================================
-- SEED DATA (Default pricing rules)
-- =====================================================

-- Carpooling pricing (fixed, fuel-based)
INSERT INTO pricing_rules (name, mode, base_fare_jod, per_km_jod, per_minute_jod, surge_enabled)
VALUES
  ('Carpooling Default', 'carpooling', 0.00, 0.072, 0.00, false); -- JOD 0.90/L ÷ 12.5 km/L

-- On-demand pricing (dynamic)
INSERT INTO pricing_rules (name, mode, base_fare_jod, per_km_jod, per_minute_jod, surge_enabled, max_surge)
VALUES
  ('On-Demand Default', 'on_demand', 1.50, 0.50, 0.10, true, 3.0);

-- Package delivery pricing
INSERT INTO pricing_rules (name, mode, base_fare_jod, per_km_jod, per_minute_jod, surge_enabled)
VALUES
  ('Package Small', 'package', 2.00, 0.012, 0.00, false),
  ('Package Medium', 'package', 3.00, 0.015, 0.00, false),
  ('Package Large', 'package', 5.00, 0.020, 0.00, false);

-- =====================================================
-- VIEWS (Convenience queries)
-- =====================================================

-- Available trips (for search)
CREATE OR REPLACE VIEW available_trips AS
SELECT
  t.*,
  u.full_name AS driver_name,
  u.avatar_url AS driver_avatar,
  dp.vehicle_make,
  dp.vehicle_model,
  dp.vehicle_color,
  dp.vehicle_type,
  dp.average_rating AS driver_rating,
  dp.total_ratings AS driver_total_ratings
FROM trips t
JOIN users u ON t.driver_id = u.id
JOIN driver_profiles dp ON t.driver_id = dp.user_id
WHERE
  t.status = 'posted'
  AND t.available_seats > 0
  AND t.departure_time > NOW();

-- User trip history
CREATE OR REPLACE VIEW user_trip_history AS
SELECT
  t.id AS trip_id,
  t.mode,
  t.status,
  t.origin_name,
  t.destination_name,
  t.departure_time,
  t.completed_at,
  tb.seats_booked,
  tb.price_paid,
  tb.driver_rating,
  tb.passenger_rating,
  driver.full_name AS driver_name,
  driver.avatar_url AS driver_avatar,
  passenger.id AS passenger_id,
  passenger.full_name AS passenger_name,
  passenger.avatar_url AS passenger_avatar
FROM trips t
LEFT JOIN trip_bookings tb ON t.id = tb.trip_id
LEFT JOIN users driver ON t.driver_id = driver.id
LEFT JOIN users passenger ON tb.passenger_id = passenger.id;

-- Driver earnings summary
CREATE OR REPLACE VIEW driver_earnings_summary AS
SELECT
  u.id AS driver_id,
  u.full_name,
  COUNT(DISTINCT t.id) AS total_trips,
  SUM(tb.price_paid) AS total_earnings,
  SUM(CASE WHEN t.completed_at >= date_trunc('month', NOW()) THEN tb.price_paid ELSE 0 END) AS this_month_earnings,
  SUM(CASE WHEN t.completed_at >= date_trunc('week', NOW()) THEN tb.price_paid ELSE 0 END) AS this_week_earnings,
  AVG(tb.driver_rating) AS average_rating
FROM users u
JOIN driver_profiles dp ON u.id = dp.user_id
LEFT JOIN trips t ON u.id = t.driver_id AND t.status = 'completed'
LEFT JOIN trip_bookings tb ON t.id = tb.trip_id
GROUP BY u.id, u.full_name;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE users IS 'Core user table for passengers and drivers';
COMMENT ON TABLE driver_profiles IS 'Extended information for drivers only';
COMMENT ON TABLE trips IS 'Unified trips table for carpooling, on-demand, and package delivery';
COMMENT ON TABLE trip_bookings IS 'Passenger reservations for trips';
COMMENT ON TABLE packages IS 'Package delivery requests';
COMMENT ON TABLE driver_locations IS 'Real-time driver location tracking';
COMMENT ON TABLE pricing_rules IS 'Dynamic pricing configuration';
COMMENT ON TABLE demand_forecasts IS 'AI-generated demand predictions';
COMMENT ON TABLE corridor_analytics IS 'Route performance metrics';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
