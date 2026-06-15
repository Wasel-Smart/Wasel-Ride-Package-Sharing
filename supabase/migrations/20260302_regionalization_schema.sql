-- ============================================================================
-- WASEL REGIONALIZATION SCHEMA v2.0
-- Phase 1: Country & Context Infrastructure
-- Created: March 2, 2026
-- ============================================================================

-- ============================================================================
-- 1. COUNTRIES TABLE (Core Country Registry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  name_local VARCHAR(100), -- Native language name (e.g., "مصر" for Egypt)
  iso_alpha2 CHAR(2) NOT NULL UNIQUE, -- "EG", "SA", "AE", etc.
  iso_alpha3 CHAR(3) NOT NULL UNIQUE, -- "EGY", "SAU", "ARE", etc.
  iso_numeric CHAR(3), -- "818", "682", "784", etc.
  
  -- Localization
  default_currency_code CHAR(3) NOT NULL, -- "EGP", "SAR", "AED", etc.
  default_locale VARCHAR(10) NOT NULL DEFAULT 'ar', -- "ar-EG", "ar-SA", etc.
  fallback_locale VARCHAR(10) DEFAULT 'en',
  phone_country_code VARCHAR(5) NOT NULL, -- "+20", "+966", "+971", etc.
  phone_format VARCHAR(50), -- "(###) ###-####" for formatting
  
  -- Regional settings
  timezone VARCHAR(50) NOT NULL, -- "Africa/Cairo", "Asia/Riyadh", etc.
  utc_offset_minutes INTEGER NOT NULL, -- 120, 180, 240, etc.
  is_rtl BOOLEAN NOT NULL DEFAULT true,
  calendar_type VARCHAR(20) DEFAULT 'gregorian', -- "gregorian", "hijri"
  weekend_days INTEGER[] DEFAULT ARRAY[5, 6], -- [Friday=5, Saturday=6] for most MENA
  
  -- Status & metadata
  status VARCHAR(20) NOT NULL DEFAULT 'inactive', -- "active", "inactive", "coming_soon", "beta"
  launch_date DATE,
  priority INTEGER DEFAULT 100, -- Lower = higher priority (for ordering)
  flag_emoji VARCHAR(10), -- "🇪🇬", "🇸🇦", "🇦🇪", etc.
  
  -- Regulatory
  requires_national_id BOOLEAN DEFAULT true,
  requires_police_clearance BOOLEAN DEFAULT true,
  min_driver_age INTEGER DEFAULT 21,
  min_passenger_age_alone INTEGER DEFAULT 18,
  allows_cross_border BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'coming_soon', 'beta')),
  CONSTRAINT valid_calendar CHECK (calendar_type IN ('gregorian', 'hijri', 'both'))
);

-- Index for fast lookups
CREATE INDEX idx_countries_iso_alpha2 ON countries(iso_alpha2);
CREATE INDEX idx_countries_status ON countries(status);
CREATE INDEX idx_countries_priority ON countries(priority);

-- Update trigger
CREATE OR REPLACE FUNCTION update_countries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_countries_updated_at();

-- ============================================================================
-- 2. COUNTRY_CONFIGS TABLE (Flexible Key-Value Config Store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS country_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  
  -- Config key-value
  key VARCHAR(100) NOT NULL, -- "pricing_engine_version", "map_style", etc.
  value JSONB NOT NULL, -- Flexible JSON storage
  description TEXT,
  
  -- Metadata
  config_type VARCHAR(50) DEFAULT 'general', -- "general", "pricing", "payment", "cultural", "safety"
  is_sensitive BOOLEAN DEFAULT false, -- Hide from public APIs
  requires_approval BOOLEAN DEFAULT false, -- Needs manager approval to change
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(country_id, key)
);

-- Indexes
CREATE INDEX idx_country_configs_country_id ON country_configs(country_id);
CREATE INDEX idx_country_configs_key ON country_configs(key);
CREATE INDEX idx_country_configs_type ON country_configs(config_type);

