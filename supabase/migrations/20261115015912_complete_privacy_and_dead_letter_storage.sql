-- Persist privacy requests and server-side worker failures with no client access.
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  granted boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_consents_latest_idx
  ON public.user_consents (user_id, consent_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  download_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS data_export_requests_user_requested_idx
  ON public.data_export_requests (user_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS data_deletion_requests_one_pending_per_user_idx
  ON public.data_deletion_requests (user_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.dead_letter_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_topic text,
  original_id text,
  payload jsonb,
  error text,
  error_stack text,
  retry_count integer,
  trace_id text,
  worker text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dead_letter_messages_created_at_idx
  ON public.dead_letter_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS dead_letter_messages_topic_created_at_idx
  ON public.dead_letter_messages (original_topic, created_at DESC);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_consents,
  public.data_export_requests,
  public.data_deletion_requests,
  public.dead_letter_messages FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_consents,
  public.data_export_requests,
  public.data_deletion_requests,
  public.dead_letter_messages TO service_role;

COMMENT ON TABLE public.dead_letter_messages IS
  'Server-only records of worker messages that exhausted retries.';
