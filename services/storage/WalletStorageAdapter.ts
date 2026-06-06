import type { WalletReliabilityMeta } from '../walletApi';

export function makeReliabilityMeta(degraded = false): WalletReliabilityMeta {
  return {
    degraded,
    fetchedAt: new Date().toISOString(),
    source: 'edge-api',
  };
}
