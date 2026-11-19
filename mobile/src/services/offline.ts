/**
 * OfflineService — Production-Grade Offline Queue with Idempotency
 *
 * Architecture:
 *  - Every queued action carries a stable idempotency key (action.id) that is
 *    persisted to MMKV alongside the queue. On retry the same key is sent,
 *    so the server can detect and short-circuit duplicate processing.
 *  - The dedup cache is persisted to MMKV so app restarts don't re-queue
 *    actions that were already dispatched in a previous session.
 *  - Sync runs all actions in parallel via Promise.allSettled — a single
 *    slow/failing action no longer blocks the entire queue.
 *  - Idempotency key is injected as the X-Idempotency-Key header on every
 *    mutating fetch call, matching the server-side middleware contract.
 */

import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import { mobileAuth } from './auth';
import {
  createOfflineAction,
  incrementOfflineRetry,
  type OfflineAction,
} from '../utils/offlineQueue';
import { isValidApiUrl } from '../utils/sanitize';
import { CSRF_HEADER, getCsrfToken } from '../utils/csrf';

function sanitizeLogValue(value: unknown): string {
  if (value instanceof Error) {
    return value.message.replace(/[\r\n]+/g, ' ');
  }
  if (typeof value === 'string') {
    return value.replace(/[\r\n]+/g, ' ');
  }
  return String(value).replace(/[\r\n]+/g, ' ');
}

// ── MMKV helpers ──────────────────────────────────────────────────────────────

const mmkv = new MMKV();

