import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  InlineStat,
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
import { colors, radii, spacing, typography } from '../theme';

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

const stepMeta: Record<string, { icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  identity: { icon: 'shield-checkmark', labelKey: 'trustCenterExpanded.identity' },
  email: { icon: 'mail', labelKey: 'trustCenterExpanded.email' },
  phone: { icon: 'call', labelKey: 'trustCenterExpanded.phone' },
  driverDocuments: { icon: 'document-text', labelKey: 'trustCenterExpanded.driverDocuments' },
  walletStanding: { icon: 'wallet', labelKey: 'trustCenterExpanded.walletStanding' },
};

const accentByState: Record<TrustStepState, string> = {
  completed: colors.green,
  in_progress: colors.cyan,
  not_started: colors.gold,
  failed: colors.red,
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

const TrustCenterScreen = React.memo(function TrustCenterScreen() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const [status, setStatus] = useState<TrustStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [identityRef, setIdentityRef] = useState('');
  const [identityDocRef, setIdentityDocRef] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverDocRef, setDriverDocRef] = useState('');
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

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
      Alert.alert(isRTL ? 'خطأ' : 'Error', message);
    } finally {
      setActionKey(null);
    }
  }, [isRTL, loadStatus]);

  const validatePhone = useCallback((value: string) => {
    if (!value.trim()) return t('trustCenterExpanded.validationRequired');
    if (!/^\+?[0-9\s-]{7,15}$/.test(value.trim())) return t('trustCenterExpanded.validationInvalidPhone');
    return null;
  }, [t]);

  const validateIdentity = useCallback((value: string) => {
    if (!value.trim()) return t('trustCenterExpanded.validationRequired');
    if (value.trim().length < 6) return t('trustCenterExpanded.validationTooShort').replace('{min}', '6');
    return null;
  }, [t]);

  const validateLicense = useCallback((value: string) => {
    if (!value.trim()) return t('trustCenterExpanded.validationRequired');
    if (value.trim().length < 6) return t('trustCenterExpanded.validationTooShort').replace('{min}', '6');
    return null;
  }, [t]);

  const handleStartPhone = useCallback(async () => {
    const phoneError = validatePhone(phone);
    setErrors((prev) => ({ ...prev, phone: phoneError }));
    if (phoneError) return;

    await run('phone-start', async () => {
      const response = await apiClient.request('/trust/phone/start', {
        method: 'POST',
        body: { phoneNumber: phone.trim() },
      });
      if (response.error) throw new Error(response.error);
    });
  }, [phone, run, validatePhone]);

  const handleConfirmPhone = useCallback(async () => {
    if (!phoneCode.trim()) {
      setErrors((prev) => ({ ...prev, phoneCode: t('trustCenterExpanded.validationRequired') }));
      return;
    }
    setErrors((prev) => ({ ...prev, phoneCode: null }));

    await run('phone-confirm', async () => {
      const response = await apiClient.request('/trust/phone/confirm', {
        method: 'POST',
        body: { code: phoneCode.trim() },
      });
      if (response.error) throw new Error(response.error);
      setPhoneCode('');
    });
  }, [phoneCode, run]);

  const handleSubmitIdentity = useCallback(async () => {
    const identityError = validateIdentity(identityRef);
    setErrors((prev) => ({ ...prev, identityRef: identityError }));
    if (identityError) return;

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
  }, [identityRef, identityDocRef, run, validateIdentity]);

  const handleEnableDriverMode = useCallback(async () => {
    await run('driver-mode', async () => {
      const response = await apiClient.request('/trust/driver-mode/enable', {
        method: 'POST',
      });
      if (response.error) throw new Error(response.error);
    });
  }, [run]);

  const handleSubmitDriverDocuments = useCallback(async () => {
    const licenseError = validateLicense(licenseNumber);
    setErrors((prev) => ({ ...prev, licenseNumber: licenseError }));
    if (licenseError) return;

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
  }, [licenseNumber, driverDocRef, run, validateLicense]);

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
  const isNewUser = effective && effective.completedSteps === 0 && nextStep !== null;
  const isRider = user?.role === 'rider';

  const capabilityRows = [
    { title: t('trustCenterExpanded.postRides'), allowed: user?.role === 'driver' || user?.role === 'both' },
    { title: t('trustCenterExpanded.carryPackages'), allowed: user?.role === 'driver' || user?.role === 'both' },
    { title: t('trustCenterExpanded.receivePayouts'), allowed: true },
    { title: t('trustCenterExpanded.prioritySupport'), allowed: (user?.trustScore ?? 0) >= 70 },
  ];

  const walletStep = effective?.steps.walletStanding;
  const walletTone = walletStep?.state === 'completed' ? colors.green : colors.red;
  const walletLabel = walletStep?.state === 'completed' ? t('trustCenterExpanded.active') : t('trustCenterExpanded.unavailable');

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
                  ? t('trustCenter.remainingChecks', { remaining: String(effective.totalSteps - effective.completedSteps) })
                  : t('trustCenter.allResolved')
                : t('trustCenter.loading')
            }
            tone="dark"
          />
          <View style={styles.metricRow}>
            <MetricTile
              label={t('trustCenterExpanded.checksDone')}
              value={`${effective?.completedSteps ?? 0}/${effective?.totalSteps ?? 5}`}
              tone={colors.cyan}
            />
            <MetricTile
              label={t('trustCenterExpanded.trustScore')}
              value={`${user?.trustScore ?? 0}`}
              tone={colors.green}
            />
            <MetricTile
              label={t('trustCenterExpanded.walletStatus')}
              value={walletLabel}
              tone={walletTone}
            />
          </View>
        </PremiumPanel>

        {isNewUser && !onboardingDismissed && (
          <View style={[styles.onboardingCard, { borderColor: `${colors.cyan}40`, backgroundColor: `${colors.cyan}12` }]}>
            <Text style={[styles.onboardingTitle, { color: colors.cyan }]}>
              {t('trustCenterExpanded.onboardingTitle')}
            </Text>
            <Text style={[styles.onboardingBody, { color: colors.textSecondary }]}>
              {t('trustCenterExpanded.onboardingSubtitle')}
            </Text>
            <View style={styles.onboardingActions}>
              <PrimaryButton
                label={t('trustCenterExpanded.onboardingStartButton')}
                tone={colors.cyan}
                onPress={() => {
                  setOnboardingDismissed(true);
                }}
                testID="trust-onboarding-start"
              />
              <PrimaryButton
                label={t('trustCenterExpanded.onboardingDismissButton')}
                variant="outline"
                tone={colors.textMuted}
                onPress={() => setOnboardingDismissed(true)}
                testID="trust-onboarding-dismiss"
              />
            </View>
          </View>
        )}

        {!isRider && (
          <View style={[styles.capabilityCard, { borderColor: colors.line }]}>
            <Text style={[styles.capabilityTitle, { color: colors.textPrimary }]}>
              {t('trustCenterExpanded.capabilityMatrixTitle')}
            </Text>
            {capabilityRows.map((cap) => (
              <View key={cap.title} style={styles.capabilityRow}>
                <Text style={[styles.capabilityLabel, { color: colors.textSecondary }]}>{cap.title}</Text>
                <StatusPill
                  label={cap.allowed ? t('trustCenterExpanded.open') : t('trustCenterExpanded.locked')}
                  tone={cap.allowed ? colors.green : colors.cyan}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.stepList}>
          {Object.entries(effective?.steps ?? {}).map(([stepId, step]) => {
            if (isRider && stepId === 'driverDocuments') return null;
            const meta = stepMeta[stepId] ?? { icon: 'help-circle', labelKey: stepId };
            const accent = accentByState[step.state] ?? colors.gold;
            const isNext = stepId === nextStep;

            return (
              <View
                key={stepId}
                style={[
                  styles.stepCard,
                  { borderColor: `${accent}30`, backgroundColor: `${accent}12` },
                ]}
              >
                <View style={styles.stepHeader}>
                  <View style={styles.stepTitleRow}>
                    <View style={[styles.stepIcon, { backgroundColor: `${accent}18` }]}>
                      <Ionicons name={meta.icon} size={18} color={accent} />
                    </View>
                    <View style={styles.stepTitleCopy}>
                      <Text style={styles.stepTitle}>{t(meta.labelKey)}</Text>
                      <Text style={styles.stepDetail}>{step.detail}</Text>
                    </View>
                  </View>
                  <StatusPill
                    label={
                      step.state === 'completed'
                        ? t('trustCenterExpanded.completed')
                        : step.state === 'in_progress'
                          ? t('trustCenterExpanded.inProgress')
                          : step.state === 'failed'
                            ? t('trustCenterExpanded.failed')
                            : t('trustCenterExpanded.notStarted')
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
                        ? t('trustCenterExpanded.confirmed')
                        : t('trustCenterExpanded.sendConfirmation')
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
                      style={[styles.input, errors.phone ? { borderColor: colors.error } : {}]}
                      placeholderTextColor={colors.muted}
                    />
                    {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
                    <PrimaryButton
                      label={step.state === 'in_progress' ? t('trustCenterExpanded.resendCode') : t('trustCenterExpanded.sendCode')}
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
                          placeholder={t('trustCenterExpanded.enterVerificationCode')}
                          keyboardType="number-pad"
                          style={[styles.input, errors.phoneCode ? { borderColor: colors.error } : {}]}
                          placeholderTextColor={colors.muted}
                        />
                        {errors.phoneCode ? <Text style={styles.errorText}>{errors.phoneCode}</Text> : null}
                        <PrimaryButton
                          label={t('trustCenterExpanded.confirmPhone')}
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
                      placeholder={t('trustCenterExpanded.sanadReference')}
                      style={[styles.input, errors.identityRef ? { borderColor: colors.error } : {}]}
                      placeholderTextColor={colors.muted}
                    />
                    {errors.identityRef ? <Text style={styles.errorText}>{errors.identityRef}</Text> : null}
                    <TextInput
                      value={identityDocRef}
                      onChangeText={setIdentityDocRef}
                      placeholder={t('trustCenterExpanded.documentReferenceOptional')}
                      style={styles.input}
                      placeholderTextColor={colors.muted}
                    />
                    <PrimaryButton
                      label={step.state === 'failed' ? t('trustCenterExpanded.resubmit') : t('trustCenterExpanded.submitForReview')}
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
                        label={t('trustCenterExpanded.enableDriverMode')}
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
                          placeholder={t('trustCenterExpanded.driverLicenseNumber')}
                          style={[styles.input, errors.licenseNumber ? { borderColor: colors.error } : {}]}
                          placeholderTextColor={colors.muted}
                        />
                        {errors.licenseNumber ? <Text style={styles.errorText}>{errors.licenseNumber}</Text> : null}
                        <TextInput
                          value={driverDocRef}
                          onChangeText={setDriverDocRef}
                          placeholder={t('trustCenterExpanded.documentReferenceOptional')}
                          style={styles.input}
                          placeholderTextColor={colors.muted}
                        />
                        <PrimaryButton
                          label={step.state === 'failed' ? t('trustCenterExpanded.resubmit') : t('trustCenterExpanded.submitDocuments')}
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
                    <PrimaryButton label={t('trustCenterExpanded.openWallet')} tone={colors.teal} onPress={() => {}} testID="trust-wallet" />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <PrimaryButton
          label={t('trustCenter.refresh')}
          variant="outline"
          tone={colors.textMuted}
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
      state: 'not_started' as TrustStepState,
      detail: 'Submit Sanad verification to continue.',
      failureReason: null,
    },
    email: {
      id: 'email',
      state: emailVerified ? 'completed' : 'not_started',
      detail: emailVerified ? 'Email is verified.' : 'Email confirmation is still required.',
      failureReason: null,
    },
    phone: {
      id: 'phone',
      state: phoneVerified ? 'completed' : 'not_started',
      detail: phoneVerified ? 'Phone number is verified.' : 'Send a verification code to confirm this phone number.',
      failureReason: null,
    },
    driverDocuments: {
      id: 'driverDocuments',
      state: 'not_started' as TrustStepState,
      detail: 'Enable Driver mode before submitting driver documents.',
      failureReason: null,
    } as TrustStep,
    walletStanding: {
      id: 'walletStanding',
      state: walletStatus === 'active' ? 'completed' : 'failed',
      detail: walletStatus === 'active' ? 'Wallet standing is healthy.' : `Wallet standing is ${walletStatus}.`,
      failureReason: walletStatus && walletStatus !== 'active' ? `Wallet is ${walletStatus}.` : null,
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
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  onboardingCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  onboardingTitle: {
    ...typography.subtitle,
    fontWeight: '700',
  },
  onboardingBody: {
    ...typography.body,
    lineHeight: 22,
  },
  onboardingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  capabilityCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  capabilityTitle: {
    ...typography.subtitle,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  capabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  capabilityLabel: {
    ...typography.body,
    fontSize: 14,
  },
});

export default TrustCenterScreen;
