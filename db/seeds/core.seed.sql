begin;

do $$
begin
  raise notice 'Applying core.seed.sql';
end $$;

insert into public.users (
  id,
  auth_user_id,
  full_name,
  phone_number,
  email,
  role,
  profile_status,
  verification_level,
  sanad_verified_status,
  avatar_url,
  referral_code
)
values
  ('11111111-1111-1111-1111-111111111111', null, 'Lina Haddad', '+962790000111', 'lina.mock@wasel14.online', 'passenger', 'active', 'level_2', 'verified', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', 'LINA-WASEL'),
  ('22222222-2222-2222-2222-222222222222', null, 'Omar Nasser', '+962790000222', 'omar.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 'OMAR-DRIVE'),
  ('33333333-3333-3333-3333-333333333333', null, 'Sara Khoury', '+962790000333', 'sara.mock@wasel14.online', 'driver', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80', 'SARA-ROAD'),
  ('44444444-4444-4444-4444-444444444444', null, 'Kareem Saleh', '+962790000444', 'kareem.mock@wasel14.online', 'passenger', 'active', 'level_1', 'pending', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d', 'KAREEM-GO'),
  ('55555555-5555-5555-5555-555555555555', null, 'Noor Hamdan', '+962790000555', 'noor.mock@wasel14.online', 'admin', 'active', 'level_3', 'verified', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', 'NOOR-OPS')
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
  referral_code = excluded.referral_code,
  updated_at = timezone('utc', now());

insert into public.wallets (user_id)
values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444'),
  ('55555555-5555-5555-5555-555555555555')
on conflict (user_id) do nothing;

insert into public.verification_records (
  verification_id,
  user_id,
  sanad_status,
  document_status,
  verification_level,
  verification_timestamp,
  provider_reference,
  document_reference
)
values
  ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'verified', 'verified', 'level_2', timezone('utc', now()) - interval '10 days', 'mock-sanad-lina', 'mock-doc-lina'),
  ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'verified', 'verified', 'level_3', timezone('utc', now()) - interval '12 days', 'mock-sanad-omar', 'mock-doc-omar'),
  ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'verified', 'verified', 'level_3', timezone('utc', now()) - interval '8 days', 'mock-sanad-sara', 'mock-doc-sara'),
  ('aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '44444444-4444-4444-4444-444444444444', 'pending', 'unverified', 'level_1', timezone('utc', now()) - interval '1 day', 'mock-sanad-kareem', null)
on conflict (verification_id) do nothing;

insert into public.drivers (
  driver_id,
  user_id,
  license_number,
  driver_status,
  verification_level,
  sanad_identity_linked,
  background_check_status
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
  vehicle_id,
  driver_id,
  vehicle_type,
  plate_number,
  capacity,
  registration_status
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
  payment_method_id,
  user_id,
  provider,
  method_type,
  token_reference,
  is_default,
  status
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
  trip_id,
  driver_id,
  origin_city,
  destination_city,
  departure_time,
  available_seats,
  price_per_seat,
  trip_status,
  allow_packages,
  package_capacity,
  package_slots_remaining,
  vehicle_make,
  vehicle_model,
  notes,
  corridor_key,
  route_scope,
  origin_governorate,
  destination_governorate,
  trip_type_key,
  lifecycle_group_id,
  paired_trip_id,
  auto_return_enabled
)
values
  (
    'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '66666666-6666-6666-6666-666666666666',
    'Amman',
    'Irbid',
    timezone('utc', now()) + interval '3 hours',
    3,
    5.50,
    'open',
    true,
    2,
    1,
    'Toyota',
    'Camry',
    'Wasel priority corridor for early liquidity.',
    'amman-irbid',
    'city_to_city',
    'Amman',
    'Irbid',
    'wasel',
    '90909090-9090-9090-9090-909090909091',
    null,
    false
  ),
  (
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '77777777-7777-7777-7777-777777777777',
    'Amman',
    'Aqaba',
    timezone('utc', now()) + interval '8 hours',
    2,
    18.00,
    'open',
    true,
    3,
    2,
    'Hyundai',
    'Santa Fe',
    'Raje3 outbound leg seeded with automatic return pair.',
    'amman-aqaba',
    'city_to_city',
    'Amman',
    'Aqaba',
    'raje3',
    '90909090-9090-9090-9090-909090909092',
    'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    true
  ),
  (
    'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '77777777-7777-7777-7777-777777777777',
    'Aqaba',
    'Amman',
    timezone('utc', now()) + interval '32 hours',
    4,
    17.10,
    'open',
    true,
    2,
    2,
    'Hyundai',
    'Santa Fe',
    'Raje3 return leg generated for paired trip lifecycle.',
    'aqaba-amman',
    'city_to_city',
    'Aqaba',
    'Amman',
    'raje3',
    '90909090-9090-9090-9090-909090909092',
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    true
  ),
  (
    'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    '66666666-6666-6666-6666-666666666666',
    'Zarqa',
    'Amman',
    timezone('utc', now()) + interval '90 minutes',
    1,
    2.75,
    'booked',
    false,
    0,
    0,
    'Toyota',
    'Camry',
    'Commuter express corridor with repeat weekday demand.',
    'zarqa-amman',
    'city_to_city',
    'Zarqa',
    'Amman',
    'wasel',
    '90909090-9090-9090-9090-909090909094',
    null,
    false
  )
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
  corridor_key = excluded.corridor_key,
  route_scope = excluded.route_scope,
  origin_governorate = excluded.origin_governorate,
  destination_governorate = excluded.destination_governorate,
  trip_type_key = excluded.trip_type_key,
  lifecycle_group_id = excluded.lifecycle_group_id,
  paired_trip_id = excluded.paired_trip_id,
  auto_return_enabled = excluded.auto_return_enabled,
  updated_at = timezone('utc', now());

insert into public.trip_presence (
  trip_presence_id,
  trip_id,
  driver_id,
  active_passengers,
  active_packages,
  last_location,
  last_heartbeat_at
)
values
  ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '66666666-6666-6666-6666-666666666666', 1, 1, '{"lat":31.955,"lng":35.915,"city":"Amman"}'::jsonb, timezone('utc', now()) - interval '4 minutes'),
  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '77777777-7777-7777-7777-777777777777', 1, 1, '{"lat":31.920,"lng":35.890,"city":"Amman"}'::jsonb, timezone('utc', now()) - interval '7 minutes'),
  ('c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3', 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '77777777-7777-7777-7777-777777777777', 0, 0, '{"lat":29.532,"lng":35.009,"city":"Aqaba"}'::jsonb, timezone('utc', now()) - interval '15 minutes'),
  ('c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4', 'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '66666666-6666-6666-6666-666666666666', 1, 0, '{"lat":32.072,"lng":36.090,"city":"Zarqa"}'::jsonb, timezone('utc', now()) - interval '2 minutes')
on conflict (trip_presence_id) do update
set
  trip_id = excluded.trip_id,
  driver_id = excluded.driver_id,
  active_passengers = excluded.active_passengers,
  active_packages = excluded.active_packages,
  last_location = excluded.last_location,
  last_heartbeat_at = excluded.last_heartbeat_at,
  updated_at = timezone('utc', now());

insert into public.bookings (
  booking_id,
  trip_id,
  passenger_id,
  seat_number,
  booking_status,
  amount,
  payment_transaction_id,
  status,
  confirmed_by_driver,
  seats_requested,
  pickup_location,
  pickup_name,
  dropoff_location,
  dropoff_name,
  price_per_seat,
  total_price,
  seats_booked
)
values
  (
    'ddddddd1-dddd-dddd-dddd-ddddddddddd1',
    'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '11111111-1111-1111-1111-111111111111',
    1,
    'confirmed',
    5.50,
    'abababab-abab-abab-abab-ababababab02',
    'confirmed',
    true,
    1,
    'Abdali Boulevard',
    'Lina Pickup',
    'Irbid University Street',
    'Irbid Drop-off',
    5.50,
    5.50,
    1
  ),
  (
    'ddddddd2-dddd-dddd-dddd-ddddddddddd2',
    'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    '44444444-4444-4444-4444-444444444444',
    1,
    'confirmed',
    2.75,
    'abababab-abab-abab-abab-ababababab05',
    'confirmed',
    true,
    1,
    'Zarqa Station',
    'Kareem Pickup',
    'Amman Downtown',
    'Amman Drop-off',
    2.75,
    2.75,
    1
  ),
  (
    'ddddddd3-dddd-dddd-dddd-ddddddddddd3',
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '11111111-1111-1111-1111-111111111111',
    2,
    'confirmed',
    18.00,
    'abababab-abab-abab-abab-ababababab06',
    'confirmed',
    true,
    1,
    '7th Circle',
    'Lina Pickup',
    'Aqaba Center',
    'Aqaba Drop-off',
    18.00,
    18.00,
    1
  )
on conflict (booking_id) do update
set
  trip_id = excluded.trip_id,
  passenger_id = excluded.passenger_id,
  seat_number = excluded.seat_number,
  booking_status = excluded.booking_status,
  amount = excluded.amount,
  payment_transaction_id = excluded.payment_transaction_id,
  status = excluded.status,
  confirmed_by_driver = excluded.confirmed_by_driver,
  seats_requested = excluded.seats_requested,
  pickup_location = excluded.pickup_location,
  pickup_name = excluded.pickup_name,
  dropoff_location = excluded.dropoff_location,
  dropoff_name = excluded.dropoff_name,
  price_per_seat = excluded.price_per_seat,
  total_price = excluded.total_price,
  seats_booked = excluded.seats_booked,
  updated_at = timezone('utc', now());

insert into public.packages (
  package_id,
  sender_id,
  receiver_id,
  trip_id,
  package_status,
  package_code,
  receiver_name,
  receiver_phone,
  description,
  weight_kg,
  fee_amount,
  payment_transaction_id,
  delivered_at,
  tracking_number,
  qr_code,
  origin_name,
  origin_location,
  destination_name,
  destination_location,
  delivery_fee,
  status
)
values
  (
    'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1',
    '11111111-1111-1111-1111-111111111111',
    null,
    'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'assigned',
    'PKG-AMM-001',
    'Maya Haddad',
    '+962790001111',
    'Documents envelope',
    0.50,
    3.00,
    null,
    null,
    'TRK-AMM-001',
    'QR-AMM-001',
    'Abdali Hub',
    'Amman',
    'Irbid Gate',
    'Irbid',
    3.00,
    'assigned'
  ),
  (
    'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2',
    '44444444-4444-4444-4444-444444444444',
    null,
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'in_transit',
    'PKG-AQB-002',
    'Hadi Saleh',
    '+962790001222',
    'Small electronics box',
    2.30,
    6.50,
    'abababab-abab-abab-abab-ababababab07',
    null,
    'TRK-AQB-002',
    'QR-AQB-002',
    'Zarqa Commercial District',
    'Zarqa',
    'Aqaba Marina',
    'Aqaba',
    6.50,
    'in_transit'
  ),
  (
    'eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3',
    '11111111-1111-1111-1111-111111111111',
    null,
    'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'delivered',
    'PKG-ZRQ-003',
    'Yousef Nasser',
    '+962790001333',
    'Books bundle',
    4.80,
    4.25,
    null,
    timezone('utc', now()) - interval '6 hours',
    'TRK-ZRQ-003',
    'QR-ZRQ-003',
    'Amman East Hub',
    'Amman',
    'Zarqa Central',
    'Zarqa',
    4.25,
    'delivered'
  )
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
  payment_transaction_id = excluded.payment_transaction_id,
  delivered_at = excluded.delivered_at,
  tracking_number = excluded.tracking_number,
  qr_code = excluded.qr_code,
  origin_name = excluded.origin_name,
  origin_location = excluded.origin_location,
  destination_name = excluded.destination_name,
  destination_location = excluded.destination_location,
  delivery_fee = excluded.delivery_fee,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.package_events (
  package_event_id,
  package_id,
  event_type,
  event_status,
  notes,
  created_by,
  created_at
)
values
  ('fffffff1-ffff-ffff-ffff-fffffffffff1', 'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1', 'assignment', 'assigned', 'Assigned to Amman-Irbid run', '22222222-2222-2222-2222-222222222222', timezone('utc', now()) - interval '40 minutes'),
  ('fffffff2-ffff-ffff-ffff-fffffffffff2', 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2', 'handoff', 'in_transit', 'Loaded for long-haul trip', '33333333-3333-3333-3333-333333333333', timezone('utc', now()) - interval '25 minutes'),
  ('fffffff3-ffff-ffff-ffff-fffffffffff3', 'eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3', 'delivery', 'delivered', 'Recipient confirmed receipt', '22222222-2222-2222-2222-222222222222', timezone('utc', now()) - interval '6 hours')
on conflict (package_event_id) do nothing;

insert into public.transactions (
  transaction_id,
  wallet_id,
  amount,
  transaction_type,
  payment_method,
  transaction_status,
  direction,
  reference_type,
  reference_id,
  metadata
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
    ('abababab-abab-abab-abab-ababababab02'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 5.50::numeric, 'ride_payment', 'wallet_balance', 'posted', 'debit', 'trip', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, '{"description":"Amman to Irbid seat"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab03'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 18.00::numeric, 'driver_earning', 'wallet_balance', 'posted', 'credit', 'booking', 'ddddddd1-dddd-dddd-dddd-ddddddddddd1'::uuid, '{"description":"Driver earnings batch"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab04'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 6.50::numeric, 'driver_earning', 'wallet_balance', 'posted', 'credit', 'package', 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2'::uuid, '{"description":"Package delivery fee"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab05'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 2.75::numeric, 'ride_payment', 'wallet_balance', 'posted', 'debit', 'trip', 'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4'::uuid, '{"description":"Zarqa commuter booking"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab06'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 18.00::numeric, 'ride_payment', 'wallet_balance', 'posted', 'debit', 'trip', 'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, '{"description":"Aqaba outbound booking"}'::jsonb),
    ('abababab-abab-abab-abab-ababababab07'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 6.50::numeric, 'package_payment', 'wallet_balance', 'posted', 'debit', 'package', 'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2'::uuid, '{"description":"Aqaba package payment"}'::jsonb)
) as seeded(transaction_id, user_id, amount, transaction_type, payment_method, transaction_status, direction, reference_type, reference_id, metadata)
join public.wallets w on w.user_id = seeded.user_id
on conflict (transaction_id) do nothing;

insert into public.notifications (
  id,
  user_id,
  type,
  title,
  message,
  read,
  is_read,
  metadata,
  related_booking_id,
  related_trip_id,
  created_at
)
values
  ('12121212-1212-1212-1212-121212121211', '11111111-1111-1111-1111-111111111111', 'trip_match', 'Trip confirmed', 'Your seat to Irbid is confirmed.', false, false, '{"priority":"high","action_url":"/my-trips"}'::jsonb, 'ddddddd1-dddd-dddd-dddd-ddddddddddd1', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', timezone('utc', now()) - interval '18 minutes'),
  ('12121212-1212-1212-1212-121212121212', '22222222-2222-2222-2222-222222222222', 'wallet', 'Earnings posted', 'A driver payout landed in your wallet.', false, false, '{"priority":"medium","action_url":"/wallet"}'::jsonb, 'ddddddd1-dddd-dddd-dddd-ddddddddddd1', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', timezone('utc', now()) - interval '12 minutes'),
  ('12121212-1212-1212-1212-121212121213', '44444444-4444-4444-4444-444444444444', 'verification', 'Verification pending', 'Complete your verification to unlock full booking access.', false, false, '{"priority":"high","action_url":"/profile"}'::jsonb, null, null, timezone('utc', now()) - interval '4 minutes'),
  ('12121212-1212-1212-1212-121212121214', '33333333-3333-3333-3333-333333333333', 'automation', 'Return leg scheduled', 'Your Raje3 return trip has been staged for Aqaba to Amman.', false, false, '{"priority":"medium","action_url":"/driver/trips"}'::jsonb, null, 'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', timezone('utc', now()) - interval '6 minutes')
on conflict (id) do update
set
  user_id = excluded.user_id,
  type = excluded.type,
  title = excluded.title,
  message = excluded.message,
  read = excluded.read,
  is_read = excluded.is_read,
  metadata = excluded.metadata,
  related_booking_id = excluded.related_booking_id,
  related_trip_id = excluded.related_trip_id,
  created_at = excluded.created_at,
  updated_at = timezone('utc', now());

insert into public.seed_execution_log (seed_name, details)
values (
  'core.seed.sql',
  jsonb_build_object('users', 5, 'drivers', 2, 'trips', 4, 'bookings', 3, 'packages', 3, 'notifications', 4, 'layer', 'business_logic_data')
);

commit;
