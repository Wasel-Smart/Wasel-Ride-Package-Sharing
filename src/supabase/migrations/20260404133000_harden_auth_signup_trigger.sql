-- Auth signup trigger hardening
-- Removes legacy profile trigger drift that can block auth signups and
-- reasserts the canonical public.users sync path.

create or replace function public.sync_auth_user_to_canonical_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
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

insert into public.users (auth_user_id, email, full_name, phone_number)
select
  au.id,
  coalesce(au.email, concat(left(au.id::text, 12), '@pending.wasel.local')),
  coalesce(
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'full_name', '')), ''),
    trim(concat_ws(' ', au.raw_user_meta_data ->> 'first_name', au.raw_user_meta_data ->> 'last_name')),
    split_part(coalesce(au.email, 'Wasel User'), '@', 1),
    'Wasel User'
  ),
  coalesce(
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'phone_number', au.raw_user_meta_data ->> 'phone', '')), ''),
    concat('pending-', left(au.id::text, 8))
  )
from auth.users au
where not exists (
  select 1
  from public.users u
  where u.auth_user_id = au.id
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_synced_to_canonical on auth.users;

create trigger on_auth_user_synced_to_canonical
  after insert or update on auth.users
  for each row execute function public.sync_auth_user_to_canonical_user();
