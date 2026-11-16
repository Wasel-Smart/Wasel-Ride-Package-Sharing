-- Stripe dispute (chargeback) register.
--
-- A dispute is Stripe taking the money back from the platform unless evidence is
-- submitted before a deadline. Nothing in the schema recorded one, so a chargeback
-- was invisible until the balance moved. This table holds one row per Stripe
-- dispute, kept current by the webhook handler for charge.dispute.* events.
--
-- Server-only: RLS is on with a deny policy for client roles. Operators read it
-- with the service role (SQL editor / admin tooling). Events can arrive out of
-- order, so an update is applied only if it is not older than what is stored.

create table if not exists public.payment_disputes (
  dispute_id            text primary key check (char_length(dispute_id) between 5 and 255),
  charge_id             text,
  payment_intent_id     text,
  booking_id            text,
  amount_minor          bigint not null check (amount_minor >= 0),
  currency              text not null check (char_length(currency) = 3),
  reason                text,
  status                text not null,
  evidence_due_by       timestamptz,
  livemode              boolean not null default false,
  last_event_id         text not null,
  last_event_created_at timestamptz not null,
  opened_at             timestamptz not null default timezone('utc', now()),
  closed_at             timestamptz,
  updated_at            timestamptz not null default timezone('utc', now())
);

create index if not exists payment_disputes_open_idx
  on public.payment_disputes (evidence_due_by)
  where closed_at is null;

create index if not exists payment_disputes_intent_idx
  on public.payment_disputes (payment_intent_id)
  where payment_intent_id is not null;

alter table public.payment_disputes enable row level security;

drop policy if exists payment_disputes_no_client_access on public.payment_disputes;
create policy payment_disputes_no_client_access
  on public.payment_disputes
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.payment_disputes from anon, authenticated;

-- Inserts or advances a dispute. Returns:
--   'inserted'  first time this dispute is seen
--   'updated'   an event at least as new as the stored one was applied
--   'stale'     the event is older than what is stored and was ignored
create or replace function public.app_record_stripe_dispute(
  p_dispute_id        text,
  p_charge_id         text,
  p_payment_intent_id text,
  p_booking_id        text,
  p_amount_minor      bigint,
  p_currency          text,
  p_reason            text,
  p_status            text,
  p_evidence_due_by   timestamptz,
  p_livemode          boolean,
  p_event_id          text,
  p_event_created_at  timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted boolean;
begin
  insert into public.payment_disputes as d (
    dispute_id, charge_id, payment_intent_id, booking_id, amount_minor, currency,
    reason, status, evidence_due_by, livemode, last_event_id, last_event_created_at,
    closed_at
  )
  values (
    p_dispute_id, p_charge_id, p_payment_intent_id, p_booking_id, p_amount_minor, lower(p_currency),
    p_reason, p_status, p_evidence_due_by, coalesce(p_livemode, false), p_event_id, p_event_created_at,
    case when p_status in ('won', 'lost', 'warning_closed') then timezone('utc', now()) else null end
  )
  on conflict (dispute_id) do update
     set charge_id             = coalesce(excluded.charge_id, d.charge_id),
         payment_intent_id     = coalesce(excluded.payment_intent_id, d.payment_intent_id),
         booking_id            = coalesce(excluded.booking_id, d.booking_id),
         amount_minor          = excluded.amount_minor,
         reason                = coalesce(excluded.reason, d.reason),
         status                = excluded.status,
         evidence_due_by       = coalesce(excluded.evidence_due_by, d.evidence_due_by),
         last_event_id         = excluded.last_event_id,
         last_event_created_at = excluded.last_event_created_at,
         closed_at             = case when excluded.status in ('won', 'lost', 'warning_closed')
                                      then coalesce(d.closed_at, timezone('utc', now()))
                                      else null end,
         updated_at            = timezone('utc', now())
   where d.last_event_created_at <= excluded.last_event_created_at
  returning (xmax = 0) into v_inserted;

  if not found then
    return 'stale';
  end if;

  return case when v_inserted then 'inserted' else 'updated' end;
end;
$$;

revoke all on function public.app_record_stripe_dispute(text, text, text, text, bigint, text, text, text, timestamptz, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.app_record_stripe_dispute(text, text, text, text, bigint, text, text, text, timestamptz, boolean, text, timestamptz) to service_role;
