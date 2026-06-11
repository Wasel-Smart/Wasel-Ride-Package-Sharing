import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  InfoCard,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { colors, spacing } from '../theme';

const NetworksScreen = React.memo(function NetworksScreen() {
  const { isOnline } = useOffline();

  return (
    <ScreenShell testID="networks-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={isOnline ? 'Live network' : 'Offline safe'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-done' : 'cloud-offline'}
          />
          <StatusPill
            label="Networks"
            tone={colors.teal}
            icon="git-network"
          />
        </View>

        <PremiumPanel tone="dark" testID="networks-command-center">
          <SectionHeader
            eyebrow="Wasel networks"
            title="Corridor network map"
            body="Browse active ride-sharing networks, partner corridors, and verified operator clusters across all routes."
            tone="dark"
          />
        </PremiumPanel>

        <InfoCard
          icon="git-network"
          title="Active ride networks"
          body="Shared-capacity corridors are grouped into verified networks. Each network maintains its own pricing, availability, and operator rules."
          tone={colors.teal}
        />
        <InfoCard
          icon="map"
          title="Corridor coverage"
          body="Networks span intercity and regional routes. Select a network to view active rides, schedules, and capacity availability in real time."
          tone={colors.blue}
        />
        <InfoCard
          icon="people"
          title="Operator clusters"
          body="Each network aggregates verified operators. Trust scores, ratings, and coverage stats are visible per cluster."
          tone={colors.green}
        />
        <InfoCard
          icon="flash"
          title="Live pressure signals"
          body="Demand pressure, pricing variance, and seat availability are broadcast in real time across all network corridors."
          tone={colors.amber}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
});

export default NetworksScreen;
