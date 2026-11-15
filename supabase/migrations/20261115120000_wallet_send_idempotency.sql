-- Idempotent wallet transfers.
--
-- A wallet send that times out on the client is retried by the HTTP layer. Without a
-- server-side key the retry is a second transfer. This migration adds a claim table and
-- one atomic wrapper: the claim row and the transfer commit (or roll back) together, so
-- there is no window where money moved but the key was not recorded, and a failed
-- transfer never leaves a key behind that would block the user's retry.

create table if not exists public.wallet_operation_idempotency (
  user_id             uuid        not null,
  scope               text        not null,
  idempotency_key     text        not null,
  request_fingerprint text        not null,
  created_at          timestamptz not null default now(),
  primary key (user_id, scope, idempotency_key),
  constraint wallet_operation_idempotency_key_format
    check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$')
);

comment on table public.wallet_operation_idempotency is
  'One row per accepted wallet money-movement request key. Written only by app_transfer_wallet_funds_idempotent. Service role only.';

alter table public.wallet_operation_idempotency enable row level security;
revoke all on table public.wallet_operation_idempotency from anon, authenticated;

drop policy if exists wallet_operation_idempotency_service_role on public.wallet_operation_idempotency;
create policy wallet_operation_idempotency_service_role
  on public.wallet_operation_idempotency
  for all
  to service_role
  using (true)
  with check (true);

create index if not exists idx_wallet_operation_idempotency_created_at
  on public.wallet_operation_idempotency (created_at);

create or replace function public.app_transfer_wallet_funds_idempotent(
  p_from_user_id    uuid,
  p_to_user_id      uuid,
  p_amount          numeric,
  p_payment_method  text,
  p_idempotency_key text,
  p_fingerprint     text
)
returns table (replayed boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted    integer;
  v_existing_fp text;
begin
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception 'invalid idempotency key' using errcode = '22023';
  end if;
  if p_fingerprint is null or length(p_fingerprint) = 0 or length(p_fingerprint) > 200 then
    raise exception 'invalid request fingerprint' using errcode = '22023';
  end if;

  -- A concurrent request with the same key blocks here until the first transaction
  -- ends, then takes the conflict branch below instead of transferring a second time.
  insert into public.wallet_operation_idempotency
    (user_id, scope, idempotency_key, request_fingerprint)
  values
    (p_from_user_id, 'wallet_send', p_idempotency_key, p_fingerprint)
  on conflict (user_id, scope, idempotency_key) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select request_fingerprint
      into v_existing_fp
      from public.wallet_operation_idempotency
     where user_id = p_from_user_id
       and scope = 'wallet_send'
       and idempotency_key = p_idempotency_key;

    if v_existing_fp is distinct from p_fingerprint then
      raise exception 'idempotency key was reused with a different request' using errcode = '22023';
    end if;

    replayed := true;
    return next;
    return;
  end if;

  perform public.app_transfer_wallet_funds(
    p_from_user_id,
    p_to_user_id,
    p_amount,
    p_payment_method
  );

  replayed := false;
  return next;
end;
$$;

-- Housekeeping: a key only needs to outlive the client's retry window.
create or replace function public.cleanup_wallet_operation_idempotency()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count bigint;
begin
  with deleted as (
    delete from public.wallet_operation_idempotency
     where created_at < now() - interval '7 days'
    returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

revoke all on function public.app_transfer_wallet_funds_idempotent(uuid, uuid, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.cleanup_wallet_operation_idempotency() from public, anon, authenticated;

grant execute on function public.app_transfer_wallet_funds_idempotent(uuid, uuid, numeric, text, text, text) to service_role;
grant execute on function public.cleanup_wallet_operation_idempotency() to service_role;
