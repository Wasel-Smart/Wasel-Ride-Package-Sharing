-- Atomic wallet top-up finalization.
--
-- The Stripe and CliQ webhooks finalize a wallet top-up by crediting the wallet
-- and marking the transaction 'posted'. That has to be one atomic step: a
-- half-applied top-up either charges the customer without crediting the wallet
-- or credits the wallet twice when the provider retries.
--
-- The edge function used to do this over a direct Postgres connection
-- (deno.land/x/postgres), which opens a fresh connection per webhook and
-- bypasses the platform connection pooler. This function moves the same logic
-- into the database so the edge can call it through PostgREST (admin.rpc),
-- which uses the pooler and needs no direct database credentials.
--
-- The behaviour matches the previous TypeScript implementation exactly:
--   - already 'posted'                        -> { applied: false, reason: 'already_posted' }
--   - only add_funds/credit is credited       -> anything else raises and rolls back
--   - provider amount/currency mismatch       -> metadata is stamped, nothing is credited
--   - wallet missing                          -> raises and rolls back
--   - otherwise                               -> wallet credited, row 'posted'
--
-- Access is service-role only, like every other money-moving RPC.

create or replace function public.app_finalize_wallet_top_up(
  p_transaction_id     text,
  p_external_reference text,
  p_provider           text,
  p_provider_payload   jsonb,
  p_expected_amount    numeric default null,
  p_expected_currency  text    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx                 record;
  v_wallet_id          uuid;
  v_stored_amount      numeric;
  v_recovered          boolean;
  v_currency_mismatch  boolean;
  v_amount_unverified  boolean;
  v_amount_mismatch    boolean;
  v_reason             text;
begin
  select t.transaction_id,
         t.wallet_id,
         t.amount,
         t.transaction_status,
         t.metadata,
         t.transaction_type,
         t.direction
    into v_tx
    from public.transactions t
   where t.transaction_id = p_transaction_id::uuid
     for update;

  if not found then
    raise exception 'Transaction % was not found', p_transaction_id using errcode = 'P0002';
  end if;

  if v_tx.transaction_status = 'posted' then
    return jsonb_build_object('applied', false, 'reason', 'already_posted');
  end if;

  -- Only credit add_funds/credit top-ups. Never credit debits or other types.
  if lower(v_tx.transaction_type::text) <> 'add_funds' or lower(v_tx.direction) <> 'credit' then
    raise exception 'Invalid top-up transaction type or direction' using errcode = '22023';
  end if;

  -- A signed "paid" event means real money arrived, so a row that an earlier
  -- failure event marked 'failed' is still credited.
  v_recovered := v_tx.transaction_status = 'failed';
  v_stored_amount := v_tx.amount;

  -- Never credit more than the provider says was paid. The 0.0051 tolerance
  -- absorbs the 3-decimal -> 2-decimal rounding of legacy rows.
  v_currency_mismatch := coalesce(
    p_expected_currency ~ '^[A-Za-z]{3}$' and lower(p_expected_currency) <> 'jod',
    false
  );
  v_amount_unverified := p_expected_amount is null or p_expected_amount <= 0;
  v_amount_mismatch   := not v_amount_unverified
                         and abs(p_expected_amount - v_stored_amount) > 0.0051;

  if v_currency_mismatch or v_amount_mismatch or v_amount_unverified then
    v_reason := case when v_amount_unverified then 'amount_unverified' else 'amount_mismatch' end;

    update public.transactions
       set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'amount_mismatch', jsonb_build_object(
               'provider', p_provider,
               'storedAmount', v_stored_amount,
               'paidAmount', p_expected_amount,
               'currency', nullif(trim(coalesce(p_expected_currency, '')), ''),
               'reason', v_reason
             )
           ),
           updated_at = timezone('utc', now())
     where transaction_id = v_tx.transaction_id;

    return jsonb_build_object('applied', false, 'reason', v_reason);
  end if;

  -- Lock the destination wallet and prove it exists before posting. Without
  -- this a missing wallet made the UPDATE match zero rows while the
  -- transaction was still marked 'posted'.
  select w.wallet_id
    into v_wallet_id
    from public.wallets w
   where w.wallet_id = v_tx.wallet_id
     for update;

  if v_wallet_id is null then
    raise exception 'Wallet % for transaction % was not found', v_tx.wallet_id, p_transaction_id
      using errcode = 'P0002';
  end if;

  update public.wallets
     set balance = balance + v_stored_amount,
         updated_at = timezone('utc', now())
   where wallet_id = v_wallet_id;

  update public.transactions
     set transaction_status = 'posted',
         reference_id = p_external_reference,
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
             'provider', p_provider,
             'provider_payload', p_provider_payload,
             'credited_via', p_provider || '_webhook',
             'recovered_from_failed', v_recovered
           ),
         updated_at = timezone('utc', now())
   where transaction_id = v_tx.transaction_id;

  return jsonb_build_object('applied', true);
end;
$$;

revoke all on function public.app_finalize_wallet_top_up(text, text, text, jsonb, numeric, text)
  from public, anon, authenticated;
grant execute on function public.app_finalize_wallet_top_up(text, text, text, jsonb, numeric, text)
  to service_role;