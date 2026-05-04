-- ============================================================================
-- WASSEL SUPER APP - PRODUCTION DATABASE SCHEMA
-- Version: 2.0.0
-- Date: February 10, 2026
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Verification Status
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  id_verified BOOLEAN DEFAULT false,
  driver_license_verified BOOLEAN DEFAULT false,
  
  -- Trip Statistics
  total_trips INTEGER DEFAULT 0,
  trips_as_driver INTEGER DEFAULT 0,
  trips_as_passenger INTEGER DEFAULT 0,
  
  -- Ratings
  rating_as_driver DECIMAL(3,2) DEFAULT 0.0 CHECK (rating_as_driver >= 0 AND rating_as_driver <= 5),
  rating_as_passenger DECIMAL(3,2) DEFAULT 0.0 CHECK (rating_as_passenger >= 0 AND rating_as_passenger <= 5),
  total_ratings_received INTEGER DEFAULT 0,
  
  -- Preferences
  smoking_allowed BOOLEAN DEFAULT false,
  pets_allowed BOOLEAN DEFAULT false,
  music_allowed BOOLEAN DEFAULT true,
  max_2_back_seat BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  currency TEXT DEFAULT 'AED' CHECK (currency IN ('AED', 'SAR', 'KWD', 'BHD', 'EGP', 'JOD')),
  
  -- Settings
  notification_enabled BOOLEAN DEFAULT true,
  location_sharing_enabled BOOLEAN DEFAULT true,
  auto_accept_bookings BOOLEAN DEFAULT false,
  
  -- Financial
  wallet_balance DECIMAL(10,2) DEFAULT 0.0,
  total_earned DECIMAL(10,2) DEFAULT 0.0,
  total_spent DECIMAL(10,2) DEFAULT 0.0,
  
  -- Vehicle Information (for drivers)
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_plate_number TEXT,
  vehicle_seats INTEGER CHECK (vehicle_seats >= 1 AND vehicle_seats <= 8),
  
  -- Metadata
  bio TEXT,
  interests TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_rating_driver ON profiles(rating_as_driver DESC);
CREATE INDEX idx_profiles_rating_passenger ON profiles(rating_as_passenger DESC);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX idx_profiles_last_active ON profiles(last_active_at DESC);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_profiles_full_name_trgm ON profiles USING gin(full_name gin_trgm_ops);

-- ============================================================================
-- 2. TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Route Information
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_coordinates POINT, -- PostGIS point type
  to_coordinates POINT,
  distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,
  waypoints JSONB, -- Array of intermediate stops
  
  -- Schedule
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  
  -- Capacity & Pricing
  total_seats INTEGER NOT NULL CHECK (total_seats >= 1 AND total_seats <= 8),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  currency TEXT DEFAULT 'AED' NOT NULL,
  
  -- Trip Type
  trip_type TEXT DEFAULT 'one-time' CHECK (trip_type IN ('one-time', 'recurring', 'scheduled', 'return')),
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
  recurrence_days INTEGER[], -- Days of week (1=Monday, 7=Sunday)
  
  -- Status
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'in-progress', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  
  -- Preferences
  smoking_allowed BOOLEAN DEFAULT false,
  pets_allowed BOOLEAN DEFAULT false,
  luggage_allowed BOOLEAN DEFAULT true,
  music_preference TEXT CHECK (music_preference IN ('yes', 'no', 'ask')),
  conversation_level TEXT CHECK (conversation_level IN ('quiet', 'moderate', 'chatty')),
  
  -- Additional Info
  notes TEXT,
  vehicle_info TEXT,
  amenities TEXT[], -- ['wifi', 'phone-charger', 'snacks', 'ac']
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT available_seats_check CHECK (available_seats <= total_seats)
);

-- Indexes for trips
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_departure_date ON trips(departure_date);
CREATE INDEX idx_trips_departure_time ON trips(departure_time);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_available_seats ON trips(available_seats) WHERE available_seats > 0;
CREATE INDEX idx_trips_from_location ON trips USING gin(from_location gin_trgm_ops);
CREATE INDEX idx_trips_to_location ON trips USING gin(to_location gin_trgm_ops);
CREATE INDEX idx_trips_created_at ON trips(created_at DESC);

