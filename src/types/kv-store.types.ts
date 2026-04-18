/**
 * KV Store Types
 * Production-grade type definitions for app configuration and feature flags
 */

// Environment types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Base KV Store Entry
export interface KVStoreEntry<T = unknown> {
  key: string;
  value: T;
  metadata: KVMetadata;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// Metadata structure
export interface KVMetadata {
  environment?: Environment;
  description?: string;
  owner?: string;
  tags?: string[];
  [key: string]: unknown;
}

// App Configuration Types
export interface AppConfig {
  maintenance_mode: boolean;
  api_rate_limit: number;
  max_upload_size_mb: number;
  supported_languages: string[];
  default_currency: string;
  support_whatsapp: string;
  min_app_version: string;
  force_update_version: string;
  [key: string]: unknown;
}

export type AppConfigKey = `app_config:${string}`;

export interface AppConfigEntry extends KVStoreEntry<AppConfig> {
  key: AppConfigKey;
}

// Feature Flag Types
export interface FeatureFlagValue {
  enabled: boolean;
  rollout?: FeatureFlagRollout;
  metadata?: {
    description?: string;
    owner?: string;
    created_date?: string;
    [key: string]: unknown;
  };
}

export interface FeatureFlagRollout {
  type: 'percentage' | 'user_list' | 'user_attribute';
  percentage?: number; // 0-100
  user_ids?: string[];
  attribute_key?: string;
  attribute_values?: string[];
}

export type FeatureFlagKey = `feature_flag:${string}`;

export interface FeatureFlagEntry extends KVStoreEntry<FeatureFlagValue> {
  key: FeatureFlagKey;
}

// Known feature flags (extend as needed)
export type KnownFeatureFlag =
  | 'feature_flag:bus_service'
  | 'feature_flag:package_delivery'
  | 'feature_flag:wallet_v2'
  | 'feature_flag:real_time_tracking'
  | 'feature_flag:two_factor_auth'
  | 'feature_flag:referral_program'
  | 'feature_flag:premium_membership';

// Audit Log Types
export interface KVAuditLogEntry {
  id: string;
  key: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_value: unknown | null;
  new_value: unknown | null;
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, unknown>;
}

// Service Function Parameters
export interface SetKVValueParams {
  key: string;
  value: unknown;
  ttl_seconds?: number;
  metadata?: KVMetadata;
}

// Helper type guards
export function isAppConfigKey(key: string): key is AppConfigKey {
  return key.startsWith('app_config:');
}

export function isFeatureFlagKey(key: string): key is FeatureFlagKey {
  return key.startsWith('feature_flag:');
}

export function isValidKVKey(key: string): boolean {
  return /^(app_config|feature_flag):[a-z0-9_:]+$/.test(key);
}
