import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
  PrimaryButton,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { useAuth } from '../providers/AuthProvider';
import { waselMobileConfig } from '../lib/config';
import { colors, spacing } from '../theme';

type RootStackParamList = {
  Tabs: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  LiveTracking: { rideId: string };
  Chat: { rideId: string; driverName: string };
  RateRide: { rideId: string; driverName: string };
  AdvancedSearch: undefined;
  SignIn: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const readiness = [
  ['Backend', waselMobileConfig.hasSupabase ? 'Live' : 'Env'],
  ['Payments', waselMobileConfig.hasStripe ? 'Ready' : 'Key'],
  ['Maps', waselMobileConfig.hasMaps ? 'Ready' : 'Key'],
  ['Functions', waselMobileConfig.hasFunctions ? 'Ready' : 'URL'],
] as const;

const readinessRows = [readiness.slice(0, 2), readiness.slice(2, 4)];

const HomeScreen = React.memo(function HomeScreen() {
  const { user, loading } = useAuth();
  const { isOnline, queueSize, cacheSize } = useOffline();
  const navigation = useNavigation<NavProp>();

  const displayName = useMemo(
    () =>
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      (loading ? 'Loading' : 'Guest'),
    [loading, user?.email, user?.user_metadata?.name],
  );

  const operationalScore = useMemo(() => {
    const readyCount = readiness.filter(([, value]) => value === 'Ready' || value === 'Live').length;
    return `${Math.round((readyCount / readiness.length) * 100)}%`;
  }, []);

  const QUICK_LINKS = [
    { label: 'My trips', icon: 'time' as const, screen: 'Trips' as const, tone: colors.teal },
    { label: 'Bus routes', icon: 'bus' as const, screen: 'Bus' as const, tone: colors.blue },
    { label: 'Driver setup', icon: 'car' as const, screen: 'Driver' as const, tone: colors.green },
    { label: 'Safety center', icon: 'shield-checkmark' as const, screen: 'Safety' as const, tone: colors.amber },
    { label: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' as const, tone: colors.lilac },
    { label: 'Smart ride search', icon: 'search' as const, screen: 'AdvancedSearch' as const, tone: colors.cyan },
  ];

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
            body="Rides, packages, networks, wallet, safety, and driver setup — all from here."
            tone="dark"
          />
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <StatusPill label={operationalScore} tone={colors.cyan} icon="flash" />
            </View>
            <View style={styles.heroStatItem}>
              <StatusPill label={`${cacheSize} cached`} tone={colors.gold} icon="archive" />
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
        ) : !user ? (
          <StateNotice
            icon="shield-checkmark"
            title="Guest control center"
            body="Verification, ratings, and secure payment context appear after sign-in."
            tone={colors.amber}
            testID="home-empty-state"
          />
        ) : null}

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

        <SectionHeader
          eyebrow="Quick access"
          title="All features"
          body="Jump directly to any section of the app."
        />

        {QUICK_LINKS.map(link => (
          <PrimaryButton
            key={link.screen}
            label={link.label}
            icon={link.icon}
            tone={link.tone}
            onPress={() => navigation.navigate(link.screen as any)}
            testID={`quick-link-${link.screen.toLowerCase()}`}
          />
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
          icon="git-network"
          title="Networks & corridors"
          body="Browse verified ride networks, partner corridors, and operator clusters across all active routes."
          tone={colors.green}
        />
        <InfoCard
          icon="shield-checkmark"
          title="Premium trust layer"
          body="Identity state, secure sessions, and payment readiness are surfaced before the user commits."
          tone={colors.lilac}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  heroStats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md, flexWrap: 'wrap' },
  heroStatItem: { gap: 3 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
});

export default HomeScreen;
