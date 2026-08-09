import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  InfoCard,
  MetricTile,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing } from '../theme';

interface DriverStep {
  id: string;
  label: string;
  description: string;
  complete: boolean;
}

const DriverScreen = React.memo(function DriverScreen() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<DriverStep[]>([
    { id: 'email', label: 'تأكيد البريد الإلكتروني', description: 'أكد بريدك الإلكتروني من الإعدادات.', complete: Boolean(user?.email) },
    { id: 'phone', label: 'تأكيد رقم الهاتف', description: 'أضف رقم موبايل أردني وفعّله.', complete: false },
    { id: 'sanad', label: 'هوية سند', description: 'كمّل التحقق من الهوية الوطنية عبر سند.', complete: false },
    { id: 'license', label: 'رخصة السواقة', description: 'ارفع رخصة سواقة أردنية سارية.', complete: false },
    { id: 'vehicle', label: 'تفاصيل المركبة', description: 'أضف نوع المركبة وموديلها ورقم اللوحة.', complete: false },
    { id: 'insurance', label: 'وثيقة التأمين', description: 'ارفع تأمين المركبة الساري حالياً.', complete: false },
  ]);

  const completedCount = steps.filter(s => s.complete).length;
  const readinessPercent = Math.round((completedCount / steps.length) * 100);
  const canOfferRide = completedCount >= 4;
  const canCarryPackages = completedCount >= 5;

  const toggleStep = useCallback((id: string) => {
    setSteps(prev =>
      prev.map(s => (s.id === id ? { ...s, complete: !s.complete } : s)),
    );
  }, []);

  const offerRide = useCallback(() => {
    if (!canOfferRide) {
      Alert.alert('لسه مش جاهز', 'كمّل ٤ خطوات على الأقل قبل عرض المشاوير.');
      return;
    }
    Alert.alert('انتقال', 'بنفتح مسار عرض مشوار...');
  }, [canOfferRide]);

  const STATUS_COLOR = readinessPercent >= 80 ? colors.green : readinessPercent >= 50 ? colors.amber : colors.red;

  return (
    <ScreenShell testID="driver-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={`${readinessPercent}% جاهز`}
            tone={STATUS_COLOR}
            icon="shield-checkmark"
          />
          <StatusPill
            label={`${completedCount}/${steps.length} خطوات`}
            tone={STATUS_COLOR}
            icon="checkmark-circle"
          />
        </View>

        <SectionHeader
          eyebrow="تجهيز السائق"
          title="صير سائق مع واصل"
          body="كمّل الخطوات لتفعيل عرض المشاوير وحمل الطرود والدفع."
        />

        <View style={styles.metrics}>
          <MetricTile label="الجاهزية" value={`${readinessPercent}%`} tone={STATUS_COLOR} />
          <MetricTile label="عرض مشوار" value={canOfferRide ? 'جاهز' : 'موقوف'} tone={canOfferRide ? colors.green : colors.amber} />
          <MetricTile label="الطرود" value={canCarryPackages ? 'جاهز' : 'موقوف'} tone={canCarryPackages ? colors.green : colors.amber} />
        </View>

        {steps.map(step => (
          <StateNotice
            key={step.id}
            icon={step.complete ? 'checkmark-circle' : 'ellipse-outline'}
            title={step.label}
            body={step.description}
            tone={step.complete ? colors.green : colors.amber}
            testID={`driver-step-${step.id}`}
          />
        ))}

        <SectionHeader
          eyebrow="إجراءات التجهيز"
          title="اضغط لتحديد الخطوات المكتملة"
          body="بالإنتاج هاي بتفتح رفع الوثائق والتحقق عبر سند."
        />

        {steps
          .filter(s => !s.complete)
          .map(step => (
            <PrimaryButton
              key={`complete-${step.id}`}
              label={`كمّل: ${step.label}`}
              icon="arrow-forward"
              tone={colors.blue}
              onPress={() => toggleStep(step.id)}
              testID={`complete-step-${step.id}`}
            />
          ))}

        <PrimaryButton
          label={canOfferRide ? 'اعرض مشوار' : `كمّل ${4 - completedCount} خطوات إضافية لعرض المشاوير`}
          icon="car"
          tone={canOfferRide ? colors.teal : colors.muted}
          onPress={offerRide}
          testID="offer-ride-driver-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="الهوية عبر سند"
          body="واصل يستخدم نظام سند الأردني للتحقق من هوية السائق قبل تفعيل المشاوير."
          tone={colors.green}
        />
        <InfoCard
          icon="cube"
          title="ميزة حمل الطرود"
          body="السائقون الموثقون بوثائق كاملة بقدروا يحملوا طرود مع الركاب لدخل إضافي."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: spacing.sm },
});

export default DriverScreen;
