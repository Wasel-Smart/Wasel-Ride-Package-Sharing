import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
import { paymentService, createTopUpSession } from '../services/payments';
import { mobileAuth } from '../services/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../theme';

const WalletScreen = React.memo(function WalletScreen() {
  const { t, language } = useLanguage();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'info' | 'error'; message: string } | null>(null);

  const userId = mobileAuth.getUser()?.id ?? '';
  const numericAmount = Number(amount);
  const paymentReady = waselMobileConfig.hasFunctions;
  const validPayment = useMemo(
    () => Number.isFinite(numericAmount) && numericAmount >= 10,
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

  // Checkout happens in the system browser and settles server-side, so the balance on
  // screen goes stale. Re-read it whenever the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') void loadBalance();
    });
    return () => subscription.remove();
  }, [loadBalance]);

  const startPayment = useCallback(async () => {
    if (!validPayment) {
      Alert.alert(t('wallet.validAmount'), t('wallet.validAmountMsg'));
      return;
    }

    if (!userId) {
      Alert.alert(t('wallet.signInRequired'), t('wallet.signInRequired'));
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      const session = await createTopUpSession({ userId, amount: numericAmount });

      if (!session.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }

      // createTopUpSession has already handed the URL to the system browser.
      const message = t('wallet.openingCheckout');
      setStatus({ kind: 'info', message });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: 'error', message });
      Alert.alert(t('wallet.paymentFailed'), message);
    } finally {
      setLoading(false);
    }
  }, [numericAmount, userId, validPayment, t]);

  return (
    <ScreenShell testID="wallet-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <StatusPill
            label={paymentReady ? t('wallet.apiReady') : t('wallet.apiUrlMissing')}
            tone={paymentReady ? colors.green : colors.amber}
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
            testID="wallet-balance"
          />
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
            icon={status.kind === 'info' ? 'checkmark-circle' : 'warning'}
            title={t('wallet.paymentStatus')}
            body={status.message}
            tone={status.kind === 'info' ? colors.green : colors.red}
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
    borderRadius: 16,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
});

export default WalletScreen;
