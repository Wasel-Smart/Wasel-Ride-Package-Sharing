-- Close the rollout gap left by 20260531070000: the private schema must not be
-- directly usable by browser JWT roles. Edge Functions and trusted workers should
-- use the service_role key for these privileged RPCs/tables.

revoke usage on schema private from anon, authenticated;
grant usage on schema private to service_role;

revoke execute on all functions in schema private from anon, authenticated;
grant execute on all functions in schema private to service_role;

alter default privileges in schema private revoke execute on functions from anon, authenticated;
alter default privileges in schema private grant execute on functions to service_role;

revoke execute on function public.app_claim_automation_jobs(integer, timestamptz) from anon, authenticated;
revoke execute on function public.app_claim_communication_deliveries(integer, integer, timestamptz) from anon, authenticated;
revoke execute on function public.app_create_support_ticket(text, text, text, text, jsonb) from anon, authenticated;
revoke execute on function public.app_enqueue_support_autoresponse(uuid) from anon, authenticated;
revoke execute on function public.app_update_support_ticket_status(uuid, text, text) from anon, authenticated;
revoke execute on function public.wallet_create_ledger_transaction(
  uuid,
  uuid,
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  numeric,
  text,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) from anon, authenticated;

grant execute on function public.app_claim_automation_jobs(integer, timestamptz) to service_role;
grant execute on function public.app_claim_communication_deliveries(integer, integer, timestamptz) to service_role;
grant execute on function public.app_create_support_ticket(text, text, text, text, jsonb) to service_role;
grant execute on function public.app_enqueue_support_autoresponse(uuid) to service_role;
grant execute on function public.app_update_support_ticket_status(uuid, text, text) to service_role;
grant execute on function public.wallet_create_ledger_transaction(
  uuid,
  uuid,
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  numeric,
  text,
  text,
  uuid,
  text,
  text,
  text,
  jsonb
) to service_role;
