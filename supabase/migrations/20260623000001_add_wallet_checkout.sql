-- Wallet Checkout Payments
-- Adds a simple checkout RPC that deducts from a user's wallet for purchases
-- The platform credit is handled separately by the backend

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
as $$
declare
  v_wallet_id uuid;
  v_transaction_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  select wallet_id into v_wallet_id from public.wallets where user_id = p_user_id;
  if v_wallet_id is null then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  v_transaction_id := public.wallet_post_transaction(
    v_wallet_id, p_amount, p_transaction_type, p_payment_method, 'debit',
    p_reference_type, p_reference_id, p_metadata
  );

  return v_transaction_id;
end;
$$;

grant execute on function public.app_pay_with_wallet(uuid, numeric, transaction_type_v2, payment_method_v2, text, uuid, jsonb) to authenticated;
