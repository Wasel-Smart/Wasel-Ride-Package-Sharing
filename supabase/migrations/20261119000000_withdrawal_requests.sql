-- ============================================================================
-- WITHDRAWAL REQUESTS TABLE
-- ============================================================================
-- Purpose: Allows drivers to request wallet withdrawals that are reviewed and
-- processed by an operator. The wallet is NOT debited when the request is
-- created -- only when the operator approves and processes the payout.
-- This is the safe early-stage pattern: no money leaves the wallet until a
-- human confirms the payout was sent.

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_jod      NUMERIC(10,2) NOT NULL CHECK (amount_jod > 0),
  payout_method   TEXT        NOT NULL DEFAULT 'bank_transfer'
                  CHECK (payout_method IN ('bank_transfer', 'cliq_alias', 'cash_pickup')),
  bank_account    TEXT        NOT NULL,
  pin_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
  reviewed_by     UUID        REFERENCES public.users(id),
  reviewed_at     TIMESTAMPTZ,
  operator_note   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id
  ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at
  ON public.withdrawal_requests(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_withdrawal_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_withdrawal_request_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_withdrawal_request_updated_at();

-- RLS: users can see their own requests; only service_role (edge function) can insert.
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY withdrawal_requests_owner_select ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.withdrawal_requests FROM anon;
GRANT SELECT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

COMMENT ON TABLE public.withdrawal_requests IS
  'Pending withdrawal requests reviewed and processed by an operator. '
  'The wallet is not debited until the operator approves and processes the payout.';
