import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { waselMobileConfig } from '../lib/config';
import { colors, spacing } from '../theme';

const readiness = [
  ['Backend', waselMobileConfig.hasSupabase ? 'Live' : 'Env'],
  ['Payments', waselMobileConfig.hasStripe ? 'Ready' : 'Key'],
  ['Maps', waselMobileConfig.hasMaps ? 'Ready' : 'Key'],
  ['Functions', waselMobileConfig.hasFunctions ? 'Ready' : 'URL'],
] as const;

const readinessRows = [
  readiness.slice(0, 2),
  readiness.slice(2, 4),
];

const HomeScreen = React.memo(function HomeScreen() {
  const { user, loading } = useAuth();
  const { isOnline, queueSize, cacheSize } = useOffline();

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || (loading ? 'Loading' : 'Guest'),
    [loading, user?.email, user?.user_metadata?.name],
  );

  const operationalScore = useMemo(() => {
    const readyCount = readiness.filter(([, value]) => value === 'Ready' || value === 'Live').length;
    return `${Math.round((readyCount / readiness.length) * 100)}%`;
  }, []);

  return (
    <ScreenShell testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'Live network' : 'Offline safe'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label={queueSize ? `${queueSize} queued` : 'No backlog'}
            tone={queueSize ? colors.amber : colors.teal}
            icon={queueSize ? 'time' : 'checkmark-circle'}
          />
        </View>

        <PremiumPanel tone="dark" testID="mobile-command-center">
          <SectionHeader
            eyebrow="Wasel command center"
            title={`Welcome, ${displayName}`}
            body="Rides, package handoffs, wallet readiness, and sync health stay visible from the first frame."
            tone="dark"
          />
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.cyan }]}>{operationalScore}</Text>
              <Text style={styles.heroStatLabel}>Ops score</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.gold }]}>{cacheSize}</Text>
              <Text style={styles.heroStatLabel}>Cache</Text>
            </View>
          </View>
        </PremiumPanel>

        <RoutePreview from="Amman" to="Aqaba" eta="3h 42m" distance="331 km" />

        {loading ? (
          <StateNotice
            icon="person-circle"
            title="Loading account"
            body="Session state is being restored from the native auth store."
            loading
            tone={colors.blue}
            testID="home-loading-state"
          />
        ) : user ? null : (
          <StateNotice
            icon="shield-checkmark"
            title="Guest control center"
            body="Verification, ratings, and secure payment context appear after sign-in."
            tone={colors.amber}
            testID="home-empty-state"
          />
        )}

        {readinessRows.map((row, index) => (
          <View key={index} style={styles.metrics}>
            {row.map(([label, value]) => (
              <MetricTile
                key={label}
                label={label}
                value={value}
                tone={value === 'Ready' || value === 'Live' ? colors.teal : colors.amber}
              />
            ))}
          </View>
        ))}

        <InfoCard
          icon="car-sport"
          title="Verified shared capacity"
          body="Corridor requests stay clear, validated, and visible through matching, pickup, and arrival."
          tone={colors.teal}
        />
        <InfoCard
          icon="cube"
          title="Custody-aware packages"
          body="Package handoffs keep route intent, weight, notes, and sync state together for poor-network trips."
          tone={colors.blue}
        />
        <InfoCard
          icon="shield-checkmark"
          title="Premium trust layer"
          body="Identity state, secure sessions, and payment readiness are surfaced before the user commits."
          tone={colors.green}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  heroStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  heroStatItem: {
    gap: 3,
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default HomeScreen;
