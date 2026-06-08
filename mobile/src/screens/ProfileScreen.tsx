import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ActionRow,
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';

const ProfileScreen = React.memo(function ProfileScreen() {
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
        <PremiumPanel tone="dark">
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <StatusPill
              label={user ? 'Verified session' : 'Guest mode'}
              tone={user ? colors.green : colors.amber}
              icon={user ? 'shield-checkmark' : 'person'}
            />
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileMeta}>Trust, session, cache, and offline controls</Text>
        </PremiumPanel>

        <View style={styles.metrics}>
          <MetricTile label="Rating" value="4.9" tone={colors.gold} />
          <MetricTile label="Trips" value="12" tone={colors.teal} />
          <MetricTile label="Trust" value={user ? 'ID' : 'Guest'} tone={user ? colors.green : colors.amber} />
        </View>

        <View style={styles.metrics}>
          <MetricTile label="Cache" value={String(cacheSize)} tone={colors.blue} />
          <MetricTile label="Queue" value={String(queueSize)} tone={queueSize ? colors.amber : colors.teal} />
        </View>

        {loading ? (
          <StateNotice
            icon="person-circle"
            title="Loading profile"
            body="Native session state is being restored."
            loading
            tone={colors.blue}
          />
        ) : null}

        <SectionHeader
          eyebrow="Account readiness"
          title="Premium trust controls"
          body="Verification, secure session state, notification readiness, and offline recovery are grouped here."
        />

        <InfoCard
          icon="notifications"
          title="Notification readiness"
          body="The native configuration includes push notification permissions and background delivery settings."
          tone={colors.blue}
        />
        <InfoCard
          icon="lock-closed"
          title="Secure session"
          body="Supabase sessions are persisted in native storage with refresh-token support."
          tone={colors.green}
        />

        <View style={styles.actions}>
          <ActionRow icon="trash" label="Clear cache" value={`${cacheSize}`} onPress={clearCache} />
          <ActionRow icon="archive" label="Clear offline queue" value={`${queueSize}`} onPress={clearQueue} />
          {user ? <ActionRow destructive icon="log-out" label="Sign out" onPress={signOut} /> : null}
        </View>
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: spacing.lg,
  },
  profileMeta: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 5,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default ProfileScreen;
