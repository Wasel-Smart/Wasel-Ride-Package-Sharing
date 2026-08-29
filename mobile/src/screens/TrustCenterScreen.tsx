import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
import { apiClient } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, radii, spacing } from '../theme';

type TrustStepState = 'not_started' | 'in_progress' | 'completed' | 'failed';

interface TrustStep {
  id: string;
  state: TrustStepState;
  detail: string;
  failureReason: string | null;
  meta?: Record<string, unknown>;
}

interface TrustStatus {
  completedSteps: number;
  totalSteps: number;
  nextStepId: string | null;
  steps: {
    identity: TrustStep;
    email: TrustStep;
    phone: TrustStep;
    driverDocuments: TrustStep;
    walletStanding: TrustStep;
  };
}

const stepMeta: Record<string, { icon: string; labelKey: string }> = {
  identity: { icon: 'shield-checkmark', labelKey: 'trustCenter.identity' },
  email: { icon: 'mail', labelKey: 'trustCenter.email' },
  phone: { icon: 'call', labelKey: 'trustCenter.phone' },
  driverDocuments: { icon: 'document-text', labelKey: 'trustCenter.driverDocuments' },
  walletStanding: { icon: 'wallet', labelKey: 'trustCenter.walletStanding' },
};

const accentByState: Record<TrustStepState, string> = {
  completed: colors.green,
  in_progress: colors.cyan,
  not_started: colors.gold,
  failed: colors.red,
};

