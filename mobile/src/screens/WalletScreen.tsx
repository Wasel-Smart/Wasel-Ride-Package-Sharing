import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

import {
  InfoCard,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { waselMobileConfig } from '../lib/config';
import { createMobilePaymentSheet } from '../services/payments';
import { colors, spacing } from '../theme';

const WalletScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    const numericAmount = Number(amount);
    if (!bookingId.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert('Payment details required', 'Enter a valid booking id and amount.');
      return;
    }

    try {
      setLoading(true);
      const sheet = await createMobilePaymentSheet({
        bookingId: bookingId.trim(),
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

      Alert.alert('Payment complete', `Payment intent ${sheet.paymentIntentId} completed.`);
    } catch (error) {
      Alert.alert('Payment failed', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

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
          title="Mobile payment"
          body="Stripe PaymentSheet is initialized from the Supabase payment function and confirms the booking payment natively."
        />

        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            placeholder="Booking ID"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={bookingId}
            onChangeText={setBookingId}
          />
          <TextInput
            keyboardType="decimal-pad"
            placeholder="Amount JOD"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        <PrimaryButton
          label="Open Stripe PaymentSheet"
          icon="card"
          loading={loading}
          disabled={!waselMobileConfig.hasStripe || !waselMobileConfig.hasFunctions}
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
};

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});

export default WalletScreen;
