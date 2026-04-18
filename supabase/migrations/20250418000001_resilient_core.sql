-- =============================================================================
-- Wasel Resilient Core Migration
-- Transforms Wasel into an event-driven, self-healing transportation system
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. RIDE STATE MACHINE — ride_events (immutable event log)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ride_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id         UUID NOT NULL,
  actor_id        UUID REFERENCES auth.users(id),
  event_type      TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  payload         JSONB DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ride_events_ride_id   ON ride_events(ride_id);
CREATE INDEX idx_ride_events_created   ON ride_events(created_at DESC);

-- Enforce valid state transitions at DB level
CREATE OR REPLACE FUNCTION validate_ride_transition()
RETURNS TRIGGER AS $$
DECLARE
  allowed_transitions JSONB := '{
    "REQUESTED":       ["MATCHING","CANCELLED"],
    "MATCHING":        ["DRIVER_ASSIGNED","FAILED","CANCELLED"],
    "DRIVER_ASSIGNED": ["DRIVER_ARRIVING","CANCELLED"],
    "DRIVER_ARRIVING": ["IN_PROGRESS","CANCELLED"],
    "IN_PROGRESS":     ["COMPLETED","FAILED"],
    "COMPLETED":       [],
    "CANCELLED":       [],
    "FAILED":          ["MATCHING"]
  }';
  valid_targets JSONB;
BEGIN
  IF NEW.from_status IS NULL THEN RETURN NEW; END IF;
  valid_targets := allowed_transitions -> NEW.from_status;
  IF valid_targets IS NULL THEN
    RAISE EXCEPTION 'Unknown ride status: %', NEW.from_status;
  END IF;
  IF NOT (valid_targets @> to_jsonb(NEW.to_status)) THEN
    RAISE EXCEPTION 'Invalid ride transition % -> %. Allowed: %',
      NEW.from_status, NEW.to_status, valid_targets;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_ride_transition ON ride_events;
