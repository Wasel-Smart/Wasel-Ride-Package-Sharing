import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import { colors, radii, spacing, typography } from '../theme';
import { createOfflineAction } from '../utils/offlineQueue';

// ── City catalogue ──────────────────────────────────────────────────────────

interface City {
  id: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
}

const CITIES: City[] = [
  { id: 'amman',   nameAr: 'عمّان',      nameEn: 'Amman',    lat: 31.9522,  lng: 35.9332 },
  { id: 'irbid',   nameAr: 'إربد',       nameEn: 'Irbid',    lat: 32.5556,  lng: 35.8500 },
  { id: 'zarqa',   nameAr: 'الزرقاء',    nameEn: 'Zarqa',    lat: 32.0728,  lng: 36.0878 },
  { id: 'aqaba',   nameAr: 'العقبة',     nameEn: 'Aqaba',    lat: 29.5321,  lng: 35.0063 },
  { id: 'salt',    nameAr: 'السلط',      nameEn: 'As-Salt',  lat: 32.0392,  lng: 35.7281 },
  { id: 'karak',   nameAr: 'الكرك',      nameEn: 'Al-Karak', lat: 31.1836,  lng: 35.7036 },
  { id: 'mafraq',  nameAr: 'المفرق',     nameEn: 'Mafraq',   lat: 32.3426,  lng: 36.2074 },
  { id: 'jerash',  nameAr: 'جرش',        nameEn: 'Jerash',   lat: 32.2744,  lng: 35.9000 },
  { id: 'madaba',  nameAr: 'مادبا',      nameEn: 'Madaba',   lat: 31.7167,  lng: 35.7958 },
  { id: 'ramtha',  nameAr: 'الرمثا',     nameEn: 'Ar-Ramtha',lat: 32.5665,  lng: 36.0084 },
  { id: 'tafilah', nameAr: 'الطفيلة',    nameEn: 'Tafilah',  lat: 30.8369,  lng: 35.6065 },
  { id: 'maan',    nameAr: 'معان',       nameEn: "Ma'an",    lat: 30.1935,  lng: 35.7345 },
];

// ── Date/time quick-pick ────────────────────────────────────────────────────

