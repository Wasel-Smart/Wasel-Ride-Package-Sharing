import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing } from '../theme';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'ride' | 'package' | 'wallet' | 'system';
  read: boolean;
  createdAt: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Ride matched',
    body: 'Your ride from Amman to Irbid has been matched with a driver.',
    type: 'ride',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Package delivered',
    body: 'Your parcel to Zarqa has been marked as delivered.',
    type: 'package',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Wallet top-up',
    body: '10.00 JOD has been added to your Wasel wallet.',
    type: 'wallet',
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Ride reminder',
    body: 'Your scheduled ride departs in 30 minutes. Please be ready.',
    type: 'ride',
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

const TYPE_ICON: Record<string, string> = {
  ride: 'car-sport',
  package: 'cube',
  wallet: 'card',
  system: 'notifications',
};

const TYPE_COLOR: Record<string, string> = {
  ride: colors.teal,
  package: colors.blue,
  wallet: colors.gold,
  system: colors.muted,
};

const NotificationsScreen = React.memo(function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

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
                icon={TYPE_ICON[notif.type] as any}
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
