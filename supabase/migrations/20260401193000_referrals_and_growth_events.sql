alter table if exists public.users
  add column if not exists referral_code text;

create unique index if not exists users_referral_code_unique
  on public.users (referral_code)
  where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.users(id) on delete cascade,
  referee_id uuid not null references public.users(id) on delete cascade,
  referral_code text not null,
  referrer_reward_jod numeric(10, 2) not null default 2.00,
  referee_reward_jod numeric(10, 2) not null default 0.00,
  referee_completed_first_trip boolean not null default false,
  referrer_rewarded boolean not null default false,
  redeemed_at timestamptz,
  completed_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referee_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_referee_idx on public.referrals (referee_id);
create index if not exists referrals_code_idx on public.referrals (referral_code);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
on public.referrals
for select
using (
  auth.uid() in (
    select auth_user_id from public.users where id = referrer_id
    union
    select auth_user_id from public.users where id = referee_id
  )
);

drop policy if exists "referrals_insert_referee" on public.referrals;
create policy "referrals_insert_referee"
on public.referrals
for insert
with check (
  auth.uid() in (
    select auth_user_id from public.users where id = referee_id
  )
);

drop policy if exists "referrals_update_participants" on public.referrals;
create policy "referrals_update_participants"
on public.referrals
for update
using (
  auth.uid() in (
    select auth_user_id from public.users where id = referrer_id
    union
    select auth_user_id from public.users where id = referee_id
  )
);

create table if not exists public.growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_name text not null,
  funnel_stage text not null,
  service_type text not null,
  route_from text,
  route_to text,
  monetary_value_jod numeric(10, 2) not null default 0.00,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists growth_events_user_idx on public.growth_events (user_id, created_at desc);
create index if not exists growth_events_service_idx on public.growth_events (service_type, funnel_stage);

alter table public.growth_events enable row level security;

drop policy if exists "growth_events_select_own" on public.growth_events;
create policy "growth_events_select_own"
on public.growth_events
for select
using (
  user_id is null
  or auth.uid() in (
    select auth_user_id from public.users where id = user_id
  )
);

drop policy if exists "growth_events_insert_own" on public.growth_events;
create policy "growth_events_insert_own"
on public.growth_events
for insert
with check (
  user_id is null
  or auth.uid() in (
    select auth_user_id from public.users where id = user_id
  )
);
