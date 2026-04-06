-- Operational bootstrap reference data for autonomous seeding and corridor intelligence.

create table if not exists public.system_roles (
  role_key text primary key
    check (role_key in ('admin', 'driver', 'rider')),
  canonical_role public.user_role_v2 not null,
  display_name text not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  is_assignable boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cities (
  city_id text primary key,
  city_name text not null unique,
  governorate text not null,
  country_code text not null default 'JO',
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  timezone_name text not null default 'Asia/Amman',
  geo_reference jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trip_types_catalog (
  trip_type_key text primary key
    check (trip_type_key in ('wasel', 'raje3')),
  display_name text not null,
  lifecycle_mode text not null
    check (lifecycle_mode in ('one_way', 'auto_return')),
  generates_return_trip boolean not null default false,
  default_return_buffer_minutes integer not null default 0
    check (default_return_buffer_minutes >= 0),
  pricing_multiplier numeric(6, 3) not null default 1.000
    check (pricing_multiplier > 0),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.trips
  add column if not exists trip_type_key text not null default 'wasel',
  add column if not exists lifecycle_group_id uuid not null default gen_random_uuid(),
  add column if not exists paired_trip_id uuid,
  add column if not exists auto_return_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_trips_trip_type_key'
      and conrelid = 'public.trips'::regclass
  ) then
    alter table public.trips
      add constraint chk_trips_trip_type_key
      check (trip_type_key in ('wasel', 'raje3'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trips_paired_trip_id_fkey'
      and conrelid = 'public.trips'::regclass
  ) then
    alter table public.trips
      add constraint trips_paired_trip_id_fkey
      foreign key (paired_trip_id) references public.trips(trip_id) on delete set null;
  end if;
end $$;

create table if not exists public.route_corridors (
  corridor_id text primary key,
  corridor_label text not null,
  origin_city_id text not null references public.cities(city_id) on delete restrict,
  destination_city_id text not null references public.cities(city_id) on delete restrict,
  route_scope text not null default 'city_to_city'
    check (route_scope in ('city_to_city', 'city_to_governorate', 'governorate_to_city', 'governorate_to_governorate')),
  demand_tier text not null default 'emerging'
    check (demand_tier in ('priority', 'core', 'growth', 'emerging')),
  distance_km numeric(10, 2) not null check (distance_km > 0),
  estimated_duration_minutes integer not null check (estimated_duration_minutes > 0),
  allows_packages boolean not null default true,
  supports_wasel boolean not null default true,
  supports_raje3 boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (origin_city_id, destination_city_id)
);

create table if not exists public.pricing_rules (
  rule_id text primary key,
  corridor_id text not null references public.route_corridors(corridor_id) on delete cascade,
  trip_type_key text not null references public.trip_types_catalog(trip_type_key) on delete restrict,
  pricing_model text not null default 'corridor_distance'
    check (pricing_model in ('corridor_distance', 'flat', 'hybrid')),
  base_fare_jod numeric(10, 3) not null default 0 check (base_fare_jod >= 0),
  distance_rate_jod numeric(10, 3) not null default 0 check (distance_rate_jod >= 0),
  minimum_price_jod numeric(10, 3) not null default 0 check (minimum_price_jod >= 0),
  package_surcharge_jod numeric(10, 3) not null default 0 check (package_surcharge_jod >= 0),
  return_trip_discount_pct numeric(5, 2) not null default 0
    check (return_trip_discount_pct between 0 and 100),
  demand_multiplier_min numeric(6, 3) not null default 1.000
    check (demand_multiplier_min > 0),
  demand_multiplier_max numeric(6, 3) not null default 1.000
    check (demand_multiplier_max >= demand_multiplier_min),
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (corridor_id, trip_type_key)
);

create table if not exists public.seed_execution_log (
  log_id uuid primary key default gen_random_uuid(),
  seed_name text not null,
  execution_source text not null default 'db/seeds',
  seed_status text not null default 'completed'
    check (seed_status in ('started', 'completed', 'failed')),
  details jsonb not null default '{}'::jsonb,
  executed_at timestamptz not null default timezone('utc', now())
);

create index if not exists cities_governorate_idx
  on public.cities (governorate, city_name);

create index if not exists trips_trip_type_departure_idx
  on public.trips (trip_type_key, departure_time desc);

create index if not exists trips_lifecycle_group_idx
  on public.trips (lifecycle_group_id, departure_time asc);

create index if not exists route_corridors_origin_destination_idx
  on public.route_corridors (origin_city_id, destination_city_id);

create index if not exists route_corridors_demand_tier_idx
  on public.route_corridors (demand_tier, active);

create index if not exists pricing_rules_corridor_idx
  on public.pricing_rules (corridor_id, trip_type_key)
  where active = true;

create index if not exists seed_execution_log_seed_name_idx
  on public.seed_execution_log (seed_name, executed_at desc);

drop trigger if exists trg_system_roles_updated_at on public.system_roles;
create trigger trg_system_roles_updated_at
before update on public.system_roles
for each row execute function public.set_updated_at();

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists trg_trip_types_catalog_updated_at on public.trip_types_catalog;
create trigger trg_trip_types_catalog_updated_at
before update on public.trip_types_catalog
for each row execute function public.set_updated_at();

drop trigger if exists trg_route_corridors_updated_at on public.route_corridors;
create trigger trg_route_corridors_updated_at
before update on public.route_corridors
for each row execute function public.set_updated_at();

drop trigger if exists trg_pricing_rules_updated_at on public.pricing_rules;
create trigger trg_pricing_rules_updated_at
before update on public.pricing_rules
for each row execute function public.set_updated_at();

alter table public.system_roles enable row level security;
alter table public.cities enable row level security;
alter table public.trip_types_catalog enable row level security;
alter table public.route_corridors enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.seed_execution_log enable row level security;

drop policy if exists system_roles_select_active on public.system_roles;
create policy system_roles_select_active
  on public.system_roles
  for select
  using (active = true or public.is_admin());

drop policy if exists system_roles_admin_manage on public.system_roles;
create policy system_roles_admin_manage
  on public.system_roles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists cities_select_active on public.cities;
create policy cities_select_active
  on public.cities
  for select
  using (active = true or public.is_admin());

drop policy if exists cities_admin_manage on public.cities;
create policy cities_admin_manage
  on public.cities
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists trip_types_catalog_select_active on public.trip_types_catalog;
create policy trip_types_catalog_select_active
  on public.trip_types_catalog
  for select
  using (active = true or public.is_admin());

drop policy if exists trip_types_catalog_admin_manage on public.trip_types_catalog;
create policy trip_types_catalog_admin_manage
  on public.trip_types_catalog
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists route_corridors_select_active on public.route_corridors;
create policy route_corridors_select_active
  on public.route_corridors
  for select
  using (active = true or public.is_admin());

drop policy if exists route_corridors_admin_manage on public.route_corridors;
create policy route_corridors_admin_manage
  on public.route_corridors
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists pricing_rules_select_active on public.pricing_rules;
create policy pricing_rules_select_active
  on public.pricing_rules
  for select
  using (active = true or public.is_admin());

drop policy if exists pricing_rules_admin_manage on public.pricing_rules;
create policy pricing_rules_admin_manage
  on public.pricing_rules
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists seed_execution_log_admin_select on public.seed_execution_log;
create policy seed_execution_log_admin_select
  on public.seed_execution_log
  for select
  using (public.is_admin());

drop policy if exists seed_execution_log_admin_manage on public.seed_execution_log;
create policy seed_execution_log_admin_manage
  on public.seed_execution_log
  for all
  using (public.is_admin())
  with check (public.is_admin());