const TrustCenterScreen = React.memo(function TrustCenterScreen() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const [status, setStatus] = useState<TrustStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [identityRef, setIdentityRef] = useState('');
  const [identityDocRef, setIdentityDocRef] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverDocRef, setDriverDocRef] = useState('');
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    setLoadingStatus(true);
    try {
      const response = await apiClient.request<{ status: TrustStatus }>('/trust/status');
      if (response.data?.status) {
        setStatus(response.data.status);
      } else {
        setStatus(buildLocalFallback(user));
      }
    } catch {
      setStatus(buildLocalFallback(user));
    } finally {
      setLoadingStatus(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const run = useCallback(async (key: string, work: () => Promise<void>) => {
    setActionKey(key);
    try {
      await work();
      await loadStatus();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert(language === 'ar' ? 'خطأ' : 'Error', message);
    } finally {
      setActionKey(null);
    }
  }, [language, loadStatus]);

  const handleStartPhone = useCallback(async () => {
    const normalized = phone.trim();
    if (!normalized) {
      Alert.alert(language === 'ar' ? 'تنبيه' : 'Notice', language === 'ar' ? 'أدخل رقم هاتف' : 'Enter a phone number');
      return;
    }
    await run('phone-start', async () => {
      const response = await apiClient.request('/trust/phone/start', {
        method: 'POST',
        body: { phoneNumber: normalized },
      });
      if (response.error) throw new Error(response.error);
    });
  }, [phone, run, language]);

  const handleConfirmPhone = useCallback(async () => {
    if (!phoneCode.trim()) {
      Alert.alert(language === 'ar' ? 'تنبيه' : 'Notice', language === 'ar' ? 'أدخل الكود' : 'Enter the verification code');
      return;
    }
    await run('phone-confirm', async () => {
      const response = await apiClient.request('/trust/phone/confirm', {
        method: 'POST',
        body: { code: phoneCode.trim() },
      });
      if (response.error) throw new Error(response.error);
    });
  }, [phoneCode, run, language]);

  const handleSubmitIdentity = useCallback(async () => {
    if (identityRef.trim().length < 6) {
      Alert.alert(language === 'ar' ? 'تنبيه' : 'Notice', language === 'ar' ? 'مرجع سند غير صالح' : 'Enter a valid Sanad reference');
      return;
    }
    await run('identity', async () => {
      const response = await apiClient.request('/trust/identity/submit', {
        method: 'POST',
        body: {
          providerReference: identityRef.trim(),
          documentReference: identityDocRef.trim() || undefined,
        },
      });
      if (response.error) throw new Error(response.error);
    });
  }, [identityRef, identityDocRef, run, language]);

  const handleEnableDriverMode = useCallback(async () => {
    await run('driver-mode', async () => {
      const response = await apiClient.request('/trust/driver-mode/enable', {
        method: 'POST',
      });
      if (response.error) throw new Error(response.error);
    });
  }, [run]);

  const handleSubmitDriverDocuments = useCallback(async () => {
    if (licenseNumber.trim().length < 6) {
      Alert.alert(language === 'ar' ? 'تنبيه' : 'Notice', language === 'ar' ? 'رقم رخصة غير صالح' : 'Enter a valid driver license number');
      return;
    }
    await run('driver-documents', async () => {
      const response = await apiClient.request('/trust/driver-documents/submit', {
        method: 'POST',
        body: {
          licenseNumber: licenseNumber.trim(),
          documentReference: driverDocRef.trim() || undefined,
        },
      });
      if (response.error) throw new Error(response.error);
    });
  }, [licenseNumber, driverDocRef, run, language]);

  if (loading && !status) {
    return (
      <ScreenShell testID="trust-center-screen">
        <StateNotice
          icon="shield-checkmark"
          title={t('trustCenter.loading')}
          loading
          tone={colors.cyan}
        />
      </ScreenShell>
    );
  }

  const effective = status ?? buildLocalFallback(user);
  const nextStep = effective?.nextStepId;

  return (
    <ScreenShell testID="trust-center-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PremiumPanel tone="dark">
          <SectionHeader
            eyebrow={t('trustCenter.eyebrow')}
            title={t('trustCenter.title')}
            body={
              effective
                ? nextStep
                  ? t('trustCenter.remainingChecks', {
                      remaining: String(effective.totalSteps - effective.completedSteps),
                    })
                  : t('trustCenter.allResolved')
                : t('trustCenter.loading')
            }
            tone="dark"
          />
          <View style={styles.metricRow}>
            <MetricTile
              label={`${effective?.completedSteps ?? 0}/${effective?.totalSteps ?? 5}`}
              value={language === 'ar' ? 'مكتمل' : 'complete'}
              tone={colors.cyan}
            />
            <MetricTile
              label={t('profile.stats.rating')}
              value="—"
              tone={colors.gold}
            />
          </View>
        </PremiumPanel>

        <View style={styles.stepList}>
          {Object.entries(effective?.steps ?? {}).map(([stepId, step]) => {
            const meta = stepMeta[stepId] ?? { icon: 'help-circle', labelKey: stepId };
            const accent = accentByState[step.state] ?? colors.gold;
            const isNext = stepId === nextStep;

            return (
              <View
                key={stepId}
                style={[
                  styles.stepCard,
                  { borderColor: `${accent}30`, backgroundColor: `${accent}08` },
                ]}
              >
                <View style={styles.stepHeader}>
                  <View style={styles.stepTitleRow}>
                    <View style={[styles.stepIcon, { backgroundColor: `${accent}18` }]}>
                      <Text style={[styles.stepIconText, { color: accent }]}>
                        {meta.icon?.[0] ?? '●'}
                      </Text>
                    </View>
                    <View style={styles.stepTitleCopy}>
                      <Text style={styles.stepTitle}>{t(meta.labelKey)}</Text>
                      <Text style={styles.stepDetail}>{step.detail}</Text>
                    </View>
                  </View>
                  <StatusPill
                    label={
                      step.state === 'completed'
                        ? t('trustCenter.completed')
                        : step.state === 'in_progress'
                          ? t('trustCenter.inProgress')
                          : step.state === 'failed'
                            ? t('trustCenter.failed')
                            : t('trustCenter.notStarted')
                    }
                    tone={accent}
                  />
                </View>

                {step.failureReason ? (
                  <View style={[styles.failureBox, { borderColor: `${colors.red}30`, backgroundColor: `${colors.red}10` }]}>
                    <Text style={[styles.failureText, { color: colors.red }]}>{step.failureReason}</Text>
                  </View>
                ) : null}

                {isNext && stepId === 'email' && (
                  <PrimaryButton
                    label={
                      step.state === 'completed'
                        ? t('trustCenter.completed')
                        : language === 'ar' ? 'إرسال رابط التأكيد' : 'Send confirmation'
                    }
                    tone={colors.cyan}
                    disabled={step.state === 'completed'}
                    onPress={() => {}}
                    testID="trust-email-action"
                  />
                )}

                {isNext && stepId === 'phone' && (
                  <View style={styles.actionStack}>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+962791234567"
                      keyboardType="phone-pad"
                      style={styles.input}
                      placeholderTextColor={colors.muted}
                    />
                    <PrimaryButton
                      label={step.state === 'in_progress' ? t('trustCenter.resendCode') : t('trustCenter.sendCode')}
                      tone={colors.cyan}
                      disabled={actionKey === 'phone-start'}
                      loading={actionKey === 'phone-start'}
                      onPress={handleStartPhone}
                      testID="trust-phone-start"
                    />
                    {step.state === 'in_progress' && (
                      <View style={styles.actionStack}>
                        <TextInput
                          value={phoneCode}
                          onChangeText={setPhoneCode}
                          placeholder={t('trustCenter.enterCode')}
                          keyboardType="number-pad"
                          style={styles.input}
                          placeholderTextColor={colors.muted}
                        />
                        <PrimaryButton
                          label={t('trustCenter.confirmPhone')}
                          tone={colors.cyan}
                          disabled={actionKey === 'phone-confirm'}
                          loading={actionKey === 'phone-confirm'}
                          onPress={handleConfirmPhone}
                          testID="trust-phone-confirm"
                        />
                      </View>
                    )}
                  </View>
                )}

                {isNext && stepId === 'identity' && (
                  <View style={styles.actionStack}>
                    <TextInput
                      value={identityRef}
                      onChangeText={setIdentityRef}
                      placeholder={language === 'ar' ? 'مرجع سند أو رقم الجلسة' : 'Sanad reference or session id'}
                      style={styles.input}
                      placeholderTextColor={colors.muted}
                    />
                    <TextInput
                      value={identityDocRef}
                      onChangeText={setIdentityDocRef}
                      placeholder={language === 'ar' ? 'مرجع المستند (اختياري)' : 'Document reference (optional)'}
                      style={styles.input}
                      placeholderTextColor={colors.muted}
                    />
                    <PrimaryButton
                      label={step.state === 'failed' ? t('trustCenter.resubmit') : t('trustCenter.submitReview')}
                      tone={colors.cyan}
                      disabled={actionKey === 'identity'}
                      loading={actionKey === 'identity'}
                      onPress={handleSubmitIdentity}
                      testID="trust-identity-submit"
                    />
                  </View>
                )}

                {isNext && stepId === 'driverDocuments' && (
                  <View style={styles.actionStack}>
                    {effective.steps.driverDocuments.meta?.role !== 'driver' && effective.steps.driverDocuments.meta?.role !== 'both' ? (
                      <PrimaryButton
                        label={t('trustCenter.enableDriverMode')}
                        tone={colors.cyan}
                        disabled={actionKey === 'driver-mode'}
                        loading={actionKey === 'driver-mode'}
                        onPress={handleEnableDriverMode}
                        testID="trust-driver-mode"
                      />
                    ) : (
                      <>
                        <TextInput
                          value={licenseNumber}
                          onChangeText={setLicenseNumber}
                          placeholder={t('trustCenter.licenseNumber')}
                          style={styles.input}
                          placeholderTextColor={colors.muted}
                        />
                        <TextInput
                          value={driverDocRef}
                          onChangeText={setDriverDocRef}
                          placeholder={t('trustCenter.documentReference')}
                          style={styles.input}
                          placeholderTextColor={colors.muted}
                        />
                        <PrimaryButton
                          label={step.state === 'failed' ? t('trustCenter.resubmit') : t('trustCenter.submitDocuments')}
                          tone={colors.cyan}
                          disabled={actionKey === 'driver-documents'}
                          loading={actionKey === 'driver-documents'}
                          onPress={handleSubmitDriverDocuments}
                          testID="trust-driver-documents"
                        />
                      </>
                    )}
                  </View>
                )}

                {isNext && stepId === 'walletStanding' && (
                  <View style={styles.actionStack}>
                    <PrimaryButton label={t('trustCenter.openWallet')} tone={colors.teal} onPress={() => {}} testID="trust-wallet" />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <PrimaryButton
          label={t('trustCenter.refresh')}
          variant="outline"
          loading={loadingStatus}
          onPress={loadStatus}
          testID="trust-refresh"
        />
      </ScrollView>
    </ScreenShell>
  );
});

function buildLocalFallback(user: { role?: string; emailVerified?: boolean; phoneVerified?: boolean; walletStatus?: string } | null): TrustStatus {
  const role = user?.role ?? 'rider';
  const emailVerified = user?.emailVerified ?? false;
  const phoneVerified = user?.phoneVerified ?? false;
  const walletStatus = user?.walletStatus ?? 'active';
  const steps = {
    identity: {
      id: 'identity',
      state: (user?.emailVerified || user?.phoneVerified) ? 'not_started' : 'not_started',
      detail: 'Submit Sanad verification to continue.',
      failureReason: null,
    } as TrustStep,
    email: {
      id: 'email',
      state: user?.emailVerified ? 'completed' : 'not_started',
      detail: user?.emailVerified ? 'Email is verified.' : 'Email confirmation is still required.',
      failureReason: null,
    } as TrustStep,
    phone: {
      id: 'phone',
      state: user?.phoneVerified ? 'completed' : 'not_started',
      detail: user?.phoneVerified ? 'Phone number is verified.' : 'Send a verification code to confirm this phone number.',
      failureReason: null,
    } as TrustStep,
    driverDocuments: {
      id: 'driverDocuments',
      state: 'not_started',
      detail: 'Enable Driver mode before submitting driver documents.',
      failureReason: null,
    } as TrustStep,
    walletStanding: {
      id: 'walletStanding',
      state: user?.walletStatus === 'active' ? 'completed' : 'failed',
      detail: user?.walletStatus === 'active' ? 'Wallet standing is healthy.' : `Wallet standing is ${user?.walletStatus ?? 'unavailable'}.`,
      failureReason: user?.walletStatus && user?.walletStatus !== 'active' ? `Wallet is ${user?.walletStatus}.` : null,
    } as TrustStep,
  };

  const all = Object.values(steps);
  const completed = all.filter(s => s.state === 'completed').length;
  const ordered = [steps.identity, steps.email, steps.phone, steps.driverDocuments, steps.walletStanding];
  const next = ordered.find(s => s.state !== 'completed') ?? null;

  return {
    completedSteps: completed,
    totalSteps: all.length,
    nextStepId: next?.id ?? null,
    steps,
  };
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stepList: {
    gap: spacing.md,
  },
  stepCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconText: {
    fontSize: 18,
    fontWeight: '900',
  },
  stepTitleCopy: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  stepDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  failureBox: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  failureText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionStack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
});

export default TrustCenterScreen;
