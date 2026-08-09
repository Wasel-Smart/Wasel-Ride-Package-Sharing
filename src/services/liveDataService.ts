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

/**
 * Generates a random delta for a given base value.
 * The delta is a percentage of the base value, determined by a random factor.
 * This helps simulate "live" data with slight variations.
 * @param base The base number to apply the delta to.
 * @param pct The maximum percentage (as a decimal, e.g., 0.05 for 5%) for the random variation.
 * @returns The base value adjusted by a random delta.
 */
function randomDelta(base: number, pct = 0.05): number {
  const values = new Uint8Array(1);
  crypto.getRandomValues(values);
  const factor = ((values[0] ?? 0) / 255 - 0.5) * pct;
  return Math.round(base * (1 + factor));
}

/**
 * Clamps a value between a minimum and maximum boundary.
 * @param val The value to clamp.
 * @param min The minimum allowed value.
 * @param max The maximum allowed value.
 * @returns The clamped value.
 */
function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// ── useLiveUserStats ──────────────────────────────────────────────────────────

// Constants for user stats calculations
const AVG_JOD_SAVED_PER_TRIP = 2.8;
const DEFAULT_RATING = 5.0;

/**
 * Returns per-user stats that power the HomeScreen stat cards.
 * Tries the wallet API first; falls back to LocalAuth data.
 */
export function useLiveUserStats(): { stats: LiveUserStats | null; loading: boolean } {
  const { user: localUser } = useLocalAuth();
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<LiveUserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const authUserId = authUser?.id;
  const localTrips = localUser?.trips;
  const localRating = localUser?.rating;
  const localBalance = localUser?.balance;

  const load = useCallback(async () => {
    setLoading(true);

    const connectedStats = getConnectedStats();
    const baseStats: LiveUserStats = {
      totalTrips: localTrips ?? connectedStats.ridesPosted,
      totalSaved: (localTrips ?? 0) * AVG_JOD_SAVED_PER_TRIP,
      rating: localRating ?? DEFAULT_RATING,
      pkgsDelivered: connectedStats.packagesCreated,
      walletBalance: localBalance ?? 0,
    };

    if (authUserId) {
      try {
        const wallet = await walletApi.getWallet(authUserId);
        setStats({
          totalTrips: localTrips ?? connectedStats.ridesPosted,
          totalSaved: wallet.total_earned ?? baseStats.totalSaved,
          rating: localRating ?? DEFAULT_RATING,
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
  }, [authUserId, localTrips, localRating, localBalance]);

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

  // Constants for platform stats simulation
  const PEAK_ACTIVE_DRIVERS = 380;
  const OFF_PEAK_ACTIVE_DRIVERS = 210;
  const PEAK_AVG_WAIT_MINUTES = 8;
  const OFF_PEAK_AVG_WAIT_MINUTES = 4;
  const PEAK_PASSENGERS_MATCHED = 1420;
  const OFF_PEAK_PASSENGERS_MATCHED = 780;
  const DRIVER_COUNT_MIN = 80;
  const DRIVER_COUNT_MAX = 600;
  const WAIT_TIME_MIN = 2;
  const WAIT_TIME_MAX = 25;
  const PASSENGERS_MATCHED_MIN = 100;
  const PASSENGERS_MATCHED_MAX = 5000;
  const REFRESH_INTERVAL_MS = 45_000;

  const refresh = useCallback(() => {
    // Seed values based on realistic Amman peak-hour estimates
    const hour = new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

    const activeDriversBase = isPeak ? PEAK_ACTIVE_DRIVERS : OFF_PEAK_ACTIVE_DRIVERS;
    const avgWaitMinutesBase = isPeak ? PEAK_AVG_WAIT_MINUTES : OFF_PEAK_AVG_WAIT_MINUTES;
    const passengersMatchedBase = isPeak ? PEAK_PASSENGERS_MATCHED : OFF_PEAK_PASSENGERS_MATCHED;

    setStats({
      activeDrivers: clamp(randomDelta(activeDriversBase, 0.08), DRIVER_COUNT_MIN, DRIVER_COUNT_MAX),
      avgWaitMinutes: clamp(randomDelta(avgWaitMinutesBase, 0.15), WAIT_TIME_MIN, WAIT_TIME_MAX),
      passengersMatchedToday: clamp(randomDelta(passengersMatchedBase, 0.06), PASSENGERS_MATCHED_MIN, PASSENGERS_MATCHED_MAX),
    });
  }, []);

  useEffect(() => {
    refresh(); // Initial refresh
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return stats;
}
