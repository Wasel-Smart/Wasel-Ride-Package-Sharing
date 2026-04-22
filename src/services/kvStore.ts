/**
 * KV Store Service
 * Production-grade service for app configuration and feature flags
 * 
 * @module services/kvStore
 */

import { supabase as _supabase } from './directSupabase';

function getSupabase() {
  if (!_supabase) {throw new Error('Supabase client is not initialised');}
  return _supabase;
}
import {
  isValidKVKey,
  type AppConfig,
  type AppConfigKey,
  type Environment,
  type FeatureFlagKey,
  type FeatureFlagValue,
  type KVAuditLogEntry,
  type KVStoreEntry,
  type KVMetadata,
  type SetKVValueParams,
} from '../types/kv-store.types';

const KV_TABLE = 'kv_store_0b1f4071';
const AUDIT_TABLE = 'kv_store_audit_log';

// ============================================================================
// Core KV Operations
// ============================================================================

/**
 * Get a value from the KV store
 */
export async function getKVValue<T = unknown>(key: string): Promise<T | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_kv_value', { p_key: key });

  if (error) {
    console.error('[KV Store] Error getting value:', error);
    return null;
  }

  return data as T;
}

/**
 * Set a value in the KV store (admin/service role only)
 */
export async function setKVValue(params: SetKVValueParams): Promise<boolean> {
  if (!isValidKVKey(params.key)) {
    console.error('[KV Store] Invalid key format:', params.key);
    return false;
  }

  const supabase = getSupabase();
  const { error } = await supabase.rpc('set_kv_value', {
    p_key: params.key,
    p_value: params.value,
    p_ttl_seconds: params.ttl_seconds ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    console.error('[KV Store] Error setting value:', error);
    return false;
  }

  return true;
}

/**
 * Delete a value from the KV store (admin/service role only)
 */
export async function deleteKVValue(key: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(KV_TABLE)
    .delete()
    .eq('key', key);

  if (error) {
    console.error('[KV Store] Error deleting value:', error);
    return false;
  }

  return true;
}

/**
 * Get multiple values by key prefix
 */
export async function getKVValuesByPrefix<T = unknown>(
  prefix: string
): Promise<KVStoreEntry<T>[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('*')
    .like('key', `${prefix}%`)
    .or('expires_at.is.null,expires_at.gt.now()');

  if (error) {
    console.error('[KV Store] Error getting values by prefix:', error);
    return [];
  }

  return (data as KVStoreEntry<T>[]) || [];
}

// ============================================================================
// App Configuration
// ============================================================================

/**
 * Get app configuration by key
 */
export async function getAppConfig(
  configKey: string,
  environment?: Environment
): Promise<AppConfig | null> {
  const key: AppConfigKey = `app_config:${configKey}`;
  const config = await getKVValue<AppConfig>(key);

  if (!config) {return null;}

  // Filter by environment if specified
  if (environment) {
    const entry = await getKVEntry<AppConfig>(key);
    if (entry?.metadata.environment !== environment) {
      return null;
    }
  }

  return config;
}

/**
 * Set app configuration (admin only)
 */
export async function setAppConfig(
  configKey: string,
  value: AppConfig,
  metadata?: KVMetadata
): Promise<boolean> {
  const key: AppConfigKey = `app_config:${configKey}`;
  
  return setKVValue({
    key,
    value,
    metadata: {
      ...metadata,
      type: 'app_config',
    },
  });
}

/**
 * Get all app configurations
 */
export async function getAllAppConfigs(): Promise<KVStoreEntry<AppConfig>[]> {
  return getKVValuesByPrefix<AppConfig>('app_config:');
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Check if a feature flag is enabled for a user
 */
export async function isFeatureEnabled(
  featureName: string,
  userId?: string
): Promise<boolean> {
  const key: FeatureFlagKey = `feature_flag:${featureName}`;
  const flag = await getKVValue<FeatureFlagValue>(key);

  if (!flag) {return false;}
  if (!flag.enabled) {return false;}

  // No rollout rules - feature is fully enabled
  if (!flag.rollout) {return true;}

  // Apply rollout rules
  return evaluateRollout(flag.rollout, userId);
}

/**
 * Get feature flag details
 */
export async function getFeatureFlag(
  featureName: string
): Promise<FeatureFlagValue | null> {
  const key: FeatureFlagKey = `feature_flag:${featureName}`;
  return getKVValue<FeatureFlagValue>(key);
}

/**
 * Set feature flag (admin only)
 */
export async function setFeatureFlag(
  featureName: string,
  value: FeatureFlagValue,
  metadata?: KVMetadata
): Promise<boolean> {
  const key: FeatureFlagKey = `feature_flag:${featureName}`;
  
  return setKVValue({
    key,
    value,
    metadata: {
      ...metadata,
      type: 'feature_flag',
    },
  });
}

/**
 * Toggle feature flag on/off (admin only)
 */
export async function toggleFeatureFlag(
  featureName: string,
  enabled: boolean
): Promise<boolean> {
  const key: FeatureFlagKey = `feature_flag:${featureName}`;
  const existing = await getKVValue<FeatureFlagValue>(key);

  if (!existing) {
    return setFeatureFlag(featureName, { enabled });
  }

  return setKVValue({
    key,
    value: { ...existing, enabled },
  });
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<KVStoreEntry<FeatureFlagValue>[]> {
  return getKVValuesByPrefix<FeatureFlagValue>('feature_flag:');
}

// ============================================================================
// Rollout Evaluation
// ============================================================================

function evaluateRollout(
  rollout: FeatureFlagValue['rollout'],
  userId?: string
): boolean {
  if (!rollout) {return true;}

  switch (rollout.type) {
    case 'percentage':
      return evaluatePercentageRollout(rollout.percentage ?? 0, userId);
    
    case 'user_list':
      return evaluateUserListRollout(rollout.user_ids ?? [], userId);
    
    case 'user_attribute':
      // Requires additional user data - implement based on your needs
      return false;
    
    default:
      return false;
  }
}

function evaluatePercentageRollout(percentage: number, userId?: string): boolean {
  if (!userId) {return false;}
  
  // Deterministic hash-based rollout
  const hash = simpleHash(userId);
  return (hash % 100) < percentage;
}

function evaluateUserListRollout(userIds: string[], userId?: string): boolean {
  if (!userId) {return false;}
  return userIds.includes(userId);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// ============================================================================
// Audit & Utilities
// ============================================================================

/**
 * Get full KV entry with metadata
 */
export async function getKVEntry<T = unknown>(
  key: string
): Promise<KVStoreEntry<T> | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('*')
    .eq('key', key)
    .or('expires_at.is.null,expires_at.gt.now()')
    .single();

  if (error) {
    console.error('[KV Store] Error getting entry:', error);
    return null;
  }

  return data as KVStoreEntry<T>;
}

/**
 * Get audit log for a key (admin only)
 */
export async function getKVAuditLog(
  key: string,
  limit = 50
): Promise<KVAuditLogEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(AUDIT_TABLE)
    .select('*')
    .eq('key', key)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[KV Store] Error getting audit log:', error);
    return [];
  }

  return (data as KVAuditLogEntry[]) || [];
}

/**
 * Cleanup expired entries (admin only)
 */
export async function cleanupExpiredEntries(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('cleanup_expired_kv_entries');

  if (error) {
    console.error('[KV Store] Error cleaning up expired entries:', error);
    return 0;
  }

  return data as number;
}
