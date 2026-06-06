/**
 * useOffline Hook
 * React hook for offline mode state and actions
 */

import { useState, useEffect, useCallback } from 'react';
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

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = offlineService.subscribeToNetworkState(setIsOnline);
    return unsubscribe;
  }, []);

  // Load stats on mount and when online state changes
  useEffect(() => {
    loadStats();
  }, [isOnline]);

  const loadStats = async () => {
    const stats = await offlineService.getOfflineStats();
    setQueueSize(stats.queueSize);
    setCacheSize(stats.cacheSize);
  };

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await offlineService.syncOfflineQueue();
      await loadStats();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    await offlineService.clearCache();
    await loadStats();
  }, []);

  const clearQueue = useCallback(async () => {
    await offlineService.clearOfflineQueue();
    await loadStats();
  }, []);

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
