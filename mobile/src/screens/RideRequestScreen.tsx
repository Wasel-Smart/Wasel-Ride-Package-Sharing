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
import { rideLifecycle } from '../services/ride';
import { colors, radii, spacing } from '../theme';
import { validateRideRequest } from '../utils/mobileValidation';

const SAMPLE_COORDINATES = {
  amman: { latitude: 31.9539, longitude: 35.9106 },
  aqaba: { latitude: 29.5321, longitude: 35.0063 },
};

const RideRequestScreen = () => {
  const { isOnline, queueSize } = useOffline();
  const [pickup, setPickup] = useState('Amman');
  const [destination, setDestination] = useState('Aqaba');
  const [seats, setSeats] = useState('1');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => validateRideRequest(pickup, destination, seats).valid,
    [destination, pickup, seats],
  );

  const submitRide = async () => {
    const validation = validateRideRequest(pickup, destination, seats);
    if (!validation.valid) {
      Alert.alert('Check ride details', validation.message);
      return;
    }

    setLoading(true);
    setLastResult(null);
    try {
      const result = await rideLifecycle.requestRide({
        origin: {
          ...SAMPLE_COORDINATES.amman,
          address: pickup.trim(),
        },
        destination: {
          ...SAMPLE_COORDINATES.aqaba,
          address: destination.trim(),
        },
        seats: Number(seats),
      });

      if (result.ride) {
        setLastResult(`Ride ${result.ride.id} is ${result.ride.status}.`);
        return;
      }

      const message = result.error?.message ?? 'Could not request this ride.';
      setLastResult(message);
      Alert.alert('Ride request', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canSubmit}
          label={isOnline ? 'Search available rides' : 'Queue ride request'}
          loading={loading}
          onPress={submitRide}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'Live request' : 'Offline queue'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'radio' : 'archive'}
          />
          <StatusPill label={`${queueSize} queued`} tone={queueSize ? colors.amber : colors.cyan} />
        </View>

        <SectionHeader
          eyebrow="Ride flow"
          title="Find verified shared capacity"
          body="Submit a corridor request with offline fallback, validation, and clear user feedback."
        />

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Pickup city"
            onChangeText={setPickup}
            placeholder="Pickup city"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={pickup}
          />
          <TextInput
            accessibilityLabel="Destination city"
            onChangeText={setDestination}
            placeholder="Destination"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={destination}
          />
          <TextInput
            accessibilityLabel="Seats"
            keyboardType="number-pad"
            onChangeText={setSeats}
            placeholder="Seats"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={seats}
          />
        </View>

        {lastResult ? (
          <View style={styles.result}>
            <Text style={styles.resultText}>{lastResult}</Text>
          </View>
        ) : null}

        <InfoCard
          icon="location"
          title="Live location ready"
          body="The mobile location service supports driver tracking and rider subscriptions over WebSocket."
          tone={colors.blue}
        />
        <InfoCard
          icon="sync"
          title="Offline safe"
          body="Requests are queued locally when connectivity drops and sync when the device returns online."
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
  result: {
    backgroundColor: colors.surfaceMuted,
    borderColor: `${colors.cyan}55`,
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

export default RideRequestScreen;
