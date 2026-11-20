-- Server-authoritative package custody and escrow gates.
-- Funds remain in the existing double-entry wallet escrow ledger
-- (public.escrow_accounts); this migration does not create a second ledger.

begin;

alter table public.packages
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists sender_code_shared_at timestamptz,
  add column if not exists assignment_expires_at timestamptz,
  add column if not exists pickup_verified_at timestamptz,
  add column if not exists delivery_verified_at timestamptz,
  add column if not exists delivery_evidence_url text,
  add column if not exists dispute_opened_at timestamptz;

alter table public.packages
  drop constraint if exists packages_payment_status_check;

alter table public.packages
  add constraint packages_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'held', 'released', 'refunded', 'failed', 'disputed'));

-- Handoff hashes are kept outside the exposed public schema. Plain OTPs are
-- returned only at creation/rotation and are never stored in the database.
create schema if not exists private;

-- Private delivery evidence bucket. Signed upload URLs are minted only by the
-- authenticated Edge Function after checking the assigned driver.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'package-evidence',
  'package-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists private.package_handoff_secrets (
  package_id uuid primary key references public.packages(package_id) on delete cascade,
  pickup_code_hash text not null,
  delivery_code_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  pickup_verified_at timestamptz,
  delivery_verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on private.package_handoff_secrets from public, anon, authenticated;
grant all on private.package_handoff_secrets to service_role;

-- Release stale un-paid package reservations back to the driver's trip.
create or replace function public.app_expire_unpaid_package_assignments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package record;
  v_expired integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'Service role or scheduled database job required' using errcode = '42501';
  end if;

  for v_package in
    select package_id, trip_id
    from public.packages
    where package_status = 'assigned'
      and payment_status in ('unpaid', 'failed')
      and assignment_expires_at is not null
      and assignment_expires_at <= timezone('utc', now())
      and pickup_verified_at is null
    for update skip locked
  loop
    update public.packages
    set trip_id = null,
        package_status = 'created',
        status = 'searching',
        payment_status = 'unpaid',
        assignment_expires_at = null,
        updated_at = timezone('utc', now())
    where package_id = v_package.package_id;

    update public.trips
    set package_slots_remaining = least(package_capacity, package_slots_remaining + 1),
        updated_at = timezone('utc', now())
    where trip_id = v_package.trip_id;

    insert into public.package_events (package_id, event_type, event_status, notes)
    values (v_package.package_id, 'assignment_expired', 'searching', 'Unpaid package reservation expired and capacity was returned.');

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

revoke all on function public.app_expire_unpaid_package_assignments() from public, anon, authenticated;
grant execute on function public.app_expire_unpaid_package_assignments() to service_role;

-- Schedule reservation cleanup and expired payment reconciliation when the
-- Supabase pg_cron/pg_net extensions and app settings are available.
do $wasel$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
  end if;

  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_net';
  end if;

  if to_regclass('cron.job') is not null
    and to_regprocedure('cron.schedule(text,text,text)') is not null then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''wasel-package-reservation-expiry''';
    execute 'select cron.schedule(''wasel-package-reservation-expiry'', ''*/5 * * * *'', ''select public.app_expire_unpaid_package_assignments();'')';

    if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null
      and to_regclass('vault.decrypted_secrets') is not null then
      declare
        v_has_project_url boolean := false;
        v_has_service_role_key boolean := false;
      begin
        execute 'select exists (select 1 from vault.decrypted_secrets where name = ''wasel_project_url'')'
          into v_has_project_url;
        execute 'select exists (select 1 from vault.decrypted_secrets where name = ''wasel_service_role_key'')'
          into v_has_service_role_key;

        if v_has_project_url and v_has_service_role_key then
          execute 'select cron.unschedule(jobid) from cron.job where jobname = ''wasel-package-payment-reconciliation''';
          execute $schedule$
            select cron.schedule(
              'wasel-package-payment-reconciliation',
              '*/5 * * * *',
              $command$
                select net.http_post(
                  url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'wasel_project_url'), '/') || '/functions/v1/make-server-0b1f4071/wallet/reconcile-expired',
                  headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'wasel_service_role_key')
                  ),
                  body := '{}'::jsonb
                );
              $command$
            )
          $schedule$;
        end if;
      end;
    end if;
  end if;
end;
$wasel$;