-- Update trigger
CREATE TRIGGER trigger_update_country_configs_updated_at
  BEFORE UPDATE ON country_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_countries_updated_at();

-- ============================================================================
-- 3. CURRENCIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  code CHAR(3) NOT NULL UNIQUE, -- "EGP", "SAR", "AED", etc.
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL, -- "ج.م", "ر.س", "د.إ", etc.
  symbol_native VARCHAR(10), -- Native symbol
  
  -- Formatting
  decimals INTEGER NOT NULL DEFAULT 2, -- 2 for most, 3 for KWD/BHD
  symbol_position VARCHAR(10) DEFAULT 'before', -- "before", "after"
  decimal_separator VARCHAR(5) DEFAULT '.',
  thousands_separator VARCHAR(5) DEFAULT ',',
  
  -- Metadata
  is_crypto BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_currencies_code ON currencies(code);
CREATE INDEX idx_currencies_active ON currencies(is_active);

-- ============================================================================
-- 4. EXCHANGE_RATES TABLE (Real-time Currency Conversion)
-- ============================================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Currency pair
  from_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  
  -- Rate details
  rate DECIMAL(18, 8) NOT NULL, -- High precision for crypto/volatile currencies
  inverse_rate DECIMAL(18, 8), -- Pre-calculated for performance
  
  -- Source & validity
  source VARCHAR(50) DEFAULT 'manual', -- "manual", "ecb", "exchangerate.host", etc.
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ, -- NULL = no expiry
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(from_currency_code, to_currency_code, fetched_at)
);

-- Indexes
CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency_code, to_currency_code);
CREATE INDEX idx_exchange_rates_fetched_at ON exchange_rates(fetched_at DESC);
CREATE INDEX idx_exchange_rates_active ON exchange_rates(is_active);

