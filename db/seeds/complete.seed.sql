-- =============================================================================
-- Wasel Comprehensive Seed Data
-- Development and testing data for all tables
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CITIES (Major Jordanian Cities)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO cities (id, name_en, name_ar, country, latitude, longitude, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Amman', 'عمّان', 'Jordan', 31.9454, 35.9284, true),
('22222222-2222-2222-2222-222222222222', 'Zarqa', 'الزرقاء', 'Jordan', 32.0728, 36.0881, true),
('33333333-3333-3333-3333-333333333333', 'Irbid', 'إربد', 'Jordan', 32.5556, 35.8500, true),
('44444444-4444-4444-4444-444444444444', 'Aqaba', 'العقبة', 'Jordan', 29.5321, 35.0063, true),
('55555555-5555-5555-5555-555555555555', 'Madaba', 'مادبا', 'Jordan', 31.7197, 35.7956, true),
('66666666-6666-6666-6666-666666666666', 'Jerash', 'جرش', 'Jordan', 32.2722, 35.8911, true),
('77777777-7777-7777-7777-777777777777', 'Ajloun', 'عجلون', 'Jordan', 32.3328, 35.7519, true),
('88888888-8888-8888-8888-888888888888', 'Karak', 'الكرك', 'Jordan', 31.1853, 35.7047, true),
('99999999-9999-9999-9999-999999999999', 'Mafraq', 'المفرق', 'Jordan', 32.3406, 36.2081, true),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Salt', 'السلط', 'Jordan', 32.0392, 35.7272, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. POPULAR ROUTES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO routes (id, origin_city_id, dest_city_id, distance_km, duration_minutes, base_price, is_popular, demand_level) VALUES
-- Amman routes
('r0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 335, 240, 25.00, true, 'high'),
('r0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 85, 60, 5.00, true, 'high'),
('r0000003-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 25, 30, 2.50, true, 'high'),
('r0000004-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 33, 35, 3.00, true, 'normal'),
('r0000005-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 48, 45, 4.00, true, 'normal'),
-- Aqaba routes
('r0000006-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 335, 240, 25.00, true, 'high'),
('r0000007-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 120, 90, 8.00, false, 'normal'),
-- Irbid routes
('r0000008-0000-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 85, 60, 5.00, true, 'high'),
('r0000009-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 25, 25, 2.00, true, 'normal'),
('r0000010-0000-0000-0000-000000000010', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777', 22, 30, 2.00, false, 'low')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TEST USERS (Profiles will be auto-created via trigger)
-- Note: In production, these would be created via auth.users
-- ─────────────────────────────────────────────────────────────────────────────

-- Demo profiles (assuming auth.users exist)
INSERT INTO profiles (id, full_name, phone_number, bio, language_preference, wallet_balance, trust_score, is_driver, is_verified) VALUES
('d0000001-0000-0000-0000-000000000001', 'Ahmad Al-Masri', '+962791234567', 'Experienced driver, 5 years on the road', 'ar', 150.00, 4.8, true, true),
('d0000002-0000-0000-0000-000000000002', 'Sarah Johnson', '+962792345678', 'Safe and friendly driver', 'en', 200.00, 4.9, true, true),
('d0000003-0000-0000-0000-000000000003', 'Mohammed Hassan', '+962793456789', 'Professional driver, always on time', 'ar', 100.00, 4.7, true, true),
('p0000001-0000-0000-0000-000000000001', 'Layla Ibrahim', '+962794567890', 'Regular commuter', 'ar', 50.00, 5.0, false, true),
('p0000002-0000-0000-0000-000000000002', 'John Smith', '+962795678901', 'Business traveler', 'en', 75.00, 4.9, false, true),
('p0000003-0000-0000-0000-000000000003', 'Fatima Al-Zahra', '+962796789012', 'Student', 'ar', 25.00, 5.0, false, true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone_number = EXCLUDED.phone_number,
  bio = EXCLUDED.bio,
  language_preference = EXCLUDED.language_preference,
  wallet_balance = EXCLUDED.wallet_balance,
  trust_score = EXCLUDED.trust_score,
  is_driver = EXCLUDED.is_driver,
  is_verified = EXCLUDED.is_verified;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SAMPLE TRIPS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO trips (id, driver_id, origin_city_id, destination_city_id, origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng, departure_time, available_seats, price_per_seat, vehicle_type, status, allows_packages, package_price) VALUES
-- Active trips
('t0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 
 'Abdali, Amman', 'Aqaba City Center', 31.9539, 35.9106, 29.5321, 35.0063, 
 now() + interval '2 hours', 3, 25.00, 'Sedan', 'active', true, 15.00),

('t0000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 
 'Shmeisani, Amman', 'Irbid City Center', 31.9606, 35.8789, 32.5556, 35.8500, 
 now() + interval '4 hours', 2, 5.00, 'SUV', 'active', true, 3.00),

('t0000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 
 'Irbid University', 'Abdoun, Amman', 32.5556, 35.8500, 31.9454, 35.8617, 
 now() + interval '1 day', 4, 5.00, 'Van', 'active', false, null),

('t0000004-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 
 'Downtown Amman', 'Zarqa City Center', 31.9539, 35.9106, 32.0728, 36.0881, 
 now() + interval '6 hours', 3, 2.50, 'Sedan', 'active', true, 2.00)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SAMPLE RIDES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO rides (id, trip_id, passenger_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, seats_requested, total_price, status, payment_status) VALUES
('r1000001-0000-0000-0000-000000000001', 't0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 
 'Jabal Amman', 'Aqaba Beach', 31.9539, 35.9284, 29.5321, 35.0063, 
 1, 25.00, 'DRIVER_ASSIGNED', 'paid'),

('r1000002-0000-0000-0000-000000000002', 't0000002-0000-0000-0000-000000000002', 'p0000002-0000-0000-0000-000000000002', 
 'Sweifieh, Amman', 'Irbid Downtown', 31.9539, 35.8617, 32.5556, 35.8500, 
 2, 10.00, 'REQUESTED', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SAMPLE PACKAGES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO packages (id, sender_id, tracking_number, origin_address, destination_address, origin_lat, origin_lng, destination_lat, destination_lng, package_size, weight_kg, description, delivery_price, status, receiver_phone, receiver_name) VALUES
('pkg00001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'PKG20250101-ABC12345', 
 'Amman, Abdali', 'Aqaba, City Center', 31.9539, 35.9106, 29.5321, 35.0063, 
 'medium', 2.5, 'Documents and gifts', 15.00, 'pending', '+962791111111', 'Ali Hassan'),

('pkg00002-0000-0000-0000-000000000002', 'p0000002-0000-0000-0000-000000000002', 'PKG20250101-DEF67890', 
 'Irbid, University', 'Amman, Shmeisani', 32.5556, 35.8500, 31.9606, 35.8789, 
 'small', 1.0, 'Books', 5.00, 'pending', '+962792222222', 'Sara Ahmad')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. BUSES & SCHEDULES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO buses (id, operator_name, bus_number, route_id, capacity, vehicle_type, amenities, is_active) VALUES
('bus00001-0000-0000-0000-000000000001', 'JETT', 'JETT-101', 'r0000001-0000-0000-0000-000000000001', 45, 'luxury', ARRAY['wifi', 'ac', 'usb_charging'], true),
('bus00002-0000-0000-0000-000000000002', 'Trust International', 'TI-205', 'r0000002-0000-0000-0000-000000000002', 40, 'standard', ARRAY['ac'], true),
('bus00003-0000-0000-0000-000000000003', 'JETT', 'JETT-102', 'r0000006-0000-0000-0000-000000000006', 45, 'luxury', ARRAY['wifi', 'ac', 'usb_charging', 'entertainment'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bus_schedules (id, bus_id, departure_time, arrival_time, days_of_week, price, is_active) VALUES
-- Amman to Aqaba (daily)
('bs000001-0000-0000-0000-000000000001', 'bus00001-0000-0000-0000-000000000001', '07:00', '11:00', ARRAY[0,1,2,3,4,5,6], 10.00, true),
('bs000002-0000-0000-0000-000000000002', 'bus00001-0000-0000-0000-000000000001', '14:00', '18:00', ARRAY[0,1,2,3,4,5,6], 10.00, true),
-- Amman to Irbid (daily)
('bs000003-0000-0000-0000-000000000003', 'bus00002-0000-0000-0000-000000000002', '06:00', '07:00', ARRAY[0,1,2,3,4,5,6], 3.00, true),
('bs000004-0000-0000-0000-000000000004', 'bus00002-0000-0000-0000-000000000002', '16:00', '17:00', ARRAY[0,1,2,3,4,5,6], 3.00, true),
-- Aqaba to Amman (daily)
('bs000005-0000-0000-0000-000000000005', 'bus00003-0000-0000-0000-000000000003', '08:00', '12:00', ARRAY[0,1,2,3,4,5,6], 10.00, true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TRUST SCORES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO trust_scores (user_id, score, total_rides, completed_rides, cancelled_rides, total_ratings, average_rating, positive_reviews, negative_reviews, response_rate, on_time_rate) VALUES
('d0000001-0000-0000-0000-000000000001', 4.8, 150, 145, 5, 120, 4.8, 115, 5, 98.5, 96.0),
('d0000002-0000-0000-0000-000000000002', 4.9, 200, 195, 5, 180, 4.9, 175, 5, 99.0, 98.0),
('d0000003-0000-0000-0000-000000000003', 4.7, 100, 95, 5, 85, 4.7, 80, 5, 97.0, 94.0),
('p0000001-0000-0000-0000-000000000001', 5.0, 50, 50, 0, 45, 5.0, 45, 0, 100.0, 100.0),
('p0000002-0000-0000-0000-000000000002', 4.9, 75, 73, 2, 70, 4.9, 68, 2, 98.0, 97.0),
('p0000003-0000-0000-0000-000000000003', 5.0, 30, 30, 0, 28, 5.0, 28, 0, 100.0, 100.0)
ON CONFLICT (user_id) DO UPDATE SET
  score = EXCLUDED.score,
  total_rides = EXCLUDED.total_rides,
  completed_rides = EXCLUDED.completed_rides,
  cancelled_rides = EXCLUDED.cancelled_rides,
  total_ratings = EXCLUDED.total_ratings,
  average_rating = EXCLUDED.average_rating,
  positive_reviews = EXCLUDED.positive_reviews,
  negative_reviews = EXCLUDED.negative_reviews,
  response_rate = EXCLUDED.response_rate,
  on_time_rate = EXCLUDED.on_time_rate;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. COMMUNICATION PREFERENCES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO communication_preferences (user_id, email_notifications, sms_notifications, whatsapp_notifications, push_notifications, marketing_emails, ride_updates, package_updates, payment_notifications, promotional_offers) VALUES
('d0000001-0000-0000-0000-000000000001', true, true, true, true, false, true, true, true, false),
('d0000002-0000-0000-0000-000000000002', true, true, true, true, true, true, true, true, true),
('d0000003-0000-0000-0000-000000000003', true, false, true, true, false, true, true, true, false),
('p0000001-0000-0000-0000-000000000001', true, true, true, true, false, true, true, true, false),
('p0000002-0000-0000-0000-000000000002', true, true, false, true, true, true, true, true, true),
('p0000003-0000-0000-0000-000000000003', true, true, true, true, false, true, true, true, false)
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SAMPLE NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO notifications (user_id, title, message, type, priority, is_read) VALUES
('p0000001-0000-0000-0000-000000000001', 'Ride Confirmed', 'Your ride to Aqaba has been confirmed with Ahmad Al-Masri', 'ride_update', 'high', false),
('p0000002-0000-0000-0000-000000000002', 'New Trip Available', 'A new trip matching your route is available', 'ride_update', 'normal', false),
('d0000001-0000-0000-0000-000000000001', 'New Ride Request', 'Layla Ibrahim requested a ride on your trip', 'ride_update', 'high', false),
('p0000001-0000-0000-0000-000000000001', 'Package Matched', 'Your package has been matched with a carrier', 'package_update', 'normal', true)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

-- Verify seed data
DO $$
DECLARE
  city_count INT;
  route_count INT;
  profile_count INT;
  trip_count INT;
BEGIN
  SELECT COUNT(*) INTO city_count FROM cities;
  SELECT COUNT(*) INTO route_count FROM routes;
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO trip_count FROM trips;
  
  RAISE NOTICE 'Seed data loaded successfully:';
  RAISE NOTICE '  Cities: %', city_count;
  RAISE NOTICE '  Routes: %', route_count;
  RAISE NOTICE '  Profiles: %', profile_count;
  RAISE NOTICE '  Trips: %', trip_count;
END $$;
