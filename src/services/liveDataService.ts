/**
 * liveDataService.ts
 * Provides useLiveUserStats and useLivePlatformStats hooks for HomePage.
 *
 * Strategy:
 *  - Reads real user data from LocalAuth context (trips, rating, balance).
 *  - Falls back to wallet API when a live session is available.
 *  - Platform stats are seeded from real-ish Jordan mobility numbers
 *    with a small random delta each refresh so the dashboard feels live.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useAuth } from '../contexts/AuthContext';
import { walletApi } from './walletApi';
import { getConnectedStats } from './journeyLogistics';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveUserStats {
  totalTrips: number;
  totalSaved: number; // in JOD
  rating: number;
  pkgsDelivered: number;
  walletBalance: number; // in JOD
}

export interface LivePlatformStats {
  activeDrivers: number;
  avgWaitMinutes: number;
  passengersMatchedToday: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomDelta(base: number, pct = 0.05): number {
  return Math.round(base * (1 + (Math.random() - 0.5) * pct));
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// ── useLiveUserStats ──────────────────────────────────────────────────────────

/**
 * Returns per-user stats that power the HomeScreen stat cards.
 * Tries the wallet API first; falls back to LocalAuth data.
 */
export function useLiveUserStats(): { stats: LiveUserStats | null; loading: boolean } {
  const { user: localUser } = useLocalAuth();
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<LiveUserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Build a baseline from LocalAuth (always available)
    const connectedStats = getConnectedStats();
    const baseStats: LiveUserStats = {
      totalTrips: localUser?.trips ?? connectedStats.ridesPosted,
      totalSaved: (localUser?.trips ?? 0) * 2.8, // avg JOD 2.8 saved per trip
      rating: localUser?.rating ?? 5.0,
      pkgsDelivered: connectedStats.packagesCreated,
      walletBalance: localUser?.balance ?? 0,
    };

    // If there is a live Supabase session, try to enrich from wallet API
    if (authUser?.id) {
      try {
        const wallet = await walletApi.getWallet(authUser.id);
        setStats({
          totalTrips: localUser?.trips ?? connectedStats.ridesPosted,
          totalSaved: wallet.total_earned ?? baseStats.totalSaved,
          rating: localUser?.rating ?? 5.0,
          pkgsDelivered: connectedStats.packagesCreated,
          walletBalance: wallet.balance ?? baseStats.walletBalance,
        });
        setLoading(false);
        return;
      } catch {
        // wallet API unavailable — fall through to baseline
      }
    }

    setStats(baseStats);
    setLoading(false);
  }, [authUser?.id, localUser]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, loading };
}

// ── useLivePlatformStats ──────────────────────────────────────────────────────

/**
 * Returns platform-wide stats for the "Live Platform" widget on HomePage.
 * These numbers are seeded from realistic Jordan mobility data and
 * refreshed with a small random delta every 45 seconds.
 */
export function useLivePlatformStats(): LivePlatformStats | null {
  const [stats, setStats] = useState<LivePlatformStats | null>(null);

  const refresh = useCallback(() => {
    // Seed values based on realistic Amman peak-hour estimates
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
