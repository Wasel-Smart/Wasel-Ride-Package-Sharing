import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  InfoCard,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { offlineService } from '../services/offline';
import { colors, radii, spacing } from '../theme';
import { validatePackageRequest } from '../utils/mobileValidation';

const PackagesScreen = () => {
  const { isOnline, queueSize } = useOffline();
  const [pickup, setPickup] = useState('Amman');
  const [dropoff, setDropoff] = useState('Irbid');
  const [weight, setWeight] = useState('2');
  const [note, setNote] = useState('Small parcel');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => validatePackageRequest(pickup, dropoff, weight).valid,
    [dropoff, pickup, weight],
  );

  const createPackageRequest = async () => {
    const validation = validatePackageRequest(pickup, dropoff, weight);
    if (!validation.valid) {
      Alert.alert('Check package details', validation.message);
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
  };

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
          <StatusPill label={`${queueSize} queued`} tone={queueSize ? colors.amber : colors.cyan} />
        </View>

        <SectionHeader
          eyebrow="Package flow"
          title="Move parcels with trusted route supply"
          body="Capture package intent, custody notes, and offline queueing from the native app."
        />

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Pickup location"
            onChangeText={setPickup}
            placeholder="Pickup location"
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="package-pickup-input"
            value={pickup}
          />
          <TextInput
            accessibilityLabel="Drop-off location"
            onChangeText={setDropoff}
            placeholder="Drop-off location"
            placeholderTextColor={colors.muted}
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

        {result ? (
          <View style={styles.result} testID="package-request-result">
            <Text style={styles.resultText}>{result}</Text>
          </View>
        ) : null}

        <InfoCard
          icon="shield-checkmark"
          title="Custody first"
          body="Request metadata is captured consistently so later screens can add pickup confirmation and delivery proof."
          tone={colors.green}
        />
        <InfoCard
          icon="time"
          title="Works under poor connectivity"
          body="The package intent is queued locally instead of failing when the network is unavailable."
          tone={colors.amber}
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
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  textArea: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  result: {
    backgroundColor: '#EFF6FF',
    borderColor: `${colors.blue}55`,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  resultText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PackagesScreen;
