import React, { useCallback, useMemo, useState } from 'react';
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
import { createMobilePaymentSheet } from '../services/payments';
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

  const startPayment = useCallback(async () => {
    if (!validPayment) {
      Alert.alert('Payment details required', 'Enter a valid amount.');
      return;
    }

    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to add funds.');
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
      Alert.alert('Payment complete', message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      Alert.alert('Payment failed', message);
    } finally {
      setLoading(false);
    }
  }, [bookingId, initPaymentSheet, numericAmount, presentPaymentSheet, validPayment]);

  return (
    <ScreenShell testID="wallet-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={waselMobileConfig.hasStripe ? 'Stripe ready' : 'Stripe key missing'}
            tone={waselMobileConfig.hasStripe ? colors.green : colors.amber}
            icon={waselMobileConfig.hasStripe ? 'card' : 'warning'}
          />
          <StatusPill
            label={waselMobileConfig.hasFunctions ? 'API ready' : 'API URL missing'}
            tone={waselMobileConfig.hasFunctions ? colors.green : colors.amber}
          />
        </View>

        <SectionHeader
          eyebrow="Wallet"
          title="Secure mobile payment"
          body="Stripe PaymentSheet is initialized from the authenticated backend and confirmed inside the native app."
        />

        <View style={styles.metrics}>
          <MetricTile label="Currency" value="JOD" tone={colors.gold} />
          <MetricTile label="Mode" value={paymentReady ? 'Live' : 'Setup'} tone={paymentReady ? colors.teal : colors.amber} />
        </View>

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Booking ID"
              autoCapitalize="none"
              onChangeText={setBookingId}
              placeholder="Booking ID"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              value={bookingId}
            />
            <TextInput
              accessibilityLabel="Amount in JOD"
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              placeholder="Amount JOD"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={amount}
            />
          </View>
        </PremiumPanel>

        {!paymentReady ? (
          <StateNotice
            icon="warning"
            title="Payment setup incomplete"
            body="Stripe publishable key and Supabase function URL are required before native checkout can open."
            tone={colors.amber}
          />
        ) : null}

        {status ? (
          <StateNotice
            icon={status.includes('completed') ? 'checkmark-circle' : 'warning'}
            title="Payment status"
            body={status}
            tone={status.includes('completed') ? colors.green : colors.red}
          />
        ) : null}

        <PrimaryButton
          label="Open Stripe PaymentSheet"
          icon="card"
          loading={loading}
          disabled={!paymentReady || !validPayment}
          onPress={startPayment}
          testID="open-payment-sheet"
        />

        <InfoCard
          icon="shield-checkmark"
          title="Server-authorized payment"
          body="The mobile app never creates Stripe intents directly; it requests a client secret from the authenticated backend function."
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
