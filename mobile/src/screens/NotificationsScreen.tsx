import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { apiClient } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing, typography } from '../theme';
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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const formatRelative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <ScreenShell testID="notifications-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={`${unreadCount} unread`}
            tone={unreadCount > 0 ? colors.amber : colors.green}
            icon="notifications"
          />
          <StatusPill
            label={`${notifications.length} total`}
            tone={colors.teal}
            icon="list"
          />
        </View>

        <SectionHeader
          eyebrow="Notifications"
          title="Your activity feed"
          body="Ride updates, package events, and wallet changes appear here in real time."
        />

        {!user ? (
          <StateNotice
            icon="person"
            title="Sign in to see notifications"
            body="Your notifications appear here after signing in."
            tone={colors.amber}
          />
        ) : notifications.length === 0 ? (
          <StateNotice
            icon="notifications-off"
            title="No notifications yet"
            body="Ride matches, package updates, and wallet events will appear here."
            tone={colors.muted}
          />
        ) : (
          <>
            {unreadCount > 0 && (
              <PrimaryButton
                label={`Mark all ${unreadCount} as read`}
                icon="checkmark-done"
                tone={colors.blue}
                onPress={markAllRead}
                testID="mark-all-read-button"
              />
            )}

            {notifications.map(notif => (
              <StateNotice
                key={notif.id}
                icon={TYPE_ICON[notif.type]}
                title={notif.read ? notif.title : `● ${notif.title}`}
                body={`${notif.body}  ·  ${formatRelative(notif.createdAt)}`}
                tone={notif.read ? colors.muted : TYPE_COLOR[notif.type]}
                testID={`notification-${notif.id}`}
              />
            ))}
          </>
        )}

        <InfoCard
          icon="notifications"
          title="Push notifications"
          body="Enable push notifications in Settings to receive ride matches, driver arrivals, and wallet alerts in real time."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
});

export default NotificationsScreen;
