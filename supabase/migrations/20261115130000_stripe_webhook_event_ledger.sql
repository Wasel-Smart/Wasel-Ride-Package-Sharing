-- Stripe webhook event ledger.
--
-- Stripe delivers every event at least once and may redeliver it, concurrently or
-- days later. Each money handler is already idempotent on its own business row,
-- but nothing recorded which *events* had been handled. This table is the missing
-- record: one row per Stripe event id, claimed atomically before processing and
-- completed afterwards. It gives us
--   - replay protection that does not depend on every handler staying idempotent,
--   - a concurrency guard (two simultaneous deliveries cannot both process),
--   - a forensic trail (type, Stripe's own created time, attempts, last error).
--
-- Access is server-only. RLS is on with a single deny policy for the client roles;
-- the service role used by the edge function bypasses RLS, and the two functions
-- below are executable by service_role only.

create table if not exists public.stripe_webhook_events (
  event_id         text primary key check (char_length(event_id) between 5 and 255),
  event_type       text not null check (char_length(event_type) between 1 and 255),
  event_created_at timestamptz not null,
  livemode         boolean not null default false,
  status           text not null default 'processing'
                     check (status in ('processing', 'processed', 'failed')),
  attempts         integer not null default 1 check (attempts >= 1),
  locked_at        timestamptz,
  processed_at     timestamptz,
  last_error       text,
  received_at      timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create index if not exists stripe_webhook_events_open_idx
  on public.stripe_webhook_events (status, locked_at)
  where status <> 'processed';

create index if not exists stripe_webhook_events_type_created_idx
  on public.stripe_webhook_events (event_type, event_created_at desc);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists stripe_webhook_events_no_client_access on public.stripe_webhook_events;
create policy stripe_webhook_events_no_client_access
  on public.stripe_webhook_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.stripe_webhook_events from anon, authenticated;

-- Atomically claims an event for processing.
--   'claimed'     this caller owns the event and must process it
--   'duplicate'   already processed successfully; acknowledge and do nothing
--   'in_progress' another delivery is processing it right now; ask Stripe to retry
-- A previously failed event, or one whose lock is older than five minutes (the
-- worker died), is re-claimed so Stripe's retries can finish the job.
create or replace function public.app_claim_stripe_event(
  p_event_id         text,
  p_event_type       text,
  p_event_created_at timestamptz,
  p_livemode         boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_locked timestamptz;
begin
  if p_event_id is null or char_length(p_event_id) < 5 then
    raise exception 'invalid event id' using errcode = '22023';
  end if;

  insert into public.stripe_webhook_events (
    event_id, event_type, event_created_at, livemode, status, attempts, locked_at
  )
  values (
    p_event_id, p_event_type, p_event_created_at, coalesce(p_livemode, false),
    'processing', 1, timezone('utc', now())
  )
  on conflict (event_id) do nothing;

  if found then
    return 'claimed';
  end if;

  select status, locked_at
    into v_status, v_locked
    from public.stripe_webhook_events
   where event_id = p_event_id
   for update;

  if v_status = 'processed' then
    return 'duplicate';
  end if;

  if v_status = 'processing'
     and v_locked is not null
     and v_locked > timezone('utc', now()) - interval '5 minutes' then
    return 'in_progress';
  end if;

  update public.stripe_webhook_events
     set status     = 'processing',
         attempts   = attempts + 1,
         locked_at  = timezone('utc', now()),
         last_error = null,
         updated_at = timezone('utc', now())
   where event_id = p_event_id;

  return 'claimed';
end;
$$;

-- Records the outcome. Only a row that is still 'processing' can be completed, so
-- a late 'failed' report can never overwrite an already 'processed' event.
create or replace function public.app_complete_stripe_event(
  p_event_id text,
  p_status   text,
  p_error    text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('processed', 'failed') then
    raise exception 'invalid status %', p_status using errcode = '22023';
  end if;

  update public.stripe_webhook_events
     set status       = p_status,
         processed_at = case when p_status = 'processed' then timezone('utc', now()) else null end,
         locked_at    = null,
         last_error   = case when p_status = 'failed' then left(coalesce(p_error, 'unknown error'), 1000) else null end,
         updated_at   = timezone('utc', now())
   where event_id = p_event_id
     and status = 'processing';
end;
$$;

revoke all on function public.app_claim_stripe_event(text, text, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.app_complete_stripe_event(text, text, text) from public, anon, authenticated;
grant execute on function public.app_claim_stripe_event(text, text, timestamptz, boolean) to service_role;
grant execute on function public.app_complete_stripe_event(text, text, text) to service_role;
