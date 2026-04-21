import type { WaselUser } from '../../contexts/LocalAuth';

export type WalletRuntimeMode = 'redirect' | 'live' | 'unavailable';

export function resolveWalletRuntimeMode({
  localUser,
}: {
  localUser: WaselUser | null;
  backendReady?: boolean;
}): WalletRuntimeMode {
  // Always allow wallet when user is authenticated - use local/demo mode
  if (!localUser) return 'redirect';
  // If user exists, allow wallet in live mode regardless of backend config
  return 'live';
}
