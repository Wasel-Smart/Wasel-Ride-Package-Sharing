-- Migration: Iraq market support
-- Adds IQD currency, Iraqi cities, Iraq phone validation, and multi-region config.

-- ── Currency support ──────────────────────────────────────────────────────────
-- Wallets already have currency_code. Ensure IQD is a valid value.
-- The check constraint on currency_code (if any) needs to include IQD.

do $$
begin
  -- Add IQD to currency check if the constraint exists
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'wallets'
      and constraint_name = 'wallets_currency_code_check'
  ) then
    alter table public.wallets drop constraint wallets_currency_code_check;
  end if;
end $$;

alter table public.wallets
  add constraint wallets_currency_code_check
  check (currency_code in ('JOD', 'IQD', 'USD', 'EUR'));

-- ── Region config table ───────────────────────────────────────────────────────
create table if not exists public.region_config (
  region_code       text        primary key,
  region_name       text        not null,
  region_name_ar    text        not null,
  country_code      text        not null,
  phone_prefix      text        not null,
  phone_regex       text        not null,
  default_currency  text        not null,
  is_active         boolean     not null default true,
  launch_date       date,
  created_at        timestamptz not null default now()
);

insert into public.region_config
  (region_code, region_name, region_name_ar, country_code, phone_prefix, phone_regex, default_currency, is_active, launch_date)
values
  ('JO', 'Jordan',  '\u0627\u0644\u0623\u0631\u062f\u0646',  'JO', '+962', '^\+962[0-9]{8,9}$',  'JOD', true,  '2024-01-01'),
  ('IQ', 'Iraq',    '\u0627\u0644\u0639\u0631\u0627\u0642',  'IQ', '+964', '^\+964[0-9]{9,10}$', 'IQD', true,  '2026-09-01'),
  ('KW', 'Kuwait',  '\u0627\u0644\u0643\u0648\u064a\u062a',  'KW', '+965', '^\+965[0-9]{8}$',    'KWD', false, null),
  ('SA', 'Saudi Arabia', '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629', 'SA', '+966', '^\+966[0-9]{9}$', 'SAR', false, null)
on conflict (region_code) do update set
  is_active   = excluded.is_active,
  launch_date = excluded.launch_date;

alter table public.region_config enable row level security;

create policy "Anyone can read active regions"
  on public.region_config for select
  using (is_active = true);

create policy "Admins manage regions"
  on public.region_config for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Iraq cities ───────────────────────────────────────────────────────────────
create table if not exists public.supported_cities (
  city_id       uuid        primary key default gen_random_uuid(),
  city_name     text        not null,
  city_name_ar  text        not null,
  region_code   text        not null references public.region_config(region_code),
  is_active     boolean     not null default true,
  lat           double precision,
  lng           double precision,
  created_at    timestamptz not null default now()
);

create unique index if not exists idx_supported_cities_name_region
  on public.supported_cities (city_name, region_code);

insert into public.supported_cities (city_name, city_name_ar, region_code, lat, lng) values
  -- Jordan
  ('Amman',    '\u0639\u0645\u0627\u0646',       'JO', 31.9539, 35.9106),
  ('Irbid',    '\u0625\u0631\u0628\u062f',        'JO', 32.5556, 35.8500),
  ('Zarqa',    '\u0627\u0644\u0632\u0631\u0642\u0627\u0621', 'JO', 32.0728, 36.0878),
  ('Aqaba',    '\u0627\u0644\u0639\u0642\u0628\u0629',       'JO', 29.5267, 35.0078),
  ('Madaba',   '\u0645\u0627\u062f\u0628\u0627',  'JO', 31.7167, 35.8000),
  ('Karak',    '\u0627\u0644\u0643\u0631\u0643',  'JO', 31.1833, 35.7000),
  ('Jerash',   '\u062c\u0631\u0634',              'JO', 32.2833, 35.9000),
  ('Mafraq',   '\u0627\u0644\u0645\u0641\u0631\u0642', 'JO', 32.3417, 36.2083),
  ('Petra',    '\u0627\u0644\u0628\u062a\u0631\u0627\u0621', 'JO', 30.3285, 35.4444),
  ('Ajloun',   '\u0639\u062c\u0644\u0648\u0646',  'JO', 32.3333, 35.7500),
  ('Salt',     '\u0627\u0644\u0633\u0644\u0637',  'JO', 32.0333, 35.7333),
  -- Iraq
  ('Baghdad',      '\u0628\u063a\u062f\u0627\u062f',          'IQ', 33.3406, 44.4009),
  ('Erbil',        '\u0623\u0631\u0628\u064a\u0644',          'IQ', 36.1901, 44.0091),
  ('Basra',        '\u0627\u0644\u0628\u0635\u0631\u0629',    'IQ', 30.5085, 47.7804),
  ('Najaf',        '\u0627\u0644\u0646\u062c\u0641',          'IQ', 31.9904, 44.3162),
  ('Mosul',        '\u0627\u0644\u0645\u0648\u0635\u0644',    'IQ', 36.3350, 43.1189),
  ('Kirkuk',       '\u0643\u0631\u0643\u0648\u0643',          'IQ', 35.4681, 44.3922),
  ('Sulaymaniyah', '\u0627\u0644\u0633\u0644\u064a\u0645\u0627\u0646\u064a\u0629', 'IQ', 35.5572, 45.4351),
  ('Karbala',      '\u0643\u0631\u0628\u0644\u0627\u0621',    'IQ', 32.6160, 44.0244),
  ('Nasiriyah',    '\u0627\u0644\u0646\u0627\u0635\u0631\u064a\u0629', 'IQ', 31.0440, 46.2590),
  ('Hillah',       '\u0627\u0644\u062d\u0644\u0629',          'IQ', 32.4722, 44.4222),
  ('Ramadi',       '\u0627\u0644\u0631\u0645\u0627\u062f\u064a', 'IQ', 33.4258, 43.2997),
  ('Duhok',        '\u062f\u0647\u0648\u0643',                'IQ', 36.8669, 42.9503)
on conflict (city_name, region_code) do nothing;

create index if not exists idx_supported_cities_region
  on public.supported_cities (region_code, is_active);

alter table public.supported_cities enable row level security;

create policy "Anyone can read active cities"
  on public.supported_cities for select
  using (is_active = true);

grant select on public.supported_cities to anon, authenticated;
grant select on public.region_config to anon, authenticated;
