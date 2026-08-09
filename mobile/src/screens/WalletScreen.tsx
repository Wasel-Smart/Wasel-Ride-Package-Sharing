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
import { useLanguage } from '../contexts/LanguageContext';
import { colors, radii, spacing } from '../theme';

const WalletScreen = React.memo(function WalletScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { t, language } = useLanguage();
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
      Alert.alert(t('wallet.validAmount'), t('wallet.validAmount'));
      return;
    }

    if (!userId) {
      Alert.alert(t('wallet.signInRequired'), t('wallet.signInRequired'));
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

      const message = t('wallet.paymentCompleted');
      setStatus(message);
      Alert.alert(t('wallet.paymentCompleted'), message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(message);
      Alert.alert(t('wallet.paymentFailed'), message);
    } finally {
      setLoading(false);
    }
  }, [initPaymentSheet, numericAmount, presentPaymentSheet, userId, validPayment, t]);

  return (
    <ScreenShell testID="wallet-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={waselMobileConfig.hasStripe ? t('wallet.stripeReady') : t('wallet.stripeKeyMissing')}
            tone={waselMobileConfig.hasStripe ? colors.green : colors.amber}
            icon={waselMobileConfig.hasStripe ? 'card' : 'warning'}
          />
          <StatusPill
            label={waselMobileConfig.hasFunctions ? t('wallet.apiReady') : t('wallet.apiUrlMissing')}
            tone={waselMobileConfig.hasFunctions ? colors.green : colors.amber}
          />
        </View>

        <SectionHeader
          eyebrow={t('wallet.eyebrow')}
          title={t('wallet.title')}
          body={t('wallet.subtitle')}
        />

        <View style={styles.metrics}>
          <MetricTile label={t('wallet.currency')} value="JOD" tone={colors.gold} />
          <MetricTile
            label={t('wallet.balance')}
            value={balance === null ? '—' : `${balance.toFixed(2)}`}
            tone={colors.teal}
          />
          <MetricTile label={t('wallet.mode')} value={paymentReady ? t('wallet.live') : t('wallet.setup')} tone={paymentReady ? colors.teal : colors.amber} />
        </View>

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel={t('wallet.amountAccessibility')}
              keyboardType="decimal-pad"
              onChangeText={setAmount}
              placeholder={t('wallet.amountPlaceholder')}
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
            title={t('wallet.paymentSetupIncomplete')}
            body={t('wallet.paymentSetupBody')}
            tone={colors.amber}
          />
        ) : null}

        {status ? (
          <StateNotice
            icon={status.includes('completed') ? 'checkmark-circle' : 'warning'}
            title={t('wallet.paymentStatus')}
            body={status}
            tone={status.includes('completed') ? colors.green : colors.red}
          />
        ) : null}

        <PrimaryButton
          label={t('wallet.openPaymentSheet')}
          icon="card"
          loading={loading}
          disabled={!paymentReady || !validPayment}
          onPress={startPayment}
          testID="open-payment-sheet"
        />

        <InfoCard
          icon="shield-checkmark"
          title={t('wallet.serverAuthorized')}
          body={t('wallet.serverAuthorizedBody')}
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
