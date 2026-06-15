-- ═══════════════════════════════════════════════════════════
-- Wasel | واصل — Additional Tables for Real-time Features
-- Version: 1.0.1
-- Date: February 24, 2026
-- ═══════════════════════════════════════════════════════════

-- This supplements the main schema migration

-- ─────────────────────────────────────────────────────────────
-- 📍 Real-time Driver Location Tracking
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  heading FLOAT,
  speed FLOAT,
  accuracy FLOAT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial index for efficient nearby queries
CREATE INDEX idx_driver_locations_location ON driver_locations USING GIST(location);
CREATE INDEX idx_driver_locations_driver_trip ON driver_locations(driver_id, trip_id);
CREATE INDEX idx_driver_locations_updated ON driver_locations(updated_at DESC);

-- Enable realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;

-- ─────────────────────────────────────────────────────────────
-- 🎟️ Promo Code Usage Tracking
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  discount_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id, trip_id)
);

CREATE INDEX idx_promo_usage_user ON promo_code_usage(user_id);
CREATE INDEX idx_promo_usage_promo ON promo_code_usage(promo_code_id);

-- ─────────────────────────────────────────────────────────────
-- 📊 Trip Analytics Cache
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER,
  location_zone TEXT,
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  average_fare DECIMAL(10, 2) DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, hour, location_zone)
);

CREATE INDEX idx_trip_analytics_date ON trip_analytics(date DESC);
CREATE INDEX idx_trip_analytics_zone ON trip_analytics(location_zone);

-- ─────────────────────────────────────────────────────────────
-- 🚦 Driver Status History (for analytics)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  is_available BOOLEAN,
  location GEOGRAPHY(POINT),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_driver_status_history_driver ON driver_status_history(driver_id, created_at DESC);
CREATE INDEX idx_driver_status_history_created ON driver_status_history(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 💬 Chat Media Files
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_type TEXT CHECK (file_type IN ('image', 'video', 'audio', 'document')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  thumbnail_url TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_media_message ON chat_media(message_id);

-- ─────────────────────────────────────────────────────────────
-- 🎯 Marketing Campaigns
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('push', 'email', 'sms', 'in_app')),
  target_audience JSONB,
  message_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  title_en TEXT,
  title_ar TEXT,
  image_url TEXT,
  action_url TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled ON campaigns(scheduled_for);

-- ─────────────────────────────────────────────────────────────
-- 📱 Device Tracking (for push notifications)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  device_name TEXT,
  app_version TEXT,
  os_version TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_last_active ON devices(last_active DESC);

-- ─────────────────────────────────────────────────────────────
-- 🔐 Audit Logs (for compliance)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 🚨 Safety Incidents
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  location GEOGRAPHY(POINT),
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_incidents_trip ON safety_incidents(trip_id);
CREATE INDEX idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX idx_safety_incidents_severity ON safety_incidents(severity);

-- ─────────────────────────────────────────────────────────────
-- 💰 Driver Payouts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS driver_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_trips INTEGER DEFAULT 0,
  gross_earnings DECIMAL(10, 2) DEFAULT 0,
  commission DECIMAL(10, 2) DEFAULT 0,
  bonuses DECIMAL(10, 2) DEFAULT 0,
  deductions DECIMAL(10, 2) DEFAULT 0,
  net_payout DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'JOD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_driver_payouts_driver ON driver_payouts(driver_id, period_end DESC);
CREATE INDEX idx_driver_payouts_status ON driver_payouts(status);

-- ─────────────────────────────────────────────────────────────
-- 🎓 University Partnerships (for student discounts)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  city TEXT NOT NULL,
  email_domains TEXT[] NOT NULL,
  discount_percentage INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_universities_active ON universities(is_active);

-- Seed some universities
INSERT INTO universities (name, name_ar, city, email_domains, discount_percentage) VALUES
('University of Jordan', 'الجامعة الأردنية', 'Amman', ARRAY['ju.edu.jo'], 15),
('Jordan University of Science and Technology', 'جامعة العلوم والتكنولوجيا الأردنية', 'Irbid', ARRAY['just.edu.jo'], 15),
('Yarmouk University', 'جامعة اليرموك', 'Irbid', ARRAY['yu.edu.jo'], 15),
('German Jordanian University', 'الجامعة الألمانية الأردنية', 'Amman', ARRAY['gju.edu.jo'], 15),
('Princess Sumaya University', 'جامعة الأميرة سمية', 'Amman', ARRAY['psut.edu.jo'], 15)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 🔄 Realtime Subscriptions
-- ─────────────────────────────────────────────────────────────

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- ─────────────────────────────────────────────────────────────
-- 🔐 Row Level Security Policies
-- ─────────────────────────────────────────────────────────────

-- Driver Locations: Only visible to active trips
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view driver location for their trips"
  ON driver_locations FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE rider_id = auth.uid() OR driver_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update own location"
  ON driver_locations FOR ALL
  USING (driver_id = auth.uid());

-- Promo Code Usage: Users can view own usage
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo usage"
  ON promo_code_usage FOR SELECT
  USING (user_id = auth.uid());

-- Safety Incidents: Participants can view
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own safety incidents"
  ON safety_incidents FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can report safety incidents"
  ON safety_incidents FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- End of Additional Tables
-- ═══════════════════════════════════════════════════════════
