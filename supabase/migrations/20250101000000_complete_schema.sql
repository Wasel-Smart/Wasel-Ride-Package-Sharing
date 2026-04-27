-- =============================================================================
-- Wasel Complete Schema Migration
-- Creates all core tables with RLS policies, indexes, and constraints
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone_number        TEXT,
  avatar_url          TEXT,
  bio                 TEXT,
  date_of_birth       DATE,
  gender              TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'ar')),
  wallet_balance      NUMERIC(12,3) DEFAULT 0.00 CHECK (wallet_balance >= 0),
  trust_score         NUMERIC(3,2) DEFAULT 5.00 CHECK (trust_score >= 0 AND trust_score <= 5),
  is_driver           BOOLEAN DEFAULT false,
  is_verified         BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_driver ON profiles(is_driver) WHERE is_driver = true;
CREATE INDEX idx_profiles_verified ON profiles(is_verified) WHERE is_verified = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CITIES & ROUTES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  country     TEXT DEFAULT 'Jordan',
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cities_active ON cities(is_active) WHERE is_active = true;
CREATE INDEX idx_cities_location ON cities USING GIST (point(longitude, latitude));

CREATE TABLE IF NOT EXISTS routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_city_id  UUID REFERENCES cities(id),
  dest_city_id    UUID REFERENCES cities(id),
  distance_km     NUMERIC(6,2),
  duration_minutes INT,
  base_price      NUMERIC(8,3),
  is_popular      BOOLEAN DEFAULT false,
  demand_level    TEXT DEFAULT 'normal' CHECK (demand_level IN ('low', 'normal', 'high')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT different_cities CHECK (origin_city_id != dest_city_id)
);

CREATE INDEX idx_routes_origin ON routes(origin_city_id);
CREATE INDEX idx_routes_dest ON routes(dest_city_id);
CREATE INDEX idx_routes_popular ON routes(is_popular) WHERE is_popular = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TRIPS (Driver Offers)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id           UUID NOT NULL REFERENCES profiles(id),
  origin_city_id      UUID REFERENCES cities(id),
  destination_city_id UUID REFERENCES cities(id),
  origin_address      TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  origin_lat          NUMERIC(10,7),
  origin_lng          NUMERIC(10,7),
  destination_lat     NUMERIC(10,7),
  destination_lng     NUMERIC(10,7),
  departure_time      TIMESTAMPTZ NOT NULL,
  arrival_time        TIMESTAMPTZ,
  available_seats     INT NOT NULL CHECK (available_seats >= 0 AND available_seats <= 8),
  price_per_seat      NUMERIC(8,3) NOT NULL CHECK (price_per_seat > 0),
  vehicle_type        TEXT,
  vehicle_plate       TEXT,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
  allows_packages     BOOLEAN DEFAULT false,
  package_price       NUMERIC(8,3),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_origin ON trips(origin_city_id);
CREATE INDEX idx_trips_destination ON trips(destination_city_id);
CREATE INDEX idx_trips_departure ON trips(departure_time);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_active ON trips(status, departure_time) WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RIDES (Passenger Bookings)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             UUID REFERENCES trips(id),
  passenger_id        UUID NOT NULL REFERENCES profiles(id),
  pickup_address      TEXT NOT NULL,
  dropoff_address     TEXT NOT NULL,
  pickup_lat          NUMERIC(10,7),
  pickup_lng          NUMERIC(10,7),
  dropoff_lat         NUMERIC(10,7),
  dropoff_lng         NUMERIC(10,7),
  seats_requested     INT NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
  total_price         NUMERIC(8,3) NOT NULL,
  status              TEXT DEFAULT 'REQUESTED' CHECK (status IN (
    'REQUESTED', 'MATCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 
    'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED'
  )),
  payment_status      TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id   TEXT,
  pickup_time         TIMESTAMPTZ,
  dropoff_time        TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by        UUID REFERENCES profiles(id),
  rating              INT CHECK (rating >= 1 AND rating <= 5),
  review              TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rides_trip ON rides(trip_id);
CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_payment ON rides(payment_status);
CREATE INDEX idx_rides_active ON rides(status) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PACKAGES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS packages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id           UUID NOT NULL REFERENCES profiles(id),
  receiver_id         UUID REFERENCES profiles(id),
  trip_id             UUID REFERENCES trips(id),
  carrier_id          UUID REFERENCES profiles(id),
  tracking_number     TEXT UNIQUE NOT NULL,
  origin_address      TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  origin_lat          NUMERIC(10,7),
  origin_lng          NUMERIC(10,7),
  destination_lat     NUMERIC(10,7),
  destination_lng     NUMERIC(10,7),
  package_size        TEXT CHECK (package_size IN ('small', 'medium', 'large')),
  weight_kg           NUMERIC(5,2),
  description         TEXT,
  declared_value      NUMERIC(10,3),
  delivery_price      NUMERIC(8,3) NOT NULL,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'matched', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed'
  )),
  payment_status      TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id   TEXT,
  pickup_time         TIMESTAMPTZ,
  delivery_time       TIMESTAMPTZ,
  receiver_phone      TEXT,
  receiver_name       TEXT,
  special_instructions TEXT,
  photo_url           TEXT,
  signature_url       TEXT,
  rating              INT CHECK (rating >= 1 AND rating <= 5),
  review              TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_packages_sender ON packages(sender_id);
