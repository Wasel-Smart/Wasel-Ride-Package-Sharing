/**
 * Offline Mode Service
 * Manages offline data persistence, sync queue, and network state
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
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

export class OfflineService {
  private isOnline = true;
  private syncInProgress = false;
  private listeners = new Set<(isOnline: boolean) => void>();
  private statsListeners = new Set<(stats: OfflineStats) => void>();
  private unsubscribeNetInfo: (() => void) | null = null;

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
    queue.push(offlineAction);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    void this.notifyStatsListeners();

    console.log(`[Offline] Queued action: ${action.type}`);
  }

  /**
   * Get all pending offline actions
   */
  private async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Offline] Error reading queue:', error);
      return [];
    }
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
          
          // Retry up to 3 times
          const retried = incrementOfflineRetry(action);
          if (retried) {
            failed.push(retried);
          } else {
            console.error(`[Offline] Discarding action after 3 retries: ${action.id}`);
          }
        }
      }

      // Update queue with only failed actions
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_QUEUE,
        JSON.stringify(resolveOfflineQueueResult(queue, successful, failed)),
      );
      console.log(`[Offline] Sync complete: ${successful.length} synced, ${failed.length} remaining`);
    } finally {
      this.syncInProgress = false;
      void this.notifyStatsListeners();
    }
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

    await AsyncStorage.setItem(`@wasel:cache:${key}`, JSON.stringify(cached));
    void this.notifyStatsListeners();
    console.log(`[Offline] Cached: ${key}`);
  }

  /**
   * Get cached data if available and not expired
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(`@wasel:cache:${key}`);
      if (!item) return null;

      const cached = JSON.parse(item) as CachedData<T>;
      const age = Date.now() - cached.timestamp;

      if (age > cached.expiresIn) {
        // Expired
        await AsyncStorage.removeItem(`@wasel:cache:${key}`);
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
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('@wasel:cache:'));
    await AsyncStorage.multiRemove(cacheKeys);
    void this.notifyStatsListeners();
    console.log(`[Offline] Cleared ${cacheKeys.length} cache entries`);
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    void this.notifyStatsListeners();
    console.log('[Offline] Cleared offline queue');
  }

  /**
   * Get offline statistics
   */
  async getOfflineStats(): Promise<OfflineStats> {
    const queue = await this.getOfflineQueue();
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('@wasel:cache:'));

    return {
      queueSize: queue.length,
      cacheSize: cacheKeys.length,
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
