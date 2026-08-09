-- Follow-up hardening after re-exposing public through the Supabase Data API.
-- Repairs remote lint failures and narrows anonymous table access while keeping
-- authenticated direct-client fallbacks governed by table RLS policies.

create extension if not exists postgis with schema extensions;

create or replace function public.create_critical_data_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  result jsonb := '{}'::jsonb;
  table_name text;
  table_count bigint;
begin
  for table_name in
    select unnest(array[
    'users',
    'drivers',
    'trips',
    'bookings',
    'packages',
    'transactions',
    'notifications'
  ])
  loop
    execute format('select count(*) from public.%I', table_name) into table_count;
    result := result || jsonb_build_object(table_name, table_count);
  end loop;

  return result;
end;
$$;

create or replace function public.app_submit_sanad_verification(
  p_user_id uuid,
  p_provider_reference text default null,
  p_document_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_verification_id uuid;
begin
  insert into public.verification_records (
    user_id,
    sanad_status,
    document_status,
    verification_level,
    provider_reference,
    document_reference
  )
  values (
    p_user_id,
    'pending'::public.verification_status_v2,
    case
      when p_document_reference is null then 'unverified'::public.verification_status_v2
      else 'pending'::public.verification_status_v2
    end,
    'level_1'::public.verification_level_v2,
    p_provider_reference,
    p_document_reference
  )
  returning verification_id into v_verification_id;

  update public.users
  set verification_level = greatest(verification_level, 'level_1'::public.verification_level_v2)
  where id = p_user_id;

  return v_verification_id;
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
set search_path = public, pg_temp
as $$
declare
  v_level public.verification_level_v2;
  v_verification_id uuid;
begin
  v_level := case
    when p_verified then 'level_2'::public.verification_level_v2
    else 'level_0'::public.verification_level_v2
  end;

  update public.verification_records
  set sanad_status = case
        when p_verified then 'verified'::public.verification_status_v2
        else 'rejected'::public.verification_status_v2
      end,
      document_status = case
        when p_verified then 'verified'::public.verification_status_v2
        else document_status
      end,
      verification_level = v_level,
      verification_timestamp = timezone('utc', now()),
      reviewer_admin_id = p_admin_id,
      failure_reason = p_failure_reason
  where user_id = p_user_id
  returning verification_id into v_verification_id;

  update public.users
  set verification_level = v_level
  where id = p_user_id;

  return v_verification_id;
end;
$$;

create or replace function public.geo_distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
stable
set search_path = extensions, public, pg_temp
as $$
  select extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(lng1, lat1), 4326)::extensions.geography,
    extensions.st_setsrid(extensions.st_makepoint(lng2, lat2), 4326)::extensions.geography
  ) / 1000.0;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'audit_logs',
    'bookings',
    'communication_deliveries',
    'communication_preferences',
    'dead_letter_messages',
    'drivers',
    'event_outbox',
    'notifications',
    'otp_sessions',
    'package_events',
    'packages',
    'payment_methods',
    'profile_change_history',
    'reviews',
    'support_tickets',
    'transactions',
    'trip_presence',
    'trips',
    'users',
    'vehicles',
    'wallets'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end;
$$;

revoke select on all tables in schema public from anon;

alter default privileges for role postgres in schema public
  revoke select on tables from anon;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trips',
    'drivers',
    'vehicles',
    'reviews',
    'ratings',
    'supported_cities',
    'region_config',
    'trip_search_cache'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('grant select on public.%I to anon', table_name);
    end if;
  end loop;
end;
$$;
