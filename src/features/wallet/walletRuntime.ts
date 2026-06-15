export type WalletRuntimeMode = 'redirect' | 'live' | 'unavailable';

export function resolveWalletRuntimeMode({
  hasUser,
  backendReady,
  localFallbackReady = false,
}: {
  hasUser: boolean;
  backendReady: boolean;
  localFallbackReady?: boolean;
}): WalletRuntimeMode {
  if (!hasUser) return 'redirect';
  if (localFallbackReady) return 'live';
  if (!backendReady) return 'unavailable';
  return 'live';
}
