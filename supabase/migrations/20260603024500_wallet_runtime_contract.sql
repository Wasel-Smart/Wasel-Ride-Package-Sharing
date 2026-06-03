alter table public.wallets
  add column if not exists auto_top_up_enabled boolean not null default false,
  add column if not exists auto_top_up_amount numeric(14,3) not null default 20,
  add column if not exists auto_top_up_threshold numeric(14,3) not null default 5,
  add column if not exists pin_hash text;

create index if not exists idx_wallets_user_status
  on public.wallets (user_id, wallet_status);

create index if not exists idx_transactions_wallet_created
  on public.transactions (wallet_id, created_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  stripe_product_id text,
  status text not null default 'incomplete'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  plan text not null default 'premium'
    check (plan in ('basic', 'premium', 'enterprise')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  ended_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions
  for select
  using (user_id = public.current_user_id() or public.is_admin());

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_sub on public.subscriptions(stripe_subscription_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_period_end
  on public.subscriptions(current_period_end)
  where status in ('active', 'trialing');

grant select on public.subscriptions to authenticated;
