-- rolling_trips.seed.sql
-- Re-runnable seed that inserts live-looking trips across major Jordan corridors.
-- All departure times are computed relative to NOW() so re-running the seed
-- after the previous trips expire keeps the search results populated.
-- Safe to run multiple times thanks to ON CONFLICT DO UPDATE.

begin;

do $$
begin
  raise notice 'Applying rolling_trips.seed.sql — seeding future trips across major corridors';
end $$;

-- ─── Prerequisite: ensure the two seed drivers exist (no-op if core.seed.sql already ran) ───

insert into public.users (id, auth_user_id, full_name, phone_number, email, role, profile_status, verification_level, sanad_verified_status, referral_code)
values
  ('22222222-2222-2222-2222-222222222222', null, 'Omar Nasser',   '+962790000222', 'omar.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'OMAR-DRIVE'),
  ('33333333-3333-3333-3333-333333333333', null, 'Sara Khoury',   '+962790000333', 'sara.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'SARA-ROAD'),
  ('66666666-cccc-cccc-cccc-666666666666', null, 'Khaled Mansour','+962790000666', 'khaled.mock@wasel14.online','driver', 'active', 'level_3', 'verified', 'KHALED-GO')
on conflict (id) do update set
  full_name   = excluded.full_name,
  updated_at  = timezone('utc', now());

insert into public.wallets (user_id)
values
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'),
  ('66666666-cccc-cccc-cccc-666666666666')
on conflict (user_id) do nothing;

insert into public.drivers (driver_id, user_id, license_number, driver_status, verification_level, sanad_identity_linked, background_check_status)
values
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'MOCK-DRIVER-OMAR',   'online', 'level_3', true, 'verified'),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'MOCK-DRIVER-SARA',   'online', 'level_3', true, 'verified'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-cccc-cccc-cccc-666666666666', 'MOCK-DRIVER-KHALED', 'online', 'level_3', true, 'verified')
on conflict (driver_id) do update set
  driver_status = excluded.driver_status,
  updated_at    = timezone('utc', now());

insert into public.vehicles (vehicle_id, driver_id, vehicle_type, plate_number, capacity, registration_status)
values
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666666', 'sedan', '11-23456', 4, 'active'),
  ('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777777', 'suv',   '22-34567', 6, 'active'),
  ('88888888-8888-8888-8888-888888888883', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sedan', '33-45678', 4, 'active')
on conflict (vehicle_id) do update set
  registration_status = excluded.registration_status,
  updated_at          = timezone('utc', now());

-- ─── Rolling trips — always in the future relative to NOW() ──────────────────
-- Trip IDs use a stable prefix so ON CONFLICT keeps them idempotent.

insert into public.trips (
  trip_id,
  driver_id,
  origin_city, destination_city,
  departure_time,
  available_seats, price_per_seat,
  trip_status,
  allow_packages, package_capacity, package_slots_remaining,
  vehicle_make, vehicle_model,
  notes,
  corridor_key, route_scope,
  origin_governorate, destination_governorate,
  trip_type_key
)
values
  -- Amman → Irbid  (2 h from now, 3 h from now)
  (
    'rt000001-0000-0000-0000-000000000001',
    '66666666-6666-6666-6666-666666666666',
    'Amman', 'Irbid',
    timezone('utc', now()) + interval '2 hours',
    3, 5.50, 'open', true, 2, 2,
    'Toyota', 'Camry',
    'Wasel priority corridor — early morning run.',
    'amman-irbid', 'city_to_city', 'Amman', 'Irbid', 'wasel'
  ),
  (
    'rt000001-0000-0000-0000-000000000002',
    '77777777-7777-7777-7777-777777777777',
    'Amman', 'Irbid',
    timezone('utc', now()) + interval '5 hours',
    4, 5.50, 'open', true, 3, 3,
    'Hyundai', 'Tucson',
    'Afternoon Amman–Irbid run with package slots.',
    'amman-irbid', 'city_to_city', 'Amman', 'Irbid', 'wasel'
  ),

  -- Irbid → Amman  (return corridors)
  (
    'rt000002-0000-0000-0000-000000000001',
    '66666666-6666-6666-6666-666666666666',
    'Irbid', 'Amman',
    timezone('utc', now()) + interval '6 hours',
    3, 5.50, 'open', false, 0, 0,
    'Toyota', 'Camry',
    'Return leg — Irbid to Amman.',
    'irbid-amman', 'city_to_city', 'Irbid', 'Amman', 'wasel'
  ),

  -- Amman → Aqaba  (long-haul, higher price)
  (
    'rt000003-0000-0000-0000-000000000001',
    '77777777-7777-7777-7777-777777777777',
    'Amman', 'Aqaba',
    timezone('utc', now()) + interval '8 hours',
    2, 18.00, 'open', true, 3, 2,
    'Hyundai', 'Santa Fe',
    'Long-haul to Aqaba — Raje3 outbound.',
    'amman-aqaba', 'city_to_city', 'Amman', 'Aqaba', 'raje3'
  ),
  (
    'rt000003-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Amman', 'Aqaba',
    timezone('utc', now()) + interval '1 day',
    3, 17.50, 'open', true, 2, 2,
    'Kia', 'Sportage',
    'Next-day Aqaba run.',
    'amman-aqaba', 'city_to_city', 'Amman', 'Aqaba', 'raje3'
  ),

  -- Aqaba → Amman  (return)
  (
    'rt000004-0000-0000-0000-000000000001',
    '77777777-7777-7777-7777-777777777777',
    'Aqaba', 'Amman',
    timezone('utc', now()) + interval '1 day 6 hours',
    4, 17.10, 'open', true, 2, 2,
    'Hyundai', 'Santa Fe',
    'Raje3 return leg — Aqaba back to Amman.',
    'aqaba-amman', 'city_to_city', 'Aqaba', 'Amman', 'raje3'
  ),

  -- Zarqa → Amman  (commuter)
  (
    'rt000005-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Zarqa', 'Amman',
    timezone('utc', now()) + interval '1 hour 30 minutes',
    2, 2.75, 'open', false, 0, 0,
    'Toyota', 'Corolla',
    'Morning commuter express — Zarqa to Amman.',
    'zarqa-amman', 'city_to_city', 'Zarqa', 'Amman', 'wasel'
  ),
  (
    'rt000005-0000-0000-0000-000000000002',
    '66666666-6666-6666-6666-666666666666',
    'Zarqa', 'Amman',
    timezone('utc', now()) + interval '4 hours',
    3, 2.75, 'open', false, 0, 0,
    'Toyota', 'Camry',
    'Mid-morning commuter run.',
    'zarqa-amman', 'city_to_city', 'Zarqa', 'Amman', 'wasel'
  ),

  -- Amman → Zarqa
  (
    'rt000006-0000-0000-0000-000000000001',
    '77777777-7777-7777-7777-777777777777',
    'Amman', 'Zarqa',
    timezone('utc', now()) + interval '3 hours',
    3, 2.75, 'open', false, 0, 0,
    'Hyundai', 'Tucson',
    'Amman to Zarqa midday run.',
    'amman-zarqa', 'city_to_city', 'Amman', 'Zarqa', 'wasel'
  ),

  -- Amman → Jerash
  (
    'rt000007-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Amman', 'Jerash',
    timezone('utc', now()) + interval '3 hours 30 minutes',
    4, 4.00, 'open', true, 1, 1,
    'Kia', 'Sportage',
    'Tourist corridor — Amman to Jerash.',
    'amman-jerash', 'city_to_city', 'Amman', 'Jerash', 'wasel'
  ),

  -- Amman → Madaba
  (
    'rt000008-0000-0000-0000-000000000001',
    '66666666-6666-6666-6666-666666666666',
    'Amman', 'Madaba',
    timezone('utc', now()) + interval '2 hours 30 minutes',
    3, 3.50, 'open', false, 0, 0,
    'Toyota', 'Camry',
    'Quick run to Madaba.',
    'amman-madaba', 'city_to_city', 'Amman', 'Madaba', 'wasel'
  ),

  -- Amman → Salt
  (
    'rt000009-0000-0000-0000-000000000001',
    '77777777-7777-7777-7777-777777777777',
    'Amman', 'Salt',
    timezone('utc', now()) + interval '4 hours 30 minutes',
    4, 3.00, 'open', false, 0, 0,
    'Hyundai', 'Tucson',
    'West corridor — Amman to Salt.',
    'amman-salt', 'city_to_city', 'Amman', 'Salt', 'wasel'
  )
on conflict (trip_id) do update set
  departure_time         = excluded.departure_time,
  available_seats        = excluded.available_seats,
  trip_status            = excluded.trip_status,
  package_slots_remaining = excluded.package_slots_remaining,
  updated_at             = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'rolling_trips.seed.sql',
  jsonb_build_object(
    'trips', 12,
    'corridors', array['amman-irbid','irbid-amman','amman-aqaba','aqaba-amman','zarqa-amman','amman-zarqa','amman-jerash','amman-madaba','amman-salt'],
    'layer', 'rolling_trip_inventory'
  )
)
on conflict do nothing;

commit;
