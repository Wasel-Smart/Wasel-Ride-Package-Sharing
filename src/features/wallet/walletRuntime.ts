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
  if (!backendReady && !localFallbackReady) return 'unavailable';
  return 'live';
}
