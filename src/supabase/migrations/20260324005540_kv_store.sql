-- Migration: 20260324005540_kv_store
-- Description: Production-grade key-value store for app config and feature flags
-- Scope: Global configuration management with audit trail

-- Main KV Store Table
CREATE TABLE IF NOT EXISTS kv_store_0b1f4071 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Key naming constraints
  CONSTRAINT valid_key_format CHECK (
    key ~ '^(app_config|feature_flag):[a-z0-9_:]+$'
  ),
  
  -- Prevent expired entries from being inserted
  CONSTRAINT valid_expiry CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS kv_store_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_kv_key_pattern ON kv_store_0b1f4071 (key text_pattern_ops);
CREATE INDEX idx_kv_expires_at ON kv_store_0b1f4071 (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_kv_updated_at ON kv_store_0b1f4071 (updated_at DESC);
CREATE INDEX idx_audit_key ON kv_store_audit_log (key);
CREATE INDEX idx_audit_changed_at ON kv_store_audit_log (changed_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_kv_store_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kv_store_update_timestamp
  BEFORE UPDATE ON kv_store_0b1f4071
  FOR EACH ROW
  EXECUTE FUNCTION update_kv_store_timestamp();

-- Audit logging trigger
CREATE OR REPLACE FUNCTION log_kv_store_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO kv_store_audit_log (key, operation, old_value, changed_by)
    VALUES (OLD.key, 'DELETE', OLD.value, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO kv_store_audit_log (key, operation, old_value, new_value, changed_by)
    VALUES (NEW.key, 'UPDATE', OLD.value, NEW.value, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO kv_store_audit_log (key, operation, new_value, changed_by)
    VALUES (NEW.key, 'INSERT', NEW.value, auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER kv_store_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON kv_store_0b1f4071
  FOR EACH ROW
  EXECUTE FUNCTION log_kv_store_changes();

-- RLS Policies
ALTER TABLE kv_store_0b1f4071 ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for non-expired entries
CREATE POLICY "Public read access to non-expired KV entries"
  ON kv_store_0b1f4071
  FOR SELECT
  USING (
    expires_at IS NULL OR expires_at > NOW()
  );

-- Admin write access (service role or specific admin users)
CREATE POLICY "Admin write access to KV store"
  ON kv_store_0b1f4071
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Audit log read access (admins only)
CREATE POLICY "Admin read access to audit log"
  ON kv_store_audit_log
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Helper function: Get value with expiry check
CREATE OR REPLACE FUNCTION get_kv_value(p_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
  FROM kv_store_0b1f4071
  WHERE key = p_key
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN v_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Set value with optional TTL
CREATE OR REPLACE FUNCTION set_kv_value(
  p_key TEXT,
  p_value JSONB,
  p_ttl_seconds INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_ttl_seconds IS NOT NULL THEN
    v_expires_at := NOW() + (p_ttl_seconds || ' seconds')::INTERVAL;
  END IF;
  
  INSERT INTO kv_store_0b1f4071 (key, value, metadata, expires_at, updated_by)
  VALUES (p_key, p_value, p_metadata, v_expires_at, auth.uid())
  ON CONFLICT (key) DO UPDATE
  SET 
    value = EXCLUDED.value,
    metadata = EXCLUDED.metadata,
    expires_at = EXCLUDED.expires_at,
    updated_by = EXCLUDED.updated_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Delete expired entries (for scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_kv_entries()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM kv_store_0b1f4071
  WHERE expires_at IS NOT NULL AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_kv_value(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_kv_value(TEXT, JSONB, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_kv_entries() TO service_role;

-- Comments for documentation
COMMENT ON TABLE kv_store_0b1f4071 IS 'Production key-value store for app configuration and feature flags';
COMMENT ON COLUMN kv_store_0b1f4071.key IS 'Namespaced key: app_config:* or feature_flag:*';
COMMENT ON COLUMN kv_store_0b1f4071.metadata IS 'Additional metadata: environment, description, owner, etc.';
COMMENT ON COLUMN kv_store_0b1f4071.expires_at IS 'Optional TTL expiration timestamp';
COMMENT ON TABLE kv_store_audit_log IS 'Audit trail for all KV store changes';
