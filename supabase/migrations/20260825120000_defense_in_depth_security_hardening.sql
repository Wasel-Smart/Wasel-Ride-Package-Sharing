-- Defense-in-depth security hardening for sensitive SECURITY DEFINER functions.
-- Adds server-side admin guards so that even if a GRANT is accidentally widened,
-- a non-admin caller cannot approve identity verifications or escalate privileges.

-- 1. app_complete_sanad_verification: only service_role or an admin may approve/reject.
--    The GRANT already excludes `authenticated`, but this guard closes the gap if
--    the function is ever called directly (e.g. via another SECURITY DEFINER).
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
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'Only administrators may complete identity verifications'
      using errcode = '42501';
  end if;

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

-- 2. Restrict public driver profile exposure: hide sensitive PII (license, insurance,
--    national ID) from the default anon/authenticated SELECT. Public viewers see only
--    a safe subset via driver_profiles_public.
drop view if exists public.driver_profiles_public;
create view public.driver_profiles_public as
select
  driver_id,
  user_id,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  vehicle_plate,
  seat_capacity,
  luggage_capacity,
  pet_friendly,
  child_seat,
  rating,
  trip_count,
  verification_status,
  created_at,
  updated_at
from public.driver_profiles;

-- Revoke broad public select on the base table; keep the public view readable.
revoke select on public.driver_profiles from anon;
grant select on public.driver_profiles_public to anon, authenticated;
