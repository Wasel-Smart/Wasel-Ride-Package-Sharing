/**
 * KV Store Hooks
 * React hooks for app configuration and feature flags
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  getAppConfig,
  getAllAppConfigs,
  setAppConfig,
  isFeatureEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  setFeatureFlag,
  toggleFeatureFlag,
} from '../services/kvStore';
import type {
  AppConfig,
  FeatureFlagValue,
  KVMetadata,
  Environment,
} from '../types/kv-store.types';

// ============================================================================
// App Configuration Hooks
// ============================================================================

/**
 * Hook to get app configuration
 */
export function useAppConfig(
  configKey: string,
  environment?: Environment
) {
  return useQuery({
    queryKey: ['kv-store', 'app-config', configKey, environment],
    queryFn: () => getAppConfig(configKey, environment),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get all app configurations
 */
export function useAllAppConfigs() {
  return useQuery({
    queryKey: ['kv-store', 'app-config', 'all'],
    queryFn: getAllAppConfigs,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to set app configuration (admin only)
 */
export function useSetAppConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configKey,
      value,
      metadata,
    }: {
      configKey: string;
      value: AppConfig;
      metadata?: KVMetadata;
    }) => setAppConfig(configKey, value, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kv-store', 'app-config'] });
    },
  });
}

// ============================================================================
// Feature Flag Hooks
// ============================================================================

/**
 * Hook to check if a feature is enabled for the current user
 */
export function useFeatureFlag(featureName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['kv-store', 'feature-flag', featureName, user?.id],
    queryFn: () => isFeatureEnabled(featureName, user?.id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get feature flag details
 */
export function useFeatureFlagDetails(featureName: string) {
  return useQuery({
    queryKey: ['kv-store', 'feature-flag-details', featureName],
    queryFn: () => getFeatureFlag(featureName),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get all feature flags
 */
export function useAllFeatureFlags() {
  return useQuery({
    queryKey: ['kv-store', 'feature-flag', 'all'],
    queryFn: getAllFeatureFlags,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to set feature flag (admin only)
 */
export function useSetFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      featureName,
      value,
      metadata,
    }: {
      featureName: string;
      value: FeatureFlagValue;
      metadata?: KVMetadata;
    }) => setFeatureFlag(featureName, value, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kv-store', 'feature-flag'] });
    },
  });
}

/**
 * Hook to toggle feature flag on/off (admin only)
 */
export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      featureName,
      enabled,
    }: {
      featureName: string;
      enabled: boolean;
    }) => toggleFeatureFlag(featureName, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kv-store', 'feature-flag'] });
    },
  });
}

// ============================================================================
// Convenience Hooks for Specific Features
// ============================================================================

export function useBusServiceEnabled() {
  return useFeatureFlag('bus_service');
}

export function usePackageDeliveryEnabled() {
  return useFeatureFlag('package_delivery');
}

export function useWalletV2Enabled() {
  return useFeatureFlag('wallet_v2');
}

export function useRealTimeTrackingEnabled() {
  return useFeatureFlag('real_time_tracking');
}

export function useTwoFactorAuthEnabled() {
  return useFeatureFlag('two_factor_auth');
}

export function useReferralProgramEnabled() {
  return useFeatureFlag('referral_program');
}

export function usePremiumMembershipEnabled() {
  return useFeatureFlag('premium_membership');
}
