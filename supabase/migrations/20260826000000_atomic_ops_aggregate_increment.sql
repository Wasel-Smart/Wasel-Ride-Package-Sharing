-- Atomic upsert for ops_aggregates to eliminate the read-modify-write race
-- in the ops-worker payments.captured handler.
-- Uses INSERT ... ON CONFLICT DO UPDATE so concurrent captures are serialised
-- at the database level with no lost updates.

create or replace function increment_ops_aggregate(
  p_metric_date  date,
  p_metric_name  text,
  p_dimension    text,
  p_amount       numeric
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into ops_aggregates (metric_date, metric_name, dimension, value, sample_count, updated_at)
  values (p_metric_date, p_metric_name, p_dimension, p_amount, 1, now())
  on conflict (metric_date, metric_name, dimension)
  do update set
    value        = ops_aggregates.value + excluded.value,
    sample_count = ops_aggregates.sample_count + 1,
    updated_at   = now();
$$;

-- Only the service role may call this function.
revoke execute on function increment_ops_aggregate(date, text, text, numeric) from public, anon, authenticated;
grant  execute on function increment_ops_aggregate(date, text, text, numeric) to service_role;
