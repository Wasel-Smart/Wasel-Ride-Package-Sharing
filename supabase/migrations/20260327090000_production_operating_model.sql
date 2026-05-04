-- Wasel Production Operating Model
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role_v2') then create type user_role_v2 as enum ('passenger', 'driver', 'admin'); end if;
  if not exists (select 1 from pg_type where typname = 'profile_status_v2') then create type profile_status_v2 as enum ('pending', 'active', 'suspended', 'blocked'); end if;
  if not exists (select 1 from pg_type where typname = 'verification_status_v2') then create type verification_status_v2 as enum ('unverified', 'pending', 'verified', 'rejected', 'expired'); end if;
  if not exists (select 1 from pg_type where typname = 'driver_status_v2') then create type driver_status_v2 as enum ('draft', 'pending_approval', 'approved', 'rejected', 'suspended', 'offline', 'online', 'busy'); end if;
  if not exists (select 1 from pg_type where typname = 'vehicle_registration_status_v2') then create type vehicle_registration_status_v2 as enum ('pending', 'active', 'expired', 'rejected', 'suspended'); end if;
  if not exists (select 1 from pg_type where typname = 'trip_status_v2') then create type trip_status_v2 as enum ('draft', 'open', 'booked', 'in_progress', 'completed', 'cancelled'); end if;
  if not exists (select 1 from pg_type where typname = 'booking_status_v2') then create type booking_status_v2 as enum ('pending_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'refunded'); end if;
  if not exists (select 1 from pg_type where typname = 'package_status_v2') then create type package_status_v2 as enum ('created', 'assigned', 'in_transit', 'delivered', 'cancelled', 'disputed'); end if;
  if not exists (select 1 from pg_type where typname = 'wallet_status_v2') then create type wallet_status_v2 as enum ('active', 'limited', 'frozen', 'closed'); end if;
  if not exists (select 1 from pg_type where typname = 'transaction_type_v2') then create type transaction_type_v2 as enum ('add_funds', 'withdraw_funds', 'transfer_funds', 'ride_payment', 'package_payment', 'driver_earning', 'refund', 'adjustment', 'hold', 'release'); end if;
  if not exists (select 1 from pg_type where typname = 'payment_method_v2') then create type payment_method_v2 as enum ('wallet_balance', 'card_payment', 'local_gateway', 'government_api'); end if;
  if not exists (select 1 from pg_type where typname = 'transaction_status_v2') then create type transaction_status_v2 as enum ('pending', 'authorized', 'posted', 'failed', 'reversed', 'refunded'); end if;
  if not exists (select 1 from pg_type where typname = 'verification_level_v2') then create type verification_level_v2 as enum ('level_0', 'level_1', 'level_2', 'level_3'); end if;
  if not exists (select 1 from pg_type where typname = 'otp_purpose_v2') then create type otp_purpose_v2 as enum ('login', 'wallet_transfer', 'wallet_withdrawal', 'driver_action', 'admin_action'); end if;
end $$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = timezone('utc', now()); return new; end; $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone_number text not null unique,
  email text not null unique,
  national_id bytea,
  national_id_hash text unique,
  national_id_last4 text,
  sanad_verified_status verification_status_v2 not null default 'unverified',
  profile_status profile_status_v2 not null default 'pending',
  role user_role_v2 not null default 'passenger',
  verification_level verification_level_v2 not null default 'level_0',
  phone_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.drivers (
  driver_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  license_number text not null unique,
  vehicle_id uuid,
  driver_status driver_status_v2 not null default 'pending_approval',
  verification_level verification_level_v2 not null default 'level_0',
  sanad_identity_linked boolean not null default false,
  background_check_status verification_status_v2 not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vehicles (
  vehicle_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(driver_id) on delete cascade,
  vehicle_type text not null,
  plate_number text not null unique,
  capacity integer not null check (capacity between 1 and 50),
  registration_status vehicle_registration_status_v2 not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trips (
  trip_id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(driver_id) on delete restrict,
  origin_city text not null,
  destination_city text not null,
  departure_time timestamptz not null,
  available_seats integer not null check (available_seats >= 0),
  price_per_seat numeric(14,2) not null check (price_per_seat >= 0),
  trip_status trip_status_v2 not null default 'draft',
  allow_packages boolean not null default false,
  package_capacity integer not null default 0 check (package_capacity >= 0),
  package_slots_remaining integer not null default 0 check (package_slots_remaining >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bookings (
  booking_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(trip_id) on delete cascade,
  passenger_id uuid not null references public.users(id) on delete cascade,
  seat_number integer not null check (seat_number > 0),
  booking_status booking_status_v2 not null default 'pending_payment',
  amount numeric(14,2) not null check (amount >= 0),
  payment_transaction_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (trip_id, seat_number),
  unique (trip_id, passenger_id)
);

create table if not exists public.packages (
  package_id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete restrict,
  receiver_id uuid references public.users(id) on delete set null,
  trip_id uuid references public.trips(trip_id) on delete set null,
  package_status package_status_v2 not null default 'created',
  package_code text not null unique,
  receiver_name text,
  receiver_phone text,
  description text,
  weight_kg numeric(8,2),
  fee_amount numeric(14,2) not null default 0,
  payment_transaction_id uuid,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wallets (
  wallet_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  pending_balance numeric(14,2) not null default 0 check (pending_balance >= 0),
  wallet_status wallet_status_v2 not null default 'active',
  currency_code text not null default 'JOD',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(wallet_id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transaction_type transaction_type_v2 not null,
  payment_method payment_method_v2 not null,
  transaction_status transaction_status_v2 not null default 'pending',
  direction text not null check (direction in ('debit', 'credit')),
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.verification_records (
  verification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sanad_status verification_status_v2 not null default 'pending',
  document_status verification_status_v2 not null default 'pending',
  verification_level verification_level_v2 not null default 'level_0',
  verification_timestamp timestamptz not null default timezone('utc', now()),
  provider_reference text,
  document_reference text,
  reviewer_admin_id uuid,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_logs (
  log_id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete restrict,
  action text not null,
  timestamp timestamptz not null default timezone('utc', now()),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.otp_sessions (
  otp_session_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  phone_number text not null,
  purpose otp_purpose_v2 not null,
  otp_hash text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_methods (
  payment_method_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  method_type payment_method_v2 not null,
  token_reference text not null,
  is_default boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.package_events (
  package_event_id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(package_id) on delete cascade,
  event_type text not null,
  event_status text not null,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trip_presence (
  trip_presence_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(trip_id) on delete cascade,
  driver_id uuid not null references public.drivers(driver_id) on delete cascade,
  active_passengers integer not null default 0,
  active_packages integer not null default 0,
  last_location jsonb not null default '{}'::jsonb,
  last_heartbeat_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.drivers
  drop constraint if exists drivers_vehicle_id_fkey;
alter table public.drivers
  add constraint drivers_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(vehicle_id) on delete set null;

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_profile_status on public.users(profile_status);
create index if not exists idx_users_verification_level on public.users(verification_level);
create index if not exists idx_drivers_status on public.drivers(driver_status);
create index if not exists idx_vehicles_driver_id on public.vehicles(driver_id);
create index if not exists idx_trips_status_departure on public.trips(trip_status, departure_time);
create index if not exists idx_trips_route on public.trips(origin_city, destination_city);
create index if not exists idx_bookings_trip_id on public.bookings(trip_id);
create index if not exists idx_packages_trip_id on public.packages(trip_id);
create index if not exists idx_transactions_wallet_id_created_at on public.transactions(wallet_id, created_at desc);
create index if not exists idx_verification_records_user_id on public.verification_records(user_id, verification_timestamp desc);
create index if not exists idx_admin_logs_admin_id on public.admin_logs(admin_id, timestamp desc);

create or replace function public.create_wallet_for_user()
returns trigger
language plpgsql
as $$
begin
  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_users_create_wallet on public.users;
create trigger trg_users_create_wallet after insert on public.users
for each row execute function public.create_wallet_for_user();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at before update on public.wallets for each row execute function public.set_updated_at();
drop trigger if exists trg_trips_updated_at on public.trips;
create trigger trg_trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
drop trigger if exists trg_bookings_updated_at on public.bookings;
create trigger trg_bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists trg_packages_updated_at on public.packages;
create trigger trg_packages_updated_at before update on public.packages for each row execute function public.set_updated_at();
drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists trg_verification_records_updated_at on public.verification_records;
create trigger trg_verification_records_updated_at before update on public.verification_records for each row execute function public.set_updated_at();
drop trigger if exists trg_payment_methods_updated_at on public.payment_methods;
create trigger trg_payment_methods_updated_at before update on public.payment_methods for each row execute function public.set_updated_at();
drop trigger if exists trg_trip_presence_updated_at on public.trip_presence;
create trigger trg_trip_presence_updated_at before update on public.trip_presence for each row execute function public.set_updated_at();

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$ select id from public.users where auth_user_id = auth.uid() limit 1; $$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$ select role::text from public.users where auth_user_id = auth.uid() limit 1; $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$ select coalesce(public.current_user_role() = 'admin', false); $$;

create or replace function public.wallet_post_transaction(
  p_wallet_id uuid,
  p_amount numeric,
  p_transaction_type transaction_type_v2,
  p_payment_method payment_method_v2,
  p_direction text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_transaction_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  insert into public.transactions (
    wallet_id, amount, transaction_type, payment_method, transaction_status,
    direction, reference_type, reference_id, metadata
  )
  values (
    p_wallet_id, p_amount, p_transaction_type, p_payment_method, 'posted',
    p_direction, p_reference_type, p_reference_id, p_metadata
  )
  returning transaction_id into v_transaction_id;

  if p_direction = 'credit' then
    update public.wallets set balance = balance + p_amount where wallet_id = p_wallet_id;
  elsif p_direction = 'debit' then
    update public.wallets set balance = balance - p_amount
    where wallet_id = p_wallet_id and balance >= p_amount;
    if not found then
      raise exception 'Insufficient wallet balance';
    end if;
  else
    raise exception 'Unsupported direction %', p_direction;
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.app_add_wallet_funds(
  p_user_id uuid,
  p_amount numeric,
  p_payment_method payment_method_v2,
  p_external_reference text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_wallet_id uuid;
begin
  select wallet_id into v_wallet_id from public.wallets where user_id = p_user_id;
  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  return public.wallet_post_transaction(
    v_wallet_id, p_amount, 'add_funds', p_payment_method, 'credit',
    'wallet', v_wallet_id, jsonb_build_object('external_reference', p_external_reference)
  );
end;
$$;

create or replace function public.app_transfer_wallet_funds(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_payment_method payment_method_v2 default 'wallet_balance'
)
returns table (debit_transaction_id uuid, credit_transaction_id uuid)
language plpgsql
security definer
as $$
declare
  v_from_wallet uuid;
  v_to_wallet uuid;
begin
  select wallet_id into v_from_wallet from public.wallets where user_id = p_from_user_id;
  select wallet_id into v_to_wallet from public.wallets where user_id = p_to_user_id;

  if v_from_wallet is null or v_to_wallet is null then
    raise exception 'Source or destination wallet not found';
  end if;

  debit_transaction_id := public.wallet_post_transaction(
    v_from_wallet, p_amount, 'transfer_funds', p_payment_method, 'debit',
    'wallet', v_to_wallet, jsonb_build_object('to_user_id', p_to_user_id)
  );
  credit_transaction_id := public.wallet_post_transaction(
    v_to_wallet, p_amount, 'transfer_funds', p_payment_method, 'credit',
    'wallet', v_from_wallet, jsonb_build_object('from_user_id', p_from_user_id)
  );
  return next;
end;
$$;

create or replace function public.app_create_trip(
  p_driver_id uuid,
  p_origin_city text,
  p_destination_city text,
  p_departure_time timestamptz,
  p_available_seats integer,
  p_price_per_seat numeric,
  p_allow_packages boolean default false,
  p_package_capacity integer default 0
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_trip_id uuid;
begin
  if p_available_seats < 1 then
    raise exception 'Trip must have at least one seat';
  end if;

  insert into public.trips (
    driver_id, origin_city, destination_city, departure_time, available_seats,
    price_per_seat, trip_status, allow_packages, package_capacity, package_slots_remaining
  )
  values (
    p_driver_id, p_origin_city, p_destination_city, p_departure_time, p_available_seats,
    p_price_per_seat, 'open', p_allow_packages, p_package_capacity, p_package_capacity
  )
  returning trip_id into v_trip_id;

  insert into public.trip_presence (trip_id, driver_id) values (v_trip_id, p_driver_id);
  return v_trip_id;
end;
$$;

create or replace function public.app_book_trip(
  p_trip_id uuid,
  p_passenger_id uuid,
  p_seat_number integer,
  p_payment_method payment_method_v2 default 'wallet_balance'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_trip record;
  v_wallet_id uuid;
  v_booking_id uuid;
  v_transaction_id uuid;
  v_passenger_level verification_level_v2;
begin
  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  if v_trip.trip_status not in ('open', 'booked') then raise exception 'Trip is not open for booking'; end if;
  if v_trip.available_seats <= 0 then raise exception 'No seats available'; end if;

  select verification_level into v_passenger_level from public.users where id = p_passenger_id;
  if v_passenger_level is null or v_passenger_level = 'level_0' then
    raise exception 'Passenger must complete phone verification before booking';
  end if;

  select wallet_id into v_wallet_id from public.wallets where user_id = p_passenger_id;
  v_transaction_id := public.wallet_post_transaction(
    v_wallet_id, v_trip.price_per_seat, 'ride_payment', p_payment_method, 'debit',
    'trip', p_trip_id, jsonb_build_object('seat_number', p_seat_number)
  );

  insert into public.bookings (
    trip_id, passenger_id, seat_number, booking_status, amount, payment_transaction_id
  )
  values (
    p_trip_id, p_passenger_id, p_seat_number, 'confirmed', v_trip.price_per_seat, v_transaction_id
  )
  returning booking_id into v_booking_id;

  update public.trips
  set available_seats = available_seats - 1,
      trip_status = case when available_seats - 1 = 0 then 'booked' else trip_status end
  where trip_id = p_trip_id;

  return v_booking_id;
end;
$$;

create or replace function public.app_credit_driver_earnings(p_booking_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_booking record;
  v_driver_user_id uuid;
  v_driver_wallet_id uuid;
  v_transaction_id uuid;
begin
  select b.*, t.driver_id
  into v_booking
  from public.bookings b
  join public.trips t on t.trip_id = b.trip_id
  where b.booking_id = p_booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;

  select user_id into v_driver_user_id from public.drivers where driver_id = v_booking.driver_id;
  select wallet_id into v_driver_wallet_id from public.wallets where user_id = v_driver_user_id;

  v_transaction_id := public.wallet_post_transaction(
    v_driver_wallet_id, v_booking.amount, 'driver_earning', 'wallet_balance', 'credit',
    'booking', p_booking_id, jsonb_build_object('trip_id', v_booking.trip_id)
  );

  update public.bookings set booking_status = 'completed' where booking_id = p_booking_id;
  return v_transaction_id;
end;
$$;

create or replace function public.app_assign_package_to_trip(
  p_package_id uuid,
  p_trip_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_trip record;
  v_sender_wallet_id uuid;
  v_package_fee numeric;
  v_transaction_id uuid;
begin
  select * into v_trip from public.trips where trip_id = p_trip_id for update;
  if not found then raise exception 'Trip not found'; end if;
  if v_trip.allow_packages is false or v_trip.package_slots_remaining <= 0 then
    raise exception 'Trip does not accept packages';
  end if;

  select w.wallet_id, p.fee_amount
  into v_sender_wallet_id, v_package_fee
  from public.packages p
  join public.wallets w on w.user_id = p.sender_id
  where p.package_id = p_package_id;

  v_transaction_id := public.wallet_post_transaction(
    v_sender_wallet_id, v_package_fee, 'package_payment', 'wallet_balance', 'debit',
    'package', p_package_id, jsonb_build_object('trip_id', p_trip_id)
  );

  update public.packages
  set trip_id = p_trip_id,
      package_status = 'assigned',
      payment_transaction_id = v_transaction_id
  where package_id = p_package_id;

  update public.trips
  set package_slots_remaining = package_slots_remaining - 1
  where trip_id = p_trip_id;

  insert into public.package_events (package_id, event_type, event_status, notes)
  values (p_package_id, 'assignment', 'assigned', 'Package assigned to trip');

  return v_transaction_id;
end;
$$;

create or replace function public.app_confirm_package_delivery(
  p_package_id uuid,
  p_driver_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_package record;
  v_driver_wallet_id uuid;
  v_transaction_id uuid;
  v_driver_user_id uuid;
begin
  select * into v_package from public.packages where package_id = p_package_id;
  if not found then raise exception 'Package not found'; end if;

  select user_id into v_driver_user_id from public.drivers where driver_id = p_driver_id;
  select wallet_id into v_driver_wallet_id from public.wallets where user_id = v_driver_user_id;

  v_transaction_id := public.wallet_post_transaction(
    v_driver_wallet_id, v_package.fee_amount, 'driver_earning', 'wallet_balance', 'credit',
    'package', p_package_id, jsonb_build_object('trip_id', v_package.trip_id)
  );

  update public.packages
  set package_status = 'delivered',
      delivered_at = timezone('utc', now())
  where package_id = p_package_id;

  insert into public.package_events (package_id, event_type, event_status, notes, created_by)
  values (p_package_id, 'delivery', 'delivered', 'Package delivery confirmed', v_driver_user_id);

  return v_transaction_id;
end;
$$;

create or replace function public.app_submit_sanad_verification(
  p_user_id uuid,
  p_provider_reference text,
  p_document_reference text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_record_id uuid;
begin
  insert into public.verification_records (
    user_id, sanad_status, document_status, verification_level, provider_reference, document_reference
  )
  values (
    p_user_id, 'pending',
    case when p_document_reference is null then 'unverified' else 'pending' end,
    'level_1', p_provider_reference, p_document_reference
  )
  returning verification_id into v_record_id;

  update public.users set sanad_verified_status = 'pending' where id = p_user_id;
  return v_record_id;
end;
$$;

create or replace function public.app_complete_sanad_verification(
  p_user_id uuid,
  p_verified boolean,
  p_admin_id uuid default null,
  p_failure_reason text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_record_id uuid;
  v_level verification_level_v2;
begin
  v_level := case when p_verified then 'level_2' else 'level_0' end;

  update public.verification_records
  set sanad_status = case when p_verified then 'verified' else 'rejected' end,
      document_status = case when p_verified then 'verified' else document_status end,
      verification_level = v_level,
      verification_timestamp = timezone('utc', now()),
      reviewer_admin_id = p_admin_id,
      failure_reason = p_failure_reason
  where user_id = p_user_id
  returning verification_id into v_record_id;

  update public.users
  set sanad_verified_status = case when p_verified then 'verified' else 'rejected' end,
      verification_level = v_level,
      profile_status = case when p_verified then 'active' else profile_status end
  where id = p_user_id;

  return v_record_id;
end;
$$;

create or replace function public.app_approve_driver(
  p_driver_id uuid,
  p_admin_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_log_id uuid;
begin
  update public.drivers
  set driver_status = 'approved',
      verification_level = 'level_3',
      sanad_identity_linked = true
  where driver_id = p_driver_id
  returning user_id into v_user_id;

  update public.users
  set role = 'driver',
      verification_level = 'level_3',
      profile_status = 'active'
  where id = v_user_id;

  insert into public.admin_logs (admin_id, action, entity_type, entity_id, metadata)
  values (p_admin_id, 'approve_driver', 'driver', p_driver_id, jsonb_build_object('user_id', v_user_id))
  returning log_id into v_log_id;

  return v_log_id;
end;
$$;

alter table public.users enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.trips enable row level security;
alter table public.bookings enable row level security;
alter table public.packages enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.verification_records enable row level security;
alter table public.admin_logs enable row level security;
alter table public.otp_sessions enable row level security;
alter table public.payment_methods enable row level security;
alter table public.package_events enable row level security;
alter table public.trip_presence enable row level security;

drop policy if exists users_self_or_admin_select on public.users;
create policy users_self_or_admin_select on public.users
for select using (id = public.current_user_id() or public.is_admin());

drop policy if exists users_self_or_admin_update on public.users;
create policy users_self_or_admin_update on public.users
for update using (id = public.current_user_id() or public.is_admin());

drop policy if exists drivers_self_or_admin_select on public.drivers;
create policy drivers_self_or_admin_select on public.drivers
for select using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists drivers_self_or_admin_update on public.drivers;
create policy drivers_self_or_admin_update on public.drivers
for update using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists vehicles_driver_or_admin_access on public.vehicles;
create policy vehicles_driver_or_admin_access on public.vehicles
for all using (
  exists (
    select 1 from public.drivers d
    where d.driver_id = vehicles.driver_id
      and (d.user_id = public.current_user_id() or public.is_admin())
  )
);

drop policy if exists trips_public_open_select on public.trips;
create policy trips_public_open_select on public.trips
for select using (
  trip_status in ('open', 'booked', 'in_progress')
  or public.is_admin()
  or exists (select 1 from public.drivers d where d.driver_id = trips.driver_id and d.user_id = public.current_user_id())
);

drop policy if exists trips_driver_or_admin_write on public.trips;
create policy trips_driver_or_admin_write on public.trips
for all using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.driver_id = trips.driver_id and d.user_id = public.current_user_id())
);

drop policy if exists bookings_owner_driver_admin_access on public.bookings;
create policy bookings_owner_driver_admin_access on public.bookings
for all using (
  passenger_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = bookings.trip_id
      and d.user_id = public.current_user_id()
  )
);

drop policy if exists packages_sender_driver_admin_access on public.packages;
create policy packages_sender_driver_admin_access on public.packages
for all using (
  sender_id = public.current_user_id()
  or receiver_id = public.current_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = packages.trip_id
      and d.user_id = public.current_user_id()
  )
);

drop policy if exists wallets_owner_admin_access on public.wallets;
create policy wallets_owner_admin_access on public.wallets
for select using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists transactions_owner_admin_access on public.transactions;
create policy transactions_owner_admin_access on public.transactions
for select using (
  public.is_admin()
  or exists (
    select 1 from public.wallets w
    where w.wallet_id = transactions.wallet_id
      and w.user_id = public.current_user_id()
  )
);

drop policy if exists verification_self_admin_access on public.verification_records;
create policy verification_self_admin_access on public.verification_records
for all using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists admin_logs_admin_only on public.admin_logs;
create policy admin_logs_admin_only on public.admin_logs
for all using (public.is_admin());

drop policy if exists otp_owner_admin_access on public.otp_sessions;
create policy otp_owner_admin_access on public.otp_sessions
for select using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists payment_methods_owner_admin_access on public.payment_methods;
create policy payment_methods_owner_admin_access on public.payment_methods
for all using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists package_events_access on public.package_events;
create policy package_events_access on public.package_events
for select using (
  public.is_admin()
  or exists (
    select 1 from public.packages p
    where p.package_id = package_events.package_id
      and (p.sender_id = public.current_user_id() or p.receiver_id = public.current_user_id())
  )
);

drop policy if exists trip_presence_driver_admin_access on public.trip_presence;
create policy trip_presence_driver_admin_access on public.trip_presence
for all using (
  public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.driver_id = trip_presence.driver_id
      and d.user_id = public.current_user_id()
  )
);