-- Geospatial index for location-based queries
CREATE INDEX idx_trips_from_coordinates ON trips USING gist(from_coordinates);
CREATE INDEX idx_trips_to_coordinates ON trips USING gist(to_coordinates);

-- Composite index for search queries
CREATE INDEX idx_trips_search ON trips(status, departure_date, available_seats) WHERE status = 'published' AND available_seats > 0;

-- ============================================================================
-- 3. BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Booking Details
  seats_requested INTEGER NOT NULL CHECK (seats_requested >= 1),
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_coordinates POINT,
  dropoff_coordinates POINT,
  
  -- Pricing
  price_per_seat DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AED' NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0.0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  
  -- Payment
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  
  -- Cancellation
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  
  -- Special Requests
  special_requests TEXT,
  luggage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Ensure passenger can't book own trip
  CONSTRAINT no_self_booking CHECK (passenger_id != (SELECT driver_id FROM trips WHERE id = trip_id))
);

-- Indexes for bookings
CREATE INDEX idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger_id ON bookings(passenger_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- ============================================================================
-- 4. MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Message Content
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'location', 'image', 'file')),
  metadata JSONB, -- For location coords, file URLs, etc.
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Indexes for messages
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_trip_id ON messages(trip_id);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_messages_read ON messages(read) WHERE read = false;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Composite index for conversation queries
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

-- ============================================================================
-- 5. REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Review Type
  role TEXT NOT NULL CHECK (role IN ('driver', 'passenger')),
  
  -- Ratings (1-5 scale)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
  
  -- Review Content
  comment TEXT,
  tags TEXT[], -- ['friendly', 'on-time', 'clean-car', 'great-music']
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_reported BOOLEAN DEFAULT false,
  report_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id),
  CONSTRAINT one_review_per_booking UNIQUE (booking_id, reviewer_id)
);

-- Indexes for reviews
CREATE INDEX idx_reviews_trip_id ON reviews(trip_id);
CREATE INDEX idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_overall_rating ON reviews(overall_rating DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_public ON reviews(is_public) WHERE is_public = true;

-- ============================================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification Type
  type TEXT NOT NULL CHECK (type IN (
    'booking_request', 'booking_accepted', 'booking_rejected', 'booking_cancelled',
    'new_message', 'trip_reminder', 'trip_cancelled', 'trip_completed',
    'payment_received', 'payment_failed', 'review_received',
    'system_update', 'promo_offer', 'safety_alert'
  )),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT,
  action_url TEXT,
  
  -- Related Entities
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Metadata
  data JSONB,
  
  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  
  -- Delivery Method
  sent_push BOOLEAN DEFAULT false,
  sent_email BOOLEAN DEFAULT false,
  sent_sms BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 7. FAVORITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Favorite Type
  type TEXT NOT NULL CHECK (type IN ('user', 'location', 'route')),
  
  -- Reference (depends on type)
  favorite_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  location_name TEXT,
  location_coordinates POINT,
  route_from TEXT,
  route_to TEXT,
  
  -- Metadata
  nickname TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_favorite UNIQUE (user_id, type, favorite_user_id, location_name, route_from, route_to)
);

-- Indexes for favorites
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_type ON favorites(type);
CREATE INDEX idx_favorites_favorite_user_id ON favorites(favorite_user_id);

-- ============================================================================
-- 8. TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  
  -- Transaction Type
  type TEXT NOT NULL CHECK (type IN (
    'payment', 'refund', 'payout', 'wallet_topup', 'wallet_withdrawal',
    'platform_fee', 'commission', 'bonus', 'penalty'
  )),
  
  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'AED' NOT NULL,
  
  -- Payment Details
  payment_method TEXT,
  payment_provider TEXT,
  payment_intent_id TEXT,
  external_transaction_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  
  -- Description
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_payment_intent ON transactions(payment_intent_id);

