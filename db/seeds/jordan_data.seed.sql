-- Seed Data for Jordan Cities and Routes
-- Major cities in Jordan with coordinates

INSERT INTO cities (name_en, name_ar, country, latitude, longitude, is_active) VALUES
  ('Amman', 'عمان', 'Jordan', 31.9454, 35.9284, true),
  ('Zarqa', 'الزرقاء', 'Jordan', 32.0728, 36.0881, true),
  ('Irbid', 'إربد', 'Jordan', 32.5556, 35.8500, true),
  ('Aqaba', 'العقبة', 'Jordan', 29.5320, 35.0063, true),
  ('Madaba', 'مادبا', 'Jordan', 31.7197, 35.7956, true),
  ('Salt', 'السلط', 'Jordan', 32.0392, 35.7272, true),
  ('Jerash', 'جرش', 'Jordan', 32.2811, 35.8992, true),
  ('Ajloun', 'عجلون', 'Jordan', 32.3328, 35.7517, true),
  ('Karak', 'الكرك', 'Jordan', 31.1853, 35.7047, true),
  ('Mafraq', 'المفرق', 'Jordan', 32.3406, 36.2081, true),
  ('Tafilah', 'الطفيلة', 'Jordan', 30.8375, 35.6042, true),
  ('Maan', 'معان', 'Jordan', 30.1920, 35.7340, true),
  ('Petra', 'البتراء', 'Jordan', 30.3285, 35.4444, true),
  ('Dead Sea', 'البحر الميت', 'Jordan', 31.5590, 35.4732, true),
  ('Wadi Rum', 'وادي رم', 'Jordan', 29.5759, 35.4184, true)
ON CONFLICT DO NOTHING;

-- Popular routes with estimated distances and prices
WITH city_ids AS (
  SELECT 
    id,
    name_en,
    latitude,
    longitude
  FROM cities
)
INSERT INTO routes (origin_city_id, dest_city_id, distance_km, duration_minutes, base_price, is_popular, demand_level)
SELECT 
  o.id,
  d.id,
  ROUND(
    (6371 * acos(
      cos(radians(o.latitude)) * cos(radians(d.latitude)) * 
      cos(radians(d.longitude) - radians(o.longitude)) + 
      sin(radians(o.latitude)) * sin(radians(d.latitude))
    ))::numeric, 2
  ) as distance_km,
  ROUND(
    (6371 * acos(
      cos(radians(o.latitude)) * cos(radians(d.latitude)) * 
      cos(radians(d.longitude) - radians(o.longitude)) + 
      sin(radians(o.latitude)) * sin(radians(d.latitude))
    ) / 60)::numeric * 60
  )::int as duration_minutes,
  ROUND(
    (6371 * acos(
      cos(radians(o.latitude)) * cos(radians(d.latitude)) * 
      cos(radians(d.longitude) - radians(o.longitude)) + 
      sin(radians(o.latitude)) * sin(radians(d.latitude))
    ) * 0.15)::numeric, 3
  ) as base_price,
  CASE 
    WHEN o.name_en IN ('Amman', 'Irbid', 'Aqaba', 'Zarqa') 
     AND d.name_en IN ('Amman', 'Irbid', 'Aqaba', 'Zarqa') THEN true
    ELSE false
  END as is_popular,
  CASE 
    WHEN o.name_en = 'Amman' OR d.name_en = 'Amman' THEN 'high'
    WHEN o.name_en IN ('Irbid', 'Zarqa', 'Aqaba') OR d.name_en IN ('Irbid', 'Zarqa', 'Aqaba') THEN 'normal'
    ELSE 'low'
  END::TEXT as demand_level
FROM city_ids o
CROSS JOIN city_ids d
WHERE o.id != d.id
ON CONFLICT DO NOTHING;

-- Sample bus operators and schedules
INSERT INTO buses (operator_name, bus_number, capacity, vehicle_type, amenities, is_active)
SELECT 
  'JETT',
  'JETT-' || generate_series,
  40,
  'standard',
  ARRAY['AC', 'WiFi', 'USB Charging'],
  true
