-- Production security and queue hardening
-- 1. Move two-factor secrets out of public.users into a private schema table.
-- 2. Keep legacy public columns empty so direct selects cannot leak secrets.
-- 3. Add an atomic communications queue claim function for worker-safe processing.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to postgres;
grant usage on schema private to service_role;

create table if not exists private.user_two_factor_secrets (
  user_id uuid primary key references public.users(id) on delete cascade,
  totp_secret text not null,
  backup_code_hashes text[] not null default '{}',
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  verified_at timestamptz,
  last_challenge_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on private.user_two_factor_secrets from public;
revoke all on private.user_two_factor_secrets from anon;
revoke all on private.user_two_factor_secrets from authenticated;
grant select, insert, update, delete on private.user_two_factor_secrets to service_role;
grant select, insert, update, delete on private.user_two_factor_secrets to postgres;

insert into private.user_two_factor_secrets (
  user_id,
  totp_secret,
  backup_code_hashes,
  verified_at
)
select
  id,
  two_factor_secret,
  coalesce(two_factor_backup_codes, '{}'),
  case when two_factor_enabled then timezone('utc', now()) else null end
from public.users
where two_factor_secret is not null
on conflict (user_id) do update
set
  totp_secret = excluded.totp_secret,
  backup_code_hashes = excluded.backup_code_hashes,
  verified_at = coalesce(private.user_two_factor_secrets.verified_at, excluded.verified_at),
  updated_at = timezone('utc', now());

update public.users
set
  two_factor_secret = null,
  two_factor_backup_codes = null
where two_factor_secret is not null
   or two_factor_backup_codes is not null;

alter table public.users
  drop constraint if exists users_two_factor_columns_unused_chk;
alter table public.users
  add constraint users_two_factor_columns_unused_chk
  check (two_factor_secret is null and two_factor_backup_codes is null);

create index if not exists communication_deliveries_claim_queue_idx
  on public.communication_deliveries (
    delivery_status,
    coalesce(next_attempt_at, queued_at),
    queued_at
  )
  where delivery_status = 'queued';

create or replace function public.app_claim_communication_deliveries(
  max_deliveries integer default 25,
  worker_name text default 'edge:communications-process'
)
returns setof public.communication_deliveries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select d.delivery_id
    from public.communication_deliveries d
    where d.delivery_status = 'queued'
      and coalesce(d.next_attempt_at, d.queued_at, timezone('utc', now())) <= timezone('utc', now())
      and (d.locked_at is null or d.locked_at < timezone('utc', now()) - interval '10 minutes')
    order by coalesce(d.next_attempt_at, d.queued_at, timezone('utc', now())) asc, d.queued_at asc
    limit greatest(1, least(max_deliveries, 100))
    for update skip locked
  ),
  claimed as (
    update public.communication_deliveries d
    set
      delivery_status = 'processing',
      attempts_count = coalesce(d.attempts_count, 0) + 1,
      last_attempt_at = timezone('utc', now()),
      locked_at = timezone('utc', now()),
      processed_by = worker_name,
      updated_at = timezone('utc', now())
    where d.delivery_id in (select delivery_id from candidates)
    returning d.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.app_claim_communication_deliveries(integer, text) from public;
revoke all on function public.app_claim_communication_deliveries(integer, text) from anon;
revoke all on function public.app_claim_communication_deliveries(integer, text) from authenticated;
grant execute on function public.app_claim_communication_deliveries(integer, text) to service_role;
