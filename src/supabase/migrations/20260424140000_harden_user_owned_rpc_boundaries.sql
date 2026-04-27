-- Harden user-facing RPC ownership checks and move direct booking fallback
-- onto atomic database functions.

create or replace function public.current_driver_id()
returns uuid
language sql
stable
set search_path = public, pg_temp
as $$
  select driver_id
  from public.drivers
  where user_id = public.current_user_id()
  limit 1;
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
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_wallet_id uuid;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to add wallet funds';
  end if;

  if not public.is_admin() and p_user_id <> v_actor_user_id then
    raise exception 'Cannot add funds to another user wallet';
  end if;

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
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_from_wallet uuid;
  v_to_wallet uuid;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to transfer wallet funds';
  end if;

  if not public.is_admin() and p_from_user_id <> v_actor_user_id then
    raise exception 'Cannot transfer funds from another user wallet';
  end if;

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
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_driver_id uuid;
  v_trip_id uuid;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to create trips';
  end if;

  if not public.is_admin() then
    v_driver_id := public.current_driver_id();
    if v_driver_id is null then
      raise exception 'Driver profile is not provisioned for this account';
    end if;
    if p_driver_id <> v_driver_id then
      raise exception 'Cannot create trips for another driver';
    end if;
  end if;

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
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_trip record;
  v_wallet_id uuid;
  v_booking_id uuid;
  v_transaction_id uuid;
  v_passenger_level verification_level_v2;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to book a trip';
  end if;

  if not public.is_admin() and p_passenger_id <> v_actor_user_id then
    raise exception 'Cannot create bookings for another passenger';
  end if;

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

