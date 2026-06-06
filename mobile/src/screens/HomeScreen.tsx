import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  InfoCard,
  MetricTile,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { waselMobileConfig } from '../lib/config';
import { colors, spacing } from '../theme';

const readiness = [
  ['Backend', waselMobileConfig.hasSupabase ? 'Connected' : 'Needs env'],
  ['Payments', waselMobileConfig.hasStripe ? 'Ready' : 'Needs key'],
  ['Maps', waselMobileConfig.hasMaps ? 'Ready' : 'Needs key'],
] as const;

const HomeScreen = () => {
  const { user, loading } = useAuth();
  const { isOnline, queueSize, cacheSize } = useOffline();
  const displayName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || (loading ? 'Loading' : 'Guest');

  return (
    <ScreenShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'Online' : 'Offline'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill label={`${queueSize} queued`} tone={queueSize ? colors.amber : colors.cyan} />
        </View>

        <SectionHeader
          eyebrow="Wasel mobile"
          title={`Good to see you, ${displayName}`}
          body="Native control center for rides, package handoffs, driver status, wallet visibility, and route operations."
        />

        <View style={styles.metrics}>
          {readiness.map(([label, value]) => (
            <MetricTile key={label} label={label} value={value} />
          ))}
        </View>

        <View style={styles.metrics}>
          <MetricTile label="Offline cache" value={String(cacheSize)} />
          <MetricTile label="Queued actions" value={String(queueSize)} />
        </View>

        <InfoCard
          icon="car-sport"
          title="Book or offer seats"
          body="Search corridors, request verified capacity, and keep the ride state visible from request to arrival."
          tone={colors.teal}
        />
        <InfoCard
          icon="cube"
          title="Move packages on route"
          body="Create custody-aware package requests that can sync later when the phone comes back online."
          tone={colors.blue}
        />
        <InfoCard
          icon="shield-checkmark"
          title="Trust and profile readiness"
          body="Verification, ratings, account state, and notification preferences stay visible to the user."
          tone={colors.green}
        />
      </ScrollView>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default HomeScreen;
