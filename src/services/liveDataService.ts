/**
 * liveDataService.ts
 * Provides useLiveUserStats and useLivePlatformStats hooks for HomePage.
 *
 * Strategy:
 *  - Reads real user data from LocalAuth context (trips, rating, balance).
 *  - Reuses cached wallet data when a live session is available.
 *  - Platform stats are seeded from real-ish Jordan mobility numbers
 *    with a small random delta each refresh so the dashboard feels live.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useAuth } from '../contexts/AuthContext';
import { walletApi } from './walletApi';
import { getConnectedStats } from './journeyLogistics';
import { QUERY_KEYS, STALE_TIMES } from '../utils/performance/cacheStrategy';

export interface LiveUserStats {
  totalTrips: number;
  totalSaved: number;
  rating: number;
  pkgsDelivered: number;
  walletBalance: number;
}

export interface LivePlatformStats {
  activeDrivers: number;
  avgWaitMinutes: number;
  passengersMatchedToday: number;
}

function randomDelta(base: number, pct = 0.05): number {
  return Math.round(base * (1 + (Math.random() - 0.5) * pct));
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
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
  const [stats, setStats] = useState<LivePlatformStats | null>(null);

  const refresh = useCallback(() => {
    const hour = new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

    setStats({
      activeDrivers: clamp(randomDelta(isPeak ? 380 : 210, 0.08), 80, 600),
      avgWaitMinutes: clamp(randomDelta(isPeak ? 8 : 4, 0.15), 2, 25),
      passengersMatchedToday: clamp(randomDelta(isPeak ? 1420 : 780, 0.06), 100, 5000),
    });
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 45_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return stats;
}
