-- Bus Services Database Schema
-- This migration adds comprehensive bus service functionality

-- Bus Routes Table
CREATE TABLE IF NOT EXISTS bus_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  operator TEXT NOT NULL,
  service_level TEXT DEFAULT 'Standard' CHECK (service_level IN ('Standard', 'Premium', 'Luxury')),
  duration TEXT NOT NULL,
  distance_km INTEGER,
  base_price DECIMAL(10,2) NOT NULL CHECK (base_price > 0),
  pickup_point TEXT NOT NULL,
  dropoff_point TEXT NOT NULL,
  via_stops TEXT[],
  amenities TEXT[],
  departure_times TEXT[],
  schedule_days TEXT,
  frequency TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_city, to_city, operator, departure_times)
);

-- Bus Schedules Table (specific departures)
CREATE TABLE IF NOT EXISTS bus_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  bus_number TEXT NOT NULL,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled')),
  driver_name TEXT,
  driver_phone TEXT,
  bus_plate_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_seats CHECK (available_seats <= total_seats),
  CONSTRAINT future_schedule CHECK (date >= CURRENT_DATE - INTERVAL '1 day'),
  UNIQUE(route_id, date, departure_time, bus_number)
);

-- Bus Bookings Table
CREATE TABLE IF NOT EXISTS bus_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES bus_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_reference TEXT NOT NULL UNIQUE,
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_email TEXT,
  seats_booked INTEGER NOT NULL CHECK (seats_booked > 0),
  seat_numbers TEXT[],
  seat_preference TEXT CHECK (seat_preference IN ('window', 'aisle', 'front', 'back')),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  booking_status TEXT DEFAULT 'confirmed' CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

-- Bus Operators Table
CREATE TABLE IF NOT EXISTS bus_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  license_number TEXT UNIQUE,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  website_url TEXT,
  logo_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bus Fleet Table
CREATE TABLE IF NOT EXISTS bus_fleet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES bus_operators(id) ON DELETE CASCADE,
  bus_number TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT,
  year INTEGER CHECK (year >= 1990 AND year <= 2030),
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  amenities TEXT[],
  last_maintenance DATE,
  next_maintenance DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(operator_id, bus_number)
);

-- Bus Reviews Table
CREATE TABLE IF NOT EXISTS bus_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bus_bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES bus_operators(id) ON DELETE SET NULL,
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  punctuality_rating DECIMAL(2,1) CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  comfort_rating DECIMAL(2,1) CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
  cleanliness_rating DECIMAL(2,1) CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  staff_rating DECIMAL(2,1) CHECK (staff_rating >= 1 AND staff_rating <= 5),
  comment TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(booking_id, user_id)
);

-- Bus Stops Table
CREATE TABLE IF NOT EXISTS bus_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location_geom GEOGRAPHY(POINT),
  amenities TEXT[],
  operating_hours TEXT,
  contact_phone TEXT,
  is_major_terminal BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(name, city)
);

-- Route Stops Junction Table
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0),
  is_pickup_point BOOLEAN DEFAULT TRUE,
  is_dropoff_point BOOLEAN DEFAULT TRUE,
  estimated_arrival_offset INTERVAL, -- Time from route start
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(route_id, stop_id),
  UNIQUE(route_id, stop_order)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bus_routes_cities ON bus_routes(from_city, to_city);
