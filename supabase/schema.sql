-- Wassel Database Schema - Production Grade
-- Version: 1.0.0
-- Description: Complete database schema for Wassel ride-sharing platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE trip_type AS ENUM ('wasel', 'raje3');
CREATE TYPE trip_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'bank_transfer');
CREATE TYPE verification_type AS ENUM ('phone', 'email', 'national_id', 'drivers_license', 'selfie');
CREATE TYPE verification_status AS ENUM ('not_started', 'pending', 'approved', 'rejected');
CREATE TYPE notification_type AS ENUM (
  'trip_request', 'trip_accepted', 'trip_rejected', 'trip_cancelled',
  'driver_arrived', 'trip_started', 'trip_completed',
  'payment_received', 'payment_sent', 'message',
  'rating_reminder', 'verification_approved', 'verification_rejected',
  'safety_alert'
);
CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'admin');
CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'system');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users/Profiles Table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  avatar_url TEXT,
  bio TEXT,
  bio_ar TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Location
  city TEXT,
  country TEXT DEFAULT 'Jordan',
  
  -- Verification
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_level INTEGER DEFAULT 0, -- 0-5 scale
  
  -- Statistics
  total_trips INTEGER DEFAULT 0,
  trips_as_driver INTEGER DEFAULT 0,
  trips_as_passenger INTEGER DEFAULT 0,
  rating_as_driver DECIMAL(3,2) DEFAULT 0.0,
  rating_as_passenger DECIMAL(3,2) DEFAULT 0.0,
  total_ratings_received INTEGER DEFAULT 0,
  
  -- Preferences
  smoking_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  music_allowed BOOLEAN DEFAULT TRUE,
  conversation_level TEXT CHECK (conversation_level IN ('quiet', 'moderate', 'chatty')),
  preferred_temperature TEXT CHECK (preferred_temperature IN ('cold', 'moderate', 'warm')),
  
  -- Account settings
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  currency TEXT DEFAULT 'JOD',
  notification_enabled BOOLEAN DEFAULT TRUE,
  location_sharing_enabled BOOLEAN DEFAULT TRUE,
  
  -- Financial
  wallet_balance DECIMAL(10,2) DEFAULT 0.0,
  total_earned DECIMAL(10,2) DEFAULT 0.0,
  total_spent DECIMAL(10,2) DEFAULT 0.0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT valid_rating_driver CHECK (rating_as_driver >= 0 AND rating_as_driver <= 5),
  CONSTRAINT valid_rating_passenger CHECK (rating_as_passenger >= 0 AND rating_as_passenger <= 5)
);

-- Vehicles Table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  seats INTEGER NOT NULL CHECK (seats >= 2 AND seats <= 8),
  vehicle_type TEXT CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'truck', 'luxury')),
  
  -- Features
  has_ac BOOLEAN DEFAULT TRUE,
  has_wifi BOOLEAN DEFAULT FALSE,
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  insurance_expiry DATE,
  registration_expiry DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(license_plate)
);

-- Trips Table (offered rides)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  
  -- Trip details
  trip_type trip_type NOT NULL,
  status trip_status DEFAULT 'draft',
  
  -- Route
  from_location TEXT NOT NULL,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_location TEXT NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,
  from_location_geom GEOGRAPHY(POINT),
  to_location_geom GEOGRAPHY(POINT),
  
  -- Timing
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  estimated_arrival_time TIME,
  actual_departure_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  
  -- Capacity & Pricing
  available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
  seats_booked INTEGER DEFAULT 0,
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  
  -- Additional info
  notes TEXT,
  luggage_allowed BOOLEAN DEFAULT TRUE,
  instant_booking BOOLEAN DEFAULT FALSE,
  
  -- Recurring trip reference
  recurring_trip_id UUID REFERENCES recurring_trips(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Search optimization
  tsv_from tsvector GENERATED ALWAYS AS (to_tsvector('english', from_location)) STORED,
  tsv_to tsvector GENERATED ALWAYS AS (to_tsvector('english', to_location)) STORED,
  
  CONSTRAINT valid_seats CHECK (seats_booked <= available_seats),
  CONSTRAINT future_departure CHECK (
    status = 'draft' OR 
    (departure_date >= CURRENT_DATE - INTERVAL '1 day')
  )
);

-- Trip Stops Table
CREATE TABLE trip_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0),
  location TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  location_geom GEOGRAPHY(POINT),
  estimated_arrival_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(trip_id, stop_order)
);

