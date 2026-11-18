-- Wassel Database Schema - Production Grade
-- Version: 1.0.1
-- Fix: bootstrap order + self-booking trigger (P0 #242)
-- Description: Complete database schema for Wassel ride-sharing platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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
  city TEXT,
  country TEXT DEFAULT 'Jordan',
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_level INTEGER DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  trips_as_driver INTEGER DEFAULT 0,
  trips_as_passenger INTEGER DEFAULT 0,
  rating_as_driver DECIMAL(3,2) DEFAULT 0.0,
  rating_as_passenger DECIMAL(3,2) DEFAULT 0.0,
  total_ratings_received INTEGER DEFAULT 0,
  smoking_allowed BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  music_allowed BOOLEAN DEFAULT TRUE,
  conversation_level TEXT CHECK (conversation_level IN ('quiet', 'moderate', 'chatty')),
  preferred_temperature TEXT CHECK (preferred_temperature IN ('cold', 'moderate', 'warm')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ar')),
  currency TEXT DEFAULT 'JOD',
  notification_enabled BOOLEAN DEFAULT TRUE,
  location_sharing_enabled BOOLEAN DEFAULT TRUE,
  wallet_balance DECIMAL(10,2) DEFAULT 0.0,
  total_earned DECIMAL(10,2) DEFAULT 0.0,
  total_spent DECIMAL(10,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_rating_driver CHECK (rating_as_driver >= 0 AND rating_as_driver <= 5),
  CONSTRAINT valid_rating_passenger CHECK (rating_as_passenger >= 0 AND rating_as_passenger <= 5)
);

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
  has_ac BOOLEAN DEFAULT TRUE,
  has_wifi BOOLEAN DEFAULT FALSE,
  wheelchair_accessible BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  insurance_expiry DATE,
  registration_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(license_plate)
);

-- Recurring Trips FIRST (required for clean bootstrap)
CREATE TABLE recurring_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trip_type trip_type NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  from_location TEXT NOT NULL,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_location TEXT NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  total_trips_created INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_type trip_type NOT NULL,
  status trip_status DEFAULT 'draft',
  from_location TEXT NOT NULL,
  from_lat DECIMAL(10,8) NOT NULL,
  from_lng DECIMAL(11,8) NOT NULL,
  to_location TEXT NOT NULL,
  to_lat DECIMAL(10,8) NOT NULL,
  to_lng DECIMAL(11,8) NOT NULL,
  from_location_geom GEOGRAPHY(POINT),
  to_location_geom GEOGRAPHY(POINT),
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  estimated_arrival_time TIME,
  actual_departure_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  available_seats INTEGER NOT NULL CHECK (available_seats >= 1),
  seats_booked INTEGER DEFAULT 0,
  price_per_seat DECIMAL(10,2) NOT NULL CHECK (price_per_seat >= 0),
  notes TEXT,
  luggage_allowed BOOLEAN DEFAULT TRUE,
  instant_booking BOOLEAN DEFAULT FALSE,
  recurring_trip_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  tsv_from tsvector GENERATED ALWAYS AS (to_tsvector('english', from_location)) STORED,
  tsv_to tsvector GENERATED ALWAYS AS (to_tsvector('english', to_location)) STORED,
  CONSTRAINT valid_seats CHECK (seats_booked <= available_seats),
  CONSTRAINT future_departure CHECK (
    status = 'draft' OR (departure_date >= CURRENT_DATE - INTERVAL '1 day')
  )
);

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

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'pending',
  seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested >= 1),
  pickup_location TEXT,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  dropoff_location TEXT,
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  total_price DECIMAL(10,2) NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  payment_method payment_method,
  notes TEXT,
  has_luggage BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  UNIQUE(trip_id, passenger_id)
);

-- FK after both tables exist
ALTER TABLE trips
  ADD CONSTRAINT trips_recurring_trip_id_fkey
  FOREIGN KEY (recurring_trip_id) REFERENCES recurring_trips(id) ON DELETE SET NULL;

-- Race-safe self-booking prevention
CREATE OR REPLACE FUNCTION prevent_self_booking()
RETURNS TRIGGER AS $$
DECLARE
  trip_driver_id UUID;
BEGIN
  SELECT driver_id INTO trip_driver_id
  FROM trips
  WHERE id = NEW.trip_id
  FOR UPDATE;

  IF trip_driver_id IS NULL THEN
    RAISE EXCEPTION 'Trip % does not exist', NEW.trip_id;
  END IF;

  IF NEW.passenger_id = trip_driver_id THEN
    RAISE EXCEPTION 'Drivers cannot book their own trip';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_self_booking
  BEFORE INSERT OR UPDATE OF passenger_id, trip_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_booking();

-- NOTE: Remaining tables (reviews, messages, notifications, etc.), indexes, RLS policies,
-- and triggers from the original schema.sql must still be merged from master if this
-- minimal bootstrap file is used as the only source. Prefer applying this ordering
-- fix on top of the full original schema.
