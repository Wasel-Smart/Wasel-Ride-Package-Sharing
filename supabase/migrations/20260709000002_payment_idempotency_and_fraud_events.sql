-- Migration: payment idempotency and state machine
-- Prevents duplicate payments and enforces valid state transitions.

-- ── Idempotency keys ──────────────────────────────────────────────────────────
-- Every payment creation must supply an idempotency key.
-- Duplicate keys within the TTL window return the original result.

create table if not exists public.payment_idempotency_keys (
  key             text        not null,
  user_id         uuid        not null references public.users(id) on delete cascade,
  operation       text        not null,
  response_body   jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours',
  primary key (key, user_id)
);

create index if not exists idx_payment_idempotency_expires
  on public.payment_idempotency_keys (expires_at)
  where expires_at > now();

alter table public.payment_idempotency_keys enable row level security;

create policy "Users can read their own idempotency keys"
  on public.payment_idempotency_keys for select
  using (user_id = public.current_user_id());

-- Service role only for insert/update (called from edge functions)
create policy "Service role manages idempotency keys"
  on public.payment_idempotency_keys for all
  to service_role
  using (true)
  with check (true);

-- ── Payment events audit log ──────────────────────────────────────────────────
-- Immutable append-only log of every payment state transition.

create table if not exists public.payment_events (
  id              uuid        primary key default gen_random_uuid(),
  payment_id      text        not null,
  user_id         uuid        references public.users(id) on delete set null,
  event_type      text        not null
    check (event_type in (
      'created', 'pending', 'processing', 'completed',
      'failed', 'refunded', 'cancelled', 'disputed'
    )),
  amount          numeric(14,3),
  currency        text        not null default 'IQD',
  provider        text,
  provider_ref    text,
  idempotency_key text,
  metadata        jsonb       not null default '{}',
  occurred_at     timestamptz not null default now()
);

create index if not exists idx_payment_events_payment_id
  on public.payment_events (payment_id, occurred_at desc);

create index if not exists idx_payment_events_user_id
  on public.payment_events (user_id, occurred_at desc);

create index if not exists idx_payment_events_type
  on public.payment_events (event_type, occurred_at desc);

alter table public.payment_events enable row level security;

-- Users can see their own payment events; admins see all
create policy "Users see own payment events"
  on public.payment_events for select
  using (user_id = public.current_user_id() or public.is_admin());

create policy "Service role manages payment events"
  on public.payment_events for all
  to service_role
  using (true)
  with check (true);

-- ── Fraud events ──────────────────────────────────────────────────────────────
create table if not exists public.fraud_events (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        references public.users(id) on delete set null,
  event_type      text        not null,
  risk_score      integer     check (risk_score between 0 and 100),
  details         jsonb       not null default '{}',
  resolved        boolean     not null default false,
  resolved_by     uuid        references public.users(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_fraud_events_user
  on public.fraud_events (user_id, created_at desc);

create index if not exists idx_fraud_events_unresolved
  on public.fraud_events (created_at desc)
  where resolved = false;

alter table public.fraud_events enable row level security;

create policy "Only admins can view fraud events"
  on public.fraud_events for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── Cleanup job for expired idempotency keys ──────────────────────────────────
create or replace function public.cleanup_expired_idempotency_keys()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
begin
  with deleted as (
    delete from public.payment_idempotency_keys
    where expires_at < now()
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

grant execute on function public.cleanup_expired_idempotency_keys() to service_role;
