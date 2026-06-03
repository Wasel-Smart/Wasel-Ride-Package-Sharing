-- Move privileged SECURITY DEFINER implementations out of the exposed public schema.
-- Public RPC compatibility wrappers are SECURITY INVOKER and delegate to private implementations.

begin;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Auth signup sync should not live as a public SECURITY DEFINER function.
alter function if exists public.sync_auth_user_to_canonical_user() set schema private;
drop trigger if exists on_auth_user_synced_to_canonical on auth.users;
create trigger on_auth_user_synced_to_canonical
  after insert or update on auth.users
  for each row execute function private.sync_auth_user_to_canonical_user();

-- Service-role queue claimers.
alter function if exists public.app_claim_automation_jobs(integer, text) set schema private;
create or replace function public.app_claim_automation_jobs(max_jobs integer default 25, worker_name text default 'edge:automation-process')
returns setof public.automation_jobs
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select * from private.app_claim_automation_jobs(max_jobs, worker_name);
$$;
revoke all on function public.app_claim_automation_jobs(integer, text) from public, anon, authenticated;
grant execute on function public.app_claim_automation_jobs(integer, text) to service_role;
grant execute on function private.app_claim_automation_jobs(integer, text) to service_role;

alter function if exists public.app_claim_communication_deliveries(integer, text) set schema private;
create or replace function public.app_claim_communication_deliveries(max_deliveries integer default 25, worker_name text default 'edge:communications-worker')
returns setof public.communication_deliveries
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select * from private.app_claim_communication_deliveries(max_deliveries, worker_name);
$$;
revoke all on function public.app_claim_communication_deliveries(integer, text) from public, anon, authenticated;
grant execute on function public.app_claim_communication_deliveries(integer, text) to service_role;
grant execute on function private.app_claim_communication_deliveries(integer, text) to service_role;

-- Client-callable support/automation wrappers remain public, but the privileged bodies move private.
alter function if exists public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) set schema private;
create or replace function public.app_enqueue_automation_job(
  p_job_type text,
  p_corridor_id text default null,
  p_corridor_key text default null,
  p_route_scope text default null,
  p_origin_location text default null,
  p_destination_location text default null,
  p_payload jsonb default '{}'::jsonb,
  p_run_after timestamptz default timezone('utc', now())
)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.app_enqueue_automation_job(
    p_job_type,
    p_corridor_id,
    p_corridor_key,
    p_route_scope,
    p_origin_location,
    p_destination_location,
    p_payload,
    p_run_after
  );
$$;
revoke all on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) from public, anon;
grant execute on function public.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to authenticated, service_role;
grant execute on function private.app_enqueue_automation_job(text, text, text, text, text, text, jsonb, timestamptz) to authenticated, service_role;

alter function if exists public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) set schema private;
create or replace function public.app_create_support_ticket(
  p_topic text,
  p_subject text,
  p_detail text,
  p_related_id text default null,
  p_route_label text default null,
  p_status text default 'open',
  p_priority text default 'low',
  p_channel text default 'in_app',
  p_note text default 'Support ticket created and waiting for review.'
)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.app_create_support_ticket(
    p_topic,
    p_subject,
    p_detail,
    p_related_id,
    p_route_label,
    p_status,
    p_priority,
    p_channel,
    p_note
  );
$$;
revoke all on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function private.app_create_support_ticket(text, text, text, text, text, text, text, text, text) to authenticated, service_role;

alter function if exists public.app_update_support_ticket_status(uuid, text, text, text, text, text) set schema private;
create or replace function public.app_update_support_ticket_status(
  p_ticket_id uuid,
  p_status text,
  p_note text,
  p_resolution_summary text default null,
  p_priority text default null,
  p_channel text default null
)
returns jsonb
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.app_update_support_ticket_status(
    p_ticket_id,
    p_status,
    p_note,
    p_resolution_summary,
    p_priority,
    p_channel
  );
$$;
revoke all on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.app_update_support_ticket_status(uuid, text, text, text, text, text) to authenticated, service_role;
grant execute on function private.app_update_support_ticket_status(uuid, text, text, text, text, text) to authenticated, service_role;

-- Wallet ledger mutation is service-role only and should be private.
alter function if exists public.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) set schema private;
create or replace function public.wallet_post_ledger_transaction(
  p_transaction_type public.wallet_transaction_type,
  p_transaction_status public.wallet_transaction_status,
  p_initiated_by_user_id uuid,
  p_amount numeric,
  p_currency_code text,
  p_description text,
  p_reference_type text,
  p_reference_id text,
  p_metadata jsonb,
  p_entries jsonb,
  p_participants uuid[] default null,
  p_payment_intent_id uuid default null,
  p_idempotency_key text default null
)
returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.wallet_post_ledger_transaction(
    p_transaction_type,
    p_transaction_status,
    p_initiated_by_user_id,
    p_amount,
    p_currency_code,
    p_description,
    p_reference_type,
    p_reference_id,
    p_metadata,
    p_entries,
    p_participants,
    p_payment_intent_id,
    p_idempotency_key
  );
$$;
revoke all on function public.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) to service_role;
grant execute on function private.wallet_post_ledger_transaction(
  public.wallet_transaction_type,
  public.wallet_transaction_status,
  uuid,
  numeric,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  uuid[],
  uuid,
  text
) to service_role;

commit;
