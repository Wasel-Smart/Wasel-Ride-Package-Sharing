-- Migration: validate previously NOT VALID constraints
-- These were added in 20260512000000_database_excellence_upgrade.sql
-- with NOT VALID to avoid table locks. Now we validate them in background.
-- Run during a low-traffic window.

-- Validate phone format on users
alter table public.users
  validate constraint users_phone_e164_format;

-- Validate booking amount calculation
-- Note: only validate if the constraint exists and the column formula is correct
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'bookings'
      and constraint_name = 'bookings_amount_matches_calculation'
  ) then
    execute 'alter table public.bookings validate constraint bookings_amount_matches_calculation';
    raise notice 'bookings_amount_matches_calculation validated';
  else
    raise notice 'bookings_amount_matches_calculation not found, skipping';
  end if;
end $$;

-- Validate transaction metadata is object
alter table public.transactions
  validate constraint transactions_metadata_is_object;

-- Add missing updated_at trigger on wallets if not present
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.triggers
    where event_object_schema = 'public'
      and event_object_table  = 'wallets'
      and trigger_name        = 'trg_wallets_updated_at'
  ) then
    execute $t$
      create trigger trg_wallets_updated_at
        before update on public.wallets
        for each row
        execute function public.set_updated_at()
    $t$;
    raise notice 'trg_wallets_updated_at created';
  end if;
end $$;
