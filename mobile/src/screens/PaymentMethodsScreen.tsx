import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PrimaryButton,
} from '../components/MobilePrimitives';
import { paymentService, createTopUpSession, type PaymentMethod } from '../services/payments';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing, typography } from '../theme';

function PaymentMethodsSkeleton() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.methodCard}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export default function PaymentMethodsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const userId = user?.id ?? '';

  /**
   * Opens the Stripe Checkout flow in the system browser to add a new card.
   * After the user completes checkout and returns to the app, invalidating
   * the payment-methods query re-fetches the updated list.
   */
  const handleAddCard = useCallback(async () => {
    if (!userId) {
      Alert.alert('سجّل دخولك أولاً', 'تحتاج إلى حساب لإضافة بطاقة.');
      return;
    }
    setActionLoading(true);
    try {
      const session = await createTopUpSession({ userId, amount: 0.01 }); // minimal amount to register card
      if (session.checkoutUrl) {
        await Linking.openURL(session.checkoutUrl);
        // Refresh list when user returns to foreground (AppState listener is in WalletScreen)
        void queryClient.invalidateQueries({ queryKey: ['payment-methods', userId] });
      } else {
        Alert.alert('خطأ', 'تعذّر فتح صفحة إضافة البطاقة. حاول مرة ثانية.');
      }
    } catch (err) {
      Alert.alert('خطأ', err instanceof Error ? err.message : 'تعذّر فتح الدفع.');
    } finally {
      setActionLoading(false);
    }
  }, [userId, queryClient]);

  const { data: methods, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-methods', userId],
    queryFn: async () => {
      if (!userId) return [];
      const result = await paymentService.getPaymentMethods(userId);
      return result;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });

  const handleSetPrimary = useCallback(async (id: string) => {
    if (!userId || !id) return;
    setActionLoading(true);
    try {
      const success = await paymentService.setDefaultPaymentMethod(userId, id);
      if (success) {
        Alert.alert('تم التحدث', 'تم تعيين وسيلة الدفع كافتراضية.');
        void queryClient.invalidateQueries({ queryKey: ['payment-methods', userId] });
      } else {
        Alert.alert(' خطأ', 'تعذر تحديد وسيلة الدفع الافتراضية.');
      }
    } finally {
      setActionLoading(false);
    }
  }, [userId, queryClient]);

  const handleRemove = useCallback(async (id: string) => {
    if (!userId || !id) return;
    Alert.alert(
      'حذف وسيلة الدفع',
      'هل أنت مطمئن أنك تريد حذف بطاقة الدفع هذه؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const success = await paymentService.removePaymentMethod(userId, id);
              if (success) {
                void queryClient.invalidateQueries({ queryKey: ['payment-methods', userId] });
              } else {
                Alert.alert(' خطأ', 'تعذر حذف وسيلة الدفع.');
              }
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [userId, queryClient]);

  if (isLoading) return <PaymentMethodsSkeleton />;

  const displayMethods: PaymentMethod[] = methods ?? [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>وسائل الدفع</Text>
        <Text style={styles.subtitle}>إدارة بطاقاتك ومحافظك</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>حدث خطأ في تحميل وسائل الدفع</Text>
          <TouchableOpacity onPress={() => void refetch()}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      )}

      {displayMethods.map((method) => (
        <View key={method.id} style={styles.methodCard}>
          <View style={styles.methodInfo}>
            <View style={[styles.methodIcon, { backgroundColor: colors.teal + '18' }]}>
              <Text style={styles.methodIconText}>{method.type === 'card' ? '💳' : '👛'}</Text>
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>
                {method.type === 'card' ? `**** ${method.token_reference?.slice(-4) ?? ''}` : 'محفظة'}
              </Text>
              {method.provider && (
                <Text style={styles.methodProvider}>{method.provider}</Text>
              )}
              {method.isDefault && (
                <View style={[styles.primaryBadge, { backgroundColor: colors.teal + '18' }]}>
                  <Text style={[styles.primaryBadgeText, { color: colors.teal }]}>افتراضي</Text>
                </View>
              )}
            </View>
          </View>

          {!method.isDefault ? (
            <TouchableOpacity
              onPress={() => handleSetPrimary(method.id)}
              disabled={actionLoading}
            >
              <Text style={[styles.setPrimaryText, { color: colors.teal }]}>تعيين كافتراضي</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => handleRemove(method.id)}
              disabled={actionLoading}
            >
              <Text style={[styles.setPrimaryText, { color: colors.red }]}>حذف</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <PrimaryButton
        label={actionLoading ? 'جاري الفتح...' : 'إضافة وسيلة دفع جديدة'}
        icon="card"
        loading={actionLoading}
        onPress={handleAddCard}
        testID="add-payment-method"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  title: { ...typography.title, fontWeight: '900', color: colors.ink },
  subtitle: { ...typography.body, color: colors.muted, marginTop: 4 },
  errorBanner: {
    backgroundColor: colors.red + '12',
    borderColor: colors.red + '44',
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
  },
  errorText: { ...typography.body, color: colors.red, fontWeight: '700' },
  retryText: { ...typography.caption, color: colors.teal, fontWeight: '800', marginTop: 4 },
  methodCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodIconText: { fontSize: 20 },
  methodDetails: { flex: 1 },
  methodName: { ...typography.body, fontWeight: '800', color: colors.ink },
  methodProvider: { ...typography.caption, color: colors.muted, marginTop: 2 },
  primaryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
  },
  primaryBadgeText: { ...typography.micro, fontWeight: '800' },
  setPrimaryText: { ...typography.caption, fontWeight: '800' },
  addButton: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#FFFFFF', ...typography.body, fontWeight: '900' },
  skeletonTitle: {
    height: 28,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    width: '60%',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    width: '40%',
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    marginRight: 16,
  },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 7,
    width: '80%',
  },
  skeletonLineShort: { width: '40%' },
});