CREATE INDEX idx_packages_receiver ON packages(receiver_id);
CREATE INDEX idx_packages_carrier ON packages(carrier_id);
CREATE INDEX idx_packages_trip ON packages(trip_id);
CREATE INDEX idx_packages_tracking ON packages(tracking_number);
CREATE INDEX idx_packages_status ON packages(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. BUSES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name   TEXT NOT NULL,
  bus_number      TEXT NOT NULL,
  route_id        UUID REFERENCES routes(id),
  capacity        INT NOT NULL DEFAULT 40,
  vehicle_type    TEXT DEFAULT 'standard' CHECK (vehicle_type IN ('standard', 'luxury', 'minibus')),
  amenities       TEXT[],
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_buses_route ON buses(route_id);
CREATE INDEX idx_buses_active ON buses(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS bus_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id          UUID NOT NULL REFERENCES buses(id),
  departure_time  TIME NOT NULL,
  arrival_time    TIME NOT NULL,
  days_of_week    INT[] NOT NULL, -- 0=Sunday, 6=Saturday
  price           NUMERIC(8,3) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bus_schedules_bus ON bus_schedules(bus_id);
CREATE INDEX idx_bus_schedules_active ON bus_schedules(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS bus_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id       UUID NOT NULL REFERENCES bus_schedules(id),
  passenger_id      UUID NOT NULL REFERENCES profiles(id),
  booking_date      DATE NOT NULL,
  seats_booked      INT NOT NULL DEFAULT 1 CHECK (seats_booked > 0),
  total_price       NUMERIC(8,3) NOT NULL,
  status            TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  payment_status    TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  payment_intent_id TEXT,
  booking_reference TEXT UNIQUE NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bus_bookings_schedule ON bus_bookings(schedule_id);
CREATE INDEX idx_bus_bookings_passenger ON bus_bookings(passenger_id);
CREATE INDEX idx_bus_bookings_date ON bus_bookings(booking_date);
CREATE INDEX idx_bus_bookings_reference ON bus_bookings(booking_reference);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. WALLET TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  amount            NUMERIC(12,3) NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  category          TEXT NOT NULL CHECK (category IN (
    'ride_payment', 'ride_refund', 'package_payment', 'package_refund',
    'bus_payment', 'bus_refund', 'wallet_topup', 'withdrawal', 
    'driver_earning', 'carrier_earning', 'bonus', 'penalty'
  )),
  reference_type    TEXT,
  reference_id      UUID,
  balance_before    NUMERIC(12,3) NOT NULL,
  balance_after     NUMERIC(12,3) NOT NULL,
  description       TEXT,
  payment_method    TEXT,
  payment_intent_id TEXT,
  status            TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wallet_transactions_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_category ON wallet_transactions(category);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN (
    'ride_update', 'package_update', 'payment', 'system', 'promotion', 'trust'
  )),
  priority      TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  reference_type TEXT,
  reference_id  UUID,
  is_read       BOOLEAN DEFAULT false,
  read_at       TIMESTAMPTZ,
  action_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TRUST & SAFETY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id),
  score           NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (score >= 0 AND score <= 5),
  total_rides     INT DEFAULT 0,
  completed_rides INT DEFAULT 0,
  cancelled_rides INT DEFAULT 0,
  total_ratings   INT DEFAULT 0,
  average_rating  NUMERIC(3,2),
  positive_reviews INT DEFAULT 0,
  negative_reviews INT DEFAULT 0,
  response_rate   NUMERIC(5,2),
  on_time_rate    NUMERIC(5,2),
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_trust_scores_user ON trust_scores(user_id);
CREATE INDEX idx_trust_scores_score ON trust_scores(score DESC);

CREATE TABLE IF NOT EXISTS user_verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  verification_type TEXT NOT NULL CHECK (verification_type IN (
    'phone', 'email', 'national_id', 'drivers_license', 'vehicle_registration', 'background_check'
  )),
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  document_url      TEXT,
  verified_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  verified_by       UUID REFERENCES profiles(id),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_type ON user_verifications(verification_type);
CREATE INDEX idx_user_verifications_status ON user_verifications(status);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id),
  reported_user_id UUID NOT NULL REFERENCES profiles(id),
  report_type     TEXT NOT NULL CHECK (report_type IN (
    'inappropriate_behavior', 'safety_concern', 'fraud', 'harassment', 'other'
  )),
  reference_type  TEXT,
  reference_id    UUID,
  description     TEXT NOT NULL,
  evidence_urls   TEXT[],
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution      TEXT,
  resolved_by     UUID REFERENCES profiles(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. COMMUNICATION PREFERENCES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communication_preferences (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  email_notifications     BOOLEAN DEFAULT true,
  sms_notifications       BOOLEAN DEFAULT true,
  whatsapp_notifications  BOOLEAN DEFAULT true,
  push_notifications      BOOLEAN DEFAULT true,
  marketing_emails        BOOLEAN DEFAULT false,
  ride_updates            BOOLEAN DEFAULT true,
  package_updates         BOOLEAN DEFAULT true,
  payment_notifications   BOOLEAN DEFAULT true,
  promotional_offers      BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_communication_preferences_user ON communication_preferences(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. WEB VITALS (Performance Monitoring)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS web_vitals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  value       NUMERIC NOT NULL,
  rating      TEXT CHECK (rating IN ('good', 'needs-improvement', 'poor')),
  page_url    TEXT,
  user_agent  TEXT,
  connection  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_web_vitals_metric ON web_vitals(metric_name, created_at DESC);
CREATE INDEX idx_web_vitals_rating ON web_vitals(rating);

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. ROW LEVEL SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY profiles_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Cities & Routes: public read
CREATE POLICY cities_read ON cities FOR SELECT USING (is_active = true);
CREATE POLICY routes_read ON routes FOR SELECT USING (true);

-- Trips: public read active, drivers manage own
CREATE POLICY trips_read ON trips FOR SELECT USING (status = 'active' OR driver_id = auth.uid());
CREATE POLICY trips_insert ON trips FOR INSERT WITH CHECK (driver_id = auth.uid());
CREATE POLICY trips_update_own ON trips FOR UPDATE USING (driver_id = auth.uid());
CREATE POLICY trips_delete_own ON trips FOR DELETE USING (driver_id = auth.uid());

-- Rides: users see own, drivers see their trip rides
CREATE POLICY rides_read_own ON rides FOR SELECT USING (
  passenger_id = auth.uid() OR 
  trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid())
);
CREATE POLICY rides_insert ON rides FOR INSERT WITH CHECK (passenger_id = auth.uid());
CREATE POLICY rides_update_own ON rides FOR UPDATE USING (passenger_id = auth.uid());

-- Packages: sender/receiver/carrier can see
CREATE POLICY packages_read ON packages FOR SELECT USING (
  sender_id = auth.uid() OR 
  receiver_id = auth.uid() OR 
  carrier_id = auth.uid()
);
CREATE POLICY packages_insert ON packages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY packages_update ON packages FOR UPDATE USING (
  sender_id = auth.uid() OR carrier_id = auth.uid()
);

-- Buses: public read
CREATE POLICY buses_read ON buses FOR SELECT USING (is_active = true);
CREATE POLICY bus_schedules_read ON bus_schedules FOR SELECT USING (is_active = true);

-- Bus bookings: users see own
CREATE POLICY bus_bookings_read_own ON bus_bookings FOR SELECT USING (passenger_id = auth.uid());
CREATE POLICY bus_bookings_insert ON bus_bookings FOR INSERT WITH CHECK (passenger_id = auth.uid());

-- Wallet transactions: users see own
CREATE POLICY wallet_transactions_read_own ON wallet_transactions FOR SELECT USING (user_id = auth.uid());

-- Notifications: users see own
CREATE POLICY notifications_read_own ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Trust scores: public read
CREATE POLICY trust_scores_read ON trust_scores FOR SELECT USING (true);

-- User verifications: users see own
CREATE POLICY user_verifications_read_own ON user_verifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_verifications_insert ON user_verifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- Reports: users see own reports
CREATE POLICY reports_read_own ON reports FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY reports_insert ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Communication preferences: users manage own
CREATE POLICY communication_preferences_read_own ON communication_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY communication_preferences_insert ON communication_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY communication_preferences_update_own ON communication_preferences FOR UPDATE USING (user_id = auth.uid());

-- Web vitals: anonymous insert for performance tracking
CREATE POLICY web_vitals_insert ON web_vitals FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. TRIGGERS & FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rides_updated_at BEFORE UPDATE ON rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trust_scores_updated_at BEFORE UPDATE ON trust_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_verifications_updated_at BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER communication_preferences_updated_at BEFORE UPDATE ON communication_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate tracking number for packages
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := 'PKG' || to_char(now(), 'YYYYMMDD') || '-' || 
                          upper(substring(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER packages_tracking_number BEFORE INSERT ON packages
  FOR EACH ROW EXECUTE FUNCTION generate_tracking_number();

-- Generate booking reference for buses
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'BUS' || to_char(now(), 'YYYYMMDD') || '-' || 
                            upper(substring(gen_random_uuid()::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bus_bookings_reference BEFORE INSERT ON bus_bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

COMMENT ON TABLE profiles IS 'User profiles with wallet and trust scores';
COMMENT ON TABLE trips IS 'Driver trip offers with available seats';
COMMENT ON TABLE rides IS 'Passenger ride bookings';
COMMENT ON TABLE packages IS 'Package delivery requests';
COMMENT ON TABLE wallet_transactions IS 'Immutable wallet transaction log';
COMMENT ON TABLE trust_scores IS 'User trust and reputation scores';
