-- Public website MVP intake tables for wasel14.online launch.
-- These tables intentionally accept insert-only lead capture from anon/authenticated
-- clients. RLS prevents public reads or updates through the Data API.

create table if not exists public.mvp_ride_searches (
  id uuid primary key default gen_random_uuid(),
  origin text not null check (char_length(origin) between 2 and 120),
  destination text not null check (char_length(destination) between 2 and 120),
  ride_date date,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  source text not null default 'public_homepage' check (char_length(source) between 2 and 80),
  created_at timestamptz not null default now(),
  constraint mvp_ride_searches_distinct_route check (origin <> destination)
);

create table if not exists public.mvp_ride_offers (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null check (char_length(driver_name) between 2 and 120),
  phone text not null check (phone ~ '^\\+?[0-9 ()-]{7,32}$'),
  origin text not null check (char_length(origin) between 2 and 120),
  destination text not null check (char_length(destination) between 2 and 120),
  ride_date date,
  seats integer not null default 1 check (seats between 1 and 8),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  source text not null default 'public_driver_page' check (char_length(source) between 2 and 80),
  created_at timestamptz not null default now(),
  constraint mvp_ride_offers_distinct_route check (origin <> destination)
);

create table if not exists public.mvp_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  message text not null check (char_length(message) between 5 and 2000),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  source text not null default 'public_contact_page' check (char_length(source) between 2 and 80),
  created_at timestamptz not null default now()
);

alter table public.mvp_ride_searches enable row level security;
alter table public.mvp_ride_offers enable row level security;
alter table public.mvp_contact_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mvp_ride_searches'
      and policyname = 'Public website can create ride searches'
  ) then
    create policy "Public website can create ride searches"
      on public.mvp_ride_searches
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mvp_ride_offers'
      and policyname = 'Public website can create ride offers'
  ) then
    create policy "Public website can create ride offers"
      on public.mvp_ride_offers
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'mvp_contact_messages'
      and policyname = 'Public website can create contact messages'
  ) then
    create policy "Public website can create contact messages"
      on public.mvp_contact_messages
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant insert on table public.mvp_ride_searches to anon, authenticated;
grant insert on table public.mvp_ride_offers to anon, authenticated;
grant insert on table public.mvp_contact_messages to anon, authenticated;
