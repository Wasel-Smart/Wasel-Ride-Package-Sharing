-- Behavioural test for the Stripe webhook event ledger. Run against a database that
-- has all migrations applied (CI: the "RLS Coverage (live database)" job):
--
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/stripe_webhook_event_ledger.sql
--
-- Everything runs inside one transaction that is rolled back, so no data is kept.
-- Any failed expectation RAISEs an exception and ON_ERROR_STOP turns it into a
-- non-zero exit.

begin;

do $$
declare
  v_result   text;
  v_attempts integer;
  v_status   text;
begin
  -- 1. First delivery claims the event.
  v_result := public.app_claim_stripe_event('evt_ledger_test_1', 'invoice.paid', now(), false);
  if v_result <> 'claimed' then
    raise exception 'first claim: expected claimed, got %', v_result;
  end if;

  -- 2. A concurrent second delivery must not be allowed to process it as well.
  v_result := public.app_claim_stripe_event('evt_ledger_test_1', 'invoice.paid', now(), false);
  if v_result <> 'in_progress' then
    raise exception 'concurrent claim: expected in_progress, got %', v_result;
  end if;

  -- 3. A failed attempt releases the event for Stripe's retry.
  perform public.app_complete_stripe_event('evt_ledger_test_1', 'failed', 'boom');
  select status into v_status from public.stripe_webhook_events where event_id = 'evt_ledger_test_1';
  if v_status <> 'failed' then
    raise exception 'after failure: expected failed, got %', v_status;
  end if;

  v_result := public.app_claim_stripe_event('evt_ledger_test_1', 'invoice.paid', now(), false);
  if v_result <> 'claimed' then
    raise exception 'retry after failure: expected claimed, got %', v_result;
  end if;
  select attempts into v_attempts from public.stripe_webhook_events where event_id = 'evt_ledger_test_1';
  if v_attempts <> 2 then
    raise exception 'retry after failure: expected attempts = 2, got %', v_attempts;
  end if;

  -- 4. Success makes every later delivery a duplicate.
  perform public.app_complete_stripe_event('evt_ledger_test_1', 'processed');
  v_result := public.app_claim_stripe_event('evt_ledger_test_1', 'invoice.paid', now(), false);
  if v_result <> 'duplicate' then
    raise exception 'after success: expected duplicate, got %', v_result;
  end if;

  -- 5. A late failure report can never reopen a processed event.
  perform public.app_complete_stripe_event('evt_ledger_test_1', 'failed', 'late');
  select status into v_status from public.stripe_webhook_events where event_id = 'evt_ledger_test_1';
  if v_status <> 'processed' then
    raise exception 'late failure overwrote a processed event: status is %', v_status;
  end if;

  -- 6. A worker that died mid-processing (stale lock) is taken over.
  insert into public.stripe_webhook_events (event_id, event_type, event_created_at, status, locked_at)
  values ('evt_ledger_test_stale', 'invoice.paid', now(), 'processing', timezone('utc', now()) - interval '10 minutes');
  v_result := public.app_claim_stripe_event('evt_ledger_test_stale', 'invoice.paid', now(), false);
  if v_result <> 'claimed' then
    raise exception 'stale lock: expected claimed, got %', v_result;
  end if;

  -- 7. Bad input is rejected.
  begin
    perform public.app_complete_stripe_event('evt_ledger_test_1', 'bogus');
    raise exception 'invalid status was accepted';
  exception when sqlstate '22023' then
    null;
  end;
  begin
    perform public.app_claim_stripe_event('x', 'invoice.paid', now(), false);
    raise exception 'invalid event id was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  -- 8. Only the service role may call the ledger or read the table.
  if has_function_privilege('anon', 'public.app_claim_stripe_event(text,text,timestamptz,boolean)', 'execute')
     or has_function_privilege('authenticated', 'public.app_claim_stripe_event(text,text,timestamptz,boolean)', 'execute')
     or has_function_privilege('anon', 'public.app_complete_stripe_event(text,text,text)', 'execute')
     or has_function_privilege('authenticated', 'public.app_complete_stripe_event(text,text,text)', 'execute') then
    raise exception 'ledger functions are executable by client roles';
  end if;
  if not has_function_privilege('service_role', 'public.app_claim_stripe_event(text,text,timestamptz,boolean)', 'execute')
     or not has_function_privilege('service_role', 'public.app_complete_stripe_event(text,text,text)', 'execute') then
    raise exception 'service_role cannot execute the ledger functions';
  end if;
  if has_table_privilege('anon', 'public.stripe_webhook_events', 'select')
     or has_table_privilege('authenticated', 'public.stripe_webhook_events', 'select') then
    raise exception 'client roles can read public.stripe_webhook_events';
  end if;

  raise notice 'Stripe webhook event ledger test passed.';
end
$$;

rollback;
