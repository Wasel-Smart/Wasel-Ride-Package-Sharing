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
import { RideCard } from '../components/domain/RideCard';
import { useOffline } from '../hooks/useOffline';
import { rideLifecycle, type AvailableTrip } from '../services/ride';
import { colors, radii, spacing } from '../theme';
import { validateRideRequest } from '../utils/mobileValidation';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const RideRequestScreen = React.memo(function RideRequestScreen() {
  const { isOnline, queueSize } = useOffline();
  const navigation = useNavigation<NavProp>();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [seats, setSeats] = useState('1');
  const [searching, setSearching] = useState(false);
  const [bookingTripId, setBookingTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<AvailableTrip[] | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const validation = useMemo(
    () => validateRideRequest(pickup, destination, seats),
    [destination, pickup, seats],
  );

  const search = useCallback(async () => {
    const latest = validateRideRequest(pickup, destination, seats);
    if (!latest.valid) {
      Alert.alert('راجع تفاصيل المشوار', latest.message);
      return;
    }

    setMessage(null);

    // Offline: queue the request; it is matched when the connection returns.
    if (!isOnline) {
      const result = await rideLifecycle.requestRide({
        origin: { latitude: 0, longitude: 0, address: pickup.trim() },
        destination: { latitude: 0, longitude: 0, address: destination.trim() },
        seats: Number(seats),
      });
      setMessage({
        text: result.error?.message ?? 'انحفظ الطلب وبينرسل لما يرجع الاتصال.',
        ok: false,
      });
      return;
    }

    setSearching(true);
    setTrips(null);
    try {
      const found = await rideLifecycle.searchTrips(
        pickup.trim(),
        destination.trim(),
        Number(seats),
        new Date().toISOString().slice(0, 10),
      );
      setTrips(found);
      if (found.length === 0) {
        setMessage({ text: 'ما في رحلات متاحة على هذا الخط حالياً. جرّب خطاً آخر أو راجع لاحقاً.', ok: false });
      }
    } finally {
      setSearching(false);
    }
  }, [destination, isOnline, pickup, seats]);

  const confirmBooking = useCallback(
    (trip: AvailableTrip) => {
      if (bookingTripId) return;
      const seatCount = Number(seats);
      const total = (trip.price * seatCount).toFixed(2);
      Alert.alert(
        'تأكيد الحجز',
        `${trip.from} ← ${trip.to}\n${trip.date} ${trip.time}\nالسائق: ${trip.driver.name}\n${seatCount} مقعد × ${trip.price.toFixed(2)} = ${total} دينار`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: `احجز (${total} د.أ)`,
            onPress: async () => {
              setBookingTripId(trip.id);
              const result = await rideLifecycle.bookTrip(trip, seatCount, pickup.trim(), destination.trim());
              setBookingTripId(null);
              if (result.ride) {
                setTrips(null);
                setMessage({ text: 'تم تأكيد حجزك. بتقدر تتابع المشوار الآن.', ok: true });
                navigation.navigate('LiveTracking', { rideId: result.ride.id });
              } else {
                const text = result.error?.message ?? 'ما قدرنا نكمّل الحجز.';
                setMessage({ text, ok: false });
                Alert.alert('الحجز', text);
              }
            },
          },
        ],
      );
    },
    [bookingTripId, navigation, pickup, destination, seats],
  );

  const routeFrom = pickup.trim() || 'نقطة الانطلاق';
  const routeTo = destination.trim() || 'الوجهة';

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          disabled={!validation.valid}
          label={isOnline ? 'دور على مشاوير متاحة' : 'احفظ طلب المشوار للمزامنة'}
          loading={searching}
          onPress={search}
          testID="submit-request-button"
        />
      }
      testID="ride-request-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          body="اختر الرحلة اللي بتناسبك وراجع السعر قبل التأكيد."
        />

        <RoutePreview from={routeFrom} to={routeTo} eta="اختر رحلة" distance={`${seats || '0'} مقاعد`} />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="مدينة الانطلاق"
              autoCapitalize="words"
              onChangeText={setPickup}
              placeholder="مدينة الانطلاق (مثلاً عمّان)"
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
              placeholder="الوجهة (مثلاً العقبة)"
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

        {!validation.valid && (pickup || destination) ? (
          <StateNotice
            icon="warning"
            title="تفاصيل المشوار ناقصة"
            body={validation.message ?? 'كمّل نقطة الانطلاق والوجهة وعدد المقاعد.'}
            tone={colors.amber}
            testID="ride-validation-state"
          />
        ) : null}

        {message ? (
          <StateNotice
            icon={message.ok ? 'checkmark-circle' : 'information-circle'}
            title="حالة الطلب"
            body={message.text}
            tone={message.ok ? colors.green : colors.amber}
            testID="ride-request-result"
          />
        ) : null}

        {trips && trips.length > 0 ? (
          <View style={styles.results} testID="trip-results">
            <SectionHeader
              eyebrow="نتائج البحث"
              title={`${trips.length} رحلة متاحة`}
              body="اضغط احجز لمراجعة السعر وتأكيد الحجز."
              size="md"
            />
            {trips.map(trip => (
              <RideCard
                key={trip.id}
                driver={{ name: trip.driver.name, rating: trip.driver.rating, isVerified: trip.driver.verified }}
                trip={{
                  from: trip.from,
                  to: trip.to,
                  departureTime: trip.time,
                  availableSeats: trip.seats,
                }}
                onReserve={() => confirmBooking(trip)}
                onPress={() => confirmBooking(trip)}
              />
            ))}
          </View>
        ) : null}

        <SectionHeader eyebrow="النقل العام" title="خطوط الباصات" body="بدك باص مجدول؟ استعرض الخطوط والمواعيد." />
        <PrimaryButton
          label="اعرض خطوط الباصات"
          icon="bus"
          tone={colors.blue}
          onPress={() => navigation.navigate('Bus')}
          testID="quick-link-bus"
        />

        <InfoCard
          icon="sync"
          title="جاهزية للشبكة الضعيفة"
          body="بدون إنترنت بنحفظ طلب البحث، لكن تأكيد الحجز والدفع بيتطلبوا اتصالاً."
          tone={colors.amber}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  form: { gap: spacing.sm },
  results: { gap: spacing.md },
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