CREATE TRIGGER enforce_ride_transition
  BEFORE INSERT ON ride_events
  FOR EACH ROW EXECUTE FUNCTION validate_ride_transition();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. JOB QUEUE — async, retryable, dead-letter pattern
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','DEAD')),
  priority        INT NOT NULL DEFAULT 5,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 5,
  run_at          TIMESTAMPTZ DEFAULT now(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  last_error      TEXT,
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_job_queue_pending ON job_queue(priority, run_at) WHERE status = 'PENDING';
CREATE INDEX idx_job_queue_type    ON job_queue(job_type);

CREATE OR REPLACE VIEW dead_letter_queue AS
  SELECT * FROM job_queue WHERE status = 'DEAD' ORDER BY failed_at DESC;

-- Atomic job claim — prevents double-processing
CREATE OR REPLACE FUNCTION claim_next_job(p_job_type TEXT DEFAULT NULL)
RETURNS job_queue AS $$
DECLARE claimed job_queue;
BEGIN
  SELECT * INTO claimed FROM job_queue
  WHERE status = 'PENDING' AND run_at <= now()
    AND (p_job_type IS NULL OR job_type = p_job_type)
  ORDER BY priority ASC, run_at ASC
  LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE job_queue SET
    status     = 'PROCESSING',
    started_at = now(),
    attempts   = attempts + 1,
    updated_at = now()
  WHERE id = claimed.id RETURNING * INTO claimed;

  RETURN claimed;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION complete_job(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE job_queue SET status='COMPLETED', completed_at=now(), updated_at=now()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Fail with exponential backoff: 5s → 30s → 2m → 10m → 30m → DEAD
CREATE OR REPLACE FUNCTION fail_job(p_job_id UUID, p_error TEXT)
RETURNS VOID AS $$
DECLARE j job_queue; backoff INT;
BEGIN
  SELECT * INTO j FROM job_queue WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN; END IF;

  backoff := CASE j.attempts
    WHEN 1 THEN 5 WHEN 2 THEN 30 WHEN 3 THEN 120 WHEN 4 THEN 600 ELSE 1800
  END;

  IF j.attempts >= j.max_attempts THEN
    UPDATE job_queue SET status='DEAD', failed_at=now(), last_error=p_error, updated_at=now()
    WHERE id = p_job_id;
  ELSE
    UPDATE job_queue SET
      status='PENDING',
      run_at=now() + (backoff||' seconds')::INTERVAL,
      last_error=p_error, failed_at=now(), updated_at=now()
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enqueue_job(
  p_type           TEXT,
  p_payload        JSONB    DEFAULT '{}',
  p_priority       INT      DEFAULT 5,
  p_idempotency_key TEXT    DEFAULT NULL,
  p_delay_seconds  INT      DEFAULT 0
) RETURNS UUID AS $$
DECLARE new_id UUID;
BEGIN
  INSERT INTO job_queue(job_type, payload, priority, idempotency_key, run_at)
  VALUES (p_type, p_payload, p_priority, p_idempotency_key,
          now() + (p_delay_seconds||' seconds')::INTERVAL)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAYMENT WEBHOOKS — idempotent provider event log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_webhooks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL,
  event_id          TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  raw_payload       JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'RECEIVED'
                      CHECK (status IN ('RECEIVED','PROCESSING','PROCESSED','FAILED')),
  payment_intent_id TEXT,
  amount            NUMERIC(12,3),
  currency          TEXT DEFAULT 'JOD',
  processing_error  TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(status);
CREATE INDEX idx_payment_webhooks_intent ON payment_webhooks(payment_intent_id);

CREATE TABLE IF NOT EXISTS payment_status (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),
  amount            NUMERIC(12,3) NOT NULL,
  currency          TEXT DEFAULT 'JOD',
  user_id           UUID REFERENCES auth.users(id),
  reference_type    TEXT,
  reference_id      TEXT,
  idempotency_key   TEXT UNIQUE,
  provider_data     JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_status_user ON payment_status(user_id);
CREATE INDEX idx_payment_status_ref  ON payment_status(reference_type, reference_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUDIT LOG — immutable security trail
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  actor_role  TEXT,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BUSINESS EVENTS — analytics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS business_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id),
  session_id  TEXT,
  properties  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_business_events_name ON business_events(event_name, created_at DESC);
CREATE INDEX idx_business_events_user ON business_events(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — hardened
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ride_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_events   ENABLE ROW LEVEL SECURITY;

-- ride_events: actor sees own events only
CREATE POLICY ride_events_own ON ride_events FOR SELECT
  USING (actor_id = auth.uid());

-- job_queue: service role only
CREATE POLICY job_queue_service ON job_queue FOR ALL
  USING (auth.role() = 'service_role');

-- payment_webhooks: service role only
CREATE POLICY payment_webhooks_service ON payment_webhooks FOR ALL
  USING (auth.role() = 'service_role');

-- payment_status: user sees own; service role writes
CREATE POLICY payment_status_own ON payment_status FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY payment_status_service ON payment_status FOR ALL
  USING (auth.role() = 'service_role');

-- audit_logs: service role reads only
CREATE POLICY audit_logs_service ON audit_logs FOR SELECT
  USING (auth.role() = 'service_role');

-- business_events: insert own; service role all
CREATE POLICY business_events_own ON business_events FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY business_events_insert ON business_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. WALLET PROTECTION — block direct balance manipulation
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_direct_wallet_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance THEN
    IF auth.role() != 'service_role' THEN
      RAISE EXCEPTION 'Direct wallet balance manipulation is forbidden. Use the payment API.';
    END IF;
    INSERT INTO audit_logs(actor_id, action, table_name, record_id, old_values, new_values)
    VALUES (
      auth.uid(), 'wallet.balance_change', TG_TABLE_NAME, NEW.id::TEXT,
      jsonb_build_object('wallet_balance', OLD.wallet_balance),
      jsonb_build_object('wallet_balance', NEW.wallet_balance)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='profiles') THEN
    DROP TRIGGER IF EXISTS protect_wallet_balance ON profiles;
    CREATE TRIGGER protect_wallet_balance
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION prevent_direct_wallet_update();
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. MAINTENANCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_old_jobs() RETURNS INT AS $$
DECLARE affected INT;
BEGIN
  DELETE FROM job_queue WHERE status='COMPLETED' AND completed_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE ride_events      IS 'Immutable audit log of all ride state transitions';
COMMENT ON TABLE job_queue        IS 'Async job queue with exponential backoff and dead-letter';
COMMENT ON TABLE payment_webhooks IS 'Idempotent payment provider event log';
COMMENT ON TABLE payment_status   IS 'Authoritative payment status — source of truth';
COMMENT ON TABLE audit_logs       IS 'Security audit trail for all sensitive operations';
COMMENT ON TABLE business_events  IS 'Business analytics event log';
