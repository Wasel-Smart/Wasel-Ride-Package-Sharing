-- ═══════════════════════════════════════════════════════════
-- Wasel | واصل — Additional Tables for Real-time Features
-- Version: 1.0.3 (canonical schema aligned)
-- Date: February 24, 2026
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 🔧 Enable required extensions
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis      WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm     WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────
-- NOTE: This migration runs before the canonical operating-model
-- tables (users, drivers, trips) exist. All FK constraints that
-- reference those tables are added AFTER the schema is ready via
-- the production_operating_model migration. Tables here are
-- created standalone and FKs added conditionally below.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 📊 Trip Analytics Cache (no FK deps)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_analytics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date             DATE NOT NULL,
  hour             INTEGER,
  location_zone    TEXT,
  total_trips      INTEGER DEFAULT 0,
  completed_trips  INTEGER DEFAULT 0,
  cancelled_trips  INTEGER DEFAULT 0,
  total_revenue    DECIMAL(10, 2) DEFAULT 0,
  average_fare     DECIMAL(10, 2) DEFAULT 0,
  average_rating   DECIMAL(3, 2)  DEFAULT 0,
  surge_multiplier DECIMAL(3, 2)  DEFAULT 1.0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, hour, location_zone)
);

CREATE INDEX IF NOT EXISTS idx_trip_analytics_date ON trip_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_trip_analytics_zone ON trip_analytics(location_zone);

-- ─────────────────────────────────────────────────────────────
-- 🎯 Marketing Campaigns (no FK deps)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT CHECK (type IN ('push', 'email', 'sms', 'in_app')),
  target_audience  JSONB,
  message_en       TEXT NOT NULL,
  message_ar       TEXT NOT NULL,
  title_en         TEXT,
  title_ar         TEXT,
  image_url        TEXT,
  action_url       TEXT,
  scheduled_for    TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  status           TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  recipient_count  INTEGER DEFAULT 0,
  delivered_count  INTEGER DEFAULT 0,
  opened_count     INTEGER DEFAULT 0,
  clicked_count    INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status    ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_for);

-- ─────────────────────────────────────────────────────────────
-- 🎓 University Partnerships (no FK deps)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS universities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  name_ar             TEXT NOT NULL,
  city                TEXT NOT NULL,
  email_domains       TEXT[] NOT NULL,
  discount_percentage INTEGER DEFAULT 15,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_universities_active ON universities(is_active);

INSERT INTO universities (name, name_ar, city, email_domains, discount_percentage) VALUES
('University of Jordan',                        'الجامعة الأردنية',                    'Amman', ARRAY['ju.edu.jo'],   15),
('Jordan University of Science and Technology', 'جامعة العلوم والتكنولوجيا الأردنية', 'Irbid', ARRAY['just.edu.jo'], 15),
('Yarmouk University',                          'جامعة اليرموك',                        'Irbid', ARRAY['yu.edu.jo'],   15),
('German Jordanian University',                 'الجامعة الألمانية الأردنية',          'Amman', ARRAY['gju.edu.jo'],  15),
('Princess Sumaya University',                  'جامعة الأميرة سمية',                  'Amman', ARRAY['psut.edu.jo'], 15)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 📍 Real-time Driver Location Tracking
-- FK to drivers(driver_id) added conditionally
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  UUID NOT NULL,
  trip_id    UUID,
  location   extensions.GEOGRAPHY(POINT) NOT NULL,
  heading    FLOAT,
  speed      FLOAT,
  accuracy   FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_location    ON driver_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_trip ON driver_locations(driver_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated     ON driver_locations(updated_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 🚦 Driver Status History
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_status_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID NOT NULL,
  status       TEXT NOT NULL,
  is_available BOOLEAN,
  location     extensions.GEOGRAPHY(POINT),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_status_history_driver  ON driver_status_history(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_status_history_created ON driver_status_history(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 💰 Driver Payouts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_payouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id      UUID NOT NULL,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  total_trips    INTEGER DEFAULT 0,
  gross_earnings DECIMAL(10, 2) DEFAULT 0,
  commission     DECIMAL(10, 2) DEFAULT 0,
  bonuses        DECIMAL(10, 2) DEFAULT 0,
  deductions     DECIMAL(10, 2) DEFAULT 0,
  net_payout     DECIMAL(10, 2) DEFAULT 0,
  currency       TEXT DEFAULT 'JOD',
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method  TEXT,
  transaction_id TEXT,
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver ON driver_payouts(driver_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON driver_payouts(status);

-- ─────────────────────────────────────────────────────────────
-- 🎟️ Promo Code Usage Tracking (standalone — promo_codes added later)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id   UUID NOT NULL,
  user_id         UUID NOT NULL,
  trip_id         UUID,
  discount_amount DECIMAL(10, 2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id, trip_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_usage_user  ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_usage_promo ON promo_code_usage(promo_code_id);

-- ─────────────────────────────────────────────────────────────
-- 💬 Chat Media Files (standalone — messages added later)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL,
  file_type     TEXT CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_url      TEXT NOT NULL,
  file_size     INTEGER,
  thumbnail_url TEXT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_media_message ON chat_media(message_id);

-- ─────────────────────────────────────────────────────────────
-- 📱 Device Tracking (standalone — users added later)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  device_id   TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  device_name TEXT,
  app_version TEXT,
  os_version  TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user        ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_active ON devices(last_active DESC);

-- ─────────────────────────────────────────────────────────────
-- 🔐 Audit Logs (standalone — users added later)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,
  action        TEXT NOT NULL,
  resource_type TEXT,
  resource_id   UUID,
  changes       JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 🚨 Safety Incidents (standalone — users/trips added later)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safety_incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID,
  reporter_id   UUID NOT NULL,
  incident_type TEXT NOT NULL,
  severity      TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description   TEXT NOT NULL,
  location      extensions.GEOGRAPHY(POINT),
  evidence      JSONB DEFAULT '[]',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID,
  resolution    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_trip     ON safety_incidents(trip_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status   ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);

-- ─────────────────────────────────────────────────────────────
-- 🔐 Row Level Security (no FK needed for RLS)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE driver_locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage  ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_incidents  ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════
-- End of Additional Tables
-- Note: Realtime publication and FK constraints for drivers/trips
-- are added by the production_operating_model migration which
-- runs after this file and creates those tables.
-- ═══════════════════════════════════════════════════════════
