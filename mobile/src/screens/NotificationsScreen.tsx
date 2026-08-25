import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InfoCard,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { apiClient } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface AppNotification {
  id: string;
  type: 'ride' | 'package' | 'wallet' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<AppNotification['type'], keyof typeof Ionicons.glyphMap> = {
  ride: 'car-sport',
  package: 'cube',
  wallet: 'card',
  system: 'notifications',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  ride: colors.teal,
  package: colors.blue,
  wallet: colors.gold,
  system: colors.muted,
};

function NotificationsSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fetchedNotifications, isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiClient.get<AppNotification[]>('notifications');
      if (response.error || !response.data) throw new Error(response.error || 'فشل التحميل');
      return response.data;
    },
    enabled: Boolean(user?.id),
    staleTime: 30 * 1000,
  });

  const notifications = fetchedNotifications ?? [];

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await apiClient.post('notifications/mark-all-read', { userId: user.id });
    },
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(['notifications', user?.id], prev =>
        prev?.map(n => ({ ...n, read: true }))
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`notifications/${id}/mark-read`, {});
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(['notifications', user?.id], prev =>
        prev?.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const markRead = useCallback((id: string) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const now = Date.now();

  const formatRelative = (iso: string) => {
    const diff = now - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `قبل ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `قبل ${hours} س`;
    return `قبل ${Math.floor(hours / 24)} يوم`;
  };

  if (isLoading) return <NotificationsSkeleton />;

  return (
    <ScreenShell testID="notifications-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={`${unreadCount} غير مقروءة`}
            tone={unreadCount > 0 ? colors.amber : colors.green}
            icon="notifications"
          />
          <StatusPill
            label={`${notifications.length} بالمجموع`}
            tone={colors.teal}
            icon="list"
          />
        </View>

        <SectionHeader
          eyebrow="الإشعارات"
          title="تغذية نشاطك"
          body="تحديثات المشاوير والطرود والمحفظة بتظهر هون مباشرة."
        />

        {!user ? (
          <StateNotice
            icon="person"
            title="سجّل دخولك لتشوف الإشعارات"
            body="إشعاراتك بتظهر هون بعد تسجيل الدخول."
            tone={colors.amber}
          />
        ) : error ? (
          <StateNotice
            icon="alert-circle"
            title="فشل تحميل الإشعارات"
            body="تحقق من الاتصال وجرّب مرة ثانية."
            tone={colors.red}
          />
        ) : notifications.length === 0 ? (
          <StateNotice
            icon="notifications-off"
            title="لسه ما في إشعارات"
            body="مطابقات المشاوير وتحديثات الطرود وأحداث المحفظة بتظهر هون."
            tone={colors.muted}
          />
        ) : (
          <>
            {unreadCount > 0 && (
              <PrimaryButton
                label={`علّم ${unreadCount} كمقروءة`}
                icon="checkmark-done"
                tone={colors.blue}
                onPress={markAllRead}
                testID="mark-all-read-button"
                disabled={markAllReadMutation.isPending}
              />
            )}

            {notifications.map(notif => (
              <Pressable
                key={notif.id}
                onPress={() => !notif.read && markRead(notif.id)}
                disabled={notif.read}
              >
                <StateNotice
                  icon={TYPE_ICON[notif.type]}
                  title={notif.read ? notif.title : `● ${notif.title}`}
                  body={`${notif.body}  ·  ${formatRelative(notif.createdAt)}`}
                  tone={notif.read ? colors.muted : TYPE_COLOR[notif.type]}
                  testID={`notification-${notif.id}`}
                />
              </Pressable>
            ))}
          </>
        )}

        <InfoCard
          icon="notifications"
          title="إشعارات فورية"
          body="فعّل الإشعارات من الإعدادات لتوصلك مطابقات المشاوير ووصول السائق وتنبيهات المحفظة مباشرة."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
  },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 14, backgroundColor: colors.surfaceAlt, borderRadius: 6, width: '80%' },
  skeletonLineShort: { width: '50%' },
});