-- Bookings Table (passengers joining trips)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Booking details
  status booking_status DEFAULT 'pending',
  seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested >= 1),
  
  -- Pickup/Dropoff
  pickup_location TEXT,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  dropoff_location TEXT,
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  
  -- Payment
  total_price DECIMAL(10,2) NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  payment_method payment_method,
  
  -- Special requests
  notes TEXT,
  has_luggage BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Cancellation
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  
  UNIQUE(trip_id, passenger_id),
  CONSTRAINT no_self_booking CHECK (passenger_id != (SELECT driver_id FROM trips WHERE id = trip_id))
);

-- Recurring Trips Table
CREATE TABLE recurring_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  
  -- Schedule details
  name TEXT NOT NULL,
  trip_type trip_type NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Route
  from_location TEXT NOT NULL,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_location TEXT NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,
  
  -- Recurrence
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0), -- 0=Sunday, 6=Saturday
  departure_time TIME NOT NULL,
  
  -- Capacity & Pricing
  available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  
  -- Statistics
  total_trips_created INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  
  -- Validity period
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE
);

-- Reviews & Ratings Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Ratings (1-5 scale)
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating DECIMAL(2,1) CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating DECIMAL(2,1) CHECK (communication_rating >= 1 AND communication_rating <= 5),
  cleanliness_rating DECIMAL(2,1) CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  driving_rating DECIMAL(2,1) CHECK (driving_rating >= 1 AND driving_rating <= 5),
  
  -- Feedback
  comment TEXT,
  quick_tags TEXT[], -- ['friendly', 'on-time', 'clean-car']
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_visible BOOLEAN DEFAULT TRUE,
  
  UNIQUE(trip_id, reviewer_id),
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id)
);

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL, -- Can be trip_id or custom conversation
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Message content
  message_type message_type DEFAULT 'text',
  content TEXT,
  image_url TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Read receipts
  read_by UUID[], -- Array of user IDs who read the message
  read_at TIMESTAMPTZ
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification details
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Related entities
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Action
  action_url TEXT,
  action_data JSONB,
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Verifications Table
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Verification details
  verification_type verification_type NOT NULL,
  status verification_status DEFAULT 'not_started',
  
  -- Document info
  document_url TEXT,
  document_number TEXT,
  
  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Expiry (for licenses, IDs, etc.)
  expires_at DATE,
  
  -- Metadata
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, verification_type)
);

-- Emergency Contacts Table
CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments/Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Parties involved
  from_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Related entities
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  
  -- Transaction details
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'JOD',
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  
  -- Payment gateway details
  gateway_transaction_id TEXT,
  gateway_name TEXT, -- 'telr', 'paytabs', 'hyperpay', 'stripe'
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  -- Refund info
  refund_amount DECIMAL(10,2),
  refund_reason TEXT
);

-- Analytics Events Table (for tracking user behavior)
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Event details
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_data JSONB,
  
  -- Session info
  session_id TEXT,
  device_type TEXT,
  platform TEXT,
  
  -- Location
  ip_address INET,
  country TEXT,
  city TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Searches Table
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  preferences JSONB, -- Filters like price range, rating, etc.
  
  notification_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety Incidents Table
CREATE TABLE safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  
  -- Incident details
  incident_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  
  -- Location
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id),
  
  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_city ON profiles(city) WHERE city IS NOT NULL;
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_rating_driver ON profiles(rating_as_driver DESC);

-- Trips indexes
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_departure ON trips(departure_date, departure_time);
CREATE INDEX idx_trips_location_from ON trips USING GIST(from_location_geom);
CREATE INDEX idx_trips_location_to ON trips USING GIST(to_location_geom);
CREATE INDEX idx_trips_search_from ON trips USING GIN(tsv_from);
CREATE INDEX idx_trips_search_to ON trips USING GIN(tsv_to);
CREATE INDEX idx_trips_recurring ON trips(recurring_trip_id) WHERE recurring_trip_id IS NOT NULL;

-- Bookings indexes
CREATE INDEX idx_bookings_trip ON bookings(trip_id);
CREATE INDEX idx_bookings_passenger ON bookings(passenger_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;
CREATE INDEX idx_notifications_expires ON notifications(expires_at);

-- Reviews indexes
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id, created_at DESC);
CREATE INDEX idx_reviews_trip ON reviews(trip_id);

-- Transactions indexes
CREATE INDEX idx_transactions_from_user ON transactions(from_user_id, created_at DESC);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id, created_at DESC);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);

