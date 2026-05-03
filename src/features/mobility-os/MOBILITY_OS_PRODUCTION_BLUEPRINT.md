# Mobility OS Production Blueprint

## Operating Idea

Mobility OS is a capacity-first marketplace.

It is not:

- a static dashboard
- a search-led ride app
- a UI that computes business logic on the client

It is:

- a corridor inventory exchange
- a realtime pricing and capacity engine
- a control surface where UI elements are projections of backend state

## Business Model

### 1. Corridor As Market Instrument

Each corridor is a monetizable unit with two sellable inventories:

- seats
- cargo kilos

Wasel is not monetizing a one-off ride request. It is monetizing repeated throughput on owned lanes.

### 2. Dual Yield Per Movement

The same trip supply can monetize both:

- passenger capacity
- parcel capacity

This makes each active route economically denser than a single-mode ride marketplace.

### 3. Recurring Enterprise Volume

Enterprise staff transport, returns, school movement, and scheduled logistics feed the same corridor book.

That matters because recurring B2B volume:

- stabilizes demand
- improves price predictability
- hardens corridor ownership
- makes supply planning easier

### 4. Dynamic Pricing Capture

Wasel captures upside from:

- higher utilization
- stronger demand pressure
- tighter remaining capacity

The engine uses these exact formulas:

```text
S_r = S_total - S_booked
K_r = K_total - K_booked
U   = (S_booked + K_booked) / (S_total + K_total)
D_p = demand_index * (1 + U)
P   = P_base * (1 + D_p * U)
```

### 5. Data Moat

The moat is not the map.

The moat is:

- corridor demand history
- price history
- supply response time
- enterprise recurrence
- operational knowledge of which corridors clear fastest

## Design Direction

The operating surface should feel like infrastructure, not lifestyle marketing.

Rules:

- use a dark command background
- use cyan for live network state
- use gold for monetization and price pressure
- use green for throughput and healthy execution
- use orange only for rising demand pressure or latency risk
- avoid soft labels like "good", "moderate", or "excellent"
- prefer exact values, rates, and movements

The current implementation follows the attachment's serious control-room tone but removes decorative dashboard habits that weaken the product story.

## Backend Architecture

### Required Services

#### CorridorService

- single state owner for corridor records
- applies bookings atomically
- updates `updated_at`
- persists demand and price histories

#### BookingService

- accepts `POST /booking/create`
- validates available capacity before emitting `BookingCreated`
- does not calculate pricing

#### DemandEngine

- listens for `CapacityUpdated`
- converts new pressure into the next `demand_index`
- emits `DemandUpdated`

#### PricingEngine

- computes availability, utilization, demand pressure, and dynamic prices
- emits `PriceRecalculated`
- never runs in frontend

#### RealtimeGateway

- subscribes to `CorridorUpdated`
- pushes WebSocket updates to clients
- no polling

### Event Flow

```text
User Action
  -> BookingService
  -> BookingCreated
  -> CorridorService
  -> CapacityUpdated
  -> DemandEngine
  -> DemandUpdated
  -> PricingEngine
  -> PriceRecalculated
  -> CorridorUpdated
  -> RealtimeGateway
  -> UI projection update
```

## Postgres-Ready Schema

```sql
create table corridors (
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
  demand_index numeric(10,4) not null check (demand_index >= 0),
  demand_history jsonb not null default '[]'::jsonb,
  price_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table booking_commands (
  booking_id uuid primary key,
  corridor_id text not null references corridors(id),
  type text not null check (type in ('seat', 'cargo')),
  quantity numeric(10,2) not null check (quantity > 0),
  created_at timestamptz not null,
  processed_at timestamptz
);

create table event_outbox (
  id uuid primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  trace_id text not null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_corridors_origin_destination on corridors(origin, destination);
create index idx_booking_commands_corridor on booking_commands(corridor_id, created_at desc);
create index idx_event_outbox_unpublished on event_outbox(published_at) where published_at is null;
```

### Atomic Booking Update Example

```sql
update corridors
set
  seats_booked = seats_booked + :quantity,
  updated_at = now()
where id = :corridor_id
  and (:type = 'seat')
  and seats_total - seats_booked >= :quantity;
```

Equivalent cargo update should target `cargo_booked_kg`.

If zero rows are updated, the booking must fail closed.

## API Contract

### Create Booking

`POST /booking/create`

```json
{
  "corridor_id": "amman-irbid",
  "type": "seat",
  "quantity": 2,
  "timestamp": "2026-05-03T08:15:00.000Z"
}
```

### Success Response

```json
{
  "booking_id": "5d2b4d7f-8a7d-4b86-8f7e-7ce6ef2d9039",
  "status": "accepted",
  "trace_id": "trace-01",
  "queued_events": [
    "BookingCreated"
  ]
}
```

## Event Definitions

### BookingCreated

```json
{
  "booking_id": "uuid",
  "corridor_id": "amman-irbid",
  "type": "seat",
  "quantity": 2,
  "timestamp": "ISO8601"
}
```

### CapacityUpdated

```json
{
  "corridor_id": "amman-irbid",
  "type": "seat",
  "quantity": 2,
  "corridor": {
    "...": "source-of-truth corridor fields only"
  }
}
```

### DemandUpdated

```json
{
  "corridor_id": "amman-irbid",
  "previous_demand_index": 0.82,
  "demand_index": 0.91,
  "signal_weight": 0.27
}
```

### PriceRecalculated

```json
{
  "corridor_id": "amman-irbid",
  "dynamic_seat_price": 6.21,
  "dynamic_cargo_price": 0.54,
  "utilization": 0.62,
  "demand_pressure": 1.47
}
```

### CorridorUpdated

```json
{
  "corridor_id": "amman-irbid",
  "projection": {
    "seats_available": 13,
    "cargo_available_kg": 56,
    "utilization": 0.62,
    "demand_pressure": 1.47,
    "dynamic_seat_price": 6.21,
    "dynamic_cargo_price": 0.54
  }
}
```

## WebSocket Contract

### Channel

`GET /ws/mobility-os`

### Streamed Messages

- `CorridorUpdated`
- `PriceRecalculated`
- optional replay on connect: `SnapshotLoaded`

Client rule:

```ts
socket.on("CorridorUpdated", applyServerProjection)
```

No fetch-on-load dependency should remain after the socket is connected.

## Next.js Reference Structure

This repo is Vite-based, but the production server shape should look like this in Next.js:

```text
app/
  mobility-os/
    page.tsx
    loading.tsx
    error.tsx
  api/
    booking/
      create/route.ts
lib/
  mobility-os/
    contracts.ts
    event-bus.ts
    pricing-engine.ts
    demand-engine.ts
    corridor-service.ts
    booking-service.ts
    realtime-gateway.ts
    repositories/
      corridor-repository.ts
      outbox-repository.ts
components/
  mobility-os/
    corridor-card.tsx
    event-tape.tsx
    market-book.tsx
    booking-panel.tsx
    ws-provider.tsx
```

## What Was Changed In This Repo

The current repo implementation now:

- moves corridor math into a dedicated runtime layer
- keeps the React page as a projection surface
- replaces generic health cards with corridor-market information
- exposes the exact booking and event flow directly in the UI
- documents the production backend contract for immediate server implementation