function buildQuickTimes(): Array<{ label: string; iso: string }> {
  const now = new Date();
  const slots: Array<{ label: string; iso: string }> = [];
  const hourMs = 60 * 60 * 1000;
  for (let h = 1; h <= 6; h++) {
    const d = new Date(now.getTime() + h * hourMs);
    // Round to next half-hour
    d.setMinutes(d.getMinutes() >= 30 ? 60 : 30, 0, 0);
    const label = d.toLocaleTimeString('ar-JO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const dateLabel = h === 1 ? 'اليوم' : d.toLocaleDateString('ar-JO', { weekday: 'short' });
    slots.push({ label: `${dateLabel} ${label}`, iso: d.toISOString() });
  }
  // Tomorrow morning
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  slots.push({
    label: 'غداً صباحاً 8:00',
    iso: tomorrow.toISOString(),
  });
  return slots;
}

// ── City picker component ───────────────────────────────────────────────────

interface CityPickerProps {
  label: string;
  selected: City | null;
  exclude?: string;
  onSelect: (city: City) => void;
  testID?: string;
}

function CityPicker({ label, selected, exclude, onSelect, testID }: CityPickerProps) {
  const [open, setOpen] = useState(false);
  const available = useMemo(
    () => CITIES.filter(c => c.id !== exclude),
    [exclude],
  );

  return (
    <View>
      <Text style={styles.pickLabel}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.nameAr : 'اختر مدينة'}`}
        style={[styles.pickBtn, selected && styles.pickBtnActive]}
        onPress={() => setOpen(o => !o)}
        testID={testID}
      >
        <Text style={[styles.pickBtnText, !selected && styles.pickBtnPlaceholder]}>
          {selected ? `${selected.nameAr}  –  ${selected.nameEn}` : 'اختر مدينة'}
        </Text>
        <Text style={styles.pickChevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {available.map(city => (
            <TouchableOpacity
              key={city.id}
              style={[styles.dropItem, selected?.id === city.id && styles.dropItemActive]}
              onPress={() => { onSelect(city); setOpen(false); }}
              accessibilityRole="menuitem"
              testID={`city-${city.id}`}
            >
              <Text style={[styles.dropItemText, selected?.id === city.id && styles.dropItemTextActive]}>
                {city.nameAr}
              </Text>
              <Text style={styles.dropItemSub}>{city.nameEn}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

interface ScheduledRideRequest {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  scheduledTime: string;
}

const ScheduledRideScreen = React.memo(function ScheduledRideScreen() {
  const [pickupCity, setPickupCity]   = useState<City | null>(null);
  const [dropoffCity, setDropoffCity] = useState<City | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const { isOnline } = useOffline();

  const quickTimes = useMemo(() => buildQuickTimes(), []);

  const isValid = pickupCity !== null && dropoffCity !== null && scheduledTime !== '';
  const sameCityError = pickupCity && dropoffCity && pickupCity.id === dropoffCity.id;

  const reset = useCallback(() => {
    setPickupCity(null);
    setDropoffCity(null);
    setScheduledTime('');
    setSubmitted(false);
    setError(null);
  }, []);

  const handleSchedule = useCallback(async () => {
    if (!pickupCity || !dropoffCity || !scheduledTime) return;
    if (pickupCity.id === dropoffCity.id) {
      Alert.alert('نفس المدينة', 'نقطة الانطلاق والوصول لازم تكونا مختلفتين.');
      return;
    }

    setLoading(true);
    setError(null);
    setSubmitted(false);

    try {
      const payload: ScheduledRideRequest = {
        pickupLat:  pickupCity.lat,
        pickupLng:  pickupCity.lng,
        dropoffLat: dropoffCity.lat,
        dropoffLng: dropoffCity.lng,
        scheduledTime,
      };

      if (!isOnline) {
        const action = createOfflineAction({
          type: 'SCHEDULED_RIDE_CREATE',
          payload,
        });
        await offlineService.queueOfflineAction(action);
        setSubmitted(true);
        reset();
        return;
      }

      const response = await apiClient.post<ScheduledRideRequest>('bookings', payload);

      if (response.error) {
        setError(response.error);
        Alert.alert('فشلت الجدولة', response.error);
        return;
      }

      setSubmitted(true);
      reset();
    } catch {
      setError('خطأ بالشبكة. جرّب مرة ثانية.');
    } finally {
      setLoading(false);
    }
  }, [pickupCity, dropoffCity, scheduledTime, isOnline, reset]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label={loading ? 'جاري الجدولة...' : 'جدولة مشوار'}
          icon="calendar"
          loading={loading}
          disabled={!isValid || !!sameCityError}
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
            <CityPicker
              label="📍 نقطة الانطلاق"
              selected={pickupCity}
              exclude={dropoffCity?.id}
              onSelect={setPickupCity}
              testID="pickup-city-picker"
            />

            <View style={styles.divider} />

            <CityPicker
              label="🏁 نقطة الوصول"
              selected={dropoffCity}
              exclude={pickupCity?.id}
              onSelect={setDropoffCity}
              testID="dropoff-city-picker"
            />
          </View>
        </PremiumPanel>

        {sameCityError ? (
          <StateNotice
            icon="warning"
            title="نفس المدينة"
            body="اختر مدينتين مختلفتين للانطلاق والوصول."
            tone={colors.amber}
            testID="same-city-error"
          />
        ) : null}

        <PremiumPanel>
          <Text style={styles.pickLabel}>🕐 وقت المشوار</Text>
          <View style={styles.timeGrid}>
            {quickTimes.map(slot => (
              <TouchableOpacity
                key={slot.iso}
                style={[styles.timeChip, scheduledTime === slot.iso && styles.timeChipActive]}
                onPress={() => setScheduledTime(slot.iso)}
                accessibilityRole="button"
                accessibilityLabel={slot.label}
                testID={`time-chip-${slot.iso}`}
              >
                <Text
                  style={[styles.timeChipText, scheduledTime === slot.iso && styles.timeChipTextActive]}
                  numberOfLines={1}
                >
                  {slot.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {scheduledTime !== '' && (
            <Text style={styles.selectedTime}>
              ✓ {new Date(scheduledTime).toLocaleString('ar-JO', {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          )}
        </PremiumPanel>

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
  scroll:   { gap: spacing.lg, paddingBottom: spacing.xxl },
  form:     { gap: spacing.md },
  divider:  { height: 1, backgroundColor: colors.line, marginVertical: spacing.xs },

  pickLabel: {
    ...typography.caption,
    color: colors.muted,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  pickBtnActive: {
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}12`,
  },
  pickBtnText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  pickBtnPlaceholder: {
    color: colors.muted,
    fontWeight: '400',
  },
  pickChevron: {
    color: colors.muted,
    fontSize: 10,
    marginStart: spacing.sm,
  },

  dropdown: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 220,
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dropItemActive: {
    backgroundColor: `${colors.teal}18`,
  },
  dropItemText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  dropItemTextActive: {
    color: colors.teal,
    fontWeight: '800',
  },
  dropItemSub: {
    color: colors.muted,
    fontSize: 12,
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceAlt,
  },
  timeChipActive: {
    borderColor: colors.teal,
    backgroundColor: `${colors.teal}18`,
  },
  timeChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: colors.teal,
    fontWeight: '800',
  },
  selectedTime: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});

export default ScheduledRideScreen;
