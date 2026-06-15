import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  RoutePreview,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { offlineService } from '../services/offline';
import { colors, radii, spacing } from '../theme';
import { validatePackageRequest } from '../utils/mobileValidation';

const PackagesScreen = React.memo(function PackagesScreen() {
  const { isOnline, queueSize } = useOffline();
  const [pickup, setPickup] = useState('Amman');
  const [dropoff, setDropoff] = useState('Irbid');
  const [weight, setWeight] = useState('2');
  const [note, setNote] = useState('Small parcel');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const validation = useMemo(
    () => validatePackageRequest(pickup, dropoff, weight),
    [dropoff, pickup, weight],
  );

  const canSubmit = validation.valid;

  const createPackageRequest = useCallback(async () => {
    const latestValidation = validatePackageRequest(pickup, dropoff, weight);
    if (!latestValidation.valid) {
      Alert.alert('Check package details', latestValidation.message);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pickup,
        dropoff,
        weightKg: Number(weight),
        note,
        requestedAt: new Date().toISOString(),
      };

      await offlineService.queueOfflineAction({
        type: 'PACKAGE_REQUEST',
        payload,
      });

      const message = isOnline
        ? 'Package request staged for backend sync.'
        : 'Package request saved offline and will sync later.';
      setResult(message);
      Alert.alert('Package delivery', message);
    } finally {
      setSubmitting(false);
    }
  }, [dropoff, isOnline, note, pickup, weight]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canSubmit}
          icon="cube"
          label={isOnline ? 'Create package request' : 'Save offline request'}
          loading={submitting}
          tone={colors.blue}
          onPress={createPackageRequest}
          testID="submit-package-button"
        />
      }
      testID="packages-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'Sync ready' : 'Offline custody'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-upload' : 'archive'}
          />
          <StatusPill label={`${queueSize} queued`} tone={queueSize ? colors.amber : colors.teal} />
        </View>

        <SectionHeader
          eyebrow="Package flow"
          title="Move parcels with trusted route supply"
          body="Package intent, weight, custody note, and sync status stay together through the request lifecycle."
        />

        <RoutePreview
          from={pickup.trim() || 'Pickup'}
          to={dropoff.trim() || 'Drop-off'}
          eta="Custody ready"
          distance={`${weight || '0'} kg`}
          tone={colors.blue}
        />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Pickup location"
              autoCapitalize="words"
              onChangeText={setPickup}
              placeholder="Pickup location"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-pickup-input"
              value={pickup}
            />
            <TextInput
              accessibilityLabel="Drop-off location"
              autoCapitalize="words"
              onChangeText={setDropoff}
              placeholder="Drop-off location"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-dropoff-input"
              value={dropoff}
            />
            <TextInput
              accessibilityLabel="Package weight"
              keyboardType="decimal-pad"
              onChangeText={setWeight}
              placeholder="Package weight kg"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-weight-input"
              value={weight}
            />
            <TextInput
              accessibilityLabel="Package note"
              multiline
              onChangeText={setNote}
              placeholder="Package note"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textArea]}
              testID="package-note-input"
              value={note}
            />
          </View>
        </PremiumPanel>

        {!validation.valid ? (
          <StateNotice
            icon="warning"
            title="Needs package details"
            body={validation.message ?? 'Complete pickup, drop-off, and package weight.'}
            tone={colors.amber}
            testID="package-validation-state"
          />
        ) : null}

        {result ? (
          <StateNotice
            icon="checkmark-circle"
            title="Package request status"
            body={result}
            tone={colors.blue}
            testID="package-request-result"
          />
        ) : null}

        <InfoCard
          icon="shield-checkmark"
          title="Custody first"
          body="Request metadata is captured consistently for pickup confirmation, proof, and delivery state."
          tone={colors.green}
        />
        <InfoCard
          icon="time"
          title="Offline resilient"
          body="The package intent is queued locally instead of failing when the network is unavailable."
          tone={colors.amber}
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  textArea: {
    minHeight: 104,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
});

export default PackagesScreen;
