import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  MetricTile,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';

const ProfileScreen = () => {
  const { user, loading, signOut } = useAuth();
  const { cacheSize, clearCache, clearQueue, isOnline, queueSize, sync, isSyncing } = useOffline();
  const name = user?.user_metadata?.name || user?.email || (loading ? 'Loading profile' : 'Guest');
  const initials = name.slice(0, 1).toUpperCase();

  return (
    <ScreenShell
      footer={
        queueSize > 0 ? (
          <PrimaryButton
            icon="sync"
            label={isOnline ? 'Sync queued actions' : 'Waiting for network'}
            loading={isSyncing}
            disabled={!isOnline}
            tone={colors.amber}
            onPress={sync}
            testID="sync-queue-button"
          />
        ) : null
      }
      testID="profile-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <StatusPill
            label={user ? 'Signed in' : 'Guest mode'}
            tone={user ? colors.green : colors.amber}
            icon={user ? 'shield-checkmark' : 'person'}
          />
        </View>

        <SectionHeader
          eyebrow="Account"
          title={name}
          body="Verification, offline state, cached data, and account controls in one native profile surface."
        />

        <View style={styles.metrics}>
          <MetricTile label="Rating" value="4.9" />
          <MetricTile label="Trips" value="12" />
          <MetricTile label="Trust" value={user ? 'ID' : 'Guest'} />
        </View>

        <View style={styles.metrics}>
          <MetricTile label="Cache" value={String(cacheSize)} />
          <MetricTile label="Queue" value={String(queueSize)} />
        </View>

        <InfoCard
          icon="notifications"
          title="Notification readiness"
          body="The native configuration includes push notification permissions and background delivery settings."
          tone={colors.blue}
        />
        <InfoCard
          icon="lock-closed"
          title="Secure session"
          body="Supabase sessions are persisted in native async storage with refresh-token support."
          tone={colors.green}
        />

        <View style={styles.actions}>
          <ProfileAction icon="trash" label="Clear cache" onPress={clearCache} />
          <ProfileAction icon="archive" label="Clear offline queue" onPress={clearQueue} />
          {user ? <ProfileAction destructive icon="log-out" label="Sign out" onPress={signOut} /> : null}
        </View>
      </ScrollView>
    </ScreenShell>
  );
};

function ProfileAction({
  destructive,
  icon,
  label,
  onPress,
}: {
  destructive?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <View style={styles.action}>
      <Ionicons name={icon} size={18} color={destructive ? colors.red : colors.text} />
      <Text style={[styles.actionText, destructive ? styles.destructiveText : null]} onPress={onPress}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  action: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: spacing.md,
  },
  destructiveText: {
    color: colors.red,
  },
});

export default ProfileScreen;
