-- Migration: fix admin_archive_old_data referencing wrong table name
-- The original function referenced wallet_transactions which does not exist.
-- The correct table is public.transactions.

create or replace function public.admin_archive_old_data()
returns table (
  audit_logs_deleted bigint,
  soft_deleted_purged bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audit_count bigint := 0;
  v_purge_count bigint := 0;
  v_users       bigint := 0;
  v_bookings    bigint := 0;
  v_packages    bigint := 0;
  v_txns        bigint := 0;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin role required';
  end if;

  -- Archive audit logs older than 1 year
  with deleted as (
    delete from public.audit_logs
    where timestamp < now() - interval '1 year'
    returning 1
  )
  select count(*) into v_audit_count from deleted;

  -- Purge soft-deleted users (90 days after deletion)
  with deleted as (
    delete from public.users
    where deleted_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_users from deleted;

  -- Purge soft-deleted bookings
  with deleted as (
    delete from public.bookings
    where deleted_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_bookings from deleted;

  -- Purge soft-deleted packages
  with deleted as (
    delete from public.packages
    where deleted_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_packages from deleted;

  -- Purge soft-deleted transactions (correct table name: transactions, not wallet_transactions)
  with deleted as (
    delete from public.transactions
    where deleted_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into v_txns from deleted;

  v_purge_count := v_users + v_bookings + v_packages + v_txns;

  audit_logs_deleted := v_audit_count;
  soft_deleted_purged := v_purge_count;
  return next;
end;
$$;

grant execute on function public.admin_archive_old_data() to authenticated;
