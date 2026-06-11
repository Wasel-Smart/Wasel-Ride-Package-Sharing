import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { offlineService } from '../services/offline';
import { colors, radii, spacing } from '../theme';

const ScheduledRideScreen = React.memo(function ScheduledRideScreen() {
  const [pickupLat, setPickupLat] = useState('31.9454');
  const [pickupLng, setPickupLng] = useState('35.9284');
  const [dropoffLat, setDropoffLat] = useState('32.5569');
  const [dropoffLng, setDropoffLng] = useState('35.8469');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const handleSchedule = async () => {
    if (!scheduledTime.trim()) return;
    setLoading(true);
    try {
      await offlineService.queueOfflineAction({
        type: 'RIDE_REQUEST',
        payload: {
          pickupLat: parseFloat(pickupLat),
          pickupLng: parseFloat(pickupLng),
          dropoffLat: parseFloat(dropoffLat),
          dropoffLng: parseFloat(dropoffLng),
          scheduledTime,
          timestamp: new Date().toISOString(),
        },
      });
      setScheduled(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label={loading ? 'Scheduling...' : 'Schedule ride'}
          icon="calendar"
          loading={loading}
          disabled={!scheduledTime.trim()}
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
          body="Book a ride for later. The request will queue and sync when online."
        />

        {scheduled && (
          <StateNotice
            icon="checkmark-circle"
            title="Ride scheduled"
            body="Your scheduled ride is queued and will be processed."
            tone={colors.green}
            testID="scheduled-success"
          />
        )}

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              placeholder="Pickup latitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={pickupLat}
              onChangeText={setPickupLat}
              keyboardType="numeric"
              testID="pickup-lat-input"
            />
            <TextInput
              placeholder="Pickup longitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={pickupLng}
              onChangeText={setPickupLng}
              keyboardType="numeric"
              testID="pickup-lng-input"
            />
            <TextInput
              placeholder="Dropoff latitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={dropoffLat}
              onChangeText={setDropoffLat}
              keyboardType="numeric"
              testID="dropoff-lat-input"
            />
            <TextInput
              placeholder="Dropoff longitude"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={dropoffLng}
              onChangeText={setDropoffLng}
              keyboardType="numeric"
              testID="dropoff-lng-input"
            />
            <TextInput
              placeholder="Scheduled time (ISO 8601)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={scheduledTime}
              onChangeText={setScheduledTime}
              testID="scheduled-time-input"
            />
          </View>
        </PremiumPanel>

        <InfoCard
          icon="time"
          title="Offline-first scheduling"
          body="Scheduled rides queue locally and sync when connectivity is restored."
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
