import { useMemo } from 'react';
import type { Notification } from '../../shared/domain-contracts';

const NOTIFICATION_BATCH_SIZE = 50;
const MAX_NOTIFICATIONS_PER_SECTION = 100;

export function useOptimizedNotifications(notifications: Notification[]) {
  return useMemo(() => {
    // Limit total notifications to prevent performance issues
    const limitedNotifications = notifications.slice(0, MAX_NOTIFICATIONS_PER_SECTION);
    
    // Sort by priority and date
    return limitedNotifications.sort((a, b) => {
      // Priority weights
      const priorityWeight = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1
      };
      
      const aPriority = priorityWeight[a.priority || 'medium'];
      const bPriority = priorityWeight[b.priority || 'medium'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same priority, sort by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notifications]);
}

export function useBatchedNotifications(notifications: Notification[], batchSize = NOTIFICATION_BATCH_SIZE) {
  return useMemo(() => {
    const batches: Notification[][] = [];
    for (let i = 0; i < notifications.length; i += batchSize) {
      batches.push(notifications.slice(i, i + batchSize));
    }
    return batches;
  }, [notifications, batchSize]);
}