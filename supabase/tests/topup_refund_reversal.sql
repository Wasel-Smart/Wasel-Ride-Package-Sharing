-- Behavioural test for wallet top-up refund reversal. Run against a database that has
-- all migrations applied (CI: the "RLS Coverage (live database)" job):
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/topup_refund_reversal.sql
--
-- Runs inside one transaction that is rolled back; nothing is kept. A failed
-- expectation RAISEs, and ON_ERROR_STOP turns that into a non-zero exit.

begin;

do $$
declare
  v_user_id   uuid;
  v_wallet_id uuid;
  v_topup_id  uuid;
  v_result    text;
  v_balance   numeric;
  v_meta      jsonb;
  v_refunds   integer;
begin
  -- Fixture: a user with a wallet holding a posted 10 JOD card top-up.
  insert into public.users (full_name, phone_number, email)
  values ('Refund Test', '+962790000099', 'refund-test@example.invalid')
  returning id into v_user_id;

  select wallet_id into v_wallet_id from public.wallets where user_id = v_user_id;
  if v_wallet_id is null then
    insert into public.wallets (user_id) values (v_user_id) returning wallet_id into v_wallet_id;
  end if;

  update public.wallets set balance = 10 where wallet_id = v_wallet_id;

  insert into public.transactions (
    wallet_id, amount, transaction_type, payment_method, transaction_status,
    direction, reference_type, metadata
  )
  values (
    v_wallet_id, 10, 'add_funds', 'card_payment', 'posted', 'credit', 'payment_session',
    jsonb_build_object(
      'provider', 'stripe',
      'provider_payload', jsonb_build_object(
        'data', jsonb_build_object('object', jsonb_build_object('payment_intent', 'pi_reversal_test'))
      )
    )
  )
  returning transaction_id into v_topup_id;

  -- 1. A payment intent that is not a top-up changes nothing.
  v_result := public.app_reverse_stripe_topup_refund('pi_not_a_topup', 'ch_x', 5, 'evt_0');
  if v_result <> 'not_a_topup' then
    raise exception 'unknown intent: expected not_a_topup, got %', v_result;
  end if;

  -- 2. A partial refund takes back exactly that much and writes a ledger row.
  v_result := public.app_reverse_stripe_topup_refund('pi_reversal_test', 'ch_1', 4, 'evt_1');
  if v_result <> 'reversed' then
    raise exception 'partial refund: expected reversed, got %', v_result;
  end if;
  select balance into v_balance from public.wallets where wallet_id = v_wallet_id;
  if v_balance <> 6 then
    raise exception 'partial refund: expected balance 6, got %', v_balance;
  end if;
  select count(*) into v_refunds from public.transactions
   where wallet_id = v_wallet_id and transaction_type = 'refund' and direction = 'debit' and amount = 4;
  if v_refunds <> 1 then
    raise exception 'partial refund: expected one 4 JOD refund ledger row, got %', v_refunds;
  end if;

  -- 3. Stripe redelivers the same cumulative figure: nothing more is taken.
  v_result := public.app_reverse_stripe_topup_refund('pi_reversal_test', 'ch_1', 4, 'evt_1b');
  if v_result <> 'already_applied' then
    raise exception 'replay: expected already_applied, got %', v_result;
  end if;
  select balance into v_balance from public.wallets where wallet_id = v_wallet_id;
  if v_balance <> 6 then
    raise exception 'replay changed the balance: %', v_balance;
  end if;

  -- 4. The customer spent most of the credit, then the rest is refunded. The wallet is
  --    debited only for what it still holds and the remainder is recorded, not lost.
  update public.wallets set balance = 2 where wallet_id = v_wallet_id;
  v_result := public.app_reverse_stripe_topup_refund('pi_reversal_test', 'ch_1', 10, 'evt_2');
  if v_result <> 'reversed_with_shortfall' then
    raise exception 'spent credit: expected reversed_with_shortfall, got %', v_result;
  end if;
  select balance into v_balance from public.wallets where wallet_id = v_wallet_id;
  if v_balance <> 0 then
    raise exception 'spent credit: expected balance 0, got %', v_balance;
  end if;
  select metadata into v_meta from public.transactions where transaction_id = v_topup_id;
  if (v_meta ->> 'refunded_jod')::numeric <> 10 or (v_meta ->> 'refund_shortfall_jod')::numeric <> 4 then
    raise exception 'spent credit: bad metadata %', v_meta;
  end if;

  -- 5. Refunding more than was paid is capped at the top-up amount and is then a no-op.
  v_result := public.app_reverse_stripe_topup_refund('pi_reversal_test', 'ch_1', 25, 'evt_3');
  if v_result <> 'already_applied' then
    raise exception 'over-refund: expected already_applied, got %', v_result;
  end if;

  -- 6. Bad input is rejected.
  begin
    perform public.app_reverse_stripe_topup_refund('not_an_intent', 'ch_x', 5, 'evt_4');
    raise exception 'invalid payment intent was accepted';
  exception when sqlstate '22023' then
    null;
  end;
  begin
    perform public.app_reverse_stripe_topup_refund('pi_reversal_test', 'ch_x', 0, 'evt_5');
    raise exception 'zero refund amount was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  -- 7. Only the service role may call it.
  if has_function_privilege('anon', 'public.app_reverse_stripe_topup_refund(text,text,numeric,text)', 'execute')
     or has_function_privilege('authenticated', 'public.app_reverse_stripe_topup_refund(text,text,numeric,text)', 'execute') then
    raise exception 'top-up reversal is executable by client roles';
  end if;
  if not has_function_privilege('service_role', 'public.app_reverse_stripe_topup_refund(text,text,numeric,text)', 'execute') then
    raise exception 'service_role cannot execute the top-up reversal';
  end if;

  raise notice 'Wallet top-up refund reversal test passed.';
end
$$;

rollback;
