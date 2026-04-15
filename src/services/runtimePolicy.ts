import { NetworkError } from '../utils/errors';
import { getConfig } from '../utils/env';

type DisabledFallbackKind = 'direct-supabase' | 'local-persistence' | 'synthetic-data';

function buildDisabledFallbackMessage(operation: string, kind: DisabledFallbackKind): string {
  const { environment } = getConfig();
  const labels: Record<DisabledFallbackKind, string> = {
    'direct-supabase': 'direct Supabase fallback',
    'local-persistence': 'local persistence fallback',
    'synthetic-data': 'synthetic data',
  };

  return `${operation} is unavailable because ${labels[kind]} is disabled in the ${environment} environment.`;
}

export function allowDirectSupabaseFallback(): boolean {
  return getConfig().allowDirectSupabaseFallback;
}

export function allowLocalPersistenceFallback(): boolean {
  return getConfig().allowLocalPersistenceFallback;
}

export function allowSyntheticData(): boolean {
  const config = getConfig();
  return config.enableDemoAccount || config.enableSyntheticTrips;
}

export function requireDirectSupabaseFallback(operation: string): void {
  if (!allowDirectSupabaseFallback()) {
    throw new NetworkError(buildDisabledFallbackMessage(operation, 'direct-supabase'), {
      environment: getConfig().environment,
      operation,
    });
  }
}

export function requireLocalPersistenceFallback(operation: string): void {
  if (!allowLocalPersistenceFallback()) {
    throw new NetworkError(buildDisabledFallbackMessage(operation, 'local-persistence'), {
      environment: getConfig().environment,
      operation,
    });
  }
}

export function requireSyntheticData(operation: string): void {
  if (!allowSyntheticData()) {
    throw new NetworkError(buildDisabledFallbackMessage(operation, 'synthetic-data'), {
      environment: getConfig().environment,
      operation,
    });
  }
}
