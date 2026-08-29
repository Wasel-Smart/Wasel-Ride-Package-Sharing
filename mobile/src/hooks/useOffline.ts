/**
 * useOffline Hook
 * React hook for offline mode state and actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineService } from '../services/offline';

interface UseOfflineReturn {
  isOnline: boolean;
  queueSize: number;
  cacheSize: number;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  clearQueue: () => Promise<void>;
  isSyncing: boolean;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(offlineService.isDeviceOnline());
  const [queueSize, setQueueSize] = useState(0);
  const [cacheSize, setCacheSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const statsLoadedRef = useRef(false);

  const applyStats = useCallback((stats: { queueSize: number; cacheSize: number }) => {
    setQueueSize(stats.queueSize);
    setCacheSize(stats.cacheSize);
  }, []);

  const loadStats = useCallback(async () => {
    const stats = await offlineService.getStats();
    applyStats(stats);
  }, [applyStats]);

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = offlineService.subscribeToNetworkState(setIsOnline);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = offlineService.subscribeToStats(applyStats);
    return unsubscribe;
  }, [applyStats]);

  // Load stats on mount
  useEffect(() => {
    if (statsLoadedRef.current) return;
    statsLoadedRef.current = true;
    void loadStats();
  }, [loadStats]);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await offlineService.syncOfflineQueue();
      await loadStats();
    } finally {
      setIsSyncing(false);
    }
  }, [loadStats]);

  const clearCache = useCallback(async () => {
    await offlineService.clearCache();
    await loadStats();
  }, [loadStats]);

  const clearQueue = useCallback(async () => {
    await offlineService.clearOfflineQueue();
    await loadStats();
  }, [loadStats]);

  return {
    isOnline,
    queueSize,
    cacheSize,
    sync,
    clearCache,
    clearQueue,
    isSyncing,
  };
}
