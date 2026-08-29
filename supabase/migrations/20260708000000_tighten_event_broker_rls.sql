-- ============================================================================
-- Tighten RLS on event broker tables
-- ============================================================================
-- Removes blanket authenticated access to event_outbox, dead_letter_messages,
-- and ops_aggregates. After this migration, only service-role clients (Edge
-- Functions, backend workers) can read or mutate these tables. The web client
-- must use the event-broker-proxy Edge Function for all queue operations.
-- ============================================================================

-- Drop existing authenticated policies on event_outbox
drop policy if exists "authenticated can write outbox" on public.event_outbox;
drop policy if exists "authenticated can read outbox" on public.event_outbox;
drop policy if exists "authenticated can update outbox" on public.event_outbox;

-- Drop existing authenticated policies on dead_letter_messages
drop policy if exists "authenticated can write dead_letter" on public.dead_letter_messages;
drop policy if exists "authenticated can read dead_letter" on public.dead_letter_messages;

-- Drop existing authenticated policies on ops_aggregates
drop policy if exists "authenticated can write ops_aggregates" on public.ops_aggregates;
drop policy if exists "authenticated can upsert ops_aggregates" on public.ops_aggregates;
drop policy if exists "authenticated can read ops_aggregates" on public.ops_aggregates;

-- Verify no authenticated policies remain on these tables
do $$
begin
  assert (
    select count(*) = 0
    from pg_policies
    where schemaname = 'public'
      and tablename in ('event_outbox', 'dead_letter_messages', 'ops_aggregates')
      and roles && array['authenticated'::name]
  ) = 0, 'authenticated policies still exist on event broker tables';
end $$;
