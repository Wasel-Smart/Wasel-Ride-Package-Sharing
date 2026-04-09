-- Final wallet/runtime integrity pass.
-- Responsibility boundary: schema hardening only. No data backfill or runtime-owned
-- side effects should be added here.

alter table public.wallets
  drop constraint if exists chk_wallets_non_negative_balances;
alter table public.wallets
  add constraint chk_wallets_non_negative_balances
  check (balance >= 0 and pending_balance >= 0);

alter table public.wallets
  drop constraint if exists chk_wallets_auto_top_up_bounds;
alter table public.wallets
  add constraint chk_wallets_auto_top_up_bounds
  check (auto_top_up_amount >= 0 and auto_top_up_threshold >= 0);

alter table public.transactions
  drop constraint if exists chk_transactions_positive_amount;
alter table public.transactions
  add constraint chk_transactions_positive_amount
  check (amount > 0);

alter table public.payment_methods
  drop constraint if exists chk_payment_methods_provider_present;
alter table public.payment_methods
  add constraint chk_payment_methods_provider_present
  check (nullif(btrim(provider), '') is not null);

alter table public.payment_methods
  drop constraint if exists chk_payment_methods_token_reference_present;
alter table public.payment_methods
  add constraint chk_payment_methods_token_reference_present
  check (nullif(btrim(token_reference), '') is not null);

alter table public.package_events
  drop constraint if exists chk_package_events_type_present;
alter table public.package_events
  add constraint chk_package_events_type_present
  check (nullif(btrim(event_type), '') is not null);

alter table public.package_events
  drop constraint if exists chk_package_events_status_present;
alter table public.package_events
  add constraint chk_package_events_status_present
  check (nullif(btrim(event_status), '') is not null);

create index if not exists idx_wallets_user_status
  on public.wallets (user_id, wallet_status);

create index if not exists idx_transactions_wallet_created_desc
  on public.transactions (wallet_id, created_at desc);

create index if not exists idx_transactions_reference_lookup
  on public.transactions (reference_type, reference_id)
  where reference_id is not null;

create index if not exists idx_payment_methods_active_default
  on public.payment_methods (user_id, is_default desc, updated_at desc)
  where status = 'active';
