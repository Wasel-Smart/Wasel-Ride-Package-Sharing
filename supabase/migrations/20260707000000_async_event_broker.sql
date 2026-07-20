-- ============================================================================
-- Async event broker + worker durability
-- ============================================================================
-- Durable outbox, dead-letter store, and ops aggregates used by the
-- in-repo event broker (src/platform/event-broker.ts) and worker framework
-- (src/platform/worker-framework.ts). Postgres-only; no Redis/external broker.
-- ============================================================================

create table if not exists public.event_outbox (
  id           text primary key,
  topic        text not null,
  payload      jsonb,
  producer     text,
  trace_id     text,
  status       text not null default 'pending'
                 check (status in ('pending', 'processing', 'processed', 'failed')),
  error        text,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists event_outbox_status_created_idx
  on public.event_outbox (status, created_at);

create table if not exists public.dead_letter_messages (
  id             text primary key default gen_random_uuid()::text,
  original_topic text,
  original_id    text,
  payload        jsonb,
  error          text,
  error_stack    text,
  retry_count    integer,
  trace_id       text,
  worker         text,
  created_at     timestamptz not null default now()
);

create table if not exists public.ops_aggregates (
  id            text primary key default gen_random_uuid()::text,
  metric_date   date,
  metric_name   text,
  dimension     text,
  value         numeric not null default 0,
  sample_count  integer not null default 0,
  updated_at    timestamptz not null default now(),
  unique (metric_date, metric_name, dimension)
);

create index if not exists ops_aggregates_metric_idx
  on public.ops_aggregates (metric_date, metric_name);

alter table public.event_outbox enable row level security;
alter table public.dead_letter_messages enable row level security;
alter table public.ops_aggregates enable row level security;

-- NOTE: the web client runs Supabase-only (no separate backend), so the
-- authenticated role owns queue operations. Service-role keys keep full
-- access server-side. Tighten these policies if a dedicated worker backend
-- is introduced later.
create policy "authenticated can write outbox"
  on public.event_outbox for insert
  to authenticated
  with check (true);

create policy "authenticated can read outbox"
  on public.event_outbox for select
  to authenticated
  using (true);

create policy "authenticated can update outbox"
  on public.event_outbox for update
  to authenticated
  using (true);

create policy "authenticated can write dead_letter"
  on public.dead_letter_messages for insert
  to authenticated
  with check (true);

create policy "authenticated can read dead_letter"
  on public.dead_letter_messages for select
  to authenticated
  using (true);

create policy "authenticated can write ops_aggregates"
  on public.ops_aggregates for insert
  to authenticated
  with check (true);

create policy "authenticated can upsert ops_aggregates"
  on public.ops_aggregates for update
  to authenticated
  using (true);

create policy "authenticated can read ops_aggregates"
  on public.ops_aggregates for select
  to authenticated
  using (true);

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table if not exists public.event_outbox;
  end if;
end $$;
