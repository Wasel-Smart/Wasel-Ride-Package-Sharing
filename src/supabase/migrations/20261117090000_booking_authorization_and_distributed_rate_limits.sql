-- Booking authorization and distributed rate-limit hardening.
-- This migration is intentionally additive; never edit historical migrations.
begin;

create or replace function public.app_create_booking_request(
  p_trip_id uuid,
  p_seats_requested integer default 1,
  p_pickup_location text default null,
  p_dropoff_location text default null,
  p_runtime_status text default 'pending_driver',
  p_total_price numeric default null,
  p_seat_number integer default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_phone_verified_at timestamptz;
  v_wallet_status text;
  v_driver_user_id uuid;
  v_driver_status text;
  v_trip public.trips%rowtype;
  v_existing public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_requested_seats integer := coalesce(p_seats_requested, 1);
  v_seat_number integer;
  v_total_price numeric(14,2);
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to create bookings';
  end if;

  if not public.app_consume_user_rate_limit('booking_create') then
    raise exception 'Too many booking requests. Please try again shortly';
  end if;

  -- Enforce the same account eligibility rules at the database boundary;
  -- callers cannot bypass the UI or Edge API by invoking this RPC directly.
  select u.phone_verified_at, coalesce(w.wallet_status::text, 'active')
  into v_phone_verified_at, v_wallet_status
  from public.users u
  left join public.wallets w on w.user_id = u.id
  where u.id = v_actor_user_id;

  if not found then
    raise exception 'A canonical user profile is required to create bookings';
  end if;
  if v_phone_verified_at is null then
    raise exception 'Booking requires a verified phone number';
  end if;
  if v_wallet_status = 'frozen' then
    raise exception 'Wallet standing needs review before booking';
  end if;

  if v_requested_seats < 1 or v_requested_seats > 8 then
    raise exception 'Requested seat count is outside the allowed range';
  end if;

  -- A passenger can request a booking, never approve or confirm it.
  if lower(trim(coalesce(p_runtime_status, 'pending_driver'))) <> 'pending_driver' then
    raise exception 'Passengers may only create pending booking requests';
  end if;

  select * into v_trip
  from public.trips
  where trip_id = p_trip_id
  for update;

  if not found then raise exception 'Trip not found'; end if;
  if coalesce(v_trip.trip_status::text, '') not in ('open', 'booked') then
    raise exception 'Trip is not open for booking';
  end if;
  if v_trip.departure_time is null or v_trip.departure_time <= now() then
    raise exception 'Trip departure time has already passed';
  end if;
  if coalesce(v_trip.available_seats, 0) < v_requested_seats then
    raise exception 'Not enough seats available';
  end if;
  if v_trip.price_per_seat is null or v_trip.price_per_seat <= 0 then
    raise exception 'Trip fare is invalid';
  end if;

  select user_id, driver_status::text
  into v_driver_user_id, v_driver_status
  from public.drivers
  where driver_id = v_trip.driver_id;
  if v_driver_user_id is null then
    raise exception 'Trip driver profile was not found';
  end if;
  if lower(trim(coalesce(v_driver_status, ''))) not in ('approved', 'online', 'offline', 'busy') then
    raise exception 'Trip driver is not approved to provide rides';
  end if;
  if v_driver_user_id = v_actor_user_id then
    raise exception 'Drivers cannot book their own trips';
  end if;

  select * into v_existing
  from public.bookings
  where trip_id = p_trip_id
    and passenger_id = v_actor_user_id
    and (
      coalesce(status, '') = 'pending_driver'
      or booking_status in ('pending_payment', 'confirmed', 'checked_in')
    )
  order by created_at desc
  limit 1
  for update;

  if v_existing.booking_id is not null then
    return v_existing;
  end if;

  -- Seat identifiers are assigned by the database; callers cannot select
  -- arbitrary or duplicate seat numbers through this privileged function.
  select coalesce(max(seat_number), 0) + 1
  into v_seat_number
  from public.bookings
  where trip_id = p_trip_id
    and booking_status <> 'cancelled';

  -- Never trust client-supplied price. Use the locked trip's canonical fare.
  v_total_price := round(v_trip.price_per_seat * v_requested_seats, 2);
  if v_total_price <= 0 then
    raise exception 'Trip fare is invalid';
  end if;

  insert into public.bookings (
    trip_id, passenger_id, seat_number, booking_status, amount, status,
    confirmed_by_driver, seats_requested, seats_booked, pickup_location,
    dropoff_location, price_per_seat, total_price
  )
  values (
    p_trip_id, v_actor_user_id, v_seat_number, 'pending_payment', v_total_price,
    'pending_driver', false, v_requested_seats, v_requested_seats,
    nullif(trim(coalesce(p_pickup_location, '')), ''),
    nullif(trim(coalesce(p_dropoff_location, '')), ''),
    v_trip.price_per_seat, v_total_price
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

create or replace function public.app_update_booking_runtime_status(
  p_booking_id uuid,
  p_runtime_status text
)
returns public.bookings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_booking public.bookings%rowtype;
  v_trip public.trips%rowtype;
  v_driver_user_id uuid;
  v_is_admin boolean;
  v_is_passenger boolean;
  v_is_driver boolean;
  v_requested_seats integer;
  v_current_status text;
  v_next_status text := lower(trim(coalesce(p_runtime_status, '')));
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to update bookings';
  end if;
  if not public.app_consume_user_rate_limit('booking_update') then
    raise exception 'Too many booking updates. Please try again shortly';
  end if;
  if v_next_status not in ('confirmed', 'rejected', 'cancelled') then
    raise exception 'Unsupported booking runtime status';
  end if;

  select * into v_booking
  from public.bookings
  where booking_id = p_booking_id
  for update;
  if not found then raise exception 'Booking not found'; end if;

  select * into v_trip
  from public.trips
  where trip_id = v_booking.trip_id
  for update;
  if not found then raise exception 'Trip not found for booking'; end if;

  select user_id into v_driver_user_id
  from public.drivers
  where driver_id = v_trip.driver_id;

  v_is_admin := coalesce(public.is_admin(), false);
  v_is_passenger := v_actor_user_id = v_booking.passenger_id;
  v_is_driver := v_actor_user_id = v_driver_user_id;

  if not v_is_admin and not v_is_passenger and not v_is_driver then
    raise exception 'Not authorized to update this booking';
  end if;

  v_current_status := coalesce(
    nullif(trim(coalesce(v_booking.status, '')), ''),
    case when v_booking.booking_status = 'pending_payment'
      then 'pending_driver' else v_booking.booking_status::text end
  );
  if v_current_status = v_next_status then return v_booking; end if;

  if v_current_status = 'pending_driver' then
    if v_next_status in ('confirmed', 'rejected') and not (v_is_driver or v_is_admin) then
      raise exception 'Only the assigned driver or an administrator may confirm or reject';
    end if;
    if v_next_status = 'cancelled' and not (v_is_passenger or v_is_admin) then
      raise exception 'Only the passenger or an administrator may cancel this request';
    end if;
  elsif v_current_status = 'confirmed' then
    if v_next_status <> 'cancelled' then
      raise exception 'Confirmed bookings may only be cancelled';
    end if;
    if not (v_is_passenger or v_is_admin) then
      raise exception 'Only the passenger or an administrator may cancel this booking';
    end if;
  else
    raise exception 'Booking status does not permit this transition';
  end if;

  v_requested_seats := greatest(1, coalesce(v_booking.seats_requested, v_booking.seats_booked, 1));

  if v_current_status = 'pending_driver' and v_next_status = 'confirmed' then
    if v_trip.available_seats < v_requested_seats then
      raise exception 'Not enough seats available';
    end if;
    update public.trips
    set available_seats = available_seats - v_requested_seats,
        trip_status = case when available_seats - v_requested_seats <= 0 then 'booked' else trip_status end
    where trip_id = v_trip.trip_id;
  elsif v_current_status = 'confirmed' and v_next_status = 'cancelled' then
    update public.trips
    set available_seats = available_seats + v_requested_seats,
        trip_status = case
          when trip_status = 'booked' and available_seats + v_requested_seats > 0 then 'open'
          else trip_status
        end
    where trip_id = v_trip.trip_id;
  end if;

  update public.bookings
  set booking_status = case when v_next_status = 'confirmed' then 'confirmed' else 'cancelled' end,
      status = v_next_status,
      confirmed_by_driver = v_next_status = 'confirmed'
  where booking_id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.app_create_booking_request(uuid, integer, text, text, text, numeric, integer)
  from public, anon, authenticated;
grant execute on function public.app_create_booking_request(uuid, integer, text, text, text, numeric, integer)
  to authenticated;
revoke execute on function public.app_update_booking_runtime_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.app_update_booking_runtime_status(uuid, text)
  to authenticated;

-- Shared fixed-window counters. No client role receives direct table access.
create table if not exists public.edge_rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  expires_at timestamptz not null
);
create index if not exists edge_rate_limit_buckets_expiry_idx
  on public.edge_rate_limit_buckets (expires_at);
alter table public.edge_rate_limit_buckets enable row level security;
revoke all on table public.edge_rate_limit_buckets from public, anon, authenticated;

create or replace function public.consume_edge_rate_limit(
  p_bucket_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_window_started timestamptz;
begin
  if p_bucket_key is null or length(p_bucket_key) < 1 or length(p_bucket_key) > 512
    or p_max_requests is null or p_max_requests < 1 or p_max_requests > 10000
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  -- Bounded opportunistic cleanup prevents the shared bucket table growing forever
  -- when a scheduled pg_cron job is not configured on the target project.
  if get_byte(decode(substr(md5(p_bucket_key), 1, 2), 'hex'), 0) < 4 then
    with expired as (
      select bucket_key
      from public.edge_rate_limit_buckets
      where expires_at < v_now
      order by expires_at
      limit 500
    )
    delete from public.edge_rate_limit_buckets b
    using expired e
    where b.bucket_key = e.bucket_key;
  end if;

  insert into public.edge_rate_limit_buckets(bucket_key, window_started_at, request_count, expires_at)
  values (p_bucket_key, v_now, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket_key) do update
    set window_started_at = case
          when public.edge_rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
            then v_now else public.edge_rate_limit_buckets.window_started_at end,
        request_count = case
          when public.edge_rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
            then 1 else public.edge_rate_limit_buckets.request_count + 1 end,
        expires_at = case
          when public.edge_rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now
            then v_now + make_interval(secs => p_window_seconds)
          else public.edge_rate_limit_buckets.expires_at end
  returning request_count, window_started_at into v_count, v_window_started;

  return v_count <= p_max_requests;
end;
$$;

revoke execute on function public.consume_edge_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.app_consume_user_rate_limit(p_scope text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $
declare
  v_auth_user_id uuid := auth.uid();
  v_max_requests integer;
  v_window_seconds integer := 60;
begin
  if v_auth_user_id is null then
    raise exception 'Authentication required for user rate limits';
  end if;

  case p_scope
    when 'booking_create' then v_max_requests := 8;
    when 'booking_update' then v_max_requests := 30;
    else raise exception 'Unsupported user rate-limit scope';
  end case;

  return public.consume_edge_rate_limit(
    'user:' || v_auth_user_id::text || ':' || p_scope,
    v_max_requests,
    v_window_seconds
  );
end;
$;

revoke execute on function public.app_consume_user_rate_limit(text)
  from public, anon, authenticated;
grant execute on function public.app_consume_user_rate_limit(text)
  to authenticated;

create or replace function public.cleanup_edge_rate_limit_buckets(p_limit integer default 5000)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_deleted integer;
begin
  with expired as (
    select bucket_key from public.edge_rate_limit_buckets
    where expires_at < clock_timestamp()
    order by expires_at
    limit greatest(1, least(coalesce(p_limit, 5000), 20000))
  )
  delete from public.edge_rate_limit_buckets b
  using expired e
  where b.bucket_key = e.bucket_key;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.cleanup_edge_rate_limit_buckets(integer)
  from public, anon, authenticated;
grant execute on function public.cleanup_edge_rate_limit_buckets(integer)
  to service_role;

commit;
