-- Bind public wallet RPCs to the authenticated account. These functions run
-- as SECURITY DEFINER, so RLS alone cannot protect a caller-supplied user ID.
-- Service-role Edge Functions remain allowed to execute trusted workflows.

create or replace function public.app_transfer_wallet_funds(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_amount numeric,
  p_payment_method payment_method_v2 default 'wallet_balance'
)
returns table (debit_transaction_id uuid, credit_transaction_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from_wallet uuid;
  v_to_wallet uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() is distinct from p_from_user_id) then
    raise exception 'Wallet transfers must be initiated by the account owner'
      using errcode = '42501';
  end if;

  if p_from_user_id = p_to_user_id then
    raise exception 'Source and destination wallets must be different';
  end if;

  if p_amount <= 0 then
    raise exception 'Transfer amount must be positive';
  end if;

  if not public.check_rate_limit(p_from_user_id, 'transfer_wallet_funds', 10, 15) then
    raise exception 'Too many transfer attempts. Please try again later.';
  end if;

  select wallet_id into v_from_wallet from public.wallets where user_id = p_from_user_id;
  select wallet_id into v_to_wallet from public.wallets where user_id = p_to_user_id;
  if v_from_wallet is null or v_to_wallet is null then
    raise exception 'Source or destination wallet not found';
  end if;

  debit_transaction_id := public.wallet_post_transaction(
    v_from_wallet, p_amount, 'transfer_funds', p_payment_method, 'debit',
    'wallet', v_to_wallet, jsonb_build_object('to_user_id', p_to_user_id)
  );
  credit_transaction_id := public.wallet_post_transaction(
    v_to_wallet, p_amount, 'transfer_funds', p_payment_method, 'credit',
    'wallet', v_from_wallet, jsonb_build_object('from_user_id', p_from_user_id)
  );
  return next;
end;
$$;

create or replace function public.app_withdraw_wallet_funds(
  p_user_id uuid,
  p_amount numeric,
  p_bank_account text,
  p_method text default 'bank_transfer'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_id uuid;
  v_balance numeric;
  v_tx_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() is distinct from p_user_id) then
    raise exception 'Wallet withdrawals must be initiated by the account owner'
      using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  select wallet_id, balance into v_wallet_id, v_balance
  from public.wallets
  where user_id = p_user_id and wallet_status = 'active'
  for update;

  if v_wallet_id is null then
    raise exception 'Wallet not found or inactive';
  end if;
  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.wallets
  set balance = balance - p_amount, updated_at = now()
  where wallet_id = v_wallet_id;

  insert into public.transactions (
    wallet_id, amount, transaction_type, payment_method, transaction_status,
    direction, reference_type, metadata
  ) values (
    v_wallet_id, p_amount, 'withdrawal',
    case p_method when 'instant' then 'bank_transfer' else p_method end,
    'posted', 'debit', 'bank_account',
    jsonb_build_object('bank_account', p_bank_account, 'requested_via', p_method)
  ) returning transaction_id into v_tx_id;

  return jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'new_balance', v_balance - p_amount);
end;
$$;

create or replace function public.app_pay_with_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type transaction_type_v2 default 'purchase',
  p_payment_method payment_method_v2 default 'wallet_balance',
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_id uuid;
  v_transaction_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
    and (auth.uid() is null or auth.uid() is distinct from p_user_id) then
    raise exception 'Wallet payments must be initiated by the account owner'
      using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select wallet_id into v_wallet_id from public.wallets where user_id = p_user_id;
  if v_wallet_id is null then
    raise exception 'Wallet not found';
  end if;

  v_transaction_id := public.wallet_post_transaction(
    v_wallet_id, p_amount, p_transaction_type, p_payment_method, 'debit',
    p_reference_type, p_reference_id, p_metadata
  );
  return v_transaction_id;
end;
$$;

revoke execute on function public.app_transfer_wallet_funds(uuid, uuid, numeric, payment_method_v2)
  from public, anon;
revoke execute on function public.app_withdraw_wallet_funds(uuid, numeric, text, text)
  from public, anon;
revoke execute on function public.app_pay_with_wallet(uuid, numeric, transaction_type_v2, payment_method_v2, text, uuid, jsonb)
  from public, anon;

grant execute on function public.app_transfer_wallet_funds(uuid, uuid, numeric, payment_method_v2)
  to authenticated, service_role;
grant execute on function public.app_withdraw_wallet_funds(uuid, numeric, text, text)
  to authenticated, service_role;
grant execute on function public.app_pay_with_wallet(uuid, numeric, transaction_type_v2, payment_method_v2, text, uuid, jsonb)
  to authenticated, service_role;
