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
  const [pickup, setPickup] = useState('عمّان');
  const [dropoff, setDropoff] = useState('إربد');
  const [weight, setWeight] = useState('2');
  const [note, setNote] = useState('طرد صغير');
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
      Alert.alert('راجع تفاصيل الطرد', latestValidation.message);
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
        ? 'طلب الطرد جاهز للمزامنة مع الخادم.'
        : 'طلب الطرد انحفظ بدون إنترنت وبتزامن لاحقاً.';
      setResult(message);
      Alert.alert('توصيل طرد', message);
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
          label={isOnline ? 'أنشئ طلب طرد' : 'احفظ الطلب بدون إنترنت'}
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
            label={isOnline ? 'جاهز للمزامنة' : 'عهدة بدون إنترنت'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'cloud-upload' : 'archive'}
          />
          <StatusPill label={`${queueSize} بالانتظار`} tone={queueSize ? colors.amber : colors.teal} />
        </View>

        <SectionHeader
          eyebrow="مسار الطرد"
          title="حرّك الطرود على خطوط موثوقة"
          body="وجهة الطرد ووزنه وملاحظة العهدة وحالة المزامنة بضلوا مع الطلب طول الرحلة."
        />

        <RoutePreview
          from={pickup.trim() || 'الاستلام'}
          to={dropoff.trim() || 'التسليم'}
          eta="العهدة جاهزة"
          distance={`${weight || '0'} kg`}
          tone={colors.blue}
        />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="موقع الاستلام"
              autoCapitalize="words"
              onChangeText={setPickup}
              placeholder="موقع الاستلام"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-pickup-input"
              value={pickup}
            />
            <TextInput
              accessibilityLabel="موقع التسليم"
              autoCapitalize="words"
              onChangeText={setDropoff}
              placeholder="موقع التسليم"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-dropoff-input"
              value={dropoff}
            />
            <TextInput
              accessibilityLabel="وزن الطرد"
              keyboardType="decimal-pad"
              onChangeText={setWeight}
              placeholder="وزن الطرد بالكغم"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="package-weight-input"
              value={weight}
            />
            <TextInput
              accessibilityLabel="ملاحظة الطرد"
              multiline
              onChangeText={setNote}
              placeholder="ملاحظة الطرد"
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
            title="تفاصيل الطرد ناقصة"
            body={validation.message ?? 'كمّل الاستلام والتسليم ووزن الطرد.'}
            tone={colors.amber}
            testID="package-validation-state"
          />
        ) : null}

        {result ? (
          <StateNotice
            icon="checkmark-circle"
            title="حالة طلب الطرد"
            body={result}
            tone={colors.blue}
            testID="package-request-result"
          />
        ) : null}

        <InfoCard
          icon="shield-checkmark"
          title="العهدة أولاً"
          body="تفاصيل الطلب بتنحفظ بشكل واضح لتأكيد الاستلام والإثبات وحالة التسليم."
          tone={colors.green}
        />
        <InfoCard
          icon="time"
          title="جاهز بدون إنترنت"
          body="طلب الطرد بنحفظ محلياً بدل ما يفشل وقت انقطاع الشبكة."
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
