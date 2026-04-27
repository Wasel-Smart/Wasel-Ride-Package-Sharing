-- Seed: Initial App Configuration and Feature Flags
-- Description: Bootstrap production-ready app config and feature flags

-- ============================================================================
-- App Configuration Seeds
-- ============================================================================

-- Global App Configuration (Production)
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'app_config:global',
  '{
    "maintenance_mode": false,
    "api_rate_limit": 100,
    "max_upload_size_mb": 10,
    "supported_languages": ["en", "ar"],
    "default_currency": "JOD",
    "support_whatsapp": "+962791234567",
    "min_app_version": "1.0.0",
    "force_update_version": "1.0.0"
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Global application configuration",
    "owner": "platform_team",
    "tags": ["critical", "global"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Staging App Configuration
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'app_config:global_staging',
  '{
    "maintenance_mode": false,
    "api_rate_limit": 200,
    "max_upload_size_mb": 20,
    "supported_languages": ["en", "ar"],
    "default_currency": "JOD",
    "support_whatsapp": "+962791234567",
    "min_app_version": "0.9.0",
    "force_update_version": "0.9.0"
  }'::jsonb,
  '{
    "environment": "staging",
    "description": "Staging environment configuration",
    "owner": "platform_team",
    "tags": ["staging", "testing"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Development App Configuration
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'app_config:global_development',
  '{
    "maintenance_mode": false,
    "api_rate_limit": 1000,
    "max_upload_size_mb": 50,
    "supported_languages": ["en", "ar"],
    "default_currency": "JOD",
    "support_whatsapp": "+962791234567",
    "min_app_version": "0.0.1",
    "force_update_version": "0.0.1"
  }'::jsonb,
  '{
    "environment": "development",
    "description": "Development environment configuration",
    "owner": "platform_team",
    "tags": ["development", "local"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Feature Flag Seeds
-- ============================================================================

-- Bus Service Feature
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:bus_service',
  '{
    "enabled": true,
    "metadata": {
      "description": "Enable bus service booking and tracking",
      "owner": "mobility_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Bus service feature flag",
    "owner": "mobility_team",
    "tags": ["core_feature", "transport"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Package Delivery Feature
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:package_delivery',
  '{
    "enabled": true,
    "metadata": {
      "description": "Enable package delivery via rides",
      "owner": "logistics_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Package delivery feature flag",
    "owner": "logistics_team",
    "tags": ["core_feature", "logistics"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Wallet V2 Feature (Gradual Rollout - 25%)
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:wallet_v2',
  '{
    "enabled": true,
    "rollout": {
      "type": "percentage",
      "percentage": 25
    },
    "metadata": {
      "description": "New wallet interface with enhanced features",
      "owner": "payments_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Wallet V2 gradual rollout",
    "owner": "payments_team",
    "tags": ["beta", "payments", "gradual_rollout"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Real-time Tracking Feature
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:real_time_tracking',
  '{
    "enabled": true,
    "metadata": {
      "description": "Enable real-time GPS tracking for active trips",
      "owner": "mobility_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Real-time tracking feature flag",
    "owner": "mobility_team",
    "tags": ["core_feature", "tracking"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Two-Factor Authentication (Disabled by default)
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:two_factor_auth',
  '{
    "enabled": false,
    "metadata": {
      "description": "Enable two-factor authentication for user accounts",
      "owner": "security_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Two-factor authentication feature flag",
    "owner": "security_team",
    "tags": ["security", "auth", "coming_soon"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Referral Program (Beta - 10% rollout)
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:referral_program',
  '{
    "enabled": true,
    "rollout": {
      "type": "percentage",
      "percentage": 10
    },
    "metadata": {
      "description": "Enable referral program with rewards",
      "owner": "growth_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Referral program beta rollout",
    "owner": "growth_team",
    "tags": ["beta", "growth", "gradual_rollout"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- Premium Membership (Coming Soon)
INSERT INTO kv_store_0b1f4071 (key, value, metadata, updated_by)
VALUES (
  'feature_flag:premium_membership',
  '{
    "enabled": false,
    "metadata": {
      "description": "Enable premium membership with exclusive benefits",
      "owner": "product_team",
      "created_date": "2026-03-24"
    }
  }'::jsonb,
  '{
    "environment": "production",
    "description": "Premium membership feature flag",
    "owner": "product_team",
    "tags": ["coming_soon", "premium"]
  }'::jsonb,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify seeds were inserted
DO $$
DECLARE
  config_count INTEGER;
  flag_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM kv_store_0b1f4071 WHERE key LIKE 'app_config:%';
  SELECT COUNT(*) INTO flag_count FROM kv_store_0b1f4071 WHERE key LIKE 'feature_flag:%';
  
  RAISE NOTICE 'KV Store seeded successfully:';
  RAISE NOTICE '  - App Configs: %', config_count;
  RAISE NOTICE '  - Feature Flags: %', flag_count;
END $$;
