import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { useOffline } from '../hooks/useOffline';
import { apiClient } from '../lib/api';
import { offlineService } from '../services/offline';
import { colors, radii, spacing } from '../theme';
import { validateScheduledRide } from '../utils/mobileValidation';
import { createOfflineAction } from '../utils/offlineQueue';

interface ScheduledRideRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  scheduledTime: string;
}

const ScheduledRideScreen = React.memo(function ScheduledRideScreen() {
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useOffline();

  const validation = useMemo(
    () => validateScheduledRide(pickupLat, pickupLng, dropoffLat, dropoffLng, scheduledTime),
    [pickupLat, pickupLng, dropoffLat, dropoffLng, scheduledTime],
  );

  const handleSchedule = useCallback(async () => {
    if (!validation.valid) {
      Alert.alert('Invalid details', validation.message);
      return;
    }

    setLoading(true);
    setError(null);
    setSubmitted(false);

    try {
      const payload: ScheduledRideRequest = {
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropoffLat: parseFloat(dropoffLat),
        dropoffLng: parseFloat(dropoffLng),
        scheduledTime,
      };

      if (!isOnline) {
        const action = createOfflineAction({
          type: 'SCHEDULED_RIDE_CREATE',
          payload,
        });
        await offlineService.queueOfflineAction(action);
        setSubmitted(true);
        setPickupLat('');
        setPickupLng('');
        setDropoffLat('');
        setDropoffLng('');
        setScheduledTime('');
        return;
      }

      const response = await apiClient.post<ScheduledRideRequest>('rides/schedule', payload);

      if (response.error) {
        setError(response.error);
        Alert.alert('Schedule failed', response.error);
        return;
      }

      setSubmitted(true);
      setPickupLat('');
      setPickupLng('');
      setDropoffLat('');
      setDropoffLng('');
      setScheduledTime('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [validation, pickupLat, pickupLng, dropoffLat, dropoffLng, scheduledTime, isOnline]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label={loading ? 'Scheduling...' : 'Schedule ride'}
          icon="calendar"
          loading={loading}
          disabled={!validation.valid}
          tone={colors.teal}
          onPress={handleSchedule}
          testID="schedule-ride-button"
        />
      }
      testID="scheduled-ride-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="Future rides"
          title="Schedule a ride"
          body="Book a ride for later. The request will be sent immediately when online."
        />

        {submitted && (
          <StateNotice
            icon="checkmark-circle"
            title="Ride scheduled"
            body="Your scheduled ride request has been submitted successfully."
            tone={colors.green}
            testID="scheduled-success"
          />
        )}

        {error && (
          <StateNotice
            icon="warning"
            title="Schedule error"
            body={error}
            tone={colors.red}
            testID="scheduled-error"
          />
        )}

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Pickup latitude"
              keyboardType="numeric"
              onChangeText={setPickupLat}
              placeholder="Pickup latitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="pickup-lat-input"
              value={pickupLat}
            />
            <TextInput
              accessibilityLabel="Pickup longitude"
              keyboardType="numeric"
              onChangeText={setPickupLng}
              placeholder="Pickup longitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="pickup-lng-input"
              value={pickupLng}
            />
            <TextInput
              accessibilityLabel="Dropoff latitude"
              keyboardType="numeric"
              onChangeText={setDropoffLat}
              placeholder="Dropoff latitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="dropoff-lat-input"
              value={dropoffLat}
            />
            <TextInput
              accessibilityLabel="Dropoff longitude"
              keyboardType="numeric"
              onChangeText={setDropoffLng}
              placeholder="Dropoff longitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="dropoff-lng-input"
              value={dropoffLng}
            />
            <TextInput
              accessibilityLabel="Scheduled time"
              onChangeText={setScheduledTime}
              placeholder="Scheduled time (ISO 8601)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="scheduled-time-input"
              value={scheduledTime}
            />
          </View>
        </PremiumPanel>

        {!validation.valid && (pickupLat || pickupLng || dropoffLat || dropoffLng || scheduledTime) && (
          <StateNotice
            icon="warning"
            title="Needs valid details"
            body={validation.message ?? 'Please check your inputs'}
            tone={colors.amber}
            testID="schedule-validation-state"
          />
        )}

        <InfoCard
          icon="time"
          title="Schedule ahead"
          body="Set a future pickup time and we'll match you with a driver automatically."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
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

export default ScheduledRideScreen;
