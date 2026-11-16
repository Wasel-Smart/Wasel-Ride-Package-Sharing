-- Behavioural test for the Stripe dispute register. Run against a database that has
-- all migrations applied (CI: the "RLS Coverage (live database)" job):
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/payment_disputes.sql
--
-- Runs inside one transaction that is rolled back; nothing is kept. A failed
-- expectation RAISEs, and ON_ERROR_STOP turns that into a non-zero exit.

begin;

do $$
declare
  v_result text;
  v_status text;
  v_closed timestamptz;
  v_amount bigint;
  t0 constant timestamptz := timestamptz '2026-11-16 10:00:00+00';
  t1 constant timestamptz := timestamptz '2026-11-16 11:00:00+00';
  t2 constant timestamptz := timestamptz '2026-11-16 12:00:00+00';
begin
  -- 1. First sighting inserts and stays open.
  v_result := public.app_record_stripe_dispute(
    'dp_test_1', 'ch_1', 'pi_1', 'b-1', 8000, 'JOD', 'fraudulent', 'needs_response',
    timestamptz '2026-12-01 00:00:00+00', false, 'evt_1', t1);
  if v_result <> 'inserted' then
    raise exception 'first record: expected inserted, got %', v_result;
  end if;
  select status, closed_at into v_status, v_closed from public.payment_disputes where dispute_id = 'dp_test_1';
  if v_status <> 'needs_response' or v_closed is not null then
    raise exception 'new dispute should be open, got status % closed_at %', v_status, v_closed;
  end if;

  -- 2. An event older than the stored one must not overwrite it.
  v_result := public.app_record_stripe_dispute(
    'dp_test_1', null, null, null, 1, 'JOD', null, 'under_review', null, false, 'evt_old', t0);
  if v_result <> 'stale' then
    raise exception 'older event: expected stale, got %', v_result;
  end if;
  select status, amount_minor into v_status, v_amount from public.payment_disputes where dispute_id = 'dp_test_1';
  if v_status <> 'needs_response' or v_amount <> 8000 then
    raise exception 'stale event changed the row: status %, amount %', v_status, v_amount;
  end if;

  -- 3. A newer event advances the dispute and keeps the fields it does not carry.
  v_result := public.app_record_stripe_dispute(
    'dp_test_1', null, null, null, 8000, 'JOD', null, 'under_review', null, false, 'evt_2', t2);
  if v_result <> 'updated' then
    raise exception 'newer event: expected updated, got %', v_result;
  end if;
  if (select booking_id from public.payment_disputes where dispute_id = 'dp_test_1') <> 'b-1'
     or (select reason from public.payment_disputes where dispute_id = 'dp_test_1') <> 'fraudulent' then
    raise exception 'update dropped booking_id or reason';
  end if;

  -- 4. A terminal status closes the dispute.
  perform public.app_record_stripe_dispute(
    'dp_test_1', null, null, null, 8000, 'JOD', null, 'lost', null, false, 'evt_3', t2 + interval '1 hour');
  select closed_at into v_closed from public.payment_disputes where dispute_id = 'dp_test_1';
  if v_closed is null then
    raise exception 'a lost dispute must have closed_at set';
  end if;

  -- 5. Only the service role may call the function or read the table.
  if has_function_privilege('anon', 'public.app_record_stripe_dispute(text,text,text,text,bigint,text,text,text,timestamptz,boolean,text,timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.app_record_stripe_dispute(text,text,text,text,bigint,text,text,text,timestamptz,boolean,text,timestamptz)', 'execute') then
    raise exception 'payment dispute function is executable by client roles';
  end if;
  if not has_function_privilege('service_role', 'public.app_record_stripe_dispute(text,text,text,text,bigint,text,text,text,timestamptz,boolean,text,timestamptz)', 'execute') then
    raise exception 'service_role cannot execute the payment dispute function';
  end if;
  if has_table_privilege('anon', 'public.payment_disputes', 'select')
     or has_table_privilege('authenticated', 'public.payment_disputes', 'select') then
    raise exception 'client roles can read public.payment_disputes';
  end if;

  raise notice 'Payment dispute register test passed.';
end
$$;

rollback;
