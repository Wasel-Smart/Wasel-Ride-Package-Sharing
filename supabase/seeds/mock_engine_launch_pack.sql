-- Mock engine launch pack
-- Seeds a realistic canonical dataset for local demos, QA flows, and dry-run
-- launch rehearsals. This pack intentionally uses fixed UUIDs so smoke checks
-- and app scenarios are repeatable.

create extension if not exists "pgcrypto";

insert into public.users (
  id, auth_user_id, full_name, phone_number, email, role, profile_status,
  verification_level, sanad_verified_status, avatar_url
)
values
  ('11111111-1111-1111-1111-111111111111', null, 'Lina Haddad', '+962790000111', 'lina.mock@wasel14.online', 'passenger', 'active', 'level_2', 'verified', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
  ('22222222-2222-2222-2222-222222222222', null, 'Omar Nasser', '+962790000222', 'omar.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'),
  ('33333333-3333-3333-3333-333333333333', null, 'Sara Khoury', '+962790000333', 'sara.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80'),
  ('44444444-4444-4444-4444-444444444444', null, 'Kareem Saleh', '+962790000444', 'kareem.mock@wasel14.online', 'passenger', 'active', 'level_1', 'pending', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'),
  ('55555555-5555-5555-5555-555555555555', null, 'Noor Hamdan', '+962790000555', 'noor.mock@wasel14.online', 'admin', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone_number = excluded.phone_number,
  email = excluded.email,
  role = excluded.role,
  profile_status = excluded.profile_status,
  verification_level = excluded.verification_level,
  sanad_verified_status = excluded.sanad_verified_status,
  avatar_url = excluded.avatar_url,
  updated_at = timezone('utc', now());

insert into public.verification_records (
  verification_id, user_id, sanad_status, document_status, verification_level,
  verification_timestamp, provider_reference, document_reference
)
values
  ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'verified', 'verified', 'level_2', timezone('utc', now()) - interval '10 days', 'mock-sanad-lina', 'mock-doc-lina'),
  ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'verified', 'verified', 'level_3', timezone('utc', now()) - interval '12 days', 'mock-sanad-omar', 'mock-doc-omar'),
  ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'verified', 'verified', 'level_3', timezone('utc', now()) - interval '8 days', 'mock-sanad-sara', 'mock-doc-sara'),
  ('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '44444444-4444-4444-4444-444444444444', 'pending', 'unverified', 'level_1', timezone('utc', now()) - interval '1 day', 'mock-sanad-kareem', null)
on conflict (verification_id) do nothing;

insert into public.drivers (
  driver_id, user_id, license_number, driver_status, verification_level,
  sanad_identity_linked, background_check_status
)
values
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'MOCK-DRIVER-OMAR', 'online', 'level_3', true, 'verified'),
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'MOCK-DRIVER-SARA', 'online', 'level_3', true, 'verified')
on conflict (driver_id) do update
set
  user_id = excluded.user_id,
  driver_status = excluded.driver_status,
  verification_level = excluded.verification_level,
  sanad_identity_linked = excluded.sanad_identity_linked,
  background_check_status = excluded.background_check_status,
  updated_at = timezone('utc', now());

insert into public.vehicles (
  vehicle_id, driver_id, vehicle_type, plate_number, capacity, registration_status
)
values
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666666', 'sedan', '11-23456', 4, 'active'),
  ('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777777', 'suv', '22-34567', 6, 'active')
on conflict (vehicle_id) do update
set
  driver_id = excluded.driver_id,
  vehicle_type = excluded.vehicle_type,
  plate_number = excluded.plate_number,
  capacity = excluded.capacity,
  registration_status = excluded.registration_status,
  updated_at = timezone('utc', now());

update public.drivers
set vehicle_id = '88888888-8888-8888-8888-888888888881'
where driver_id = '66666666-6666-6666-6666-666666666666';

update public.drivers
set vehicle_id = '88888888-8888-8888-8888-888888888882'
where driver_id = '77777777-7777-7777-7777-777777777777';

update public.wallets
set
  balance = seeded.balance,
  pending_balance = seeded.pending_balance,
  wallet_status = 'active',
  currency_code = 'JOD',
  updated_at = timezone('utc', now())
from (
  values
    ('11111111-1111-1111-1111-111111111111'::uuid, 82.50::numeric, 0.00::numeric),
    ('22222222-2222-2222-2222-222222222222'::uuid, 154.00::numeric, 12.00::numeric),
    ('33333333-3333-3333-3333-333333333333'::uuid, 210.25::numeric, 15.00::numeric),
    ('44444444-4444-4444-4444-444444444444'::uuid, 41.00::numeric, 0.00::numeric),
    ('55555555-5555-5555-5555-555555555555'::uuid, 500.00::numeric, 0.00::numeric)
) as seeded(user_id, balance, pending_balance)
where wallets.user_id = seeded.user_id;

