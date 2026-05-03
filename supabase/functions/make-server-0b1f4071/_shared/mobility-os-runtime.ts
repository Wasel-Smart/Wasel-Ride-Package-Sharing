export type MobilityBookingType = 'seat' | 'cargo';

export type MobilityCorridorRow = {
  id: string;
  origin: string;
  destination: string;
  distance_km: number;
  travel_time_min: number;
  seats_total: number;
  seats_booked: number;
  cargo_total_kg: number;
  cargo_booked_kg: number;
  base_price_seat: number;
  base_price_kg: number;
  demand_index: number;
  demand_history: number[];
  price_history: number[];
  updated_at: string;
};

export type MobilityProjection = {
  corridor: MobilityCorridorRow;
  seats_available: number;
  cargo_available_kg: number;
  utilization: number;
  demand_pressure: number;
  dynamic_seat_price: number;
  dynamic_cargo_price: number;
  seat_price_direction: 'up' | 'down' | 'flat';
  cargo_price_direction: 'up' | 'down' | 'flat';
};

function roundTo(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getSeatAvailability(corridor: MobilityCorridorRow): number {
  return corridor.seats_total - corridor.seats_booked;
}

export function getCargoAvailability(corridor: MobilityCorridorRow): number {
  return corridor.cargo_total_kg - corridor.cargo_booked_kg;
}

export function getUtilization(corridor: MobilityCorridorRow): number {
  return (corridor.seats_booked + corridor.cargo_booked_kg) /
    Math.max(corridor.seats_total + corridor.cargo_total_kg, 1);
}

export function getDemandPressure(corridor: MobilityCorridorRow): number {
  const utilization = getUtilization(corridor);
  return corridor.demand_index * (1 + utilization);
}

export function getDynamicPrice(basePrice: number, corridor: MobilityCorridorRow): number {
  const utilization = getUtilization(corridor);
  const demandPressure = getDemandPressure(corridor);
  return basePrice * (1 + demandPressure * utilization);
}

function getDirection(current: number, previous: number | null | undefined): 'up' | 'down' | 'flat' {
  if (previous === null || previous === undefined) return 'flat';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}

export function projectCorridor(corridor: MobilityCorridorRow): MobilityProjection {
  const dynamicSeatPrice = roundTo(getDynamicPrice(corridor.base_price_seat, corridor), 2);
  const dynamicCargoPrice = roundTo(getDynamicPrice(corridor.base_price_kg, corridor), 2);
  const previousSeatPrice = corridor.price_history.at(-1);
  const previousCargoPrice = previousSeatPrice === undefined
    ? undefined
    : roundTo((previousSeatPrice / Math.max(corridor.base_price_seat, 0.0001)) * corridor.base_price_kg, 2);

  return {
    corridor,
    seats_available: getSeatAvailability(corridor),
    cargo_available_kg: getCargoAvailability(corridor),
    utilization: getUtilization(corridor),
    demand_pressure: getDemandPressure(corridor),
    dynamic_seat_price: dynamicSeatPrice,
    dynamic_cargo_price: dynamicCargoPrice,
    seat_price_direction: getDirection(dynamicSeatPrice, previousSeatPrice),
    cargo_price_direction: getDirection(dynamicCargoPrice, previousCargoPrice),
  };
}

export function appendHistory(values: number[], nextValue: number, limit = 12, digits = 4): number[] {
  return [...values, roundTo(nextValue, digits)].slice(-limit);
}

export function advanceCorridorAfterBooking(input: {
  corridor: MobilityCorridorRow;
  type: MobilityBookingType;
  quantity: number;
  timestamp: string;
}): MobilityCorridorRow {
  const corridor = structuredClone(input.corridor);

  if (input.type === 'seat') {
    corridor.seats_booked = corridor.seats_booked + input.quantity;
  } else {
    corridor.cargo_booked_kg = corridor.cargo_booked_kg + input.quantity;
  }

  const capacityBase = input.type === 'seat'
    ? Math.max(corridor.seats_total, 1)
    : Math.max(corridor.cargo_total_kg, 1);
  const quantityShare = input.quantity / capacityBase;
  const utilization = getUtilization(corridor);
  const directionalBias = input.type === 'seat' ? 0.05 : 0.03;

  corridor.demand_index = roundTo(
    clamp(corridor.demand_index * 0.74 + quantityShare * 0.16 + utilization * 0.10 + directionalBias, 0.18, 1.85),
    4,
  );
  corridor.demand_history = appendHistory(corridor.demand_history, corridor.demand_index, 12, 4);
  corridor.updated_at = input.timestamp;

  const recalculatedSeatPrice = getDynamicPrice(corridor.base_price_seat, corridor);
  corridor.price_history = appendHistory(corridor.price_history, recalculatedSeatPrice, 12, 2);

  return corridor;
}

export function buildMobilitySnapshot(corridors: MobilityCorridorRow[], recentEvents: Array<Record<string, unknown>>) {
  const projections = corridors.map(projectCorridor).sort((left, right) => right.demand_pressure - left.demand_pressure);
  const totalSeatsAvailable = projections.reduce((sum, item) => sum + item.seats_available, 0);
  const totalCargoAvailable = projections.reduce((sum, item) => sum + item.cargo_available_kg, 0);
  const averageUtilization = projections.reduce((sum, item) => sum + item.utilization, 0) / Math.max(projections.length, 1);
  const hottest = projections[0];

  return {
    corridors: projections,
    metrics: {
      total_seats_available: totalSeatsAvailable,
      total_cargo_available_kg: totalCargoAvailable,
      average_utilization: averageUtilization,
      hottest_corridor: hottest ? `${hottest.corridor.origin} -> ${hottest.corridor.destination}` : '',
      seat_revenue_run_rate: roundTo(
        projections.reduce((sum, item) => sum + item.dynamic_seat_price * item.corridor.seats_booked, 0),
        2,
      ),
      cargo_revenue_run_rate: roundTo(
        projections.reduce((sum, item) => sum + item.dynamic_cargo_price * item.corridor.cargo_booked_kg, 0),
        2,
      ),
      event_latency_target_ms: 200,
    },
    recent_events: recentEvents,
    updated_at: new Date().toISOString(),
  };
}

export const MOBILITY_OS_RUNTIME_SQL = `
create table if not exists public.mobility_corridors (
  id text primary key,
  origin text not null,
  destination text not null,
  distance_km numeric(10,2) not null check (distance_km >= 0),
  travel_time_min integer not null check (travel_time_min >= 0),
  seats_total integer not null check (seats_total >= 0),
  seats_booked integer not null default 0 check (seats_booked >= 0),
  cargo_total_kg numeric(10,2) not null check (cargo_total_kg >= 0),
  cargo_booked_kg numeric(10,2) not null default 0 check (cargo_booked_kg >= 0),
  base_price_seat numeric(10,2) not null check (base_price_seat >= 0),
  base_price_kg numeric(10,2) not null check (base_price_kg >= 0),
  demand_index numeric(10,4) not null default 0.30 check (demand_index >= 0),
  demand_history jsonb not null default '[]'::jsonb,
  price_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mobility_bookings (
  booking_id uuid primary key default gen_random_uuid(),
  corridor_id text not null references public.mobility_corridors(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  type text not null check (type in ('seat', 'cargo')),
  quantity numeric(10,2) not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  total_price numeric(10,2) not null check (total_price >= 0),
  booking_timestamp timestamptz not null,
  trace_id text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mobility_event_outbox (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  trace_id text not null,
  payload jsonb not null,
  occurred_at timestamptz not null default timezone('utc', now()),
  published_at timestamptz
);

create index if not exists idx_mobility_bookings_corridor_created
  on public.mobility_bookings(corridor_id, created_at desc);

create index if not exists idx_mobility_event_outbox_unpublished
  on public.mobility_event_outbox(published_at)
  where published_at is null;

alter table public.mobility_corridors enable row level security;
alter table public.mobility_bookings enable row level security;
alter table public.mobility_event_outbox enable row level security;

drop policy if exists mobility_corridors_authenticated_select on public.mobility_corridors;
create policy mobility_corridors_authenticated_select
  on public.mobility_corridors
  for select
  to authenticated
  using (true);

drop policy if exists mobility_event_outbox_authenticated_select on public.mobility_event_outbox;
create policy mobility_event_outbox_authenticated_select
  on public.mobility_event_outbox
  for select
  to authenticated
  using (true);

drop policy if exists mobility_bookings_owner_select on public.mobility_bookings;
create policy mobility_bookings_owner_select
  on public.mobility_bookings
  for select
  to authenticated
  using (
    user_id in (
      select id
      from public.users
      where auth_user_id::text = auth.uid()::text
    )
  );

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mobility_corridors'
  ) then
    alter publication supabase_realtime add table public.mobility_corridors;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mobility_event_outbox'
  ) then
    alter publication supabase_realtime add table public.mobility_event_outbox;
  end if;
end $$;
`;

export const MOBILITY_OS_SEED_SQL = `
insert into public.mobility_corridors (
  id, origin, destination, distance_km, travel_time_min,
  seats_total, seats_booked, cargo_total_kg, cargo_booked_kg,
  base_price_seat, base_price_kg, demand_index, demand_history, price_history
)
values
  ('amman-irbid', 'Amman', 'Irbid', 104, 90, 44, 29, 160, 104, 4.80, 0.42, 0.93, '[0.74,0.82,0.88,0.91,0.93]'::jsonb, '[5.12,5.34,5.62,5.89,6.02]'::jsonb),
  ('amman-zarqa', 'Amman', 'Zarqa', 22, 30, 58, 21, 210, 88, 2.40, 0.28, 0.52, '[0.38,0.44,0.47,0.50,0.52]'::jsonb, '[2.52,2.54,2.60,2.62,2.66]'::jsonb),
  ('amman-aqaba', 'Amman', 'Aqaba', 330, 240, 36, 28, 240, 150, 9.60, 0.68, 1.08, '[0.86,0.94,1.01,1.04,1.08]'::jsonb, '[10.84,11.18,11.54,11.88,12.12]'::jsonb),
  ('amman-karak', 'Amman', 'Karak', 140, 120, 40, 17, 170, 61, 5.60, 0.50, 0.57, '[0.41,0.46,0.50,0.54,0.57]'::jsonb, '[5.80,5.96,6.04,6.10,6.14]'::jsonb),
  ('irbid-zarqa', 'Irbid', 'Zarqa', 79, 67, 32, 12, 120, 40, 3.30, 0.31, 0.48, '[0.29,0.33,0.40,0.44,0.48]'::jsonb, '[3.40,3.46,3.50,3.52,3.58]'::jsonb),
  ('madaba-amman', 'Madaba', 'Amman', 33, 34, 28, 9, 90, 18, 2.10, 0.24, 0.40, '[0.24,0.28,0.31,0.36,0.40]'::jsonb, '[2.18,2.22,2.24,2.28,2.30]'::jsonb)
on conflict (id) do nothing;
`;
