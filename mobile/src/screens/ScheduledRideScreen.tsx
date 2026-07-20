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
      Alert.alert('تفاصيل غير صحيحة', validation.message);
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
        Alert.alert('فشلت الجدولة', response.error);
        return;
      }

      setSubmitted(true);
      setPickupLat('');
      setPickupLng('');
      setDropoffLat('');
      setDropoffLng('');
      setScheduledTime('');
    } catch {
      setError('خطأ بالشبكة. جرّب مرة ثانية.');
    } finally {
      setLoading(false);
    }
  }, [validation, pickupLat, pickupLng, dropoffLat, dropoffLng, scheduledTime, isOnline]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label={loading ? 'جاري الجدولة...' : 'جدولة مشوار'}
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
          eyebrow="مشاوير مستقبلية"
          title="جدولة مشوار"
          body="احجز مشوار لوقت لاحق. الطلب بنرسل فوراً لما تكون متصل."
        />

        {submitted && (
          <StateNotice
            icon="checkmark-circle"
            title="تمت جدولة المشوار"
            body="تم إرسال طلب المشوار المجدول بنجاح."
            tone={colors.green}
            testID="scheduled-success"
          />
        )}

        {error && (
          <StateNotice
            icon="warning"
            title="خطأ بالجدولة"
            body={error}
            tone={colors.red}
            testID="scheduled-error"
          />
        )}

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="خط عرض الانطلاق"
              keyboardType="numeric"
              onChangeText={setPickupLat}
              placeholder="خط عرض الانطلاق"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="pickup-lat-input"
              value={pickupLat}
            />
            <TextInput
              accessibilityLabel="خط طول الانطلاق"
              keyboardType="numeric"
              onChangeText={setPickupLng}
              placeholder="خط طول الانطلاق"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="pickup-lng-input"
              value={pickupLng}
            />
            <TextInput
              accessibilityLabel="خط عرض الوصول"
              keyboardType="numeric"
              onChangeText={setDropoffLat}
              placeholder="خط عرض الوصول"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="dropoff-lat-input"
              value={dropoffLat}
            />
            <TextInput
              accessibilityLabel="خط طول الوصول"
              keyboardType="numeric"
              onChangeText={setDropoffLng}
              placeholder="خط طول الوصول"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="dropoff-lng-input"
              value={dropoffLng}
            />
            <TextInput
              accessibilityLabel="وقت الجدولة"
              onChangeText={setScheduledTime}
              placeholder="وقت الجدولة (ISO 8601)"
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
            title="بحاجة لتفاصيل صحيحة"
            body={validation.message ?? 'راجع المدخلات'}
            tone={colors.amber}
            testID="schedule-validation-state"
          />
        )}

        <InfoCard
          icon="time"
          title="جدولة مسبقة"
          body="حدد وقت استلام مستقبلي وإحنا بنطابقك مع سائق تلقائياً."
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
