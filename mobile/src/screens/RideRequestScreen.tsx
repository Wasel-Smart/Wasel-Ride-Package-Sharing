import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

type RootStackParamList = {
  Tabs: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const SAMPLE_COORDINATES = {
  amman: { latitude: 31.9539, longitude: 35.9106 },
  aqaba: { latitude: 29.5321, longitude: 35.0063 },
};

const RideRequestScreen = React.memo(function RideRequestScreen() {
  const { isOnline, queueSize } = useOffline();
  const navigation = useNavigation<NavProp>();
  const [pickup, setPickup] = useState('عمّان');
  const [destination, setDestination] = useState('العقبة');
  const [seats, setSeats] = useState('1');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const validation = useMemo(
    () => validateRideRequest(pickup, destination, seats),
    [destination, pickup, seats],
  );

  const canSubmit = validation.valid;
  const routeFrom = pickup.trim() || 'نقطة الانطلاق';
  const routeTo = destination.trim() || 'الوجهة';

  const submitRide = useCallback(async () => {
    const latestValidation = validateRideRequest(pickup, destination, seats);
    if (!latestValidation.valid) {
      Alert.alert('راجع تفاصيل المشوار', latestValidation.message);
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

      const message = result.error?.message ?? 'ما قدرنا نطلب هذا المشوار.';
      setLastResult(message);
      Alert.alert('طلب مشوار', message);
    } finally {
      setLoading(false);
    }
  }, [destination, pickup, seats]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!canSubmit}
          label={isOnline ? 'دور على مشاوير متاحة' : 'احفظ طلب المشوار للمزامنة'}
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
            label={isOnline ? 'مطابقة مباشرة' : 'طابور بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'radio' : 'archive'}
          />
          <StatusPill label={`${queueSize} بالانتظار`} tone={queueSize ? colors.amber : colors.teal} />
        </View>

        <SectionHeader
          eyebrow="مسار المشوار"
          title="دور على مقعد مشترك موثوق"
          body="الخط وعدد المقاعد وحالة الشبكة واضحين قبل ما يطلع الطلب من الجهاز."
        />

        <RoutePreview from={routeFrom} to={routeTo} eta="مطابقة مباشرة" distance={`${seats || '0'} مقاعد`} />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="مدينة الانطلاق"
              autoCapitalize="words"
              onChangeText={setPickup}
              placeholder="مدينة الانطلاق"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="origin-input"
              value={pickup}
            />
            <TextInput
              accessibilityLabel="مدينة الوصول"
              autoCapitalize="words"
              onChangeText={setDestination}
              placeholder="الوجهة"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="destination-input"
              value={destination}
            />
            <TextInput
              accessibilityLabel="عدد المقاعد"
              keyboardType="number-pad"
              onChangeText={setSeats}
              placeholder="عدد المقاعد"
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
            title="تفاصيل المشوار ناقصة"
            body={validation.message ?? 'كمّل نقطة الانطلاق والوجهة وعدد المقاعد.'}
            tone={colors.amber}
            testID="ride-validation-state"
          />
        ) : null}

        {lastResult ? (
          <StateNotice
            icon={lastResult.includes('queued') || lastResult.includes('failed') ? 'time' : 'checkmark-circle'}
            title="حالة طلب المشوار"
            body={lastResult}
            tone={lastResult.includes('failed') ? colors.red : colors.teal}
            testID="ride-request-result"
          />
        ) : null}

        <SectionHeader
          eyebrow="النقل العام"
          title="خطوط الباصات"
          body="بدك باص مجدول؟ استعرض الخطوط والمواعيد."
        />

        <PrimaryButton
          label="اعرض خطوط الباصات"
          icon="bus"
          tone={colors.blue}
          onPress={() => navigation.navigate('Bus')}
          testID="quick-link-bus"
        />

        <InfoCard
          icon="location"
          title="الموقع المباشر جاهز"
          body="خدمة الموقع بالتطبيق بتدعم تتبع السائق واشتراكات الراكب عبر WebSocket."
          tone={colors.blue}
        />
        <InfoCard
          icon="sync"
          title="جاهزية للشبكة الضعيفة"
          body="الطلبات بتنحفظ محلياً لما تضعف الشبكة وبتتزامن أول ما يرجع الاتصال."
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