-- ============================================================================
-- 5. SERVICE_ZONES (Geo-Fencing & Service Areas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location hierarchy
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  city_name VARCHAR(100) NOT NULL,
  city_name_ar VARCHAR(100) NOT NULL,
  zone_name VARCHAR(100), -- "Downtown Riyadh", "Cairo Airport", etc.
  zone_name_ar VARCHAR(100),
  
  -- Geo data (PostGIS)
  zone_polygon GEOMETRY(POLYGON, 4326) NOT NULL, -- WGS84
  center_point GEOMETRY(POINT, 4326), -- Pre-calculated centroid
  
  -- Service configuration
  service_type VARCHAR(50) NOT NULL, -- "intercity", "carpool", "delivery", etc.
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  
  -- Metadata
  population_estimate INTEGER,
  coverage_area_km2 DECIMAL(10, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial indexes (PostGIS)
CREATE INDEX idx_service_zones_polygon ON service_zones USING GIST(zone_polygon);
CREATE INDEX idx_service_zones_center ON service_zones USING GIST(center_point);
CREATE INDEX idx_service_zones_country ON service_zones(country_id);
CREATE INDEX idx_service_zones_service_type ON service_zones(service_type);

-- ============================================================================
-- 6. ROUTE_RESTRICTIONS (Cross-Border Logic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS route_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Route definition
  from_country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  to_country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  
  -- Restriction rules
  allowed BOOLEAN DEFAULT false,
  reason_code VARCHAR(50), -- "border_closed", "no_license", "regulatory", etc.
  reason_message TEXT,
  reason_message_ar TEXT,
  
  -- Conditional rules (JSONB for flexibility)
  conditions JSONB, -- {"requires_passport": true, "max_distance_km": 500}
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(from_country_id, to_country_id)
);

-- Indexes
CREATE INDEX idx_route_restrictions_from ON route_restrictions(from_country_id);
CREATE INDEX idx_route_restrictions_to ON route_restrictions(to_country_id);

-- ============================================================================
-- 7. PRICING_ZONES (Dynamic Pricing per Zone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  city_name VARCHAR(100) NOT NULL,
  zone_polygon GEOMETRY(POLYGON, 4326),
  
  -- Pricing rules (flexible JSONB)
  base_fare_rules JSONB NOT NULL, -- {"intercity": {"base": 800, "per_km": 50}}
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  
  -- Validity
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pricing_zones_polygon ON pricing_zones USING GIST(zone_polygon);
CREATE INDEX idx_pricing_zones_country ON pricing_zones(country_id);
CREATE INDEX idx_pricing_zones_active ON pricing_zones(is_active);

-- ============================================================================
-- 8. COUNTRY_SERVICES (Feature Flags per Country)
-- ============================================================================
CREATE TABLE IF NOT EXISTS country_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  service_id VARCHAR(50) NOT NULL, -- Maps to services in /config/services-hierarchy.ts
  
  -- Availability
  enabled BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 100, -- Display order
  rollout_percentage INTEGER DEFAULT 0, -- 0-100 for gradual rollout
  
  -- Metadata
  launch_date DATE,
  sunset_date DATE,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(country_id, service_id),
  CONSTRAINT valid_rollout CHECK (rollout_percentage BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_country_services_country ON country_services(country_id);
CREATE INDEX idx_country_services_enabled ON country_services(enabled);

-- ============================================================================
-- 9. COUNTRY_FEATURE_FLAGS (Feature Toggle System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS country_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  flag_key VARCHAR(100) NOT NULL, -- "female_driver_preference", "prayer_stops", etc.
  
  -- Flag state
  enabled BOOLEAN DEFAULT false,
  variant VARCHAR(50), -- "control", "variant_a", "variant_b" for A/B testing
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  
  -- Metadata
  description TEXT,
  category VARCHAR(50), -- "safety", "cultural", "payment", "premium"
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(country_id, flag_key),
  CONSTRAINT valid_flag_rollout CHECK (rollout_percentage BETWEEN 0 AND 100)
);

-- Indexes
CREATE INDEX idx_country_feature_flags_country ON country_feature_flags(country_id);
CREATE INDEX idx_country_feature_flags_key ON country_feature_flags(flag_key);
CREATE INDEX idx_country_feature_flags_enabled ON country_feature_flags(enabled);

-- ============================================================================
-- 10. USER_REGIONAL_PREFERENCES (User-Specific Country Settings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_regional_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country_iso CHAR(2) NOT NULL, -- User's preferred country context
  
  -- Preferences
  gender_preference VARCHAR(20), -- "mixed", "women_only", "men_only", "family_only"
  privacy_level VARCHAR(20) DEFAULT 'standard', -- "standard", "high", "maximum"
  preferred_locale VARCHAR(10), -- Override country default
  preferred_currency CHAR(3), -- Override country default
  
  -- Cultural preferences
  prayer_time_alerts BOOLEAN DEFAULT true,
  ramadan_mode BOOLEAN DEFAULT false,
  hide_profile_photo BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, country_iso)
);

-- Indexes
CREATE INDEX idx_user_regional_prefs_user ON user_regional_preferences(user_id);
CREATE INDEX idx_user_regional_prefs_country ON user_regional_preferences(country_iso);

-- ============================================================================
-- 11. CONFIG_AUDIT_LOG (Full Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- "INSERT", "UPDATE", "DELETE"
  
  -- Who changed it
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  
  -- What was the change
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[], -- Array of field names that changed
  
  -- When & where
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Impact assessment
  impact_level VARCHAR(20) DEFAULT 'low', -- "low", "medium", "high", "critical"
  requires_rollback BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_config_audit_table ON config_audit_log(table_name);
CREATE INDEX idx_config_audit_record ON config_audit_log(record_id);
CREATE INDEX idx_config_audit_user ON config_audit_log(user_id);
CREATE INDEX idx_config_audit_changed_at ON config_audit_log(changed_at DESC);

-- ============================================================================
-- SEED DATA: Initial 10 MENA Countries
-- ============================================================================

INSERT INTO countries (name, name_ar, iso_alpha2, iso_alpha3, default_currency_code, default_locale, phone_country_code, timezone, utc_offset_minutes, status, priority, flag_emoji, weekend_days) VALUES
  -- Jordan (already launched)
  ('Jordan', 'الأردن', 'JO', 'JOR', 'JOD', 'ar-JO', '+962', 'Asia/Amman', 180, 'active', 1, '🇯🇴', ARRAY[5, 6]),
  
  -- Priority launches (Gulf)
  ('Saudi Arabia', 'المملكة العربية السعودية', 'SA', 'SAU', 'SAR', 'ar-SA', '+966', 'Asia/Riyadh', 180, 'coming_soon', 2, '🇸🇦', ARRAY[5, 6]),
  ('United Arab Emirates', 'الإمارات العربية المتحدة', 'AE', 'ARE', 'AED', 'ar-AE', '+971', 'Asia/Dubai', 240, 'coming_soon', 3, '🇦🇪', ARRAY[5, 6]),
  ('Qatar', 'قطر', 'QA', 'QAT', 'QAR', 'ar-QA', '+974', 'Asia/Qatar', 180, 'coming_soon', 4, '🇶🇦', ARRAY[5, 6]),
  ('Kuwait', 'الكويت', 'KW', 'KWT', 'KWD', 'ar-KW', '+965', 'Asia/Kuwait', 180, 'coming_soon', 5, '🇰🇼', ARRAY[5, 6]),
  
  -- Other Gulf
  ('Bahrain', 'البحرين', 'BH', 'BHR', 'BHD', 'ar-BH', '+973', 'Asia/Bahrain', 180, 'coming_soon', 6, '🇧🇭', ARRAY[5, 6]),
  ('Oman', 'عُمان', 'OM', 'OMN', 'OMR', 'ar-OM', '+968', 'Asia/Muscat', 240, 'coming_soon', 7, '🇴🇲', ARRAY[5, 6]),
  
  -- North Africa
  ('Egypt', 'مصر', 'EG', 'EGY', 'EGP', 'ar-EG', '+20', 'Africa/Cairo', 120, 'coming_soon', 8, '🇪🇬', ARRAY[5, 6]),
  
  -- Levant
  ('Lebanon', 'لبنان', 'LB', 'LBN', 'LBP', 'ar-LB', '+961', 'Asia/Beirut', 120, 'coming_soon', 9, '🇱🇧', ARRAY[6, 0]),
  
  -- Iraq
  ('Iraq', 'العراق', 'IQ', 'IRQ', 'IQD', 'ar-IQ', '+964', 'Asia/Baghdad', 180, 'coming_soon', 10, '🇮🇶', ARRAY[5, 6])
ON CONFLICT (iso_alpha2) DO NOTHING;

-- ============================================================================
-- SEED DATA: Currencies
-- ============================================================================

INSERT INTO currencies (code, name, name_ar, symbol, decimals, symbol_position) VALUES
  ('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.أ', 3, 'after'),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', 2, 'after'),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 2, 'after'),
  ('QAR', 'Qatari Riyal', 'ريال قطري', 'ر.ق', 2, 'after'),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 3, 'after'),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 3, 'after'),
  ('OMR', 'Omani Rial', 'ريال عماني', 'ر.ع', 3, 'after'),
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 2, 'after'),
  ('LBP', 'Lebanese Pound', 'ليرة لبنانية', 'ل.ل', 2, 'after'),
  ('IQD', 'Iraqi Dinar', 'دينار عراقي', 'د.ع', 3, 'after'),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', 2, 'before')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Exchange Rates (to USD)
-- ============================================================================

INSERT INTO exchange_rates (from_currency_code, to_currency_code, rate, inverse_rate, source, valid_until) VALUES
  ('JOD', 'USD', 1.41, 0.71, 'manual', '2026-12-31'),
  ('SAR', 'USD', 0.27, 3.75, 'manual', '2026-12-31'),
  ('AED', 'USD', 0.27, 3.67, 'manual', '2026-12-31'),
  ('QAR', 'USD', 0.27, 3.64, 'manual', '2026-12-31'),
  ('KWD', 'USD', 3.26, 0.31, 'manual', '2026-12-31'),
  ('BHD', 'USD', 2.65, 0.38, 'manual', '2026-12-31'),
  ('OMR', 'USD', 2.60, 0.38, 'manual', '2026-12-31'),
  ('EGP', 'USD', 0.032, 31.00, 'manual', '2026-12-31'),
  ('LBP', 'USD', 0.000067, 15000, 'manual', '2026-12-31'),
  ('IQD', 'USD', 0.00068, 1470, 'manual', '2026-12-31')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_regional_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access for countries, currencies, exchange rates
CREATE POLICY "Public read access to active countries"
  ON countries FOR SELECT
  USING (status = 'active' OR status = 'coming_soon');

CREATE POLICY "Public read access to currencies"
  ON currencies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public read access to exchange rates"
  ON exchange_rates FOR SELECT
  USING (is_active = true);

-- Users can read their own preferences
CREATE POLICY "Users can read own regional preferences"
  ON user_regional_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own regional preferences"
  ON user_regional_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own regional preferences"
  ON user_regional_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin-only policies for config tables
CREATE POLICY "Admins can manage country_configs"
  ON country_configs FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage service_zones"
  ON service_zones FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get active countries
CREATE OR REPLACE FUNCTION get_active_countries()
RETURNS TABLE (
  iso_alpha2 CHAR(2),
  name VARCHAR(100),
  name_ar VARCHAR(100),
  currency_code CHAR(3),
  flag_emoji VARCHAR(10)
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.iso_alpha2, c.name, c.name_ar, c.default_currency_code, c.flag_emoji
  FROM countries c
  WHERE c.status = 'active'
  ORDER BY c.priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get country config by ISO
CREATE OR REPLACE FUNCTION get_country_config(country_iso CHAR(2))
RETURNS JSONB AS $$
DECLARE
  config_json JSONB;
BEGIN
  SELECT jsonb_object_agg(cc.key, cc.value)
  INTO config_json
  FROM country_configs cc
  JOIN countries c ON c.id = cc.country_id
  WHERE c.iso_alpha2 = country_iso;
  
  RETURN COALESCE(config_json, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convert currency
CREATE OR REPLACE FUNCTION convert_currency(
  amount DECIMAL,
  from_code CHAR(3),
  to_code CHAR(3)
)
RETURNS DECIMAL AS $$
DECLARE
  exchange_rate DECIMAL;
BEGIN
  IF from_code = to_code THEN
    RETURN amount;
  END IF;
  
  SELECT er.rate INTO exchange_rate
  FROM exchange_rates er
  WHERE er.from_currency_code = from_code
    AND er.to_currency_code = to_code
    AND er.is_active = true
    AND (er.valid_until IS NULL OR er.valid_until > NOW())
  ORDER BY er.fetched_at DESC
  LIMIT 1;
  
  IF exchange_rate IS NULL THEN
    RAISE EXCEPTION 'No exchange rate found for % to %', from_code, to_code;
  END IF;
  
  RETURN amount * exchange_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Regionalization Schema v2.0 Applied Successfully';
  RAISE NOTICE '📊 10 MENA countries seeded';
  RAISE NOTICE '💱 11 currencies configured';
  RAISE NOTICE '🔐 RLS policies enabled';
  RAISE NOTICE '🚀 Ready for Phase 2: Geo-Fencing';
END $$;
