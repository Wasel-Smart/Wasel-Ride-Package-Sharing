export type WalletRuntimeMode = 'redirect' | 'live' | 'unavailable';

export function resolveWalletRuntimeMode({
  hasUser,
  backendReady,
}: {
  hasUser: boolean;
  backendReady: boolean;
}): WalletRuntimeMode {
  if (!hasUser) return 'redirect';
  if (!backendReady) return 'unavailable';
  return 'live';
}
