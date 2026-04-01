alter table public.users
  add column if not exists avatar_url text,
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists two_factor_secret text,
  add column if not exists two_factor_backup_codes text[];

insert into public.users (auth_user_id, email, full_name, phone_number, role, verification_level, avatar_url)
select
  p.id,
  coalesce(p.email, au.email, concat(left(p.id::text, 12), '@pending.wasel.local')),
  coalesce(nullif(trim(p.full_name), ''), split_part(coalesce(p.email, au.email, 'Wasel User'), '@', 1), 'Wasel User'),
  coalesce(
    nullif(trim(coalesce(profile_payload.payload ->> 'phone_number', profile_payload.payload ->> 'phone')), ''),
    concat('pending-', left(p.id::text, 8))
  ),
  case
    when profile_payload.payload ->> 'role' in ('driver', 'admin', 'passenger') then (profile_payload.payload ->> 'role')::public.user_role_v2
    when profile_payload.payload ->> 'role' in ('rider', 'both') then 'passenger'::public.user_role_v2
    else 'passenger'::public.user_role_v2
  end,
  case
    when profile_payload.payload ->> 'verification_level' in ('level_0', 'level_1', 'level_2', 'level_3') then (profile_payload.payload ->> 'verification_level')::public.verification_level_v2
    else 'level_0'::public.verification_level_v2
  end,
  profile_payload.payload ->> 'avatar_url'
from public.profiles p
cross join lateral (
  select to_jsonb(p) as payload
) profile_payload
left join auth.users au on au.id = p.id
where not exists (
  select 1
  from public.users u
  where u.auth_user_id = p.id or u.id = p.id
);

update public.users u
set
  email = coalesce(u.email, p.email, u.email),
  full_name = coalesce(nullif(trim(p.full_name), ''), u.full_name),
  phone_number = coalesce(
    nullif(trim(coalesce(profile_payload.payload ->> 'phone_number', profile_payload.payload ->> 'phone')), ''),
    u.phone_number
  ),
  verification_level = case
    when profile_payload.payload ->> 'verification_level' in ('level_0', 'level_1', 'level_2', 'level_3') then (profile_payload.payload ->> 'verification_level')::public.verification_level_v2
    else u.verification_level
  end,
  avatar_url = coalesce(u.avatar_url, profile_payload.payload ->> 'avatar_url'),
  two_factor_enabled = coalesce((profile_payload.payload ->> 'two_factor_enabled')::boolean, u.two_factor_enabled),
  two_factor_secret = coalesce(profile_payload.payload ->> 'two_factor_secret', u.two_factor_secret),
  two_factor_backup_codes = coalesce(
    case
      when jsonb_typeof(profile_payload.payload -> 'two_factor_backup_codes') = 'array' then array(
        select jsonb_array_elements_text(profile_payload.payload -> 'two_factor_backup_codes')
      )
      else null
    end,
    u.two_factor_backup_codes
  )
from public.profiles p
cross join lateral (
  select to_jsonb(p) as payload
) profile_payload
where u.auth_user_id = p.id;

create or replace function public.sync_auth_user_to_canonical_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_full_name text;
  v_phone_number text;
begin
  v_full_name := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    trim(concat_ws(' ', new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')),
    split_part(coalesce(new.email, 'Wasel User'), '@', 1),
    'Wasel User'
  );

  v_phone_number := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', new.raw_user_meta_data ->> 'phone', '')), ''),
    concat('pending-', left(new.id::text, 8))
  );

  insert into public.users (auth_user_id, email, full_name, phone_number)
  values (
    new.id,
    coalesce(new.email, concat(left(new.id::text, 12), '@pending.wasel.local')),
    v_full_name,
    v_phone_number
  )
  on conflict (auth_user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    phone_number = case
      when public.users.phone_number like 'pending-%' then excluded.phone_number
      else public.users.phone_number
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced_to_canonical on auth.users;
create trigger on_auth_user_synced_to_canonical
  after insert or update on auth.users
  for each row execute function public.sync_auth_user_to_canonical_user();
