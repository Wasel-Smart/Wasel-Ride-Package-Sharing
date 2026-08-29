-- ============================================================================
-- Rollback: Restore authenticated access to event broker tables
-- ============================================================================
-- Recreates the blanket authenticated policies that were removed by
-- 20260708000000_tighten_event_broker_rls.sql. Use only if you need to
-- temporarily revert the security fix before the Edge Function proxy
-- is deployed.
-- ============================================================================

create policy "authenticated can write outbox"
  on public.event_outbox for insert
  to authenticated
  with check (true);

create policy "authenticated can read outbox"
  on public.event_outbox for select
  to authenticated
  using (true);

create policy "authenticated can update outbox"
  on public.event_outbox for update
  to authenticated
  using (true);

create policy "authenticated can write dead_letter"
  on public.dead_letter_messages for insert
  to authenticated
  with check (true);

create policy "authenticated can read dead_letter"
  on public.dead_letter_messages for select
  to authenticated
  using (true);

create policy "authenticated can write ops_aggregates"
  on public.ops_aggregates for insert
  to authenticated
  with check (true);

create policy "authenticated can upsert ops_aggregates"
  on public.ops_aggregates for update
  to authenticated
  using (true);

create policy "authenticated can read ops_aggregates"
  on public.ops_aggregates for select
  to authenticated
  using (true);
