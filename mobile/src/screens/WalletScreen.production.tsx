import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import { useAuth } from '../providers/AuthProvider';
import { useOffline } from '../hooks/useOffline';
import { paymentService, type PaymentMethod } from '../services/payments';
import { colors, spacing } from '../theme';

type RootStackParamList = {
  PaymentMethods: undefined;
  Receipt: { paymentId: string };
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  currency: string;
}

const WalletScreen = React.memo(function WalletScreen() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const navigation = useNavigation<NavProp>();
  const [balance, setBalance] = useState<WalletBalance>({
    available: 0,
    pending: 0,
    total: 0,
    currency: 'JOD',
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [topUpAmount] = useState(50);

  const loadWalletData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [walletBalance, methods] = await Promise.all([
        paymentService.getWalletBalance(user.id),
        paymentService.getPaymentMethods(user.id),
      ]);
      setBalance(walletBalance);
      setPaymentMethods(methods);
    } catch (error) {
      console.error('[Wallet] Load error:', error);
      Alert.alert('المحفظة', 'ما قدرنا نحمّل بيانات المحفظة');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadWalletData();
  }, [loadWalletData]);

  const handleTopUp = useCallback(async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'سجّل دخولك لإضافة رصيد');
      return;
    }

    if (topUpAmount < 10 || topUpAmount > 500) {
      Alert.alert('مبلغ غير صحيح', 'مبلغ الشحن لازم يكون بين 10 و 500 JOD');
      return;
    }

    setLoading(true);
    try {
      const result = await paymentService.addFunds(user.id, topUpAmount, 'JOD');
      if (result.success) {
        Alert.alert('تم بنجاح', `تمت إضافة ${topUpAmount} JOD إلى محفظتك`);
        await loadWalletData();
      } else {
        Alert.alert('فشل الدفع', result.error || 'ما قدرنا نعالج الدفع');
      }
    } catch (error) {
      console.error('[Wallet] Top-up error:', error);
      Alert.alert('خطأ', 'فشلت عملية الشحن');
    } finally {
      setLoading(false);
    }
  }, [loadWalletData, topUpAmount, user]);

  const handleWithdraw = useCallback(async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'سجّل دخولك لسحب الرصيد');
      return;
    }

    if (balance.available < 10) {
      Alert.alert('الرصيد غير كافي', 'الحد الأدنى للسحب 10 JOD');
      return;
    }

    Alert.alert(
      'تأكيد السحب',
      `بدك تسحب ${balance.available.toFixed(2)} JOD لحسابك البنكي؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'اسحب',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await paymentService.withdrawFunds(user.id, balance.available);
              if (result.success) {
                Alert.alert('تم طلب السحب', 'الرصيد بوصل خلال ٢-٣ أيام عمل');
                await loadWalletData();
              } else {
                Alert.alert('فشل السحب', result.error || 'ما قدرنا نعالج السحب');
              }
            } catch (error) {
              console.error('[Wallet] Withdrawal error:', error);
              Alert.alert('خطأ', 'فشلت عملية السحب');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [balance.available, loadWalletData, user]);

  const defaultMethod = paymentMethods.find(m => m.isDefault);

  return (
    <ScreenShell testID="wallet-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statusRow}>
          <StatusPill
            label={isOnline ? 'محفظة مباشرة' : 'رصيد محفوظ'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'wallet' : 'archive'}
          />
          <StatusPill
            label={`${paymentMethods.length} وسائل دفع`}
            tone={paymentMethods.length > 0 ? colors.teal : colors.amber}
            icon="card"
          />
        </View>

        <SectionHeader
          eyebrow="محفظة واصل"
          title="رصيدك ودفعاتك"
          body="اشحن واسحب وأدر وسائل الدفع بأمان."
        />

        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="الرصيد المتاح"
            title={`${balance.available.toFixed(2)} ${balance.currency}`}
            body={`معلّق: ${balance.pending.toFixed(2)} ${balance.currency} · المجموع: ${balance.total.toFixed(2)} ${balance.currency}`}
            tone="dark"
          />
        </PremiumPanel>

        <View style={styles.metrics}>
          <MetricTile
            label="المتاح"
            value={`${balance.available.toFixed(0)}`}
            tone={colors.green}
          />
          <MetricTile label="المعلّق" value={`${balance.pending.toFixed(0)}`} tone={colors.amber} />
        </View>

        {!user ? (
          <StateNotice
            icon="person"
            title="تسجيل الدخول مطلوب"
            body="افتح محفظتك بعد تسجيل الدخول."
            tone={colors.amber}
          />
        ) : loading ? (
          <StateNotice
            icon="sync"
            title="جاري تحميل المحفظة"
            body="بنحمّل رصيدك ووسائل الدفع..."
            loading
            tone={colors.blue}
          />
        ) : null}

        <SectionHeader
          eyebrow="إجراءات سريعة"
          title="إضافة أو سحب رصيد"
          body="اشحن محفظتك أو حوّل رصيدك لحسابك البنكي."
        />

        <View style={styles.buttonRow}>
          <PrimaryButton
            label={`اشحن ${topUpAmount} JOD`}
            icon="add-circle"
            tone={colors.green}
            onPress={handleTopUp}
            disabled={loading || !user}
            testID="topup-button"
          />
          <PrimaryButton
            label="اسحب"
            icon="arrow-back"
            tone={colors.blue}
            onPress={handleWithdraw}
            disabled={loading || !user || balance.available < 10}
            testID="withdraw-button"
          />
        </View>

        <SectionHeader
          eyebrow="وسائل الدفع"
          title="بطاقاتك وحساباتك"
          body={
            defaultMethod
              ? `الافتراضية: ${defaultMethod.brand} •••• ${defaultMethod.last4}`
              : 'ما في وسائل دفع مضافة'
          }
        />

        {paymentMethods.length > 0 ? (
          paymentMethods.map(method => (
            <InfoCard
              key={method.id}
              icon={method.isDefault ? 'star' : 'card'}
              title={`${method.brand} •••• ${method.last4}`}
              body={`بتنتهي ${method.expiryMonth}/${method.expiryYear}${method.isDefault ? ' · افتراضية' : ''}`}
              tone={method.isDefault ? colors.gold : colors.teal}
            />
          ))
        ) : (
          <StateNotice
            icon="card-outline"
            title="ما في وسائل دفع"
            body="أضف بطاقة أو حساب بنكي لتفعيل الدفع."
            tone={colors.muted}
          />
        )}

        <PrimaryButton
          label="إدارة وسائل الدفع"
          icon="settings"
          tone={colors.teal}
          onPress={() => navigation.navigate('PaymentMethods')}
          testID="manage-payments-button"
        />

        <PrimaryButton
          label="حدّث المحفظة"
          icon="refresh"
          tone={colors.blue}
          onPress={loadWalletData}
          disabled={loading}
          testID="refresh-wallet-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="دفعات آمنة"
          body="كل العمليات مشفرة وبتتم عبر Stripe وفق PCI-DSS."
          tone={colors.green}
        />
        <InfoCard
          icon="lock-closed"
          title="شحن فوري"
          body="الرصيد بنضاف فوراً وبصير متاح لحجوزات المشاوير."
          tone={colors.teal}
        />
        <InfoCard
          icon="time"
          title="سحب سريع"
          body="التحويلات البنكية عادة بتوصل خلال ٢-٣ أيام عمل."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  buttonRow: { gap: spacing.sm },
});

export default WalletScreen;