-- A payment intent can back only one escrow account. This closes the duplicate
-- webhook race in the existing wallet ledger.
create unique index if not exists escrow_accounts_payment_intent_uidx
  on public.escrow_accounts(payment_intent_id)
  where payment_intent_id is not null;

alter table public.package_events enable row level security;

drop policy if exists package_events_access on public.package_events;
create policy package_events_access on public.package_events
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.packages p
    where p.package_id = package_events.package_id
      and (
        p.sender_id = public.current_user_id()
        or p.receiver_id = public.current_user_id()
        or exists (
          select 1
          from public.trips t
          join public.drivers d on d.driver_id = t.driver_id
          where t.trip_id = p.trip_id
            and d.user_id = public.current_user_id()
        )
      )
  )
);

drop policy if exists package_events_driver_admin_insert on public.package_events;
revoke insert, update, delete on public.package_events from anon, authenticated;
grant select on public.package_events to authenticated;
grant all on public.package_events to service_role;

-- Match waiting package requests when a new eligible trip is published.
create or replace function public.app_match_waiting_packages_to_trip(p_trip_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trip public.trips%rowtype;
  v_package record;
  v_matched integer := 0;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  perform public.app_expire_unpaid_package_assignments();

  select * into v_trip
  from public.trips
  where trip_id = p_trip_id
  for update;

  if not found
    or v_trip.trip_status <> 'open'
    or not coalesce(v_trip.allow_packages, false)
    or coalesce(v_trip.package_slots_remaining, 0) < 1
    or v_trip.departure_time < timezone('utc', now()) + interval '24 hours'
    or not exists (
      select 1
      from public.drivers d
      where d.driver_id = v_trip.driver_id
        and d.driver_status in ('approved', 'online', 'offline', 'busy')
    )
  then
    return 0;
  end if;

  for v_package in
    select package_id, sender_id
    from public.packages
    where package_status = 'created'
      and status = 'searching'
      and payment_status = 'unpaid'
      and trip_id is null
      and lower(trim(origin_name)) = lower(trim(v_trip.origin_city))
      and lower(trim(destination_name)) = lower(trim(v_trip.destination_city))
    order by created_at asc
    for update skip locked
  loop
    exit when v_trip.package_slots_remaining < 1;

    update public.packages
    set trip_id = p_trip_id,
        package_status = 'assigned',
        status = 'matched',
        assignment_expires_at = timezone('utc', now()) + interval '15 minutes',
        updated_at = timezone('utc', now())
    where package_id = v_package.package_id
      and package_status = 'created'
      and trip_id is null
      and payment_status = 'unpaid';

    if found then
      update public.trips
      set package_slots_remaining = package_slots_remaining - 1,
          updated_at = timezone('utc', now())
      where trip_id = p_trip_id
        and package_slots_remaining > 0;

      if not found then
        update public.packages
        set trip_id = null,
            package_status = 'created',
            status = 'searching',
            assignment_expires_at = null,
            updated_at = timezone('utc', now())
        where package_id = v_package.package_id;
        exit;
      end if;

      v_trip.package_slots_remaining := v_trip.package_slots_remaining - 1;

      insert into public.package_events (package_id, event_type, event_status, notes)
      values (
        v_package.package_id,
        'assigned',
        'assigned',
        'Package automatically matched to an eligible trip.'
      );

      v_matched := v_matched + 1;
    end if;
  end loop;

  return v_matched;
end;
$$;

revoke all on function public.app_match_waiting_packages_to_trip(uuid) from public, anon, authenticated;
grant execute on function public.app_match_waiting_packages_to_trip(uuid) to service_role;

-- Package creation, assignment, custody state and payment state must go
-- through the authenticated server API. Browser clients cannot forge them.
create or replace function public.guard_package_client_mutations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
    and coalesce(current_setting('wasel.package_rpc', true), 'off') <> 'on' then
    raise exception 'Package mutations must use the authenticated server API'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_package_client_mutations on public.packages;
create trigger trg_guard_package_client_mutations
before insert or update on public.packages
for each row execute function public.guard_package_client_mutations();
revoke all on function public.guard_package_client_mutations() from public, anon, authenticated;

-- A dispute freezes held package funds in the existing ledger by moving its
-- escrow state to cancelled. Refund is then handled by the wallet refund flow.
create or replace function public.open_package_dispute(p_package_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package public.packages%rowtype;
  v_actor uuid := public.current_user_id();
  v_is_driver boolean;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated'
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    or auth.uid() is null
    or v_actor is null then
    raise exception 'Authenticated user required' using errcode = '42501';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;

  if not found then
    raise exception 'Package not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = v_package.trip_id
      and d.user_id = v_actor
  ) into v_is_driver;

  if v_actor <> v_package.sender_id
    and (v_package.receiver_id is null or v_actor <> v_package.receiver_id)
    and not v_is_driver
    and not public.is_admin()
  then
    raise exception 'Not a package participant' using errcode = '42501';
  end if;

  if v_package.package_status in ('delivered', 'cancelled') then
    raise exception 'A closed package cannot be disputed' using errcode = '23514';
  end if;

  if v_package.package_status = 'disputed' then
    return;
  end if;

  perform set_config('wasel.package_rpc', 'on', true);

  update public.packages
  set package_status = 'disputed',
      status = 'disputed',
      payment_status = case when payment_status in ('held', 'pending') then 'disputed' else payment_status end,
      dispute_opened_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  update public.escrow_accounts
  set escrow_state = 'cancelled',
      updated_at = timezone('utc', now()),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('disputeOpenedAt', timezone('utc', now()))
  where escrow_type = 'package'
    and reference_id = p_package_id::text
    and escrow_state = 'held';

  insert into public.package_events (package_id, event_type, event_status, notes, created_by)
  values (p_package_id, 'dispute_opened', 'disputed', left(coalesce(p_reason, 'Dispute opened'), 500), v_actor);
end;
$$;

revoke all on function public.open_package_dispute(uuid, text) from public, anon;
grant execute on function public.open_package_dispute(uuid, text) to authenticated;

-- Private evidence storage. Uploads are issued through server-created signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'package-evidence',
  'package-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Private-schema writes are exposed only through service-role RPCs because the
-- private schema is intentionally not exposed through PostgREST.
create or replace function public.app_store_package_handoff_secrets(
  p_package_id uuid,
  p_pickup_code_hash text,
  p_delivery_code_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if length(coalesce(p_pickup_code_hash, '')) <> 64
    or length(coalesce(p_delivery_code_hash, '')) <> 64 then
    raise exception 'Invalid package OTP hash' using errcode = '22023';
  end if;

  insert into private.package_handoff_secrets (
    package_id, pickup_code_hash, delivery_code_hash, created_at, updated_at
  ) values (
    p_package_id, p_pickup_code_hash, p_delivery_code_hash,
    timezone('utc', now()), timezone('utc', now())
  );
end;
$$;

create or replace function public.app_rotate_package_handoff_secrets(
  p_package_id uuid,
  p_pickup_code_hash text,
  p_delivery_code_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if (p_pickup_code_hash is not null and length(p_pickup_code_hash) <> 64)
    or length(coalesce(p_delivery_code_hash, '')) <> 64 then
    raise exception 'Invalid package OTP hash' using errcode = '22023';
  end if;

  update private.package_handoff_secrets
  set pickup_code_hash = coalesce(p_pickup_code_hash, pickup_code_hash),
      delivery_code_hash = p_delivery_code_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  if not found then
    raise exception 'Package handoff secrets not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.app_store_package_handoff_secrets(uuid, text, text) from public, anon, authenticated;
revoke all on function public.app_rotate_package_handoff_secrets(uuid, text, text) from public, anon, authenticated;
grant execute on function public.app_store_package_handoff_secrets(uuid, text, text) to service_role;
grant execute on function public.app_rotate_package_handoff_secrets(uuid, text, text) to service_role;

create or replace function public.app_verify_package_pickup(
  p_package_id uuid,
  p_driver_user_id uuid,
  p_code_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package public.packages%rowtype;
  v_secret private.package_handoff_secrets%rowtype;
  v_is_driver boolean;
  v_attempts integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;
  if not found then raise exception 'Package not found' using errcode = 'P0002'; end if;

  select exists (
    select 1 from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = v_package.trip_id and d.user_id = p_driver_user_id
  ) into v_is_driver;

  if not v_is_driver then raise exception 'Only the assigned driver can verify pickup' using errcode = '42501'; end if;
  if v_package.package_status <> 'assigned'
    or v_package.payment_status <> 'held'
    or v_package.sender_code_shared_at is null
    or v_package.dispute_opened_at is not null then
    raise exception 'Package is not eligible for pickup verification' using errcode = '23514';
  end if;

  select * into v_secret
  from private.package_handoff_secrets
  where package_id = p_package_id
  for update;
  if not found then raise exception 'Package handoff secret not found' using errcode = 'P0002'; end if;
  if v_secret.locked_until is not null and v_secret.locked_until > now() then return false; end if;

  if v_secret.pickup_code_hash <> p_code_hash then
    v_attempts := v_secret.failed_attempts + 1;
    update private.package_handoff_secrets
    set failed_attempts = v_attempts,
        locked_until = case when v_attempts >= 5 then now() + interval '15 minutes' else null end,
        updated_at = timezone('utc', now())
    where package_id = p_package_id;
    return false;
  end if;

  update public.packages
  set package_status = 'in_transit',
      status = 'in_transit',
      pickup_verified_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  update private.package_handoff_secrets
  set pickup_verified_at = timezone('utc', now()),
      failed_attempts = 0,
      locked_until = null,
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  insert into public.package_events (package_id, event_type, event_status, notes, created_by)
  values (p_package_id, 'pickup_verified', 'in_transit', 'Pickup OTP verified by assigned driver', p_driver_user_id);

  return true;
end;
$$;

create or replace function public.app_verify_package_delivery(
  p_package_id uuid,
  p_driver_user_id uuid,
  p_code_hash text,
  p_evidence_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_package public.packages%rowtype;
  v_secret private.package_handoff_secrets%rowtype;
  v_is_driver boolean;
  v_attempts integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into v_package
  from public.packages
  where package_id = p_package_id
  for update;
  if not found then raise exception 'Package not found' using errcode = 'P0002'; end if;

  select exists (
    select 1 from public.trips t
    join public.drivers d on d.driver_id = t.driver_id
    where t.trip_id = v_package.trip_id and d.user_id = p_driver_user_id
  ) into v_is_driver;

  if not v_is_driver then raise exception 'Only the assigned driver can verify delivery' using errcode = '42501'; end if;
  if v_package.package_status <> 'in_transit'
    or v_package.pickup_verified_at is null
    or v_package.payment_status <> 'held'
    or v_package.dispute_opened_at is not null then
    raise exception 'Package is not eligible for delivery verification' using errcode = '23514';
  end if;

  if coalesce(trim(p_evidence_path), '') = ''
    or length(p_evidence_path) > 512
    or p_evidence_path not like p_package_id::text || '/%'
    or p_evidence_path like '%..%' then
    raise exception 'A valid package-scoped evidence path is required' using errcode = '22023';
  end if;

  select * into v_secret
  from private.package_handoff_secrets
  where package_id = p_package_id
  for update;
  if not found then raise exception 'Package handoff secret not found' using errcode = 'P0002'; end if;
  if v_secret.locked_until is not null and v_secret.locked_until > now() then return false; end if;

  if v_secret.delivery_code_hash <> p_code_hash then
    v_attempts := v_secret.failed_attempts + 1;
    update private.package_handoff_secrets
    set failed_attempts = v_attempts,
        locked_until = case when v_attempts >= 5 then now() + interval '15 minutes' else null end,
        updated_at = timezone('utc', now())
    where package_id = p_package_id;
    return false;
  end if;

  update public.packages
  set package_status = 'delivered',
      status = 'delivered',
      delivered_at = timezone('utc', now()),
      delivery_verified_at = timezone('utc', now()),
      delivery_evidence_url = p_evidence_path,
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  update private.package_handoff_secrets
  set delivery_verified_at = timezone('utc', now()),
      failed_attempts = 0,
      locked_until = null,
      updated_at = timezone('utc', now())
  where package_id = p_package_id;

  insert into public.package_events (package_id, event_type, event_status, notes, created_by)
  values (p_package_id, 'delivery_verified', 'delivered', 'Delivery OTP and private evidence verified', p_driver_user_id);

  return true;
end;
$$;

revoke all on function public.app_verify_package_pickup(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.app_verify_package_delivery(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.app_verify_package_pickup(uuid, uuid, text) to service_role;
grant execute on function public.app_verify_package_delivery(uuid, uuid, text, text) to service_role;

comment on table private.package_handoff_secrets is
  'Private HMAC-SHA-256 hashes for pickup and delivery OTPs; plaintext codes are never persisted.';
comment on function public.open_package_dispute(uuid, text) is
  'Opens a participant dispute and freezes any held package escrow in the existing wallet ledger.';

commit;
