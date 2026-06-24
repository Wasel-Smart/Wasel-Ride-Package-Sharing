/**
 * Offline Mode Service
 * Manages offline data persistence, sync queue, and network state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';
import { mobileAuth } from './auth';
import {
  createOfflineAction,
  incrementOfflineRetry,
  resolveOfflineQueueResult,
  type OfflineAction,
} from '../utils/offlineQueue';

interface CachedData<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

type OfflineStats = {
  queueSize: number;
  cacheSize: number;
  isOnline: boolean;
};

const STORAGE_KEYS = {
  OFFLINE_QUEUE: '@wasel:offline_queue',
  CACHED_RIDES: '@wasel:cached_rides',
  CACHED_DRIVER: '@wasel:cached_driver',
  CACHED_HISTORY: '@wasel:cached_history',
  NETWORK_STATE: '@wasel:network_state',
};

const mmkv = new MMKV();

function mmkvGet(key: string): string | null {
  try {
    return mmkv.getString(key) ?? null;
  } catch {
    return null;
  }
}

function mmkvSet(key: string, value: string): void {
  try {
    mmkv.set(key, value);
  } catch {
    // ignore MMKV failures, fallback to AsyncStorage not needed for critical path
  }
}

function mmkvDelete(key: string): void {
  try {
    mmkv.delete(key);
  } catch {
    // ignore
  }
}

export class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private listeners = new Set<(isOnline: boolean) => void>();
  private statsListeners = new Set<(stats: OfflineStats) => void>();
  private unsubscribeNetInfo: (() => void) | null = null;
  private readonly maxQueueSize = 100;
  private readonly maxRetries = 5;
  private dedupCache = new Set<string>();

  constructor() {
    void this.initializeNetworkMonitoring().catch(error => {
      console.error('[Offline] Network monitoring failed:', error);
    });
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = this.readOnlineState(state);

    // Listen for network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = this.readOnlineState(state);

      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));
      void this.notifyStatsListeners();

      // Trigger sync if we just came online
      if (!wasOnline && this.isOnline) {
        this.syncOfflineQueue();
      }

      console.log(`[Offline] Network state: ${this.isOnline ? 'online' : 'offline'}`);
    });
  }

  private readOnlineState(state: {
    isConnected: boolean | null;
    isInternetReachable?: boolean | null;
  }): boolean {
    const connected = state.isConnected ?? true;
    const reachable = state.isInternetReachable ?? true;
    return connected && reachable;
  }

  /**
   * Check if device is currently online
   */
  isDeviceOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to network state changes
   */
  subscribeToNetworkState(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isOnline); // Immediate call with current state

    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeToStats(listener: (stats: OfflineStats) => void): () => void {
    this.statsListeners.add(listener);
    void this.getOfflineStats().then(listener).catch(error => {
      console.error('[Offline] Error reading stats:', error);
    });

    return () => {
      this.statsListeners.delete(listener);
    };
  }

  /**
   * Queue an action for later sync when offline
   */
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const offlineAction = createOfflineAction(action);

    const queue = await this.getOfflineQueue();

    if (queue.length >= this.maxQueueSize) {
      console.warn('[Offline] Queue full, dropping oldest action');
      queue.shift();
    }

    const dedupKey = `${action.type}:${JSON.stringify(action.payload)}`;
    if (this.dedupCache.has(dedupKey)) {
      console.log('[Offline] Duplicate action skipped:', dedupKey);
      return;
    }
    this.dedupCache.add(dedupKey);

    queue.push(offlineAction);
    await this.persistQueue(queue);
    void this.notifyStatsListeners();

    console.log(`[Offline] Queued action: ${action.type}`);
  }

  /**
   * Get all pending offline actions
   */
  private async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const raw = mmkvGet(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is OfflineAction =>
        item && typeof item === 'object' && 'id' in item && 'type' in item
      );
    } catch (error) {
      console.error('[Offline] Error reading queue:', error);
      return [];
    }
  }

  private async persistQueue(queue: OfflineAction[]): Promise<void> {
    mmkvSet(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  /**
   * Sync all queued offline actions
   */
  async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      console.log('[Offline] Sync skipped (offline or already in progress)');
      return;
    }

    this.syncInProgress = true;
    this.updateConnectionStore();
    console.log('[Offline] Starting sync...');

    try {
      const queue = await this.getOfflineQueue();
      const successful: string[] = [];
      const failed: OfflineAction[] = [];

      for (const action of queue) {
        try {
          await this.executeOfflineAction(action);
          successful.push(action.id);
          console.log(`[Offline] Synced: ${action.type}`);
        } catch (error) {
          console.error(`[Offline] Failed to sync ${action.type}:`, error);

          const retried = incrementOfflineRetry(action, this.maxRetries);
          if (retried) {
            const backoffMs = Math.min(1000 * Math.pow(2, retried.retries), 30000);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            failed.push(retried);
          } else {
            console.error(`[Offline] Discarding action after ${this.maxRetries} retries: ${action.id}`);
          }
        }
      }

      await this.persistQueue(failed);
      this.dedupCache.clear();
      console.log(`[Offline] Sync complete: ${successful.length} synced, ${failed.length} remaining`);
      void this.notifyStatsListeners();
    } finally {
      this.syncInProgress = false;
      this.updateConnectionStore();
    }
  }

  private updateConnectionStore(): void {
    // Keep legacy listeners for backward compatibility
    // Zustand store consumers can use useConnectionStore directly
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  /**
   * Execute a single offline action
   */
  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    const token = mobileAuth.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error('API URL not configured');
    }

    switch (action.type) {
      case 'RIDE_REQUEST':
        await this.sendQueuedRequest(`${apiUrl}/trips`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(this.toTripCreatePayload(action.payload)),
        });
        break;

      case 'RIDE_CANCEL': {
        const bookingId = this.readPayloadString(action.payload, ['bookingId', 'rideId']);
        await this.sendQueuedRequest(`${apiUrl}/cancellations/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            reason: this.readPayloadField(action.payload, 'reason') ?? 'Cancelled from mobile offline sync',
          }),
        });
        break;
      }

      case 'RIDE_RATING': {
        const bookingId = this.readPayloadString(action.payload, ['bookingId', 'rideId']);
        await this.sendQueuedRequest(`${apiUrl}/ratings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bookingId,
            rating: this.readPayloadField(action.payload, 'rating'),
            feedback: this.readPayloadField(action.payload, 'feedback'),
          }),
        });
        break;
      }

      case 'PACKAGE_REQUEST':
        await this.sendQueuedRequest(`${apiUrl}/v1/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.payload),
        });
        break;

      case 'PROFILE_UPDATE':
        await this.sendQueuedRequest(
          `${apiUrl}/profile/${encodeURIComponent(this.requireCurrentUserId())}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(action.payload),
          },
        );
        break;

      default:
        throw new Error(`Unknown action type: ${String((action as { type?: string }).type)}`);
    }
  }

  private async sendQueuedRequest(url: string, options: RequestInit): Promise<void> {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Queued action failed with ${response.status}`);
    }
  }

  private readPayloadField(payload: unknown, field: string): unknown {
    if (!payload || typeof payload !== 'object' || !(field in payload)) {
      return undefined;
    }

    return (payload as Record<string, unknown>)[field];
  }

  private readPayloadString(payload: unknown, fields: string[]): string {
    const value = fields.map(field => this.readPayloadField(payload, field)).find(candidate => candidate !== undefined);
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`Queued action missing one of: ${fields.join(', ')}`);
    }

    return String(value);
  }

  private requireCurrentUserId(): string {
    const userId = mobileAuth.getUser()?.id;
    if (!userId) {
      throw new Error('Queued profile update requires an authenticated user');
    }

    return userId;
  }

  private toTripCreatePayload(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const source = payload as Record<string, unknown>;
    if ('from' in source || 'to' in source) {
      return source;
    }

    const origin = source.origin && typeof source.origin === 'object'
      ? source.origin as Record<string, unknown>
      : {};
    const destination = source.destination && typeof source.destination === 'object'
      ? source.destination as Record<string, unknown>
      : {};
    const scheduledAt = typeof source.scheduled_for === 'string'
      ? new Date(source.scheduled_for)
      : new Date(Date.now() + 60 * 60 * 1000);

    return {
      from: source.origin_address ?? origin.address,
      to: source.dest_address ?? destination.address,
      date: scheduledAt.toISOString().slice(0, 10),
      time: scheduledAt.toISOString().slice(11, 16),
      seats: source.seats,
      notes: source.notes,
    };
  }

  /**
   * Cache data for offline access
   */
  async cacheData<T>(key: string, data: T, expiresIn: number = 3600000): Promise<void> {
    const cached: CachedData<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresIn,
    };

    mmkvSet(`@wasel:cache:${key}`, JSON.stringify(cached));
    void this.notifyStatsListeners();
    console.log(`[Offline] Cached: ${key}`);
  }

  /**
   * Get cached data if available and not expired
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const item = mmkvGet(`@wasel:cache:${key}`);
      if (!item) return null;

      const cached = JSON.parse(item) as CachedData<T>;
      const age = Date.now() - cached.timestamp;

      if (age > cached.expiresIn) {
        mmkvDelete(`@wasel:cache:${key}`);
        console.log(`[Offline] Cache expired: ${key}`);
        return null;
      }

      console.log(`[Offline] Cache hit: ${key}`);
      return cached.data as T;
    } catch (error) {
      console.error(`[Offline] Error reading cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Cache ride history for offline viewing
   */
  async cacheRideHistory<T>(rides: T[]): Promise<void> {
    await this.cacheData(STORAGE_KEYS.CACHED_HISTORY, rides, 86400000); // 24 hours
  }

  /**
   * Get cached ride history
   */
  async getCachedRideHistory<T = unknown>(): Promise<T[] | null> {
    return this.getCachedData<T[]>(STORAGE_KEYS.CACHED_HISTORY);
  }

  /**
   * Cache current active ride
   */
  async cacheActiveRide<T>(ride: T): Promise<void> {
    await this.cacheData(STORAGE_KEYS.CACHED_RIDES, ride, 3600000); // 1 hour
  }

  /**
   * Get cached active ride
   */
  async getCachedActiveRide<T = unknown>(): Promise<T | null> {
    return this.getCachedData<T>(STORAGE_KEYS.CACHED_RIDES);
  }

  /**
   * Cache driver info
   */
  async cacheDriverInfo<T>(driverId: string, driver: T): Promise<void> {
    await this.cacheData(`${STORAGE_KEYS.CACHED_DRIVER}_${driverId}`, driver, 7200000); // 2 hours
  }

  /**
   * Get cached driver info
   */
  async getCachedDriverInfo<T = unknown>(driverId: string): Promise<T | null> {
    return this.getCachedData<T>(`${STORAGE_KEYS.CACHED_DRIVER}_${driverId}`);
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const allKeys = mmkv.getAllKeys();
      const cacheKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('@wasel:cache:'));
      cacheKeys.forEach(key => mmkvDelete(key));
      await this.notifyStatsListeners();
      console.log(`[Offline] Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error('[Offline] Error clearing cache:', error);
    }
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    mmkvDelete(STORAGE_KEYS.OFFLINE_QUEUE);
    this.dedupCache.clear();
    void this.notifyStatsListeners();
    console.log('[Offline] Cleared offline queue');
  }

  /**
   * Get offline statistics
   */
  async getOfflineStats(): Promise<OfflineStats> {
    const queue = await this.getOfflineQueue();
    let cacheSize = 0;
    try {
      const allKeys = mmkv.getAllKeys();
      cacheSize = allKeys.filter(key => typeof key === 'string' && key.startsWith('@wasel:cache:')).length;
    } catch {
      cacheSize = 0;
    }

    return {
      queueSize: queue.length,
      cacheSize,
      isOnline: this.isOnline,
    };
  }

  private async notifyStatsListeners(): Promise<void> {
    if (this.statsListeners.size === 0) {
      return;
    }

    const stats = await this.getOfflineStats();
    this.statsListeners.forEach(listener => listener(stats));
  }

  /**
   * Cleanup on service shutdown
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.listeners.clear();
    this.statsListeners.clear();
  }
}

export const offlineService = new OfflineService();
