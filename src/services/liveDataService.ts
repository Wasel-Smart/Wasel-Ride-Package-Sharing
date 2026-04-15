/**
 * liveDataService.ts
 * Provides useLiveUserStats and useLivePlatformStats hooks for HomePage.
 *
 * Strategy:
 *  - Reads authenticated wallet data when available.
 *  - Falls back to cached, synced ride/package counts only.
 *  - Uses the real Mobility OS live snapshot for network-wide platform stats.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useAuth } from '../contexts/AuthContext';
import { walletApi } from './walletApi';
import { getConnectedStats } from './journeyLogistics';
import { QUERY_KEYS, STALE_TIMES } from '../utils/performance/cacheStrategy';
import { useMobilityOSLiveData } from '../features/mobility-os/liveMobilityData';

export interface LiveUserStats {
  totalTrips: number;
  totalSaved: number;
  rating: number;
  pkgsDelivered: number;
  walletBalance: number;
}

export interface LivePlatformStats {
  activeDrivers: number;
  seatAvailability: number;
  passengersMatchedToday: number;
}

export function useLiveUserStats(): { stats: LiveUserStats | null; loading: boolean } {
  const { user: localUser } = useLocalAuth();
  const { user: authUser } = useAuth();

  const connectedStats = useMemo(() => getConnectedStats(), []);
  const baseStats = useMemo<LiveUserStats>(() => ({
    totalTrips: localUser?.trips ?? connectedStats.ridesPosted,
    totalSaved: (localUser?.trips ?? 0) * 2.8,
    rating: localUser?.rating ?? 5.0,
    pkgsDelivered: connectedStats.packagesCreated,
    walletBalance: localUser?.balance ?? 0,
  }), [
    connectedStats.packagesCreated,
    connectedStats.ridesPosted,
    localUser?.balance,
    localUser?.rating,
    localUser?.trips,
  ]);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.payments.wallet(authUser?.id ?? localUser?.id ?? 'guest-home-stats'),
    queryFn: async () => {
      if (!authUser?.id) {
        return baseStats;
      }

      try {
        const wallet = await walletApi.getWallet(authUser.id);
        return {
          totalTrips: localUser?.trips ?? connectedStats.ridesPosted,
          totalSaved: wallet.total_earned ?? baseStats.totalSaved,
          rating: localUser?.rating ?? 5.0,
          pkgsDelivered: connectedStats.packagesCreated,
          walletBalance: wallet.balance ?? baseStats.walletBalance,
        } satisfies LiveUserStats;
      } catch {
        return baseStats;
      }
    },
    staleTime: STALE_TIMES.WALLET_BALANCE,
    refetchInterval: authUser?.id ? STALE_TIMES.WALLET_BALANCE : false,
    refetchOnWindowFocus: false,
    placeholderData: baseStats,
  });

  return { stats: data ?? baseStats, loading: isLoading };
}

export function useLivePlatformStats(): LivePlatformStats | null {
  const { snapshot } = useMobilityOSLiveData(false);

  return useMemo(() => {
    if (!snapshot) {
      return null;
    }

    return {
      activeDrivers: snapshot.analytics.totalVehicles,
      seatAvailability: snapshot.analytics.seatAvailability,
      passengersMatchedToday: snapshot.analytics.activePassengers,
    };
  }, [snapshot]);
}
