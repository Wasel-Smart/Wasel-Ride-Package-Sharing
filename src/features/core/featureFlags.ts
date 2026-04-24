import { getConfig, getEnv } from '../../utils/env';

export type CoreFeatureKey = 'rides' | 'packages' | 'bus' | 'wallet' | 'admin';
export type CoreFeatureState = boolean | 'limited';

function isExplicitlyEnabled(keys: string[]): boolean {
  return keys.some((key) => ['1', 'true', 'yes', 'on'].includes(getEnv(key).trim().toLowerCase()));
}

function isInternalFeatureEnabled(keys: string[]): boolean {
  const config = getConfig();
  return isExplicitlyEnabled(keys) && (config.isDev || config.isTest);
}

export const featureFlags = {
  get core(): Record<CoreFeatureKey, CoreFeatureState> {
    return {
      rides: true,
      packages: true,
      bus: isInternalFeatureEnabled(['VITE_ENABLE_BUS', 'ENABLE_BUS']),
      wallet: 'limited',
      admin: isInternalFeatureEnabled(['VITE_ENABLE_ADMIN', 'ENABLE_ADMIN']),
    };
  },
};

export function getCoreFeatureState(feature: CoreFeatureKey): CoreFeatureState {
  return featureFlags.core[feature];
}

export function isCoreFeatureEnabled(feature: CoreFeatureKey): boolean {
  const state = getCoreFeatureState(feature);
  return state === true || state === 'limited';
}

export function isCoreFeatureLimited(feature: CoreFeatureKey): boolean {
  return getCoreFeatureState(feature) === 'limited';
}
