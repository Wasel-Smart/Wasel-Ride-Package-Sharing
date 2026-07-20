import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { waselMobileConfig } from '../lib/config';
import { createMobilePaymentSheet, paymentService } from '../services/payments';
import { mobileAuth } from '../services/auth';
import { colors, radii, spacing } from '../theme';

const WalletScreen = React.memo(function WalletScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const userId = mobileAuth.getUser()?.id ?? '';
  const numericAmount = Number(amount);
  const paymentReady = waselMobileConfig.hasStripe && waselMobileConfig.hasFunctions;
  const validPayment = useMemo(
    () => Number.isFinite(numericAmount) && numericAmount > 0,
    [numericAmount],
  );

  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (!userId) return;
    const result = await paymentService.getWalletBalance(userId);
    setBalance(result.available);
  }, [userId]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const startPayment = useCallback(async () => {
    if (!validPayment) {
      Alert.alert('تفاصيل الدفع مطلوبة', 'اكتب مبلغ صحيح.');
      return;
    }

    if (!userId) {
      Alert.alert('تسجيل الدخول مطلوب', 'سجّل دخولك لإضافة رصيد.');
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      const sheet = await createMobilePaymentSheet({
        userId,
        amount: numericAmount,
        currency: 'jod',
        metadata: { source: 'wasel-mobile' },
      });

      const initResult = await initPaymentSheet({
        merchantDisplayName: 'Wasel',
        paymentIntentClientSecret: sheet.clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          address: {
            country: 'JO',
          },
        },
      });

      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      const presentResult = await presentPaymentSheet();
      if (presentResult.error) {
        throw new Error(presentResult.error.message);
      }

      const message = `Payment intent ${sheet.paymentIntentId} completed.`;
      setStatus(message);
      Alert.alert('تم الدفع', message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      Alert.alert('فشل الدفع', message);
    } finally {
      setLoading(false);
    }
  }, [initPaymentSheet, numericAmount, presentPaymentSheet, userId, validPayment]);

  return (
    <ScreenShell testID="wallet-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={waselMobileConfig.hasStripe ? 'Stripe جاهز' : 'مفتاح Stripe ناقص'}
            tone={waselMobileConfig.hasStripe ? colors.green : colors.amber}
            icon={waselMobileConfig.hasStripe ? 'card' : 'warning'}
          />
          <StatusPill
            label={waselMobileConfig.hasFunctions ? 'API جاهز' : 'رابط API ناقص'}
            tone={waselMobileConfig.hasFunctions ? colors.green : colors.amber}
          />
        </View>

        <SectionHeader
          eyebrow="المحفظة"
          title="دفع آمن من الموبايل"
          body="Stripe PaymentSheet بتنفتح من خادم موثق وبتتأكد داخل التطبيق."
        />

        <View style={styles.metrics}>
          <MetricTile label="العملة" value="JOD" tone={colors.gold} />
          <MetricTile
            label="الرصيد"
            value={balance === null ? '—' : `${balance.toFixed(2)}`}
            tone={colors.teal}
          />
          <MetricTile label="الوضع" value={paymentReady ? 'مباشر' : 'إعداد'} tone={paymentReady ? colors.teal : colors.amber} />
        </View>

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="المبلغ بالدينار الأردني"
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              placeholder="المبلغ JOD"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              value={amount}
            />
          </View>
        </PremiumPanel>

        {!paymentReady ? (
          <StateNotice
            icon="warning"
            title="إعداد الدفع غير مكتمل"
            body="مفتاح Stripe العام ورابط دالة Supabase مطلوبين قبل فتح الدفع داخل التطبيق."
            tone={colors.amber}
          />
        ) : null}

        {status ? (
          <StateNotice
            icon={status.includes('completed') ? 'checkmark-circle' : 'warning'}
            title="حالة الدفع"
            body={status}
            tone={status.includes('completed') ? colors.green : colors.red}
          />
        ) : null}

        <PrimaryButton
          label="افتح Stripe PaymentSheet"
          icon="card"
          loading={loading}
          disabled={!paymentReady || !validPayment}
          onPress={startPayment}
          testID="open-payment-sheet"
        />

        <InfoCard
          icon="shield-checkmark"
          title="دفع مصرح من الخادم"
          body="تطبيق الموبايل ما بنشئ عمليات Stripe مباشرة؛ بطلب السر من دالة خلفية موثقة."
          tone={colors.green}
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
  topRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
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

export default WalletScreen;