create or replace function public.app_assign_package_to_trip(
  p_package_id uuid,
  p_trip_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_sender_user_id uuid;
  v_trip record;
  v_sender_wallet_id uuid;
  v_package_fee numeric;
  v_transaction_id uuid;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to assign packages';
  end if;

  select sender_id into v_sender_user_id
  from public.packages
  where package_id = p_package_id;

  if v_sender_user_id is null then
    raise exception 'Package not found';
  end if;

  if not public.is_admin() and v_sender_user_id <> v_actor_user_id then
    raise exception 'Cannot assign packages for another sender';
  end if;

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

create or replace function public.app_submit_sanad_verification(
  p_user_id uuid,
  p_provider_reference text,
  p_document_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_user_id uuid;
  v_record_id uuid;
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to submit verification';
  end if;

  if not public.is_admin() and p_user_id <> v_actor_user_id then
    raise exception 'Cannot submit verification for another user';
  end if;

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

create or replace function public.app_create_booking_request(
  p_trip_id uuid,
  p_seats_requested integer default 1,
  p_pickup_location text default null,
  p_dropoff_location text default null,
  p_runtime_status text default 'confirmed',
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
  v_trip public.trips%rowtype;
  v_existing public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_requested_seats integer := greatest(1, coalesce(p_seats_requested, 1));
  v_runtime_status text := lower(trim(coalesce(p_runtime_status, 'confirmed')));
  v_seat_number integer;
  v_total_price numeric(14,2);
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to create bookings';
  end if;

  if v_runtime_status not in ('pending_driver', 'confirmed') then
    raise exception 'Unsupported booking runtime status: %', v_runtime_status;
  end if;

  select *
  into v_trip
  from public.trips
  where trip_id = p_trip_id
  for update;

  if not found then
    raise exception 'Trip not found';
  end if;

  if v_trip.trip_status not in ('open', 'booked', 'in_progress') then
    raise exception 'Trip is not open for booking';
  end if;

  if v_trip.available_seats < v_requested_seats then
    raise exception 'Not enough seats available';
  end if;

  select *
  into v_existing
  from public.bookings
  where trip_id = p_trip_id
    and passenger_id = v_actor_user_id
    and (
      coalesce(status, '') = 'pending_driver'
      or booking_status in ('pending_payment', 'confirmed', 'checked_in')
    )
  order by created_at desc
  limit 1;

  if v_existing.booking_id is not null then
    return v_existing;
  end if;

  if p_seat_number is not null and p_seat_number > 0 then
    v_seat_number := p_seat_number;
  else
    select coalesce(max(seat_number), 0) + 1
    into v_seat_number
    from public.bookings
    where trip_id = p_trip_id
      and booking_status <> 'cancelled';
  end if;

  v_total_price := coalesce(p_total_price, v_trip.price_per_seat * v_requested_seats);
  if v_total_price < 0 then
    raise exception 'Booking total price cannot be negative';
  end if;

  insert into public.bookings (
    trip_id,
    passenger_id,
    seat_number,
    booking_status,
    amount,
    status,
    confirmed_by_driver,
    seats_requested,
    seats_booked,
    pickup_location,
    dropoff_location,
    price_per_seat,
    total_price
  )
  values (
    p_trip_id,
    v_actor_user_id,
    v_seat_number,
    case when v_runtime_status = 'pending_driver' then 'pending_payment' else 'confirmed' end,
    v_total_price,
    v_runtime_status,
    v_runtime_status = 'confirmed',
    v_requested_seats,
    v_requested_seats,
    nullif(trim(coalesce(p_pickup_location, '')), ''),
    nullif(trim(coalesce(p_dropoff_location, '')), ''),
    v_trip.price_per_seat,
    v_total_price
  )
  returning *
  into v_booking;

  if v_runtime_status = 'confirmed' then
    update public.trips
    set
      available_seats = available_seats - v_requested_seats,
      trip_status = case when available_seats - v_requested_seats <= 0 then 'booked' else trip_status end
    where trip_id = p_trip_id;
  end if;

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
  v_requested_seats integer;
  v_current_runtime_status text;
  v_next_runtime_status text := lower(trim(coalesce(p_runtime_status, '')));
begin
  v_actor_user_id := public.current_user_id();
  if v_actor_user_id is null then
    raise exception 'Authentication required to update bookings';
  end if;

  if v_next_runtime_status not in ('confirmed', 'rejected', 'cancelled') then
    raise exception 'Unsupported booking runtime status: %', v_next_runtime_status;
  end if;

  select *
  into v_booking
  from public.bookings
  where booking_id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  select *
  into v_trip
  from public.trips
  where trip_id = v_booking.trip_id
  for update;

  if not found then
    raise exception 'Trip not found for booking';
  end if;

  select user_id
  into v_driver_user_id
  from public.drivers
  where driver_id = v_trip.driver_id;

  if not public.is_admin()
    and v_actor_user_id <> v_booking.passenger_id
    and v_actor_user_id <> v_driver_user_id then
    raise exception 'Cannot update another user''s booking';
  end if;

  v_requested_seats := greatest(1, coalesce(v_booking.seats_requested, v_booking.seats_booked, 1));
  v_current_runtime_status := coalesce(
    nullif(trim(coalesce(v_booking.status, '')), ''),
    case
      when v_booking.booking_status = 'pending_payment' then 'pending_driver'
      else v_booking.booking_status::text
    end
  );

  if v_current_runtime_status = v_next_runtime_status then
    return v_booking;
  end if;

  if v_current_runtime_status = 'pending_driver' and v_next_runtime_status = 'confirmed' then
    if v_trip.available_seats < v_requested_seats then
      raise exception 'Not enough seats available';
    end if;

    update public.trips
    set
      available_seats = available_seats - v_requested_seats,
      trip_status = case when available_seats - v_requested_seats <= 0 then 'booked' else trip_status end
    where trip_id = v_trip.trip_id;
  elsif v_current_runtime_status = 'confirmed' and v_next_runtime_status in ('cancelled', 'rejected') then
    update public.trips
    set
      available_seats = available_seats + v_requested_seats,
      trip_status = case when trip_status = 'cancelled' then trip_status else 'open' end
    where trip_id = v_trip.trip_id;
  end if;

  update public.bookings
  set
    booking_status = case when v_next_runtime_status = 'confirmed' then 'confirmed' else 'cancelled' end,
    status = v_next_runtime_status,
    confirmed_by_driver = v_next_runtime_status = 'confirmed'
  where booking_id = p_booking_id
  returning *
  into v_booking;

  return v_booking;
end;
$$;

revoke execute on function public.app_create_booking_request(
  uuid, integer, text, text, text, numeric, integer
) from public, anon, authenticated;

grant execute on function public.app_create_booking_request(
  uuid, integer, text, text, text, numeric, integer
) to authenticated;

revoke execute on function public.app_update_booking_runtime_status(
  uuid, text
) from public, anon, authenticated;

grant execute on function public.app_update_booking_runtime_status(
  uuid, text
) to authenticated;
