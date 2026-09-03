import { useMemo } from 'react';
import { isFeatureEnabled, type FeatureFlagKey } from '@/utils/featureFlags';

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  return useMemo(() => isFeatureEnabled(key), [key]);
}

export function useEnabledFeatureFlags(): FeatureFlagKey[] {
  return useMemo(() => {
    const flags: FeatureFlagKey[] = [];
    for (const key of [
      'twoFactorAuth',
      'enforceTwoFactorAuth',
      'emailNotifications',
      'smsNotifications',
      'whatsAppNotifications',
      'demoData',
      'syntheticTrips',
      'directSupabaseFallback',
      'captchaAuth',
    ]) {
      if (isFeatureEnabled(key as FeatureFlagKey)) {
        flags.push(key as FeatureFlagKey);
      }
    }
    return flags;
  }, []);
}