CREATE INDEX IF NOT EXISTS idx_bus_routes_operator ON bus_routes(operator) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bus_schedules_route_date ON bus_schedules(route_id, date, departure_time);
CREATE INDEX IF NOT EXISTS idx_bus_schedules_date_status ON bus_schedules(date, status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_bus_bookings_user ON bus_bookings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_schedule ON bus_bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_reference ON bus_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bus_operators_active ON bus_operators(name) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bus_fleet_operator ON bus_fleet(operator_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bus_reviews_route ON bus_reviews(route_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bus_stops_city ON bus_stops(city) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bus_stops_location ON bus_stops USING GIST(location_geom) WHERE is_active = TRUE;

-- Triggers for updated_at
CREATE TRIGGER set_bus_routes_updated_at BEFORE UPDATE ON bus_routes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_schedules_updated_at BEFORE UPDATE ON bus_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_bookings_updated_at BEFORE UPDATE ON bus_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_operators_updated_at BEFORE UPDATE ON bus_operators FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_fleet_updated_at BEFORE UPDATE ON bus_fleet FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_reviews_updated_at BEFORE UPDATE ON bus_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_bus_stops_updated_at BEFORE UPDATE ON bus_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update geography points for bus stops
CREATE OR REPLACE FUNCTION update_bus_stop_geography()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bus_stop_geography BEFORE INSERT OR UPDATE ON bus_stops 
FOR EACH ROW EXECUTE FUNCTION update_bus_stop_geography();

-- Function to update available seats when booking is created/cancelled
CREATE OR REPLACE FUNCTION update_bus_schedule_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.booking_status = 'confirmed' THEN
    -- Decrease available seats for new confirmed booking
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.booking_status != 'confirmed') THEN
      UPDATE bus_schedules
      SET available_seats = available_seats - NEW.seats_booked
      WHERE id = NEW.schedule_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.booking_status = 'confirmed' THEN
    -- Increase available seats for cancelled booking
    IF TG_OP = 'DELETE' OR NEW.booking_status != 'confirmed' THEN
      UPDATE bus_schedules
      SET available_seats = available_seats + OLD.seats_booked
      WHERE id = OLD.schedule_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_bus_schedule_seats AFTER INSERT OR UPDATE OR DELETE ON bus_bookings
FOR EACH ROW EXECUTE FUNCTION update_bus_schedule_seats();

-- Function to update operator ratings when review is added
CREATE OR REPLACE FUNCTION update_operator_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  IF NEW.operator_id IS NOT NULL THEN
    -- Calculate new average rating
    SELECT AVG(overall_rating), COUNT(*)
    INTO avg_rating, review_count
    FROM bus_reviews
    WHERE operator_id = NEW.operator_id;
    
    -- Update operator
    UPDATE bus_operators
    SET rating = avg_rating,
        total_reviews = review_count
    WHERE id = NEW.operator_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operator_rating_on_review AFTER INSERT OR UPDATE ON bus_reviews
FOR EACH ROW EXECUTE FUNCTION update_operator_rating();

-- RLS Policies
ALTER TABLE bus_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

-- Bus Routes Policies (public read for active routes)
CREATE POLICY "Active bus routes are viewable by everyone"
  ON bus_routes FOR SELECT
  USING (is_active = TRUE);

-- Bus Schedules Policies (public read for scheduled)
CREATE POLICY "Scheduled bus schedules are viewable by everyone"
  ON bus_schedules FOR SELECT
  USING (status IN ('scheduled', 'boarding'));

-- Bus Bookings Policies
CREATE POLICY "Users can view own bus bookings"
  ON bus_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bus bookings"
  ON bus_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bus bookings"
  ON bus_bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Bus Operators Policies (public read for active)
CREATE POLICY "Active bus operators are viewable by everyone"
  ON bus_operators FOR SELECT
  USING (is_active = TRUE);

-- Bus Fleet Policies (public read for active)
CREATE POLICY "Active bus fleet is viewable by everyone"
  ON bus_fleet FOR SELECT
  USING (is_active = TRUE);

-- Bus Reviews Policies
CREATE POLICY "Bus reviews are viewable by everyone"
  ON bus_reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can create reviews for their bookings"
  ON bus_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bus Stops Policies (public read for active)
CREATE POLICY "Active bus stops are viewable by everyone"
  ON bus_stops FOR SELECT
  USING (is_active = TRUE);

-- Route Stops Policies (public read)
CREATE POLICY "Route stops are viewable by everyone"
  ON route_stops FOR SELECT
  USING (TRUE);

-- Insert sample data
INSERT INTO bus_operators (name, contact_phone, contact_email, is_verified, is_active) VALUES
('JETT', '+962-6-5664146', 'info@jett.com.jo', TRUE, TRUE),
('Trust International', '+962-6-4291234', 'info@trust.jo', TRUE, TRUE),
('Al-Ahram Transport', '+962-6-4567890', 'contact@ahram.jo', TRUE, TRUE),
('Jordan Express', '+962-6-7891234', 'info@jordanexpress.jo', TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert major bus stops
INSERT INTO bus_stops (name, city, address, latitude, longitude, is_major_terminal, amenities) VALUES
('Abdali Bus Station', 'Amman', 'Abdali, Amman', 31.9515694, 35.9239625, TRUE, ARRAY['Restrooms', 'Cafeteria', 'WiFi', 'Parking']),
('North Bus Station', 'Amman', 'North Amman', 32.0054, 35.8781, TRUE, ARRAY['Restrooms', 'Shops', 'Parking']),
('South Bus Station', 'Amman', 'South Amman', 31.9203, 35.9316, TRUE, ARRAY['Restrooms', 'Cafeteria']),
('Irbid Central Terminal', 'Irbid', 'City Center, Irbid', 32.5556, 35.8500, TRUE, ARRAY['Restrooms', 'Shops', 'WiFi']),
('Aqaba Bus Terminal', 'Aqaba', 'Aqaba City Center', 29.5320, 35.0063, TRUE, ARRAY['Restrooms', 'Cafeteria', 'AC Waiting']),
('Zarqa Bus Station', 'Zarqa', 'Zarqa Center', 32.0728, 36.0876, TRUE, ARRAY['Restrooms', 'Shops']),
('Karak Bus Stop', 'Karak', 'Karak Center', 31.1851, 35.7048, FALSE, ARRAY['Restrooms']),
('Madaba Bus Stop', 'Madaba', 'Madaba Center', 31.7197, 35.7956, FALSE, ARRAY['Restrooms'])
ON CONFLICT (name, city) DO NOTHING;

-- Insert sample bus routes
INSERT INTO bus_routes (from_city, to_city, operator, service_level, duration, distance_km, base_price, pickup_point, dropoff_point, via_stops, amenities, departure_times, schedule_days, frequency, description) VALUES
('Amman', 'Aqaba', 'JETT', 'Premium', '4h 30m', 335, 12.00, 'Abdali Bus Station', 'Aqaba Bus Terminal', ARRAY['Madaba', 'Karak'], ARRAY['AC', 'WiFi', 'Restroom', 'Reclining Seats'], ARRAY['07:00', '14:00', '20:00'], 'Daily', '3 times daily', 'Premium service to Aqaba with comfort amenities'),
('Amman', 'Irbid', 'Trust International', 'Standard', '1h 45m', 85, 3.00, 'North Bus Station', 'Irbid Central Terminal', ARRAY['Jerash'], ARRAY['AC', 'USB Charging'], ARRAY['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'], 'Daily', 'Every 30 minutes', 'Regular service to Irbid'),
('Amman', 'Zarqa', 'Jordan Express', 'Standard', '45m', 25, 1.50, 'Abdali Bus Station', 'Zarqa Bus Station', ARRAY[], ARRAY['AC'], ARRAY['06:00', '06:15', '06:30', '06:45', '07:00'], 'Daily', 'Every 15 minutes', 'Frequent service to Zarqa'),
('Irbid', 'Amman', 'Trust International', 'Standard', '1h 45m', 85, 3.00, 'Irbid Central Terminal', 'North Bus Station', ARRAY['Jerash'], ARRAY['AC', 'USB Charging'], ARRAY['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'], 'Daily', 'Every 30 minutes', 'Return service from Irbid'),
('Aqaba', 'Amman', 'JETT', 'Premium', '4h 30m', 335, 12.00, 'Aqaba Bus Terminal', 'Abdali Bus Station', ARRAY['Karak', 'Madaba'], ARRAY['AC', 'WiFi', 'Restroom', 'Reclining Seats'], ARRAY['08:00', '15:00', '21:00'], 'Daily', '3 times daily', 'Return premium service from Aqaba')
ON CONFLICT (from_city, to_city, operator, departure_times) DO NOTHING;

-- Function to generate bus schedules for the next 30 days
CREATE OR REPLACE FUNCTION generate_bus_schedules()
RETURNS void AS $$
DECLARE
  route_record RECORD;
  schedule_date DATE;
  departure_time TEXT;
  arrival_time TIME;
  bus_counter INTEGER;
BEGIN
  -- Clear existing future schedules
  DELETE FROM bus_schedules WHERE date >= CURRENT_DATE;
  
  -- Generate schedules for each route
  FOR route_record IN SELECT * FROM bus_routes WHERE is_active = TRUE LOOP
    bus_counter := 1;
    
    -- Generate for next 30 days
    FOR i IN 0..29 LOOP
      schedule_date := CURRENT_DATE + i;
      
      -- Generate schedule for each departure time
      FOREACH departure_time IN ARRAY route_record.departure_times LOOP
        -- Calculate arrival time (departure + duration)
        arrival_time := departure_time::TIME + route_record.duration::INTERVAL;
        
        INSERT INTO bus_schedules (
          route_id,
          date,
          departure_time,
          arrival_time,
          bus_number,
          total_seats,
          available_seats,
          price
        ) VALUES (
          route_record.id,
          schedule_date,
          departure_time::TIME,
          arrival_time,
          route_record.operator || '-' || bus_counter,
          CASE 
            WHEN route_record.service_level = 'Premium' THEN 45
            WHEN route_record.service_level = 'Luxury' THEN 32
            ELSE 55
          END,
          CASE 
            WHEN route_record.service_level = 'Premium' THEN 45
            WHEN route_record.service_level = 'Luxury' THEN 32
            ELSE 55
          END,
          route_record.base_price
        );
        
        bus_counter := bus_counter + 1;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate initial schedules
SELECT generate_bus_schedules();

-- Function to clean up old schedules and bookings
CREATE OR REPLACE FUNCTION cleanup_old_bus_data()
RETURNS void AS $$
BEGIN
  -- Delete old schedules (older than 7 days)
  DELETE FROM bus_schedules WHERE date < CURRENT_DATE - INTERVAL '7 days';
  
  -- Update old bookings to completed if they were confirmed
  UPDATE bus_bookings 
  SET booking_status = 'completed'
  WHERE booking_status = 'confirmed'
    AND schedule_id IN (
      SELECT id FROM bus_schedules 
      WHERE date < CURRENT_DATE AND status = 'arrived'
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (would be set up with pg_cron in production)
-- SELECT cron.schedule('cleanup-old-bus-data', '0 2 * * *', 'SELECT cleanup_old_bus_data()');

-- Function to search nearby bus stops
CREATE OR REPLACE FUNCTION search_nearby_bus_stops(
  search_lat DECIMAL,
  search_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 5
)
RETURNS TABLE (
  stop_id UUID,
  stop_name TEXT,
  city TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.id,
    bs.name,
    bs.city,
    (ST_Distance(
      bs.location_geom,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) / 1000)::DECIMAL(10,2) as distance
  FROM bus_stops bs
  WHERE 
    bs.is_active = TRUE
    AND ST_DWithin(
      bs.location_geom,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      max_distance_km * 1000
    )
  ORDER BY distance;
END;
$$ LANGUAGE plpgsql;