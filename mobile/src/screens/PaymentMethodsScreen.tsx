import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing, typography } from '../theme';

type PaymentMethodType = 'wallet' | 'card';

interface LocalPaymentMethod {
  id: string;
  type: PaymentMethodType;
  name: string;
  balance?: number;
  primary: boolean;
}

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

  const { data: methods, isLoading, error } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiClient.get<LocalPaymentMethod[]>(payments/methods/);
      if (response.error || !response.data) throw new Error(response.error || 'Failed to load');
      return response.data;
    },
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <PaymentMethodsSkeleton />;

  const displayMethods: LocalPaymentMethod[] = methods ?? [];

  const handleAddPayment = () => {
    Alert.alert('Add Payment Method', 'Connect to Stripe or other payment provider');
  };

  const handleSetPrimary = (id: string) => {
    Alert.alert('Success', 'Primary payment method updated');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <Text style={styles.subtitle}>Manage your payment options</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Failed to load payment methods</Text>
          <TouchableOpacity onPress={handleAddPayment}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {displayMethods.map((method) => (
        <View key={method.id} style={styles.methodCard}>
          <View style={styles.methodInfo}>
            <View style={[styles.methodIcon, { backgroundColor: colors.teal + '18' }]}>
              <Text style={styles.methodIconText}>{method.type === 'wallet' ? '💳' : '🏦'}</Text>
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>{method.name}</Text>
              {method.type === 'wallet' && (
                <Text style={styles.balance}>Balance: JOD {(method.balance ?? 0).toFixed(2)}</Text>
              )}
              {method.primary && (
                <View style={[styles.primaryBadge, { backgroundColor: colors.teal + '18' }]}>
                  <Text style={[styles.primaryBadgeText, { color: colors.teal }]}>Primary</Text>
                </View>
              )}
            </View>
          </View>

          {!method.primary && (
            <TouchableOpacity onPress={() => handleSetPrimary(method.id)}>
              <Text style={[styles.setPrimaryText, { color: colors.teal }]}>Set as Primary</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.teal }]}
        onPress={handleAddPayment}
      >
        <Text style={styles.addButtonText}>+ Add Payment Method</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  title: { fontSize: typography.title, fontWeight: '900', color: colors.ink },
  subtitle: { fontSize: typography.body, color: colors.muted, marginTop: 4 },
  errorBanner: {
    backgroundColor: colors.red + '12',
    borderColor: colors.red + '44',
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
  },
  errorText: { fontSize: typography.body, color: colors.red, fontWeight: '700' },
  retryText: { fontSize: typography.caption, color: colors.teal, fontWeight: '800', marginTop: 4 },
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
  methodName: { fontSize: typography.body, fontWeight: '800', color: colors.ink },
  balance: { fontSize: typography.caption, color: colors.green, marginTop: 2, fontWeight: '700' },
  primaryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 4,
  },
  primaryBadgeText: { fontSize: typography.micro, fontWeight: '800' },
  setPrimaryText: { fontSize: typography.caption, fontWeight: '800' },
  addButton: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontSize: typography.body, fontWeight: '900' },
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
