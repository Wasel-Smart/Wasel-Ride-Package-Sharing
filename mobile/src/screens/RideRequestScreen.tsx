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
import { rideLifecycle } from '../services/ride';
import { colors, radii, spacing } from '../theme';
import { validateRideRequest } from '../utils/mobileValidation';

const SAMPLE_COORDINATES = {
  amman: { latitude: 31.9539, longitude: 35.9106 },
  aqaba: { latitude: 29.5321, longitude: 35.0063 },
};

const RideRequestScreen = React.memo(function RideRequestScreen() {
  const { isOnline, queueSize } = useOffline();
  const [pickup, setPickup] = useState('Amman');
  const [destination, setDestination] = useState('Aqaba');
  const [seats, setSeats] = useState('1');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const validation = useMemo(
    () => validateRideRequest(pickup, destination, seats),
    [destination, pickup, seats],
  );

  const canSubmit = validation.valid;
  const routeFrom = pickup.trim() || 'Pickup';
  const routeTo = destination.trim() || 'Destination';

  const submitRide = useCallback(async () => {
    const latestValidation = validateRideRequest(pickup, destination, seats);
    if (!latestValidation.valid) {
      Alert.alert('Check ride details', latestValidation.message);
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
  }, [destination, pickup, seats]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canSubmit}
          label={isOnline ? 'Search available rides' : 'Queue ride request'}
          loading={loading}
          onPress={submitRide}
          testID="submit-request-button"
        />
      }
      testID="ride-request-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'Live matching' : 'Offline queue'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'radio' : 'archive'}
          />
          <StatusPill label={`${queueSize} queued`} tone={queueSize ? colors.amber : colors.teal} />
        </View>

        <SectionHeader
          eyebrow="Ride flow"
          title="Find verified shared capacity"
          body="Corridor intent, seat count, and network state remain visible before the request leaves the device."
        />

        <RoutePreview from={routeFrom} to={routeTo} eta="Live match" distance={`${seats || '0'} seat`} />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Pickup city"
              autoCapitalize="words"
              onChangeText={setPickup}
              placeholder="Pickup city"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="origin-input"
              value={pickup}
            />
            <TextInput
              accessibilityLabel="Destination city"
              autoCapitalize="words"
              onChangeText={setDestination}
              placeholder="Destination"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="destination-input"
              value={destination}
            />
            <TextInput
              accessibilityLabel="Seats"
              keyboardType="number-pad"
              onChangeText={setSeats}
              placeholder="Seats"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="seats-input"
              value={seats}
            />
          </View>
        </PremiumPanel>

        {!validation.valid ? (
          <StateNotice
            icon="warning"
            title="Needs ride details"
            body={validation.message ?? 'Complete the pickup, destination, and seat count.'}
            tone={colors.amber}
            testID="ride-validation-state"
          />
        ) : null}

        {lastResult ? (
          <StateNotice
            icon={lastResult.includes('queued') || lastResult.includes('failed') ? 'time' : 'checkmark-circle'}
            title="Ride request status"
            body={lastResult}
            tone={lastResult.includes('failed') ? colors.red : colors.teal}
            testID="ride-request-result"
          />
        ) : null}

        <InfoCard
          icon="location"
          title="Live location ready"
          body="The mobile location service supports driver tracking and rider subscriptions over WebSocket."
          tone={colors.blue}
        />
        <InfoCard
          icon="sync"
          title="Poor-network resilience"
          body="Requests queue locally when connectivity drops and sync once the device returns online."
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
});

export default RideRequestScreen;