insert into public.payment_methods (
  payment_method_id, user_id, provider, method_type, token_reference, is_default, status
)
values
  ('99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', 'mock_stripe', 'card_payment', 'card-lina-4242', true, 'active'),
  ('99999999-9999-9999-9999-999999999992', '22222222-2222-2222-2222-222222222222', 'mock_stripe', 'card_payment', 'card-omar-1881', true, 'active'),
  ('99999999-9999-9999-9999-999999999993', '33333333-3333-3333-3333-333333333333', 'mock_stripe', 'card_payment', 'card-sara-2991', true, 'active'),
  ('99999999-9999-9999-9999-999999999994', '44444444-4444-4444-4444-444444444444', 'mock_stripe', 'card_payment', 'card-kareem-3112', true, 'active')
on conflict (payment_method_id) do update
set
  user_id = excluded.user_id,
  provider = excluded.provider,
  method_type = excluded.method_type,
  token_reference = excluded.token_reference,
  is_default = excluded.is_default,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.trips (
  trip_id, driver_id, origin_city, destination_city, departure_time, available_seats,
  price_per_seat, trip_status, allow_packages, package_capacity, package_slots_remaining,
  vehicle_make, vehicle_model, notes
)
values
  ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '66666666-6666-6666-6666-666666666666', 'Amman', 'Irbid', timezone('utc', now()) + interval '3 hours', 3, 4.50, 'open', true, 2, 1, 'Toyota', 'Camry', 'Morning intercity corridor'),
  ('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '77777777-7777-7777-7777-777777777777', 'Amman', 'Aqaba', timezone('utc', now()) + interval '8 hours', 2, 12.00, 'open', true, 3, 2, 'Hyundai', 'Santa Fe', 'Long-haul priority route'),
  ('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '66666666-6666-6666-6666-666666666666', 'Zarqa', 'Amman', timezone('utc', now()) + interval '90 minutes', 1, 2.75, 'booked', false, 0, 0, 'Toyota', 'Camry', 'Commuter express corridor')
on conflict (trip_id) do update
set
  driver_id = excluded.driver_id,
  origin_city = excluded.origin_city,
  destination_city = excluded.destination_city,
  departure_time = excluded.departure_time,
  available_seats = excluded.available_seats,
  price_per_seat = excluded.price_per_seat,
  trip_status = excluded.trip_status,
  allow_packages = excluded.allow_packages,
  package_capacity = excluded.package_capacity,
  package_slots_remaining = excluded.package_slots_remaining,
  vehicle_make = excluded.vehicle_make,
  vehicle_model = excluded.vehicle_model,
  notes = excluded.notes,
  updated_at = timezone('utc', now());

insert into public.trip_presence (
  trip_presence_id, trip_id, driver_id, active_passengers, active_packages,
  last_location, last_heartbeat_at
)
values
  ('ccccccc1-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '66666666-6666-6666-6666-666666666666', 1, 1, '{"lat":31.9539,"lng":35.9106,"city":"Amman"}'::jsonb, timezone('utc', now()) - interval '2 minutes'),
  ('ccccccc2-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '77777777-7777-7777-7777-777777777777', 1, 1, '{"lat":31.9454,"lng":35.9284,"city":"Amman"}'::jsonb, timezone('utc', now()) - interval '5 minutes'),
  ('ccccccc3-cccc-cccc-cccc-ccccccccccc3', 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '66666666-6666-6666-6666-666666666666', 1, 0, '{"lat":32.0728,"lng":36.0880,"city":"Zarqa"}'::jsonb, timezone('utc', now()) - interval '1 minutes')
on conflict (trip_id) do update
set
  driver_id = excluded.driver_id,
  active_passengers = excluded.active_passengers,
  active_packages = excluded.active_packages,
  last_location = excluded.last_location,
  last_heartbeat_at = excluded.last_heartbeat_at,
  updated_at = timezone('utc', now());

insert into public.bookings (
  booking_id, trip_id, passenger_id, seat_number, booking_status, amount, payment_transaction_id
)
values
  ('ddddddd1-dddd-dddd-dddd-ddddddddddd1', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', 1, 'confirmed', 4.50, null),
  ('ddddddd2-dddd-dddd-dddd-ddddddddddd2', 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '44444444-4444-4444-4444-444444444444', 1, 'confirmed', 12.00, null)
on conflict (booking_id) do update
set
  trip_id = excluded.trip_id,
  passenger_id = excluded.passenger_id,
  seat_number = excluded.seat_number,
  booking_status = excluded.booking_status,
  amount = excluded.amount,
  updated_at = timezone('utc', now());

insert into public.packages (
  package_id, sender_id, receiver_id, trip_id, package_status, package_code,
  receiver_name, receiver_phone, description, weight_kg, fee_amount,
  delivered_at
)
values
  ('eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1', '11111111-1111-1111-1111-111111111111', null, 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'assigned', 'PKG-AMM-001', 'Maya Haddad', '+962790001111', 'Documents envelope', 0.50, 3.00, null),
  ('eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2', '44444444-4444-4444-4444-444444444444', null, 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'in_transit', 'PKG-AQB-002', 'Hadi Saleh', '+962790001222', 'Small electronics box', 2.30, 6.50, null),
  ('eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3', '11111111-1111-1111-1111-111111111111', null, 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'delivered', 'PKG-ZRQ-003', 'Yousef Nasser', '+962790001333', 'Books bundle', 4.80, 4.25, timezone('utc', now()) - interval '6 hours')
on conflict (package_id) do update
set
  sender_id = excluded.sender_id,
  receiver_id = excluded.receiver_id,
  trip_id = excluded.trip_id,
  package_status = excluded.package_status,
  package_code = excluded.package_code,
  receiver_name = excluded.receiver_name,
  receiver_phone = excluded.receiver_phone,
  description = excluded.description,
  weight_kg = excluded.weight_kg,
  fee_amount = excluded.fee_amount,
  delivered_at = excluded.delivered_at,
  updated_at = timezone('utc', now());

insert into public.package_events (
  package_event_id, package_id, event_type, event_status, notes, created_by, created_at
)
values
  ('fffffff1-ffff-ffff-ffff-fffffffffff1', 'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1', 'assignment', 'assigned', 'Assigned to Amman-Irbid run', '22222222-2222-2222-2222-222222222222', timezone('utc', now()) - interval '40 minutes'),
  ('fffffff2-ffff-ffff-ffff-fffffffffff2', 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2', 'handoff', 'in_transit', 'Loaded for long-haul trip', '33333333-3333-3333-3333-333333333333', timezone('utc', now()) - interval '25 minutes'),
  ('fffffff3-ffff-ffff-ffff-fffffffffff3', 'eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3', 'delivery', 'delivered', 'Recipient confirmed receipt', '22222222-2222-2222-2222-222222222222', timezone('utc', now()) - interval '6 hours')
on conflict (package_event_id) do nothing;

insert into public.transactions (
  transaction_id, wallet_id, amount, transaction_type, payment_method,
  transaction_status, direction, reference_type, reference_id, metadata
)
select
  seeded.transaction_id,
  w.wallet_id,
  seeded.amount,
  seeded.transaction_type::public.transaction_type_v2,
  seeded.payment_method::public.payment_method_v2,
  seeded.transaction_status::public.transaction_status_v2,
  seeded.direction,
  seeded.reference_type,
  seeded.reference_id,
  seeded.metadata
from (
  values
    ('abababab-abab-abab-abab-ababababab01'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 25.00::numeric, 'add_funds', 'card_payment', 'posted', 'credit', 'wallet', '11111111-1111-1111-1111-111111111111'::uuid, '{"description":"Mock top-up"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab02'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 4.50::numeric, 'ride_payment', 'wallet_balance', 'posted', 'debit', 'trip', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, '{"description":"Amman to Irbid seat"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab03'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 18.00::numeric, 'driver_earning', 'wallet_balance', 'posted', 'credit', 'booking', 'ddddddd1-dddd-dddd-dddd-ddddddddddd1'::uuid, '{"description":"Driver earnings batch"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab04'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 6.50::numeric, 'driver_earning', 'wallet_balance', 'posted', 'credit', 'package', 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2'::uuid, '{"description":"Package delivery fee"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab05'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 12.00::numeric, 'ride_payment', 'wallet_balance', 'posted', 'debit', 'trip', 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, '{"description":"Aqaba booking"}'::jsonb)
) as seeded(transaction_id, user_id, amount, transaction_type, payment_method, transaction_status, direction, reference_type, reference_id, metadata)
join public.wallets w on w.user_id = seeded.user_id
on conflict (transaction_id) do nothing;

insert into public.notifications (
  id, user_id, type, title, message, read, is_read, metadata, created_at
)
values
  ('12121212-1212-1212-1212-121212121211', '11111111-1111-1111-1111-111111111111', 'trip_match', 'Trip confirmed', 'Your seat to Irbid is confirmed.', false, false, '{"priority":"high","action_url":"/my-trips"}'::jsonb, timezone('utc', now()) - interval '18 minutes'),
  ('12121212-1212-1212-1212-121212121212', '22222222-2222-2222-2222-222222222222', 'wallet', 'Earnings posted', 'A driver payout landed in your wallet.', false, false, '{"priority":"medium","action_url":"/wallet"}'::jsonb, timezone('utc', now()) - interval '12 minutes'),
  ('12121212-1212-1212-1212-121212121213', '44444444-4444-4444-4444-444444444444', 'verification', 'Verification pending', 'Complete your verification to unlock full booking access.', false, false, '{"priority":"high","action_url":"/profile"}'::jsonb, timezone('utc', now()) - interval '4 minutes')
on conflict (id) do update
set
  user_id = excluded.user_id,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  read = excluded.read,
  is_read = excluded.is_read,
  metadata = excluded.metadata,
  created_at = excluded.created_at;
