import type { WaselUser } from '../../contexts/LocalAuth';

export type WalletRuntimeMode = 'redirect' | 'live' | 'unavailable';

export function resolveWalletRuntimeMode({
  localUser,
  backendReady,
}: {
  localUser: WaselUser | null;
  backendReady: boolean;
}): WalletRuntimeMode {
  if (!localUser) return 'redirect';
  if (!backendReady) return 'unavailable';
  return 'live';
}