-- Analytics indexes
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_event ON analytics_events(event_name, created_at DESC);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recurring_trips FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update geography points when lat/lng changes
CREATE OR REPLACE FUNCTION update_trip_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.from_location_geom = ST_SetSRID(ST_MakePoint(NEW.from_lng, NEW.from_lat), 4326)::geography;
  NEW.to_location_geom = ST_SetSRID(ST_MakePoint(NEW.to_lng, NEW.to_lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trip_geography BEFORE INSERT OR UPDATE ON trips 
FOR EACH ROW EXECUTE FUNCTION update_trip_geography();

CREATE OR REPLACE FUNCTION update_stop_geography()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location_geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_stop_geography BEFORE INSERT OR UPDATE ON trip_stops 
FOR EACH ROW EXECUTE FUNCTION update_stop_geography();

-- Update profile ratings when new review is added
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
  is_driver BOOLEAN;
BEGIN
  -- Check if reviewee was driver or passenger
  SELECT (driver_id = NEW.reviewee_id) INTO is_driver
  FROM trips WHERE id = NEW.trip_id;
  
  -- Calculate new average rating
  SELECT AVG(overall_rating), COUNT(*)
  INTO avg_rating, review_count
  FROM reviews
  WHERE reviewee_id = NEW.reviewee_id AND is_visible = TRUE;
  
  -- Update profile
  IF is_driver THEN
    UPDATE profiles
    SET rating_as_driver = avg_rating,
        total_ratings_received = review_count
    WHERE id = NEW.reviewee_id;
  ELSE
    UPDATE profiles
    SET rating_as_passenger = avg_rating,
        total_ratings_received = review_count
    WHERE id = NEW.reviewee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- Update trip seats when booking is created/cancelled
CREATE OR REPLACE FUNCTION update_trip_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'accepted' THEN
    UPDATE trips
    SET seats_booked = seats_booked + NEW.seats_requested
    WHERE id = NEW.trip_id;
  ELSIF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.status = 'accepted' THEN
    UPDATE trips
    SET seats_booked = seats_booked - OLD.seats_requested
    WHERE id = OLD.trip_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_trip_seats AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_trip_seats();

-- Update wallet balance on transaction completion
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Deduct from sender
    IF NEW.from_user_id IS NOT NULL THEN
      UPDATE profiles
      SET wallet_balance = wallet_balance - NEW.amount,
          total_spent = total_spent + NEW.amount
      WHERE id = NEW.from_user_id;
    END IF;
    
    -- Add to receiver
    IF NEW.to_user_id IS NOT NULL THEN
      UPDATE profiles
      SET wallet_balance = wallet_balance + NEW.amount,
          total_earned = total_earned + NEW.amount
      WHERE id = NEW.to_user_id;
    END IF;
  ELSIF NEW.payment_status = 'refunded' AND OLD.payment_status = 'completed' THEN
    -- Reverse the transaction
    IF NEW.from_user_id IS NOT NULL THEN
      UPDATE profiles
      SET wallet_balance = wallet_balance + NEW.refund_amount,
          total_spent = total_spent - NEW.refund_amount
      WHERE id = NEW.from_user_id;
    END IF;
    
    IF NEW.to_user_id IS NOT NULL THEN
      UPDATE profiles
      SET wallet_balance = wallet_balance - NEW.refund_amount,
          total_earned = total_earned - NEW.refund_amount
      WHERE id = NEW.to_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_wallet AFTER UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_wallet_balance();

-- Auto-delete expired notifications
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Vehicles policies
CREATE POLICY "Vehicles viewable by everyone"
  ON vehicles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can manage own vehicles"
  ON vehicles FOR ALL
  USING (auth.uid() = user_id);

-- Trips policies
CREATE POLICY "Published trips viewable by everyone"
  ON trips FOR SELECT
  USING (status IN ('published', 'active', 'completed'));

CREATE POLICY "Drivers can manage own trips"
  ON trips FOR ALL
  USING (auth.uid() = driver_id);

-- Trip stops policies
CREATE POLICY "Stops viewable with trip"
  ON trip_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id 
      AND trips.status IN ('published', 'active', 'completed')
    )
  );

CREATE POLICY "Drivers can manage trip stops"
  ON trip_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips WHERE trips.id = trip_stops.trip_id 
      AND trips.driver_id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM trips WHERE trips.id = bookings.trip_id AND trips.driver_id = auth.uid())
  );

CREATE POLICY "Passengers can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers and drivers can update bookings"
  ON bookings FOR UPDATE
  USING (
    auth.uid() = passenger_id OR
    EXISTS (SELECT 1 FROM trips WHERE trips.id = bookings.trip_id AND trips.driver_id = auth.uid())
  );

-- Reviews policies
CREATE POLICY "Reviews viewable by all"
  ON reviews FOR SELECT
  USING (is_visible = TRUE);

CREATE POLICY "Users can create reviews for their trips"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.trip_id::text = messages.conversation_id 
      AND (bookings.passenger_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM trips WHERE trips.id = bookings.trip_id AND trips.driver_id = auth.uid()))
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Verifications policies
CREATE POLICY "Users can view own verifications"
  ON verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own verifications"
  ON verifications FOR ALL
  USING (auth.uid() = user_id);

