begin;

create schema if not exists private;

do $$
begin
  create type public.wallet_profile_status as enum ('active', 'limited', 'suspended', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_account_scope as enum (
    'user_available',
    'user_escrow',
    'provider_clearing',
    'platform_escrow',
    'payout_clearing',
    'revenue',
    'opening_balance'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_normal_balance as enum ('debit', 'credit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_account_status as enum ('active', 'suspended', 'closed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_provider_name as enum ('stripe', 'cliq', 'aman', 'wallet');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_payment_method_type as enum ('card', 'wallet', 'bank_transfer', 'cliq');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_transaction_type as enum (
    'deposit',
    'withdrawal',
    'transfer',
    'escrow_hold',
    'escrow_release',
    'refund',
    'payment'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_transaction_status as enum (
    'pending',
    'processing',
    'requires_action',
    'authorized',
    'posted',
    'completed',
    'failed',
    'refunded',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_entry_side as enum ('debit', 'credit');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_payment_intent_purpose as enum (
    'deposit',
    'ride_payment',
    'package_payment',
    'subscription',
    'withdrawal'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_payment_intent_status as enum (
    'created',
    'requires_confirmation',
    'requires_action',
    'processing',
    'webhook_received',
    'succeeded',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_escrow_status as enum (
    'pending',
    'held',
    'released',
    'refunded',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_payout_status as enum (
    'pending',
    'processing',
    'paid',
    'failed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_subscription_status as enum (
    'trialing',
    'active',
    'past_due',
    'paused',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_step_up_purpose as enum (
    'transfer',
    'withdrawal',
    'payment_method',
    'deposit',
    'subscription'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.wallet_step_up_channel as enum ('email', 'sms');
exception
  when duplicate_object then null;
end $$;

alter table public.wallets
  add column if not exists auto_top_up_enabled boolean not null default false,
  add column if not exists auto_top_up_amount numeric(18,3) not null default 20,
  add column if not exists auto_top_up_threshold numeric(18,3) not null default 5;

create table if not exists public.wallet_profiles (
  wallet_profile_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  wallet_status public.wallet_profile_status not null default 'active',
  currency_code text not null default 'JOD',
  auto_top_up_enabled boolean not null default false,
  auto_top_up_amount numeric(18,3) not null default 20,
  auto_top_up_threshold numeric(18,3) not null default 5,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wallet_accounts (
  account_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid null references public.users(id) on delete cascade,
  account_scope public.wallet_account_scope not null,
  account_name text not null,
  currency_code text not null default 'JOD',
  normal_balance public.wallet_normal_balance not null,
  account_status public.wallet_account_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wallet_accounts_owner_scope_uidx
  on public.wallet_accounts(owner_user_id, account_scope, currency_code)
  where owner_user_id is not null;

create unique index if not exists wallet_accounts_system_scope_uidx
  on public.wallet_accounts(account_scope, currency_code)
  where owner_user_id is null
    and account_scope <> 'platform_escrow';

create table if not exists public.wallet_payment_intents (
  payment_intent_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose public.wallet_payment_intent_purpose not null,
  status public.wallet_payment_intent_status not null default 'created',
  payment_method_type public.wallet_payment_method_type not null,
  provider_name public.wallet_provider_name not null,
  amount numeric(18,3) not null check (amount > 0),
  currency_code text not null default 'JOD',
  provider_payment_id text null,
  provider_client_secret text null,
  idempotency_key text null,
  reference_type text null,
  reference_id text null,
  redirect_url text null,
  last_error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz null,
  confirmed_at timestamptz null,
  unique(provider_name, provider_payment_id),
  unique(idempotency_key)
);

create table if not exists public.wallet_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  initiated_by_user_id uuid null references public.users(id) on delete set null,
  payment_intent_id uuid null references public.wallet_payment_intents(payment_intent_id) on delete set null,
  transaction_type public.wallet_transaction_type not null,
  transaction_status public.wallet_transaction_status not null default 'pending',
  amount numeric(18,3) not null check (amount > 0),
  currency_code text not null default 'JOD',
  description text not null,
  reference_type text null,
  reference_id text null,
  idempotency_key text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  posted_at timestamptz null,
  unique(idempotency_key)
);

create index if not exists wallet_transactions_status_created_idx
  on public.wallet_transactions(transaction_status, created_at desc);

create index if not exists wallet_transactions_payment_intent_idx
  on public.wallet_transactions(payment_intent_id)
  where payment_intent_id is not null;

create table if not exists public.wallet_transaction_participants (
  transaction_id uuid not null references public.wallet_transactions(transaction_id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  relationship text not null default 'participant'
    check (relationship in ('participant', 'payer', 'beneficiary', 'counterparty')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (transaction_id, user_id)
);

create index if not exists wallet_transaction_participants_user_idx
  on public.wallet_transaction_participants(user_id, created_at desc);

create table if not exists public.ledger_entries (
  ledger_entry_id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.wallet_transactions(transaction_id) on delete cascade,
  account_id uuid not null references public.wallet_accounts(account_id) on delete restrict,
  entry_side public.wallet_entry_side not null,
  amount numeric(18,3) not null check (amount > 0),
  currency_code text not null default 'JOD',
  memo text null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ledger_entries_transaction_idx
  on public.ledger_entries(transaction_id);

create index if not exists ledger_entries_account_idx
  on public.ledger_entries(account_id, created_at desc);

create table if not exists public.wallet_payment_methods (
  payment_method_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  method_type public.wallet_payment_method_type not null,
  provider_name public.wallet_provider_name not null,
  provider_reference text not null,
  label text null,
  brand text null,
  last4 text null,
  expiry_month integer null check (expiry_month between 1 and 12),
  expiry_year integer null check (expiry_year between 2000 and 9999),
  is_default boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'pending_verification', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wallet_payment_methods_provider_ref_uidx
  on public.wallet_payment_methods(provider_name, provider_reference);

create unique index if not exists wallet_payment_methods_default_uidx
  on public.wallet_payment_methods(user_id)
  where is_default = true and status = 'active';

create table if not exists public.escrow_accounts (
  escrow_account_id uuid primary key default gen_random_uuid(),
  payer_user_id uuid not null references public.users(id) on delete cascade,
  beneficiary_user_id uuid not null references public.users(id) on delete cascade,
  payer_account_id uuid not null references public.wallet_accounts(account_id) on delete restrict,
  beneficiary_account_id uuid not null references public.wallet_accounts(account_id) on delete restrict,
  ledger_account_id uuid not null unique references public.wallet_accounts(account_id) on delete restrict,
  payment_intent_id uuid null references public.wallet_payment_intents(payment_intent_id) on delete set null,
  hold_transaction_id uuid null references public.wallet_transactions(transaction_id) on delete set null,
  release_transaction_id uuid null references public.wallet_transactions(transaction_id) on delete set null,
  refund_transaction_id uuid null references public.wallet_transactions(transaction_id) on delete set null,
  escrow_type text not null check (escrow_type in ('ride', 'package')),
  reference_id text not null,
  amount numeric(18,3) not null check (amount > 0),
  currency_code text not null default 'JOD',
  escrow_state public.wallet_escrow_status not null default 'pending',
  expires_at timestamptz null,
  held_at timestamptz null,
  released_at timestamptz null,
  refunded_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists escrow_accounts_user_state_idx
  on public.escrow_accounts(payer_user_id, beneficiary_user_id, escrow_state, created_at desc);

create index if not exists escrow_accounts_reference_idx
  on public.escrow_accounts(escrow_type, reference_id);

create table if not exists public.wallet_payout_requests (
  payout_request_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source_account_id uuid not null references public.wallet_accounts(account_id) on delete restrict,
  payment_method_id uuid null references public.wallet_payment_methods(payment_method_id) on delete set null,
  amount numeric(18,3) not null check (amount > 0),
  currency_code text not null default 'JOD',
  provider_name public.wallet_provider_name not null,
  provider_reference text null,
  payout_status public.wallet_payout_status not null default 'pending',
  failure_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz null
);

create index if not exists wallet_payout_requests_user_idx
  on public.wallet_payout_requests(user_id, payout_status, created_at desc);

create table if not exists public.wallet_subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider_name public.wallet_provider_name not null,
  provider_subscription_id text null,
  plan_code text not null,
  plan_name text not null,
  amount numeric(18,3) not null check (amount >= 0),
  currency_code text not null default 'JOD',
  subscription_status public.wallet_subscription_status not null default 'active',
  corridor_id text null,
  renewal_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists wallet_subscriptions_active_user_uidx
  on public.wallet_subscriptions(user_id)
  where subscription_status in ('trialing', 'active', 'past_due', 'paused');

create table if not exists public.payment_webhook_events (
  webhook_event_id uuid primary key default gen_random_uuid(),
  provider_name public.wallet_provider_name not null,
  provider_event_id text not null,
  signature text null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  processing_error text null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(provider_name, provider_event_id)
);

create table if not exists private.wallet_pin_secrets (
  user_id uuid primary key references public.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  pin_updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists private.wallet_step_up_challenges (
  challenge_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose public.wallet_step_up_purpose not null,
  delivery_channel public.wallet_step_up_channel not null,
  destination text null,
  otp_hash text not null,
  attempts_count integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists wallet_step_up_challenges_user_idx
  on private.wallet_step_up_challenges(user_id, purpose, expires_at desc);

create table if not exists private.wallet_step_up_tokens (
  token_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  purpose public.wallet_step_up_purpose not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace view public.wallet_account_balances as
select
  accounts.account_id,
  accounts.owner_user_id,
  accounts.account_scope,
  accounts.currency_code,
  coalesce(sum(
    case
      when entries.entry_side::text = accounts.normal_balance::text then entries.amount
      else -entries.amount
    end
  ), 0)::numeric(18,3) as balance
from public.wallet_accounts as accounts
left join public.ledger_entries as entries
  on entries.account_id = accounts.account_id
group by
  accounts.account_id,
  accounts.owner_user_id,
  accounts.account_scope,
  accounts.currency_code,
  accounts.normal_balance;

create or replace view public.wallet_user_balances as
select
  profiles.user_id,
  profiles.currency_code,
  coalesce(available.balance, 0)::numeric(18,3) as available_balance,
  coalesce(escrow.balance, 0)::numeric(18,3) as pending_balance
from public.wallet_profiles as profiles
left join public.wallet_account_balances as available
  on available.owner_user_id = profiles.user_id
 and available.account_scope = 'user_available'
left join public.wallet_account_balances as escrow
  on escrow.owner_user_id = profiles.user_id
 and escrow.account_scope = 'user_escrow';

create or replace function public.wallet_post_ledger_transaction(
  p_transaction_type public.wallet_transaction_type,
  p_transaction_status public.wallet_transaction_status,
  p_initiated_by_user_id uuid,
  p_amount numeric,
  p_currency_code text,
  p_description text,
  p_reference_type text,
  p_reference_id text,
  p_metadata jsonb,
  p_entries jsonb,
  p_participants uuid[] default null,
  p_payment_intent_id uuid default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction_id uuid;
  v_entry jsonb;
  v_account_id uuid;
  v_entry_side public.wallet_entry_side;
  v_entry_amount numeric;
  v_total_debits numeric := 0;
  v_total_credits numeric := 0;
  v_participant uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Ledger transaction amount must be positive';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) < 2 then
    raise exception 'Ledger transactions require at least two balanced entries';
  end if;

  if p_idempotency_key is not null then
    select transaction_id
    into v_transaction_id
    from public.wallet_transactions
    where idempotency_key = p_idempotency_key;

    if v_transaction_id is not null then
      return v_transaction_id;
    end if;
  end if;

  insert into public.wallet_transactions (
    initiated_by_user_id,
    payment_intent_id,
    transaction_type,
    transaction_status,
    amount,
    currency_code,
    description,
    reference_type,
    reference_id,
    idempotency_key,
    metadata,
    posted_at,
    updated_at
  )
  values (
    p_initiated_by_user_id,
    p_payment_intent_id,
    p_transaction_type,
    p_transaction_status,
    p_amount,
    coalesce(nullif(trim(p_currency_code), ''), 'JOD'),
    coalesce(nullif(trim(p_description), ''), initcap(replace(p_transaction_type::text, '_', ' '))),
    nullif(trim(coalesce(p_reference_type, '')), ''),
    nullif(trim(coalesce(p_reference_id, '')), ''),
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    coalesce(p_metadata, '{}'::jsonb),
    case when p_transaction_status in ('posted', 'completed', 'refunded') then timezone('utc', now()) else null end,
    timezone('utc', now())
  )
  returning transaction_id into v_transaction_id;

  for v_entry in
    select value
    from jsonb_array_elements(p_entries)
  loop
    v_account_id := nullif(trim(coalesce(v_entry ->> 'account_id', '')), '')::uuid;
    v_entry_side := coalesce(nullif(trim(coalesce(v_entry ->> 'entry_side', '')), ''), 'debit')::public.wallet_entry_side;
    v_entry_amount := nullif(trim(coalesce(v_entry ->> 'amount', '')), '')::numeric;

    if v_account_id is null or v_entry_amount is null or v_entry_amount <= 0 then
      raise exception 'Each ledger entry must include a valid account_id and positive amount';
    end if;

    perform 1
    from public.wallet_accounts
    where account_id = v_account_id
      and currency_code = coalesce(nullif(trim(p_currency_code), ''), 'JOD');

    if not found then
      raise exception 'Ledger entry account % is missing or uses a different currency', v_account_id;
    end if;

    insert into public.ledger_entries (
      transaction_id,
      account_id,
      entry_side,
      amount,
      currency_code,
      memo
    )
    values (
      v_transaction_id,
      v_account_id,
      v_entry_side,
      v_entry_amount,
      coalesce(nullif(trim(p_currency_code), ''), 'JOD'),
      nullif(trim(coalesce(v_entry ->> 'memo', '')), '')
    );

    if v_entry_side = 'debit' then
      v_total_debits := v_total_debits + v_entry_amount;
    else
      v_total_credits := v_total_credits + v_entry_amount;
    end if;
  end loop;

  if round(v_total_debits::numeric, 3) <> round(v_total_credits::numeric, 3) then
    raise exception 'Ledger entries must balance exactly';
  end if;

  if p_participants is not null then
    foreach v_participant in array p_participants
    loop
      if v_participant is not null then
        insert into public.wallet_transaction_participants (transaction_id, user_id, relationship)
        values (v_transaction_id, v_participant, 'participant')
        on conflict (transaction_id, user_id) do nothing;
      end if;
    end loop;
  elsif p_initiated_by_user_id is not null then
    insert into public.wallet_transaction_participants (transaction_id, user_id, relationship)
    values (v_transaction_id, p_initiated_by_user_id, 'participant')
    on conflict (transaction_id, user_id) do nothing;
  end if;

  return v_transaction_id;
end;
$$;

revoke all on function public.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) to service_role;

insert into public.wallet_profiles (
  user_id,
  wallet_status,
  currency_code,
  auto_top_up_enabled,
  auto_top_up_amount,
  auto_top_up_threshold,
  created_at,
  updated_at
)
select
  users.id,
  case
    when wallets.wallet_status::text in ('frozen', 'suspended', 'limited') then 'suspended'::public.wallet_profile_status
    when wallets.wallet_status::text = 'closed' then 'closed'::public.wallet_profile_status
    else 'active'::public.wallet_profile_status
  end,
  coalesce(wallets.currency_code, 'JOD'),
  coalesce(wallets.auto_top_up_enabled, false),
  coalesce(wallets.auto_top_up_amount, 20),
  coalesce(wallets.auto_top_up_threshold, 5),
  coalesce(wallets.created_at, timezone('utc', now())),
  timezone('utc', now())
from public.users
left join public.wallets
  on wallets.user_id = users.id
on conflict (user_id) do update
set
  currency_code = excluded.currency_code,
  auto_top_up_enabled = excluded.auto_top_up_enabled,
  auto_top_up_amount = excluded.auto_top_up_amount,
  auto_top_up_threshold = excluded.auto_top_up_threshold,
  updated_at = timezone('utc', now());

insert into public.wallet_accounts (
  owner_user_id,
  account_scope,
  account_name,
  currency_code,
  normal_balance
)
select
  profiles.user_id,
  'user_available',
  'User Available Wallet',
  profiles.currency_code,
  'credit'
from public.wallet_profiles as profiles
on conflict do nothing;

insert into public.wallet_accounts (
  owner_user_id,
  account_scope,
  account_name,
  currency_code,
  normal_balance
)
select
  profiles.user_id,
  'user_escrow',
  'User Escrow Wallet',
  profiles.currency_code,
  'credit'
from public.wallet_profiles as profiles
on conflict do nothing;

insert into public.wallet_accounts (
  owner_user_id,
  account_scope,
  account_name,
  currency_code,
  normal_balance
)
values
  (null, 'provider_clearing', 'Provider Clearing', 'JOD', 'debit'),
  (null, 'platform_escrow', 'Platform Escrow Control', 'JOD', 'credit'),
  (null, 'payout_clearing', 'Payout Clearing', 'JOD', 'credit'),
  (null, 'revenue', 'Platform Revenue', 'JOD', 'credit'),
  (null, 'opening_balance', 'Opening Balance Migration', 'JOD', 'debit')
on conflict do nothing;

do $$
declare
  v_opening_account uuid;
  v_available_account uuid;
  v_escrow_account uuid;
  v_legacy record;
begin
  select account_id
  into v_opening_account
  from public.wallet_accounts
  where owner_user_id is null
    and account_scope = 'opening_balance'
    and currency_code = 'JOD'
  limit 1;

  for v_legacy in
    select
      wallets.user_id,
      coalesce(wallets.balance, 0)::numeric(18,3) as balance_amount,
      coalesce(wallets.pending_balance, 0)::numeric(18,3) as pending_amount
    from public.wallets
    where coalesce(wallets.balance, 0) > 0
       or coalesce(wallets.pending_balance, 0) > 0
  loop
    select account_id
    into v_available_account
    from public.wallet_accounts
    where owner_user_id = v_legacy.user_id
      and account_scope = 'user_available'
    limit 1;

    select account_id
    into v_escrow_account
    from public.wallet_accounts
    where owner_user_id = v_legacy.user_id
      and account_scope = 'user_escrow'
    limit 1;

    if v_legacy.balance_amount > 0 then
      perform public.wallet_post_ledger_transaction(
        'deposit',
        'completed',
        v_legacy.user_id,
        v_legacy.balance_amount,
        'JOD',
        'Legacy wallet balance migration',
        'legacy_wallet',
        v_legacy.user_id::text,
        jsonb_build_object('migration', true, 'source', 'public.wallets.balance'),
        jsonb_build_array(
          jsonb_build_object('account_id', v_opening_account, 'entry_side', 'debit', 'amount', v_legacy.balance_amount),
          jsonb_build_object('account_id', v_available_account, 'entry_side', 'credit', 'amount', v_legacy.balance_amount)
        ),
        array[v_legacy.user_id],
        null,
        format('wallet-migration-available:%s', v_legacy.user_id)
      );
    end if;

    if v_legacy.pending_amount > 0 then
      perform public.wallet_post_ledger_transaction(
        'escrow_hold',
        'completed',
        v_legacy.user_id,
        v_legacy.pending_amount,
        'JOD',
        'Legacy pending balance migration',
        'legacy_wallet_pending',
        v_legacy.user_id::text,
        jsonb_build_object('migration', true, 'source', 'public.wallets.pending_balance'),
        jsonb_build_array(
          jsonb_build_object('account_id', v_opening_account, 'entry_side', 'debit', 'amount', v_legacy.pending_amount),
          jsonb_build_object('account_id', v_escrow_account, 'entry_side', 'credit', 'amount', v_legacy.pending_amount)
        ),
        array[v_legacy.user_id],
        null,
        format('wallet-migration-pending:%s', v_legacy.user_id)
      );
    end if;
  end loop;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wallets'
      and column_name = 'pin_hash'
  ) then
    insert into private.wallet_pin_secrets (user_id, pin_hash, created_at, updated_at, pin_updated_at)
    select
      wallets.user_id,
      wallets.pin_hash,
      coalesce(wallets.created_at, timezone('utc', now())),
      timezone('utc', now()),
      timezone('utc', now())
    from public.wallets
    where wallets.pin_hash is not null
    on conflict (user_id) do update
    set
      pin_hash = excluded.pin_hash,
      updated_at = timezone('utc', now()),
      pin_updated_at = timezone('utc', now());

    execute 'update public.wallets set pin_hash = null where pin_hash is not null';
  end if;
end $$;

alter table public.wallet_profiles enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_payment_intents enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_transaction_participants enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.wallet_payment_methods enable row level security;
alter table public.escrow_accounts enable row level security;
alter table public.wallet_payout_requests enable row level security;
alter table public.wallet_subscriptions enable row level security;
alter table public.payment_webhook_events enable row level security;

drop policy if exists wallet_profiles_select_own on public.wallet_profiles;
create policy wallet_profiles_select_own
  on public.wallet_profiles
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists wallet_accounts_select_own on public.wallet_accounts;
create policy wallet_accounts_select_own
  on public.wallet_accounts
  for select
  to authenticated
  using (owner_user_id = public.current_user_id());

drop policy if exists wallet_payment_intents_select_own on public.wallet_payment_intents;
create policy wallet_payment_intents_select_own
  on public.wallet_payment_intents
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists wallet_transactions_select_participants on public.wallet_transactions;
create policy wallet_transactions_select_participants
  on public.wallet_transactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wallet_transaction_participants as participants
      where participants.transaction_id = wallet_transactions.transaction_id
        and participants.user_id = public.current_user_id()
    )
  );

drop policy if exists wallet_transaction_participants_select_own on public.wallet_transaction_participants;
create policy wallet_transaction_participants_select_own
  on public.wallet_transaction_participants
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists ledger_entries_select_own on public.ledger_entries;
create policy ledger_entries_select_own
  on public.ledger_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wallet_accounts as accounts
      where accounts.account_id = ledger_entries.account_id
        and accounts.owner_user_id = public.current_user_id()
    )
  );

drop policy if exists wallet_payment_methods_select_own on public.wallet_payment_methods;
create policy wallet_payment_methods_select_own
  on public.wallet_payment_methods
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists escrow_accounts_select_own on public.escrow_accounts;
create policy escrow_accounts_select_own
  on public.escrow_accounts
  for select
  to authenticated
  using (
    payer_user_id = public.current_user_id()
    or beneficiary_user_id = public.current_user_id()
  );

drop policy if exists wallet_payout_requests_select_own on public.wallet_payout_requests;
create policy wallet_payout_requests_select_own
  on public.wallet_payout_requests
  for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists wallet_subscriptions_select_own on public.wallet_subscriptions;
create policy wallet_subscriptions_select_own
  on public.wallet_subscriptions
  for select
  to authenticated
  using (user_id = public.current_user_id());

revoke all on public.wallet_profiles from public, anon;
revoke all on public.wallet_accounts from public, anon;
revoke all on public.wallet_payment_intents from public, anon;
revoke all on public.wallet_transactions from public, anon;
revoke all on public.wallet_transaction_participants from public, anon;
revoke all on public.ledger_entries from public, anon;
revoke all on public.wallet_payment_methods from public, anon;
revoke all on public.escrow_accounts from public, anon;
revoke all on public.wallet_payout_requests from public, anon;
revoke all on public.wallet_subscriptions from public, anon;
revoke all on public.payment_webhook_events from public, anon, authenticated;

grant select on public.wallet_profiles to authenticated;
grant select on public.wallet_accounts to authenticated;
grant select on public.wallet_payment_intents to authenticated;
grant select on public.wallet_transactions to authenticated;
grant select on public.wallet_transaction_participants to authenticated;
grant select on public.ledger_entries to authenticated;
grant select on public.wallet_payment_methods to authenticated;
grant select on public.escrow_accounts to authenticated;
grant select on public.wallet_payout_requests to authenticated;
grant select on public.wallet_subscriptions to authenticated;
grant select on public.wallet_account_balances to authenticated;
grant select on public.wallet_user_balances to authenticated;

revoke execute on function public.app_add_wallet_funds(
  uuid, numeric, public.payment_method_v2, text
) from public, anon, authenticated;

revoke execute on function public.app_transfer_wallet_funds(
  uuid, uuid, numeric, public.payment_method_v2
) from public, anon, authenticated;

revoke execute on function public.app_book_trip(
  uuid, uuid, integer, public.payment_method_v2
) from public, anon, authenticated;

revoke execute on function public.app_assign_package_to_trip(
  uuid, uuid
) from public, anon, authenticated;

revoke execute on function public.app_credit_driver_earnings(uuid)
from public, anon, authenticated;

revoke execute on function public.app_confirm_package_delivery(
  uuid, uuid
) from public, anon, authenticated;

create or replace function public.app_add_wallet_funds(
  p_user_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method_v2,
  p_external_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Direct wallet credits are disabled. Use the secure payment intent API and verified webhooks.';
end;
$$;

create or replace function public.app_transfer_wallet_funds(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method_v2 default 'wallet_balance'
)
returns table (debit_transaction_id uuid, credit_transaction_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Direct wallet transfers are disabled. Use the secure wallet transfer API with step-up verification.';
end;
$$;

create or replace function public.app_book_trip(
  p_trip_id uuid,
  p_passenger_id uuid,
  p_seat_number integer,
  p_payment_method public.payment_method_v2 default 'wallet_balance'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Trip booking no longer debits wallets directly. Create a payment intent and wait for webhook settlement.';
end;
$$;

create or replace function public.app_assign_package_to_trip(
  p_package_id uuid,
  p_trip_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Package assignment no longer debits wallets directly. Create a payment intent and escrow hold instead.';
end;
$$;

create or replace function public.app_credit_driver_earnings(p_booking_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Driver earnings are released from escrow through the secure ledger service.';
end;
$$;

create or replace function public.app_confirm_package_delivery(
  p_package_id uuid,
  p_driver_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'Package delivery settlement is handled by the secure escrow release service.';
end;
$$;

commit;
