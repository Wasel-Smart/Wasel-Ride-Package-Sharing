import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { notificationsAPI } from '../services/notifications.js';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  read: boolean;
  created_at: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  source?: 'local' | 'server';
}

type RawNotification = Omit<Notification, 'read'> & {
  read?: boolean;
  is_read?: boolean;
};

type ConnectionStatus = 'online' | 'offline' | 'syncing';

const ARCHIVED_NOTIFICATION_KEY = 'wasel-notification-archive';

function notificationsQueryKey(userId?: string) {
  return ['notifications', userId] as const;
}

function normalizeNotification(item: RawNotification): Notification {
  return {
    ...item,
    read: typeof item.read === 'boolean' ? item.read : Boolean(item.is_read),
    priority: item.priority ?? 'medium',
    source: item.source ?? 'server',
  };
}

function archiveStorageKey(userId?: string) {
  return `${ARCHIVED_NOTIFICATION_KEY}:${userId || 'guest'}`;
}

function readArchivedNotificationIds(userId?: string): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(archiveStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeArchivedNotificationIds(userId: string | undefined, ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(archiveStorageKey(userId), JSON.stringify(ids.slice(0, 200)));
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(() => (
    typeof navigator === 'undefined' ? true : navigator.onLine
  ));
  const [archivedIds, setArchivedIds] = useState<string[]>(() => readArchivedNotificationIds(user?.id));

  useEffect(() => {
    setArchivedIds(readArchivedNotificationIds(user?.id));
  }, [user?.id]);

  const {
    data: notifications = [],
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: notificationsQueryKey(user?.id),
    queryFn: async () => {
      if (!user) return [];

      try {
        const response = await notificationsAPI.getNotifications();
        const items = Array.isArray(response.notifications) ? response.notifications : [];
        return items.map((item: RawNotification) => normalizeNotification(item));
      } catch {
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    retry: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read && !archivedIds.includes(notification.id)).length;
  const connectionStatus: ConnectionStatus =
    !isOnline ? 'offline' : isFetching ? 'syncing' : 'online';

  const markAsRead = async (notificationId: string) => {
    const queryKey = notificationsQueryKey(user?.id);
    const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];

    queryClient.setQueryData<Notification[]>(queryKey, (current = []) => (
      current.map((notification) => (
        notification.id === notificationId ? { ...notification, read: true } : notification
      ))
    ));

    try {
      await notificationsAPI.markAsRead(notificationId);
    } catch (error) {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to update notification');
      void refetch();
      throw error;
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((notification) => !notification.read && !archivedIds.includes(notification.id));
    if (unread.length === 0) return;

    const queryKey = notificationsQueryKey(user?.id);
    const previous = queryClient.getQueryData<Notification[]>(queryKey) ?? [];

    queryClient.setQueryData<Notification[]>(queryKey, (current = []) => (
      current.map((notification) => ({ ...notification, read: true }))
    ));

    try {
      await Promise.all(unread.map((notification) => notificationsAPI.markAsRead(notification.id)));
      toast.success('All notifications marked as read');
    } catch (error) {
      queryClient.setQueryData(queryKey, previous);
      toast.error('Failed to mark all notifications as read');
      void refetch();
      throw error;
    }
  };

  const archiveNotification = (notificationId: string) => {
    setArchivedIds((current) => {
      if (current.includes(notificationId)) return current;
      const next = [...current, notificationId];
      writeArchivedNotificationIds(user?.id, next);
      return next;
    });
    toast.success('Notification archived');
  };

  const restoreArchivedNotifications = () => {
    setArchivedIds([]);
    writeArchivedNotificationIds(user?.id, []);
    toast.success('Archived notifications restored');
  };

  const createNotification = async (data: Parameters<typeof notificationsAPI.createNotification>[0]) => {
    if (!user) return;

    try {
      await notificationsAPI.createNotification(data);
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey(user.id) });
    } catch (error) {
      toast.error('Failed to send notification');
      throw error;
    }
  };

  return {
    notifications,
    unreadCount,
    archivedIds,
    loading,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification: archiveNotification,
    restoreArchivedNotifications,
    createNotification,
    refresh: () => refetch(),
  };
}
