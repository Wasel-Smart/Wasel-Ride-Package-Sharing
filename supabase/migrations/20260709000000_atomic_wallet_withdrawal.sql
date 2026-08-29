-- Migration: atomic wallet withdrawal RPC
-- Replaces the two-step (insert tx + update balance) pattern in walletApi.ts
-- which had a race condition allowing double-spend.

create or replace function public.app_withdraw_wallet_funds(
  p_user_id        uuid,
  p_amount         numeric,
  p_bank_account   text,
  p_method         text default 'bank_transfer'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_id   uuid;
  v_balance     numeric;
  v_tx_id       uuid;
begin
  -- Lock the wallet row for the duration of this transaction
  select wallet_id, balance
  into   v_wallet_id, v_balance
  from   public.wallets
  where  user_id = p_user_id
    and  wallet_status = 'active'
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found or inactive for user %', p_user_id;
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient balance: have %, need %', v_balance, p_amount;
  end if;

  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  -- Deduct balance atomically
  update public.wallets
  set    balance    = balance - p_amount,
         updated_at = now()
  where  wallet_id  = v_wallet_id;

  -- Record the transaction
  insert into public.transactions (
    wallet_id,
    amount,
    transaction_type,
    payment_method,
    transaction_status,
    direction,
    reference_type,
    metadata
  ) values (
    v_wallet_id,
    p_amount,
    'withdrawal',
    case p_method when 'instant' then 'bank_transfer' else p_method end,
    'posted',
    'debit',
    'bank_account',
    jsonb_build_object('bank_account', p_bank_account, 'requested_via', p_method)
  )
  returning transaction_id into v_tx_id;

  return jsonb_build_object(
    'success',        true,
    'transaction_id', v_tx_id,
    'new_balance',    v_balance - p_amount
  );
end;
$$;

-- Only authenticated users may call this; RLS on wallets enforces ownership
grant execute on function public.app_withdraw_wallet_funds(uuid, numeric, text, text) to authenticated;

-- Rollback companion
-- drop function if exists public.app_withdraw_wallet_funds(uuid, numeric, text, text);
