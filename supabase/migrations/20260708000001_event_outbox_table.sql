-- Migration: event_outbox table for durable Supabase event broker
-- This table is required by src/platform/event-broker.ts (SupabaseEventBroker).

CREATE TABLE IF NOT EXISTS public.event_outbox (
  id            TEXT        PRIMARY KEY,
  topic         TEXT        NOT NULL,
  payload       JSONB       NOT NULL DEFAULT '{}',
  producer      TEXT        NOT NULL DEFAULT 'app',
  trace_id      TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processed', 'failed')),
  attempts      INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS event_outbox_status_created_idx
  ON public.event_outbox (status, created_at ASC)
  WHERE status = 'pending';

-- RLS: only service-role can write; anon/authenticated can read their own events
-- via the event-broker-proxy edge function (which uses service-role key).
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically; no explicit policy needed for it.
-- Deny all direct client access — all writes go through the proxy edge function.
CREATE POLICY "deny_direct_client_access" ON public.event_outbox
  FOR ALL TO anon, authenticated
  USING (false);
