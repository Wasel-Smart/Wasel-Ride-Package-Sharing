alter table public.wallets
  add column if not exists auto_top_up_enabled boolean not null default false,
  add column if not exists auto_top_up_amount numeric(14,3) not null default 20,
  add column if not exists auto_top_up_threshold numeric(14,3) not null default 5,
  add column if not exists pin_hash text;

create index if not exists idx_wallets_user_status
  on public.wallets (user_id, wallet_status);

create index if not exists idx_transactions_wallet_created
  on public.transactions (wallet_id, created_at desc);
