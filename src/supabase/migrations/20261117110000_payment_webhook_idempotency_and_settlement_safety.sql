begin;

alter table public.payment_webhook_events
  add column if not exists processing_started_at timestamptz null,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists processing_token uuid null;

alter table public.wallet_accounts
  add column if not exists payment_intent_id uuid null;

do $$
begin
  if exists (
    select 1
    from public.wallet_accounts
    where account_scope = 'platform_escrow'
      and metadata ? 'paymentIntentId'
      and (metadata ->> 'paymentIntentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    group by (metadata ->> 'paymentIntentId')
    having count(*) > 1
  ) then
    raise exception 'Duplicate platform escrow ledger accounts already exist for a payment intent; reconcile them before applying webhook idempotency migration.';
  end if;

  if exists (
    select 1
    from public.escrow_accounts
    where payment_intent_id is not null
    group by payment_intent_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate escrow_accounts already exist for a payment intent; reconcile them before applying webhook idempotency migration.';
  end if;
end $$;

update public.wallet_accounts
set payment_intent_id = (metadata ->> 'paymentIntentId')::uuid
where account_scope = 'platform_escrow'
  and payment_intent_id is null
  and metadata ? 'paymentIntentId'
  and (metadata ->> 'paymentIntentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'wallet_accounts_payment_intent_id_key'
      and conrelid = 'public.wallet_accounts'::regclass
  ) then
    alter table public.wallet_accounts
      add constraint wallet_accounts_payment_intent_id_key unique (payment_intent_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'escrow_accounts_payment_intent_id_key'
      and conrelid = 'public.escrow_accounts'::regclass
  ) then
    alter table public.escrow_accounts
      add constraint escrow_accounts_payment_intent_id_key unique (payment_intent_id);
  end if;
end $$;

create or replace function public.app_claim_payment_webhook_event(
  p_provider_name public.wallet_provider_name,
  p_provider_event_id text,
  p_signature text,
  p_payload jsonb,
  p_lease_seconds integer default 300,
  p_processing_token uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claimed_event_id uuid;
  v_processed_at timestamptz;
  v_lease_seconds integer := greatest(30, least(coalesce(p_lease_seconds, 300), 1800));
begin
  if p_provider_event_id is null or length(btrim(p_provider_event_id)) = 0
    or length(p_provider_event_id) > 255 then
    raise exception 'A valid provider event ID is required';
  end if;
  if p_processing_token is null then
    raise exception 'A payment webhook processing token is required';
  end if;

  insert into public.payment_webhook_events (
    provider_name,
    provider_event_id,
    signature,
    payload,
    processing_started_at,
    processing_token,
    attempt_count,
    created_at
  )
  values (
    p_provider_name,
    p_provider_event_id,
    p_signature,
    coalesce(p_payload, '{}'::jsonb),
    now(),
    p_processing_token,
    1,
    now()
  )
  on conflict (provider_name, provider_event_id) do update
  set
    signature = excluded.signature,
    payload = excluded.payload,
    processing_started_at = now(),
    processing_token = excluded.processing_token,
    attempt_count = public.payment_webhook_events.attempt_count + 1,
    processing_error = null
  where public.payment_webhook_events.processed_at is null
    and (
      public.payment_webhook_events.processing_started_at is null
      or public.payment_webhook_events.processing_started_at
        < now() - make_interval(secs => v_lease_seconds)
    )
  returning webhook_event_id into v_claimed_event_id;

  if v_claimed_event_id is not null then
    return 'claimed';
  end if;

  select processed_at
  into v_processed_at
  from public.payment_webhook_events
  where provider_name = p_provider_name
    and provider_event_id = p_provider_event_id;

  if v_processed_at is not null then
    return 'processed';
  end if;

  return 'busy';
end;
$$;

create or replace function public.app_complete_payment_webhook_event(
  p_provider_name public.wallet_provider_name,
  p_provider_event_id text,
  p_processing_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.payment_webhook_events
  set
    processed_at = now(),
    processing_started_at = null,
    processing_token = null,
    processing_error = null
  where provider_name = p_provider_name
    and provider_event_id = p_provider_event_id
    and processing_token = p_processing_token
    and processed_at is null;

  return found;
end;
$$;

create or replace function public.app_fail_payment_webhook_event(
  p_provider_name public.wallet_provider_name,
  p_provider_event_id text,
  p_processing_token uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.payment_webhook_events
  set
    processing_started_at = null,
    processing_token = null,
    processing_error = left(coalesce(p_error, 'Payment webhook processing failed'), 2000)
  where provider_name = p_provider_name
    and provider_event_id = p_provider_event_id
    and processing_token = p_processing_token
    and processed_at is null;

  return found;
end;
$$;

create or replace function public.app_upsert_wallet_subscription(
  p_user_id uuid,
  p_provider_name public.wallet_provider_name,
  p_provider_subscription_id text,
  p_plan_code text,
  p_plan_name text,
  p_amount numeric,
  p_currency_code text,
  p_corridor_id text,
  p_renewal_at timestamptz,
  p_metadata jsonb
)
returns public.wallet_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription public.wallet_subscriptions;
begin
  insert into public.wallet_subscriptions (
    user_id,
    provider_name,
    provider_subscription_id,
    plan_code,
    plan_name,
    amount,
    currency_code,
    subscription_status,
    corridor_id,
    renewal_at,
    metadata,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    p_provider_name,
    p_provider_subscription_id,
    p_plan_code,
    p_plan_name,
    p_amount,
    p_currency_code,
    'active',
    p_corridor_id,
    p_renewal_at,
    coalesce(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (user_id)
    where subscription_status in ('trialing', 'active', 'past_due', 'paused')
  do update set
    provider_name = excluded.provider_name,
    provider_subscription_id = excluded.provider_subscription_id,
    plan_code = excluded.plan_code,
    plan_name = excluded.plan_name,
    amount = excluded.amount,
    currency_code = excluded.currency_code,
    subscription_status = 'active',
    corridor_id = excluded.corridor_id,
    renewal_at = excluded.renewal_at,
    metadata = excluded.metadata,
    updated_at = now()
  returning * into v_subscription;

  return v_subscription;
end;
$$;

revoke all on function public.app_claim_payment_webhook_event(public.wallet_provider_name, text, text, jsonb, integer, uuid) from public, anon, authenticated;
revoke all on function public.app_complete_payment_webhook_event(public.wallet_provider_name, text, uuid) from public, anon, authenticated;
revoke all on function public.app_fail_payment_webhook_event(public.wallet_provider_name, text, uuid, text) from public, anon, authenticated;
revoke all on function public.app_upsert_wallet_subscription(uuid, public.wallet_provider_name, text, text, text, numeric, text, text, timestamptz, jsonb) from public, anon, authenticated;

grant execute on function public.app_claim_payment_webhook_event(public.wallet_provider_name, text, text, jsonb, integer, uuid) to service_role;
grant execute on function public.app_complete_payment_webhook_event(public.wallet_provider_name, text, uuid) to service_role;
grant execute on function public.app_fail_payment_webhook_event(public.wallet_provider_name, text, uuid, text) to service_role;
grant execute on function public.app_upsert_wallet_subscription(uuid, public.wallet_provider_name, text, text, text, numeric, text, text, timestamptz, jsonb) to service_role;

commit;
