import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
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

interface DriverStep {
  id: string;
  label: string;
  description: string;
  complete: boolean;
}

const DriverScreen = React.memo(function DriverScreen() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<DriverStep[]>([
    { id: 'email', label: 'Verify email', description: 'Confirm your email address in Settings.', complete: Boolean(user?.email) },
    { id: 'phone', label: 'Verify phone', description: 'Add and verify a Jordanian mobile number.', complete: false },
    { id: 'sanad', label: 'Sanad identity', description: 'Complete Sanad national ID verification.', complete: false },
    { id: 'license', label: "Driver's licence", description: 'Upload a valid Jordanian driving licence.', complete: false },
    { id: 'vehicle', label: 'Vehicle details', description: 'Add your vehicle make, model, and plate number.', complete: false },
    { id: 'insurance', label: 'Insurance document', description: 'Upload current vehicle insurance coverage.', complete: false },
  ]);

  const completedCount = steps.filter(s => s.complete).length;
  const readinessPercent = Math.round((completedCount / steps.length) * 100);
  const canOfferRide = completedCount >= 4;
  const canCarryPackages = completedCount >= 5;

  const toggleStep = useCallback((id: string) => {
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, complete: !s.complete } : s)),
    );
  }, []);

  const offerRide = useCallback(() => {
    if (!canOfferRide) {
      Alert.alert('Not ready', 'Complete at least 4 setup steps before offering rides.');
      return;
    }
    Alert.alert('Navigate', 'Opening the offer a ride flow…');
  }, [canOfferRide]);

  const STATUS_COLOR = readinessPercent >= 80 ? colors.green : readinessPercent >= 50 ? colors.amber : colors.red;

  return (
    <ScreenShell testID="driver-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={`${readinessPercent}% ready`}
            tone={STATUS_COLOR}
            icon="shield-checkmark"
          />
          <StatusPill
            label={`${completedCount}/${steps.length} steps`}
            tone={STATUS_COLOR}
            icon="checkmark-circle"
          />
        </View>

        <SectionHeader
          eyebrow="Driver setup"
          title="Become a Wasel driver"
          body="Complete each step to unlock ride offering, package carry, and payouts."
        />

        <View style={styles.metrics}>
          <MetricTile label="Readiness" value={`${readinessPercent}%`} tone={STATUS_COLOR} />
          <MetricTile label="Offer ride" value={canOfferRide ? 'Ready' : 'Blocked'} tone={canOfferRide ? colors.green : colors.amber} />
          <MetricTile label="Packages" value={canCarryPackages ? 'Ready' : 'Blocked'} tone={canCarryPackages ? colors.green : colors.amber} />
        </View>

        {steps.map(step => (
          <StateNotice
            key={step.id}
            icon={step.complete ? 'checkmark-circle' : 'ellipse-outline'}
            title={step.label}
            body={step.description}
            tone={step.complete ? colors.green : colors.amber}
            testID={`driver-step-${step.id}`}
          />
        ))}

        <SectionHeader
          eyebrow="Setup actions"
          title="Tap to mark steps complete"
          body="In production these link to document upload flows and Sanad verification."
        />

        {steps
          .filter(s => !s.complete)
          .map(step => (
            <PrimaryButton
              key={`complete-${step.id}`}
              label={`Complete: ${step.label}`}
              icon="arrow-forward"
              tone={colors.blue}
              onPress={() => toggleStep(step.id)}
              testID={`complete-step-${step.id}`}
            />
          ))}

        <PrimaryButton
          label={canOfferRide ? 'Offer a ride' : `Complete ${4 - completedCount} more steps to offer rides`}
          icon="car"
          tone={canOfferRide ? colors.teal : colors.muted}
          onPress={offerRide}
          testID="offer-ride-driver-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="Identity via Sanad"
          body="Wasel uses Jordan's Sanad national ID system to verify driver identity before allowing ride operations."
          tone={colors.green}
        />
        <InfoCard
          icon="cube"
          title="Package carry bonus"
          body="Verified drivers with full documentation can carry packages alongside passengers for extra earnings."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: spacing.sm },
});

export default DriverScreen;
