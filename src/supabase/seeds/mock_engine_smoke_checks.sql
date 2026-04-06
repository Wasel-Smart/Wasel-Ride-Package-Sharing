-- Operational bootstrap smoke checks
-- Run after db/seeds/*.sql to confirm the application engine has
-- enough realistic data to boot search, booking, wallet, package, and trust
-- scenarios.

select 'users' as area, count(*) as total from public.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
)
union all
select 'drivers', count(*) from public.drivers
where driver_id in (
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777'
)
union all
select 'trips', count(*) from public.trips
where trip_id in (
  'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4'
)
union all
select 'bookings', count(*) from public.bookings
where booking_id in (
  'ddddddd1-dddd-dddd-dddd-ddddddddddd1',
  'ddddddd2-dddd-dddd-dddd-ddddddddddd2',
  'ddddddd3-dddd-dddd-dddd-ddddddddddd3'
)
union all
select 'packages', count(*) from public.packages
where package_id in (
  'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1',
  'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2',
  'eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3'
)
union all
select 'transactions', count(*) from public.transactions
where transaction_id in (
  'abababab-abab-abab-abab-ababababab01',
  'abababab-abab-abab-abab-ababababab02',
  'abababab-abab-abab-abab-ababababab03',
  'abababab-abab-abab-abab-ababababab04',
  'abababab-abab-abab-abab-ababababab05',
  'abababab-abab-abab-abab-ababababab06',
  'abababab-abab-abab-abab-ababababab07'
)
union all
select 'notifications', count(*) from public.notifications
where id in (
  '12121212-1212-1212-1212-121212121211',
  '12121212-1212-1212-1212-121212121212',
  '12121212-1212-1212-1212-121212121213',
  '12121212-1212-1212-1212-121212121214'
);

select
  t.trip_id,
  t.origin_city,
  t.destination_city,
  t.trip_status,
  t.available_seats,
  d.driver_status,
  u.full_name as driver_name
from public.trips t
join public.drivers d on d.driver_id = t.driver_id
join public.users u on u.id = d.user_id
where t.trip_id in (
  'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  'bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  'bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4'
)
order by t.departure_time;

select
  b.booking_id,
  passenger.full_name as passenger_name,
  trip.origin_city,
  trip.destination_city,
  b.booking_status,
  b.amount
from public.bookings b
join public.users passenger on passenger.id = b.passenger_id
join public.trips trip on trip.trip_id = b.trip_id
where b.booking_id in (
  'ddddddd1-dddd-dddd-dddd-ddddddddddd1',
  'ddddddd2-dddd-dddd-dddd-ddddddddddd2',
  'ddddddd3-dddd-dddd-dddd-ddddddddddd3'
)
order by b.created_at;

select
  p.package_code,
  p.package_status,
  p.weight_kg,
  sender.full_name as sender_name,
  p.trip_id
from public.packages p
join public.users sender on sender.id = p.sender_id
where p.package_id in (
  'eeeeeee1-eeee-eeee-eeee-eeeeeeeeeee1',
  'eeeeeee2-eeee-eeee-eeee-eeeeeeeeeee2',
  'eeeeeee3-eeee-eeee-eeee-eeeeeeeeeee3'
)
order by p.created_at;

select
  u.full_name,
  w.balance,
  w.pending_balance,
  count(tx.transaction_id) as transaction_count
from public.users u
join public.wallets w on w.user_id = u.id
left join public.transactions tx on tx.wallet_id = w.wallet_id
where u.id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
)
group by u.full_name, w.balance, w.pending_balance
order by u.full_name;