FROM generate_series(1, 5)
ON CONFLICT DO NOTHING;

INSERT INTO buses (operator_name, bus_number, capacity, vehicle_type, amenities, is_active)
SELECT 
  'Trust International',
  'TRUST-' || generate_series,
  45,
  'luxury',
  ARRAY['AC', 'WiFi', 'USB Charging', 'Reclining Seats', 'Entertainment'],
  true
FROM generate_series(1, 3)
ON CONFLICT DO NOTHING;

-- Bus schedules for popular routes
WITH amman_id AS (SELECT id FROM cities WHERE name_en = 'Amman' LIMIT 1),
     aqaba_id AS (SELECT id FROM cities WHERE name_en = 'Aqaba' LIMIT 1),
     irbid_id AS (SELECT id FROM cities WHERE name_en = 'Irbid' LIMIT 1),
     route_amman_aqaba AS (
       SELECT id FROM routes 
       WHERE origin_city_id = (SELECT id FROM amman_id) 
       AND dest_city_id = (SELECT id FROM aqaba_id) 
       LIMIT 1
     ),
     route_amman_irbid AS (
       SELECT id FROM routes 
       WHERE origin_city_id = (SELECT id FROM amman_id) 
       AND dest_city_id = (SELECT id FROM irbid_id) 
       LIMIT 1
     )
INSERT INTO bus_schedules (bus_id, departure_time, arrival_time, days_of_week, price, is_active)
SELECT 
  b.id,
  '07:00:00'::TIME,
  '11:00:00'::TIME,
  ARRAY[0,1,2,3,4,5,6],
  10.000,
  true
FROM buses b
WHERE b.operator_name = 'JETT'
LIMIT 2
ON CONFLICT DO NOTHING;

INSERT INTO bus_schedules (bus_id, departure_time, arrival_time, days_of_week, price, is_active)
SELECT 
  b.id,
  '08:00:00'::TIME,
  '09:30:00'::TIME,
  ARRAY[0,1,2,3,4,5,6],
  5.000,
  true
FROM buses b
WHERE b.operator_name = 'Trust International'
LIMIT 2
ON CONFLICT DO NOTHING;

-- Pricing tiers
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO pricing_tiers (name, multiplier, description, is_active) VALUES
  ('Standard', 1.00, 'Regular pricing', true),
  ('Peak Hours', 1.50, 'Morning (7-9 AM) and Evening (5-7 PM)', true),
  ('Weekend', 1.25, 'Friday and Saturday', true),
  ('Holiday', 1.75, 'Public holidays and special events', true),
  ('Late Night', 1.40, 'After 10 PM', true),
  ('Early Bird', 0.85, 'Before 6 AM', true)
ON CONFLICT DO NOTHING;

-- Cancellation policies
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hours_before_departure INT NOT NULL,
  refund_percentage INT NOT NULL CHECK (refund_percentage >= 0 AND refund_percentage <= 100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO cancellation_policies (name, hours_before_departure, refund_percentage, description, is_active) VALUES
  ('Full Refund', 24, 100, 'Cancel 24+ hours before departure', true),
  ('Partial Refund', 12, 50, 'Cancel 12-24 hours before departure', true),
  ('Minimal Refund', 2, 25, 'Cancel 2-12 hours before departure', true),
  ('No Refund', 0, 0, 'Cancel less than 2 hours before departure', true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE cities IS 'Major cities in Jordan with coordinates';
COMMENT ON TABLE routes IS 'Popular routes between cities with pricing';
COMMENT ON TABLE buses IS 'Bus operators and vehicles';
COMMENT ON TABLE bus_schedules IS 'Regular bus schedules';
COMMENT ON TABLE pricing_tiers IS 'Dynamic pricing multipliers';
COMMENT ON TABLE cancellation_policies IS 'Refund policies based on cancellation timing';
