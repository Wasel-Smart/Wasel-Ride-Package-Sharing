-- Migration: dead_letter_messages table for worker dead-letter queue
-- Required by src/platform/worker-framework.ts (BaseWorker.sendToDeadLetter).

CREATE TABLE IF NOT EXISTS public.dead_letter_messages (
  id              BIGSERIAL   PRIMARY KEY,
  original_id     TEXT        NOT NULL,
  original_topic  TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  error           TEXT        NOT NULL DEFAULT '',
  error_stack     TEXT,
  retry_count     INTEGER     NOT NULL DEFAULT 0,
  trace_id        TEXT        NOT NULL DEFAULT '',
  worker          TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dead_letter_messages_topic_idx
  ON public.dead_letter_messages (original_topic, created_at DESC);

ALTER TABLE public.dead_letter_messages ENABLE ROW LEVEL SECURITY;

-- Only service-role (via edge functions) may insert dead letters.
CREATE POLICY "deny_direct_client_access" ON public.dead_letter_messages
  FOR ALL TO anon, authenticated
  USING (false);