-- ============================================================================
-- 9. REPORTED_CONTENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reported_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Reported Entity
  content_type TEXT NOT NULL CHECK (content_type IN ('user', 'trip', 'review', 'message')),
  content_id UUID NOT NULL,
  
  -- Report Details
  reason TEXT NOT NULL CHECK (reason IN (
    'inappropriate_behavior', 'harassment', 'fraud', 'spam',
    'safety_concern', 'fake_profile', 'offensive_content', 'other'
  )),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reported content
CREATE INDEX idx_reported_content_reporter_id ON reported_content(reporter_id);
CREATE INDEX idx_reported_content_type ON reported_content(content_type, content_id);
CREATE INDEX idx_reported_content_status ON reported_content(status);
CREATE INDEX idx_reported_content_created_at ON reported_content(created_at DESC);

-- ============================================================================
-- 10. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update available seats after booking
CREATE OR REPLACE FUNCTION update_trip_seats_after_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'accepted') THEN
    UPDATE trips 
    SET available_seats = available_seats - NEW.seats_requested
    WHERE id = NEW.trip_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status != 'accepted' AND NEW.status = 'accepted') THEN
      UPDATE trips 
      SET available_seats = available_seats - NEW.seats_requested
      WHERE id = NEW.trip_id;
    ELSIF (OLD.status = 'accepted' AND NEW.status IN ('cancelled', 'rejected')) THEN
      UPDATE trips 
      SET available_seats = available_seats + OLD.seats_requested
      WHERE id = NEW.trip_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_seats AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_trip_seats_after_booking();

-- Function to update user statistics after trip completion
CREATE OR REPLACE FUNCTION update_user_trip_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Update driver stats
    UPDATE profiles
    SET 
      total_trips = total_trips + 1,
      trips_as_driver = trips_as_driver + 1
    WHERE id = NEW.driver_id;
    
    -- Update passenger stats for all completed bookings
    UPDATE profiles
    SET 
      total_trips = total_trips + 1,
      trips_as_passenger = trips_as_passenger + 1
    WHERE id IN (
      SELECT passenger_id FROM bookings
      WHERE trip_id = NEW.id AND status = 'completed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_stats AFTER UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_user_trip_stats();

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_content ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trips policies
CREATE POLICY "Published trips are viewable by everyone" ON trips
  FOR SELECT USING (status = 'published' OR driver_id = auth.uid());

CREATE POLICY "Drivers can manage own trips" ON trips
  FOR ALL USING (driver_id = auth.uid());

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (
    passenger_id = auth.uid() OR 
    trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid())
  );

CREATE POLICY "Passengers can create bookings" ON bookings
  FOR INSERT WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (
    passenger_id = auth.uid() OR 
    trip_id IN (SELECT id FROM trips WHERE driver_id = auth.uid())
  );

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Reviews policies
CREATE POLICY "Public reviews are viewable by everyone" ON reviews
  FOR SELECT USING (is_public = true OR reviewer_id = auth.uid() OR reviewee_id = auth.uid());

CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Favorites policies
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (user_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

-- Reported content policies
CREATE POLICY "Users can view own reports" ON reported_content
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON reported_content
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- ============================================================================
-- 12. HELPER VIEWS
-- ============================================================================

-- View for active trips with driver information
CREATE OR REPLACE VIEW active_trips_with_driver AS
SELECT 
  t.*,
  p.full_name as driver_name,
  p.avatar_url as driver_avatar,
  p.rating_as_driver as driver_rating,
  p.trips_as_driver as driver_trips,
  p.phone as driver_phone
FROM trips t
JOIN profiles p ON t.driver_id = p.id
WHERE t.status = 'published' 
  AND t.available_seats > 0
  AND t.departure_date >= CURRENT_DATE
  AND p.deleted_at IS NULL;

-- View for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
  p.id,
  p.full_name,
  p.total_trips,
  p.trips_as_driver,
  p.trips_as_passenger,
  p.rating_as_driver,
  p.rating_as_passenger,
  COUNT(DISTINCT t.id) as published_trips,
  COUNT(DISTINCT b.id) as active_bookings
FROM profiles p
LEFT JOIN trips t ON t.driver_id = p.id AND t.status IN ('published', 'in-progress')
LEFT JOIN bookings b ON b.passenger_id = p.id AND b.status IN ('pending', 'accepted')
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
