-- Expand the canonical operating-model tables so they match the current
-- app-facing runtime contract used by the direct Supabase fallback layer.

alter table public.trips
  add column if not exists vehicle_make text,
  add column if not exists vehicle_model text,
  add column if not exists notes text,
  add column if not exists deleted_at timestamptz;

alter table public.bookings
  add column if not exists status text,
  add column if not exists confirmed_by_driver boolean not null default false,
  add column if not exists seats_requested integer,
  add column if not exists pickup_location text,
  add column if not exists pickup_name text,
  add column if not exists dropoff_location text,
  add column if not exists dropoff_name text,
  add column if not exists price_per_seat numeric(14,2),
  add column if not exists total_price numeric(14,2),
  add column if not exists seats_booked integer;

update public.bookings
set
  status = coalesce(status, booking_status::text),
  seats_booked = coalesce(seats_booked, 1),
  seats_requested = coalesce(seats_requested, seats_booked, 1),
  total_price = coalesce(total_price, amount),
  price_per_seat = coalesce(price_per_seat, amount)
where
  status is null
  or seats_booked is null
  or seats_requested is null
  or total_price is null
  or price_per_seat is null;

alter table public.packages
  add column if not exists tracking_number text,
  add column if not exists qr_code text,
  add column if not exists origin_name text,
  add column if not exists origin_location text,
  add column if not exists destination_name text,
  add column if not exists destination_location text,
  add column if not exists delivery_fee numeric(14,2) not null default 0,
  add column if not exists status text;

update public.packages
set
  tracking_number = coalesce(tracking_number, package_code),
  qr_code = coalesce(qr_code, package_code),
  status = coalesce(status, package_status::text)
where
  tracking_number is null
  or qr_code is null
  or status is null;

create unique index if not exists packages_tracking_number_unique
  on public.packages (tracking_number)
  where tracking_number is not null;

create index if not exists idx_trips_deleted_at on public.trips (deleted_at);
create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_packages_tracking_number on public.packages (tracking_number);
