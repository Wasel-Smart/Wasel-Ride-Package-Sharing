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
      Alert.alert('Wallet', 'Could not load wallet data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadWalletData();
  }, [loadWalletData]);

  const handleTopUp = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add funds');
      return;
    }

    if (topUpAmount < 10 || topUpAmount > 500) {
      Alert.alert('Invalid amount', 'Top-up amount must be between 10 and 500 JOD');
      return;
    }

    setLoading(true);
    try {
      const result = await paymentService.addFunds(user.id, topUpAmount, 'JOD');
      if (result.success) {
        Alert.alert('Success', `Added ${topUpAmount} JOD to your wallet`);
        await loadWalletData();
      } else {
        Alert.alert('Payment failed', result.error || 'Could not process payment');
      }
    } catch (error) {
      console.error('[Wallet] Top-up error:', error);
      Alert.alert('Error', 'Failed to process top-up');
    } finally {
      setLoading(false);
    }
  }, [loadWalletData, topUpAmount, user]);

  const handleWithdraw = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to withdraw funds');
      return;
    }

    if (balance.available < 10) {
      Alert.alert('Insufficient balance', 'Minimum withdrawal is 10 JOD');
      return;
    }

    Alert.alert(
      'Confirm withdrawal',
      `Withdraw ${balance.available.toFixed(2)} JOD to your bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await paymentService.withdrawFunds(user.id, balance.available);
              if (result.success) {
                Alert.alert('Withdrawal requested', 'Funds will arrive in 2-3 business days');
                await loadWalletData();
              } else {
                Alert.alert('Withdrawal failed', result.error || 'Could not process withdrawal');
              }
            } catch (error) {
              console.error('[Wallet] Withdrawal error:', error);
              Alert.alert('Error', 'Failed to process withdrawal');
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
            label={isOnline ? 'Live wallet' : 'Cached balance'}
            tone={isOnline ? colors.green : colors.amber}
            icon={isOnline ? 'wallet' : 'archive'}
          />
          <StatusPill
            label={`${paymentMethods.length} payment methods`}
            tone={paymentMethods.length > 0 ? colors.teal : colors.amber}
            icon="card"
          />
        </View>

        <SectionHeader
          eyebrow="Wasel wallet"
          title="Your balance & payments"
          body="Top up, withdraw, and manage your payment methods securely."
        />

        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow="Available balance"
            title={`${balance.available.toFixed(2)} ${balance.currency}`}
            body={`Pending: ${balance.pending.toFixed(2)} ${balance.currency} · Total: ${balance.total.toFixed(2)} ${balance.currency}`}
            tone="dark"
          />
        </PremiumPanel>

        <View style={styles.metrics}>
          <MetricTile
            label="Available"
            value={`${balance.available.toFixed(0)}`}
            tone={colors.green}
          />
          <MetricTile label="Pending" value={`${balance.pending.toFixed(0)}`} tone={colors.amber} />
        </View>

        {!user ? (
          <StateNotice
            icon="person"
            title="Sign in required"
            body="Access your wallet after signing in."
            tone={colors.amber}
          />
        ) : loading ? (
          <StateNotice
            icon="sync"
            title="Loading wallet"
            body="Fetching your balance and payment methods…"
            loading
            tone={colors.blue}
          />
        ) : null}

        <SectionHeader
          eyebrow="Quick actions"
          title="Add or withdraw funds"
          body="Top up your wallet or transfer money to your bank account."
        />

        <View style={styles.buttonRow}>
          <PrimaryButton
            label={`Top up ${topUpAmount} JOD`}
            icon="add-circle"
            tone={colors.green}
            onPress={handleTopUp}
            disabled={loading || !user}
            testID="topup-button"
          />
          <PrimaryButton
            label="Withdraw"
            icon="arrow-back"
            tone={colors.blue}
            onPress={handleWithdraw}
            disabled={loading || !user || balance.available < 10}
            testID="withdraw-button"
          />
        </View>

        <SectionHeader
          eyebrow="Payment methods"
          title="Your cards & accounts"
          body={
            defaultMethod
              ? `Default: ${defaultMethod.brand} •••• ${defaultMethod.last4}`
              : 'No payment methods added'
          }
        />

        {paymentMethods.length > 0 ? (
          paymentMethods.map(method => (
            <InfoCard
              key={method.id}
              icon={method.isDefault ? 'star' : 'card'}
              title={`${method.brand} •••• ${method.last4}`}
              body={`Expires ${method.expiryMonth}/${method.expiryYear}${method.isDefault ? ' · Default' : ''}`}
              tone={method.isDefault ? colors.gold : colors.teal}
            />
          ))
        ) : (
          <StateNotice
            icon="card-outline"
            title="No payment methods"
            body="Add a card or bank account to enable payments."
            tone={colors.muted}
          />
        )}

        <PrimaryButton
          label="Manage payment methods"
          icon="settings"
          tone={colors.teal}
          onPress={() => navigation.navigate('PaymentMethods')}
          testID="manage-payments-button"
        />

        <PrimaryButton
          label="Refresh wallet"
          icon="refresh"
          tone={colors.blue}
          onPress={loadWalletData}
          disabled={loading}
          testID="refresh-wallet-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="Secure payments"
          body="All transactions are encrypted and processed through Stripe with PCI-DSS compliance."
          tone={colors.green}
        />
        <InfoCard
          icon="lock-closed"
          title="Instant top-ups"
          body="Funds are added to your wallet immediately and available for ride bookings."
          tone={colors.teal}
        />
        <InfoCard
          icon="time"
          title="Fast withdrawals"
          body="Bank transfers typically arrive within 2-3 business days."
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
