import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../src/components/MobilePrimitives';
import { colors, spacing } from '../src/theme';

const checkpoints = [
  ['car-sport', 'Live rides', 'Driver and rider status cards with route context.', colors.teal],
  ['cube', 'Packages', 'Pickup, custody transfer, and delivery confirmation.', colors.blue],
  ['shield-checkmark', 'Trust', 'Identity, safety, support, and incident escalation.', colors.green],
  ['notifications', 'Notifications', 'Push and in-app delivery status surfaces.', colors.amber],
] as const;

export default function OperationsPreview() {
  return (
    <ScreenShell testID="operations-preview-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Link href="/" style={styles.backLink}>
          Back to dashboard
        </Link>

        <PremiumPanel tone="dark">
          <View style={styles.heroTop}>
            <StatusPill label="Native foundation" tone={colors.cyan} icon="sparkles" />
          </View>
          <SectionHeader
            eyebrow="Operations preview"
            title="Ready for production workflows"
            body="The mobile foundation is aligned to Supabase, Edge Functions, offline sync, native payments, and route operations."
            tone="dark"
          />
        </PremiumPanel>

        <View style={styles.metrics}>
          <MetricTile label="Routes" value="4" tone={colors.teal} />
          <MetricTile label="State" value="Live" tone={colors.green} />
        </View>

        {checkpoints.map(([icon, title, body, tone]) => (
          <InfoCard key={title} icon={icon} title={title} body={body} tone={tone} />
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backLink: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: '900',
  },
  heroTop: {
    marginBottom: spacing.lg,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