-- Emergency contacts policies
CREATE POLICY "Users can manage own emergency contacts"
  ON emergency_contacts FOR ALL
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Analytics policies
CREATE POLICY "Users can insert own analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Saved searches policies
CREATE POLICY "Users can manage own saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id);

-- Safety incidents policies
CREATE POLICY "Users can view own incidents"
  ON safety_incidents FOR SELECT
  USING (auth.uid() = reported_by);

CREATE POLICY "Users can create incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (auth.uid() = reported_by);

-- ============================================================================
-- FUNCTIONS FOR APPLICATION LOGIC
-- ============================================================================

-- Search nearby trips
CREATE OR REPLACE FUNCTION search_nearby_trips(
  from_lat DECIMAL,
  from_lng DECIMAL,
  to_lat DECIMAL,
  to_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 10,
  departure_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  trip_id UUID,
  driver_name TEXT,
  distance_from_km DECIMAL,
  distance_to_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    p.full_name,
    (ST_Distance(
      t.from_location_geom,
      ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography
    ) / 1000)::DECIMAL(10,2) as dist_from,
    (ST_Distance(
      t.to_location_geom,
      ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography
    ) / 1000)::DECIMAL(10,2) as dist_to
  FROM trips t
  JOIN profiles p ON t.driver_id = p.id
  WHERE 
    t.status = 'published'
    AND t.departure_date >= departure_date
    AND ST_DWithin(
      t.from_location_geom,
      ST_SetSRID(ST_MakePoint(from_lng, from_lat), 4326)::geography,
      max_distance_km * 1000
    )
    AND ST_DWithin(
      t.to_location_geom,
      ST_SetSRID(ST_MakePoint(to_lng, to_lat), 4326)::geography,
      max_distance_km * 1000
    )
  ORDER BY dist_from + dist_to;
END;
$$ LANGUAGE plpgsql;

-- Get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
  total_trips_count INTEGER,
  as_driver INTEGER,
  as_passenger INTEGER,
  total_distance_km DECIMAL,
  carbon_saved_kg DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT t.id)::INTEGER,
    COUNT(DISTINCT CASE WHEN t.driver_id = user_uuid THEN t.id END)::INTEGER,
    COUNT(DISTINCT CASE WHEN b.passenger_id = user_uuid THEN t.id END)::INTEGER,
    0::DECIMAL, -- Calculate from actual GPS data
    0::DECIMAL  -- Calculate based on distance
  FROM trips t
  LEFT JOIN bookings b ON t.id = b.trip_id
  WHERE t.driver_id = user_uuid OR b.passenger_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA / SEED DATA
-- ============================================================================

-- Insert default admin user (you'll need to create this in Supabase Auth first)
-- This is just a placeholder
INSERT INTO profiles (id, email, full_name, phone_verified, email_verified, is_verified)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@wassel.app',
  'Wassel Admin',
  TRUE,
  TRUE,
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active trips with driver info
CREATE OR REPLACE VIEW active_trips_view AS
SELECT 
  t.*,
  p.full_name as driver_name,
  p.avatar_url as driver_avatar,
  p.rating_as_driver,
  v.make as vehicle_make,
  v.model as vehicle_model,
  (t.available_seats - t.seats_booked) as remaining_seats
FROM trips t
JOIN profiles p ON t.driver_id = p.id
LEFT JOIN vehicles v ON t.vehicle_id = v.id
WHERE t.status IN ('published', 'active')
  AND t.departure_date >= CURRENT_DATE;

-- User inbox (unread messages count)
CREATE OR REPLACE VIEW user_inbox_view AS
SELECT 
  m.conversation_id,
  COUNT(*) FILTER (WHERE NOT (auth.uid() = ANY(m.read_by))) as unread_count,
  MAX(m.created_at) as last_message_at
FROM messages m
WHERE 
  m.sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.trip_id::text = m.conversation_id 
    AND bookings.passenger_id = auth.uid()
  )
GROUP BY m.conversation_id;

-- ============================================================================
-- SCHEDULED JOBS (using pg_cron extension)
-- ============================================================================

-- Auto-delete expired notifications (run daily)
-- SELECT cron.schedule('delete-expired-notifications', '0 2 * * *', 'SELECT delete_expired_notifications()');

-- Auto-complete trips (run every hour)
-- SELECT cron.schedule('auto-complete-trips', '0 * * * *', $$
--   UPDATE trips SET status = 'completed' 
--   WHERE status = 'active' 
--   AND actual_arrival_time < NOW() - INTERVAL '1 hour'
-- $$);