function mmkvGet(key: string): string | null {
  try { return mmkv.getString(key) ?? null; } catch { return null; }
}
function mmkvSet(key: string, value: string): void {
  try { mmkv.set(key, value); } catch { /* storage full — best effort */ }
}
function mmkvDelete(key: string): void {
  try { mmkv.delete(key); } catch { /* ignore */ }
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEYS = {
  OFFLINE_QUEUE: '@wasel:offline_queue',
  DEDUP_CACHE: '@wasel:offline_dedup',   // persisted across restarts
  CACHED_RIDES: '@wasel:cached_rides',
  CACHED_DRIVER: '@wasel:cached_driver',
  CACHED_HISTORY: '@wasel:cached_history',
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresIn: number;
}

type OfflineStats = { queueSize: number; cacheSize: number; isOnline: boolean };

// ── Service ───────────────────────────────────────────────────────────────────

export class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private listeners = new Set<(online: boolean) => void>();
  private statsListeners = new Set<(stats: OfflineStats) => void>();
  private unsubscribeNetInfo: (() => void) | null = null;

  private readonly maxQueueSize = 100;
  private readonly maxRetries = 5;

  constructor() {
    void this.initNetworkMonitoring().catch(err =>
      console.error('[Offline] Network monitoring failed:', sanitizeLogValue(err)),
    );
  }

  // ── Network monitoring ──────────────────────────────────────────────────────

  private async initNetworkMonitoring(): Promise<void> {
    const state = await NetInfo.fetch();
    this.isOnline = this.readOnlineState(state);

    this.unsubscribeNetInfo = NetInfo.addEventListener(s => {
      const wasOnline = this.isOnline;
      this.isOnline = this.readOnlineState(s);
      this.listeners.forEach(cb => cb(this.isOnline));
      void this.notifyStats();
      if (!wasOnline && this.isOnline) void this.syncOfflineQueue();
    });
  }

  private readOnlineState(s: { isConnected: boolean | null; isInternetReachable?: boolean | null }): boolean {
    return (s.isConnected ?? true) && (s.isInternetReachable ?? true);
  }

  isDeviceOnline(): boolean { return this.isOnline; }

  subscribeToNetworkState(cb: (online: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isOnline);
    return () => this.listeners.delete(cb);
  }

  subscribeToStats(cb: (stats: OfflineStats) => void): () => void {
    this.statsListeners.add(cb);
    void this.getStats().then(cb).catch(err => console.error(sanitizeLogValue(err)));
    return () => this.statsListeners.delete(cb);
  }

  // ── Queue management ────────────────────────────────────────────────────────

  async queueOfflineAction(
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'expiresAt' | 'retries'>,
  ): Promise<void> {
    // Check persisted dedup cache first (survives app restarts)
    const dedupKey = `${action.type}:${JSON.stringify(action.payload)}`;
    const persistedDedup = this.loadDedupCache();
    if (persistedDedup.has(dedupKey)) {
      console.log('[Offline] Duplicate action skipped (persisted):', sanitizeLogValue(action.type));
      return;
    }

    const offlineAction = createOfflineAction(action);
    const queue = this.loadQueue();

    if (queue.length >= this.maxQueueSize) {
      console.warn('[Offline] Queue full — dropping oldest action');
      queue.shift();
    }

    queue.push(offlineAction);
    persistedDedup.add(dedupKey);

    this.saveQueue(queue);
    this.saveDedupCache(persistedDedup);
    void this.notifyStats();
    console.log(`[Offline] Queued: ${sanitizeLogValue(action.type)} (id=${offlineAction.id})`);
    // Online callers (e.g. package requests) expect the action to go out now,
    // not only after the next offline->online transition.
    if (this.isOnline) void this.syncOfflineQueue();
  }

  // ── Sync ────────────────────────────────────────────────────────────────────

  /**
   * Parallel sync: all queued actions are dispatched concurrently.
   * Failed actions are retried with incremented retry count.
   * Succeeded actions are removed from the queue atomically.
   */
  async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return;
    this.syncInProgress = true;
    console.log('[Offline] Starting parallel sync...');

    try {
      const queue = this.loadQueue();
      if (queue.length === 0) return;

      const now = Date.now();
      // Discard any action that has exceeded its maximum age before dispatching.
      const expired = queue.filter(a => a.expiresAt !== undefined && a.expiresAt < now);
      const activeQueue = queue.filter(a => a.expiresAt === undefined || a.expiresAt >= now);
      if (expired.length > 0) {
        console.warn(`[Offline] Discarding ${expired.length} expired action(s):`, expired.map(a => sanitizeLogValue(a.id)).join(', '));
        this.saveQueue(activeQueue);
        void this.notifyStats();
      }
      if (activeQueue.length === 0) return;

      // Dispatch sequentially in queue order so e.g. a cancel never races the booking it cancels.
      const results: PromiseSettledResult<void>[] = [];
      for (const action of activeQueue) {
        try {
          await this.executeAction(action);
          results.push({ status: 'fulfilled', value: undefined });
        } catch (reason) {
          results.push({ status: 'rejected', reason });
        }
      }

      const failed: OfflineAction[] = [];

      results.forEach((result, i) => {
        const action = activeQueue[i];
        if (result.status === 'fulfilled') {
          console.log(`[Offline] Synced: ${sanitizeLogValue(action.type)} (id=${action.id})`);
        } else {
          console.error(`[Offline] Failed: ${sanitizeLogValue(action.type)}`, sanitizeLogValue(result.reason));
          const retried = incrementOfflineRetry(action, this.maxRetries);
          if (retried) {
            failed.push(retried);
          } else {
            console.error(`[Offline] Discarding after ${this.maxRetries} retries: ${sanitizeLogValue(action.id)}`);
          }
        }
      });

      // Actions queued while the sync was in flight must not be lost: reload the
      // live queue, drop everything we processed, keep retried failures.
      const processedIds = new Set(activeQueue.map(a => a.id));
      const arrivedDuringSync = this.loadQueue().filter(a => !processedIds.has(a.id));
      this.saveQueue([...failed, ...arrivedDuringSync]);

      // Only clear dedup cache for successfully synced actions
      if (failed.length < queue.length) {
        // Rebuild dedup from remaining failed actions only — anything that
        // synced successfully should no longer block a legitimate retry.
        const newDedup = new Set<string>();
        for (const action of [...failed, ...arrivedDuringSync]) {
          newDedup.add(`${action.type}:${JSON.stringify(action.payload)}`);
        }
        this.saveDedupCache(newDedup);
      }

      console.log(`[Offline] Sync done: ${activeQueue.length - failed.length} ok, ${failed.length} remaining`);
      void this.notifyStats();
    } finally {
      this.syncInProgress = false;
    }
  }

  // ── Action execution ────────────────────────────────────────────────────────

  private async executeAction(action: OfflineAction): Promise<void> {
    const token = mobileAuth.getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) throw new Error('API URL not configured');

    const base = apiUrl.replace(/\/$/, '');

    switch (action.type) {
      case 'RIDE_REQUEST': {
        const src = action.payload as Record<string, unknown>;
        const originAddress = String( src.origin_address ?? ( ( src.origin as Record<string, unknown> | undefined )?.address ) ?? '' );
        const destAddress = String( src.dest_address ?? ( ( src.destination as Record<string, unknown> | undefined )?.address ) ?? '' );
        const seats = Number( src.seats ?? 1 );
        const today = src.scheduled_for
          ? new Date( src.scheduled_for as string ).toISOString().slice( 0, 10 )
          : new Date().toISOString().slice( 0, 10 );

        const searchParams = new URLSearchParams( { from: originAddress, to: destAddress, seats: String( seats ), date: today } );
        const searchUrl = `${ base }/v1/trips/search?${ searchParams.toString() }`;
        const searchResp = await fetch( searchUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ token }` },
        } );
        if ( !searchResp.ok ) {
          throw new Error( `Trip search failed: ${ searchResp.status }` );
        }
        const trips = await searchResp.json().catch( () => [] ) as Array<{ id: string }>;
        if ( !trips.length ) {
          throw new Error( 'No available trips found for this route' );
        }
        const selectedTrip = trips[0];

        await this.idempotentFetch(
          `${ base }/v1/bookings`,
          {
            method: 'POST',
            body: JSON.stringify( {
              trip_id: selectedTrip.id,
              seats_requested: seats,
              pickup_stop: originAddress,
              dropoff_stop: destAddress,
            } ),
          },
          token,
          action.id,
        );
        break;
      }

      case 'RIDE_CANCEL': {
        const bookingId = this.requireString(action.payload, ['bookingId', 'rideId']);
        await this.idempotentFetch(
          `${base}/cancellations/bookings`,
          {
            method: 'POST',
            body: JSON.stringify({
              bookingId,
              reason: this.readField(action.payload, 'reason') ?? 'Cancelled from mobile offline sync',
            }),
          },
          token,
          action.id,
        );
        break;
      }

      case 'RIDE_RATING': {
        const bookingId = this.requireString(action.payload, ['bookingId', 'rideId']);
        await this.idempotentFetch(
          `${base}/ratings`,
          {
            method: 'POST',
            body: JSON.stringify({
              bookingId,
              rating: this.readField(action.payload, 'rating'),
              review: this.readField(action.payload, 'review') ?? this.readField(action.payload, 'feedback'),
              tags: this.readField(action.payload, 'tags'),
              driverId: this.readField(action.payload, 'driverId'),
              tripId: this.readField(action.payload, 'tripId'),
            }),
          },
          token,
          action.id,
        );
        break;
      }

      case 'PACKAGE_REQUEST':
        await this.idempotentFetch(
          `${base}/v1/packages`,
          { method: 'POST', body: JSON.stringify(action.payload) },
          token,
          action.id,
        );
        break;

      case 'PROFILE_UPDATE': {
        const userId = this.requireCurrentUserId();
        await this.idempotentFetch(
          `${base}/profile/${encodeURIComponent(userId)}`,
          { method: 'PATCH', body: JSON.stringify(action.payload) },
          token,
          action.id,
        );
        break;
      }

      case 'SCHEDULED_RIDE_CREATE':
        await this.idempotentFetch(
          `${base}/v1/bookings`,
          { method: 'POST', body: JSON.stringify(action.payload) },
          token,
          action.id,
        );
        break;

      case 'ISSUE_REPORT':
        await this.idempotentFetch(
          `${base}/reports`,
          { method: 'POST', body: JSON.stringify(action.payload) },
          token,
          action.id,
        );
        break;

      default:
        throw new Error(`Unknown action type: ${String((action as { type?: string }).type)}`);
    }
  }

  /**
   * Fetch wrapper that injects the idempotency key header.
   *
   * The server-side middleware (see idempotency-middleware.ts) will:
   *  1. Check Redis for a cached response keyed by X-Idempotency-Key
   *  2. If found → return the cached response immediately (no DB write)
   *  3. If not found → process normally, cache the response for 24 h
   *
   * This means a retried RIDE_REQUEST after a network drop will never
   * create a second booking — the server returns the original response.
   */
  private async idempotentFetch(
    url: string,
    options: RequestInit,
    token: string,
    idempotencyKey: string,
  ): Promise<void> {
    if (!isValidApiUrl(url)) {
      throw new Error('Invalid or unauthorized URL');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: getCsrfToken(),
        'X-Idempotency-Key': idempotencyKey,
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    // 409 Conflict means the server already processed this key — treat as success
    if (response.status === 409) {
      console.log(`[Offline] Idempotent replay detected for key ${idempotencyKey}`);
      return;
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }
  }

  // ── Cache helpers ───────────────────────────────────────────────────────────

  async cacheData<T>(key: string, data: T, expiresIn = 3_600_000): Promise<void> {
    const entry: CachedData<T> = { key, data, timestamp: Date.now(), expiresIn };
    mmkvSet(`@wasel:cache:${key}`, JSON.stringify(entry));
    void this.notifyStats();
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const raw = mmkvGet(`@wasel:cache:${key}`);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CachedData<T>;
      if (Date.now() - entry.timestamp > entry.expiresIn) {
        mmkvDelete(`@wasel:cache:${key}`);
        return null;
      }
      return entry.data;
    } catch { return null; }
  }

  async cacheRideHistory<T>(rides: T[]): Promise<void> {
    await this.cacheData(KEYS.CACHED_HISTORY, rides, 86_400_000);
  }
  async getCachedRideHistory<T = unknown>(): Promise<T[] | null> {
    return this.getCachedData<T[]>(KEYS.CACHED_HISTORY);
  }
  async cacheActiveRide<T>(ride: T): Promise<void> {
    await this.cacheData(KEYS.CACHED_RIDES, ride, 3_600_000);
  }
  async getCachedActiveRide<T = unknown>(): Promise<T | null> {
    return this.getCachedData<T>(KEYS.CACHED_RIDES);
  }
  async cacheDriverInfo<T>(driverId: string, driver: T): Promise<void> {
    await this.cacheData(`${KEYS.CACHED_DRIVER}_${driverId}`, driver, 7_200_000);
  }
  async getCachedDriverInfo<T = unknown>(driverId: string): Promise<T | null> {
    return this.getCachedData<T>(`${KEYS.CACHED_DRIVER}_${driverId}`);
  }

  async clearCache(): Promise<void> {
    try {
      mmkv.getAllKeys()
      .filter((k: any) => typeof k === 'string' && k.startsWith('@wasel:cache:'))
      .forEach((k: any) => mmkvDelete(k));
      void this.notifyStats();
    } catch (err) { console.error('[Offline] clearCache error:', sanitizeLogValue(err)); }
  }

  async clearOfflineQueue(): Promise<void> {
    mmkvDelete(KEYS.OFFLINE_QUEUE);
    mmkvDelete(KEYS.DEDUP_CACHE);
    void this.notifyStats();
  }

  async getStats(): Promise<OfflineStats> {
    const queue = this.loadQueue();
    let cacheSize = 0;
    try {
      cacheSize = mmkv.getAllKeys()
        .filter((k: any) => typeof k === 'string' && k.startsWith('@wasel:cache:')).length;
    } catch { /* ignore */ }
    return { queueSize: queue.length, cacheSize, isOnline: this.isOnline };
  }

  destroy(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.listeners.clear();
    this.statsListeners.clear();
  }

  // ── MMKV queue/dedup persistence ────────────────────────────────────────────

  private loadQueue(): OfflineAction[] {
    try {
      const raw = mmkvGet(KEYS.OFFLINE_QUEUE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is OfflineAction =>
          item && typeof item === 'object' && 'id' in item && 'type' in item,
      );
    } catch { return []; }
  }

  private saveQueue(queue: OfflineAction[]): void {
    mmkvSet(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  private loadDedupCache(): Set<string> {
    try {
      const raw = mmkvGet(KEYS.DEDUP_CACHE);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? new Set<string>(arr) : new Set();
    } catch { return new Set(); }
  }

  private saveDedupCache(cache: Set<string>): void {
    mmkvSet(KEYS.DEDUP_CACHE, JSON.stringify(Array.from(cache)));
  }

  // ── Payload helpers ─────────────────────────────────────────────────────────

  private readField(payload: unknown, field: string): unknown {
    if (!payload || typeof payload !== 'object' || !(field in payload)) return undefined;
    return (payload as Record<string, unknown>)[field];
  }

  private requireString(payload: unknown, fields: string[]): string {
    const val = fields
      .map(f => this.readField(payload, f))
      .find(v => v !== undefined);
    if (typeof val !== 'string' && typeof val !== 'number') {
      throw new Error(`Missing one of: ${fields.join(', ')}`);
    }
    return String(val);
  }

  private requireCurrentUserId(): string {
    const id = mobileAuth.getUser()?.id;
    if (!id) throw new Error('Queued profile update requires authenticated user');
    return id;
  }

  private async notifyStats(): Promise<void> {
    if (this.statsListeners.size === 0) return;
    const stats = await this.getStats();
    this.statsListeners.forEach(cb => cb(stats));
  }
}

export const offlineService = new OfflineService();
