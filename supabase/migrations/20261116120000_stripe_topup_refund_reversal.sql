-- Reverse a wallet top-up when Stripe refunds the card payment that funded it.
--
-- A top-up credits the wallet when Stripe confirms payment. If the cardholder is then
-- refunded (dashboard refund, lost dispute, automatic refund), Stripe returns the money
-- to the card while the wallet still holds the credit: the platform pays twice. This
-- function takes the credit back, atomically, using the same ledger primitive every
-- other wallet movement uses (public.wallet_post_transaction), so the ledger and the
-- balance stay consistent.
--
-- Policy for money that has already been spent:
--   * The wallet is debited only for what it still holds. A balance is never driven
--     negative and a spent ride is never silently unwound.
--   * Whatever could not be taken back is recorded on the top-up row as
--     refund_shortfall_jod and reported to the caller ('reversed_with_shortfall'), so
--     finance can recover it deliberately. The platform bears that loss until then.
--
-- Safe to call repeatedly: Stripe reports the cumulative refunded amount, and only the
-- difference from what has already been reversed is applied.

-- The top-up is found through the payment intent Stripe stored in the finalized
-- webhook payload. This index keeps that lookup from scanning the ledger.
create index if not exists transactions_stripe_topup_intent_idx
  on public.transactions ((metadata -> 'provider_payload' -> 'data' -> 'object' ->> 'payment_intent'))
  where transaction_type = 'add_funds';

create or replace function public.app_reverse_stripe_topup_refund(
  p_payment_intent_id    text,
  p_charge_id            text,
  p_amount_refunded_jod  numeric,
  p_event_id             text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx             record;
  v_balance        numeric;
  v_target         numeric;
  v_already        numeric;
  v_prev_shortfall numeric;
  v_delta          numeric;
  v_reversible     numeric;
  v_shortfall      numeric;
begin
  if p_payment_intent_id is null or p_payment_intent_id !~ '^pi_' then
    raise exception 'invalid payment intent' using errcode = '22023';
  end if;
  if p_amount_refunded_jod is null or p_amount_refunded_jod <= 0 then
    raise exception 'invalid refund amount' using errcode = '22023';
  end if;

  select t.transaction_id, t.wallet_id, t.amount, t.metadata
    into v_tx
    from public.transactions t
   where t.transaction_type = 'add_funds'
     and t.transaction_status = 'posted'
     and t.metadata -> 'provider_payload' -> 'data' -> 'object' ->> 'payment_intent' = p_payment_intent_id
   order by t.created_at
   limit 1
   for update;

  if not found then
    return 'not_a_topup';
  end if;

  select w.balance
    into v_balance
    from public.wallets w
   where w.wallet_id = v_tx.wallet_id
   for update;

  if not found then
    raise exception 'wallet % for top-up % was not found', v_tx.wallet_id, v_tx.transaction_id;
  end if;

  v_already        := coalesce((v_tx.metadata ->> 'refunded_jod')::numeric, 0);
  v_prev_shortfall := coalesce((v_tx.metadata ->> 'refund_shortfall_jod')::numeric, 0);
  v_target         := round(least(p_amount_refunded_jod, v_tx.amount), 3);
  v_delta          := v_target - v_already;

  if v_delta <= 0 then
    return 'already_applied';
  end if;

  v_reversible := least(v_delta, v_balance);
  v_shortfall  := v_delta - v_reversible;

  if v_reversible > 0 then
    perform public.wallet_post_transaction(
      v_tx.wallet_id,
      v_reversible,
      'refund',
      'card_payment',
      'debit',
      'topup_refund',
      v_tx.transaction_id,
      jsonb_build_object(
        'stripe_payment_intent', p_payment_intent_id,
        'stripe_charge', p_charge_id,
        'stripe_event', p_event_id,
        'topup_transaction_id', v_tx.transaction_id,
        'refund_shortfall_jod', v_shortfall
      )
    );
  end if;

  update public.transactions
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'refunded_jod', v_target,
           'refund_shortfall_jod', v_prev_shortfall + v_shortfall,
           'last_refund_event', p_event_id
         ),
         updated_at = timezone('utc', now())
   where transaction_id = v_tx.transaction_id;

  return case when v_shortfall > 0 then 'reversed_with_shortfall' else 'reversed' end;
end;
$$;

revoke all on function public.app_reverse_stripe_topup_refund(text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.app_reverse_stripe_topup_refund(text, text, numeric, text) to service_role;
