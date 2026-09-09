import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileCheck,
  Headphones,
  MailCheck,
  Package,
  Shield,
  Wallet,
} from 'lucide-react';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { WaselDialog, WaselInput, WaselLogo } from '../../components/wasel-ui';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import {
  FailureNotice,
  ReviewTimeline,
  StepCard,
  TrustActionRow,
  TrustOnboarding,
  TrustScoreDisplay,
  TrustScoreExplanation,
  TrustSkeleton,
  VerificationSteps,
  stateAccent,
} from './components';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  confirmTrustPhoneVerification,
  enableTrustDriverMode,
  fetchReviewHistory,
  getTrustCenterStatus,
  resendTrustEmailConfirmation,
  startTrustPhoneVerification,
  submitTrustDriverDocuments,
  submitTrustIdentityVerification,
} from '../../services/trustCenter';
import {
  buildFallbackTrustCenterStatus,
  type ReviewHistoryItem,
  type TrustCenterStatus,
  type TrustStepState,
} from '../../services/trustCenterModel';
import { evaluateTrustCapability } from '../../services/trustRules';
import { C, F, GRAD_AURORA, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {return error.message;}
  return 'Trust Center request failed.';
}

function isNewUser(status: TrustCenterStatus | null): boolean {
  if (!status) {return false;}
  return status.completedSteps === 0 && status.nextStepId !== null;
}

function applyOptimisticStepUpdate(
  status: TrustCenterStatus,
  stepId: TrustStepState extends 'completed' ? 'identity' | 'email' | 'phone' | 'driver_documents' | 'wallet_standing' : string,
  newState: TrustStepState,
): TrustCenterStatus {
  const next = { ...status, steps: { ...status.steps } } as TrustCenterStatus;
  const stepKey = stepId as keyof TrustCenterStatus['steps'];
  if (stepKey in next.steps) {
    next.steps = {
      ...next.steps,
      [stepKey]: {
        ...next.steps[stepKey],
        state: newState,
      },
    };
  }
  const allSteps = Object.values(next.steps);
  next.completedSteps = allSteps.filter((s) => s.state === 'completed').length;
  next.totalSteps = allSteps.length;
  next.nextStepId = (() => {
    const ordered = [next.steps.phone, next.steps.email, next.steps.identity, next.steps.driverDocuments, next.steps.walletStanding];
    return ordered.find((s) => s.state !== 'completed')?.id ?? null;
  })();
  next.blockedSteps = allSteps.filter((s) => s.state === 'failed').map((s) => s.id);
  return next;
}

function getStepBadge(state: TrustStepState, t: (key: string) => string) {
  switch (state) {
    case 'completed':
      return { label: t('trustCenterExpanded.completed'), accent: C.green };
    case 'in_progress':
      return { label: t('trustCenterExpanded.inProgress'), accent: C.cyan };
    case 'failed':
      return { label: t('trustCenterExpanded.failed'), accent: C.error };
    default:
      return { label: t('trustCenterExpanded.notStarted'), accent: C.gold };
  }
}

function formatTimestamp(value?: string | null): string | null {
  if (!value) {return null;}
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {return null;}
  return date.toLocaleString();
}

function getTrustStepTitle(stepId: string | null, t: (key: string) => string): string {
  switch (stepId) {
    case 'identity':
      return t('trustCenterExpanded.identity');
    case 'email':
      return t('trustCenterExpanded.email');
    case 'phone':
      return t('trustCenterExpanded.phone');
    case 'driver_documents':
      return t('trustCenterExpanded.driverDocuments');
    case 'wallet_standing':
      return t('trustCenterExpanded.walletStanding');
    default:
      return t('trustCenterExpanded.ready');
  }
}

function getNextTrustStepDetail(
  status: TrustCenterStatus | null,
  t: (key: string) => string,
): string {
  if (!status?.nextStepId) {
    return t('trustCenterExpanded.allCapabilitiesReady');
  }

  switch (status.nextStepId) {
    case 'identity':
      return status.steps.identity.detail;
    case 'email':
      return status.steps.email.detail;
    case 'phone':
      return status.steps.phone.detail;
    case 'driver_documents':
      return status.steps.driverDocuments.detail;
    case 'wallet_standing':
      return status.steps.walletStanding.detail;
    default:
      return t('trustCenterExpanded.reviewFlowBelow');
  }
}

export default function TrustCenterPage() {
  const { language, t } = useLanguage();
  const { refreshProfile } = useAuth();
  const { user, updateUser } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const workflowRef = useRef<HTMLDivElement | null>(null);
  const identityRef = useRef<HTMLDivElement | null>(null);
  const contactRef = useRef<HTMLDivElement | null>(null);
  const documentsRef = useRef<HTMLDivElement | null>(null);
  const walletRef = useRef<HTMLDivElement | null>(null);

  const [trustStatus, setTrustStatus] = useState<TrustCenterStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [phoneCode, setPhoneCode] = useState('');
  const [identityReference, setIdentityReference] = useState('');
  const [identityDocumentReference, setIdentityDocumentReference] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverDocumentReference, setDriverDocumentReference] = useState('');
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => {} });
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const previousStatusRef = useRef<TrustCenterStatus | null>(null);

  const fallbackStatus = useMemo(
    () => (user ? buildFallbackTrustCenterStatus(user) : null),
    [user],
  );
  const effectiveStatus = trustStatus ?? fallbackStatus;

  useEffect(() => {
    setPhoneInput(user?.phone ?? '');
  }, [user?.phone]);

  useEffect(() => {
    if (!effectiveStatus) {return;}

    const providerReference = effectiveStatus.steps.identity.meta.providerReference;
    const documentReference = effectiveStatus.steps.identity.meta.documentReference;
    const existingLicense = effectiveStatus.steps.driverDocuments.meta.licenseNumber;

    if (providerReference && !identityReference) {setIdentityReference(providerReference);}
    if (documentReference && !identityDocumentReference) {
      setIdentityDocumentReference(documentReference);
    }
    if (existingLicense && !licenseNumber) {setLicenseNumber(existingLicense);}
  }, [effectiveStatus, identityDocumentReference, identityReference, licenseNumber]);

  const reloadTrustStatus = useCallback(async (silent = false) => {
    if (!user) {return;}
    if (!silent) {setStatusLoading(true);}

    try {
      const nextStatus = await getTrustCenterStatus(user);
      setTrustStatus(nextStatus);
      previousStatusRef.current = nextStatus;
    } catch (error) {
      const fallback = buildFallbackTrustCenterStatus(user);
      setTrustStatus(fallback);
      previousStatusRef.current = fallback;
      if (!silent) {
        console.warn('[Trust Center] Using fallback status:', error);
      }
    } finally {
      if (!silent) {setStatusLoading(false);}
      if (silent) {setInitialLoading(false);}
    }
  }, [user]);

  const loadReviewHistory = useCallback(async () => {
    try {
      const items = await fetchReviewHistory();
      setReviewHistory(items);
    } catch {
      setReviewHistory([]);
    }
  }, []);

  const emailBadge = useMemo(
    () => getStepBadge(effectiveStatus?.steps.email.state ?? 'not_started', t),
    [t, effectiveStatus?.steps.email.state],
  );
  const phoneBadge = useMemo(
    () => getStepBadge(effectiveStatus?.steps.phone.state ?? 'not_started', t),
    [t, effectiveStatus?.steps.phone.state],
  );

  useEffect(() => {
    if (!user) {
      setTrustStatus(null);
      setInitialLoading(false);
      setReviewHistory([]);
      return;
    }
    setInitialLoading(true);
    void reloadTrustStatus(true);
    void loadReviewHistory();
  }, [
    user?.id,
    user?.email,
    user?.phone,
    user?.emailVerified,
    user?.phoneVerified,
    user?.sanadVerified,
    user?.verified,
    user?.verificationLevel,
    user?.walletStatus,
    user?.role,
  ]);

  if (!user) {
    return <ProtectedPagePreview pathname="/app/trust" />;
  }

  const capabilityRows = [
    {
      title: t('trustCenterExpanded.postRides'),
      icon: <BadgeCheck size={18} />,
      gate: evaluateTrustCapability(user, 'offer_ride'),
    },
    {
      title: t('trustCenterExpanded.carryPackages'),
      icon: <Package size={18} />,
      gate: evaluateTrustCapability(user, 'carry_packages'),
    },
    {
      title: t('trustCenterExpanded.receivePayouts'),
      icon: <Wallet size={18} />,
      gate: evaluateTrustCapability(user, 'receive_payouts'),
    },
    {
      title: t('trustCenterExpanded.prioritySupport'),
      icon: <Headphones size={18} />,
      gate: evaluateTrustCapability(user, 'priority_support'),
    },
  ];
  const unlockedCount = capabilityRows.filter(item => item.gate.allowed).length;
  const lockedCapabilities = capabilityRows.filter(item => !item.gate.allowed);
  const walletStep = effectiveStatus?.steps.walletStanding;
  const walletTone =
    walletStep?.meta.walletStatus === 'closed'
      ? { label: t('trustCenterExpanded.closed'), color: C.error }
      : walletStep?.meta.walletStatus === 'frozen'
        ? { label: t('trustCenterExpanded.frozen'), color: C.error }
        : walletStep?.meta.walletStatus === 'limited'
          ? { label: t('trustCenterExpanded.limited'), color: C.gold }
          : walletStep?.meta.walletStatus === 'unavailable'
            ? { label: t('trustCenterExpanded.unavailable'), color: C.error }
            : { label: t('trustCenterExpanded.active'), color: C.green };
  const heroAccent = effectiveStatus?.blockedSteps.length
    ? C.error
    : effectiveStatus?.nextStepId
      ? C.cyan
      : C.green;
  const heroLabel = effectiveStatus?.blockedSteps.length
    ? t('trustCenterExpanded.needsReview')
    : effectiveStatus?.nextStepId
      ? t('trustCenterExpanded.actionNeeded')
      : t('trustCenterExpanded.ready');
  const showOnboarding = isNewUser(effectiveStatus) && !onboardingDismissed;

  const runAction = async (key: string, work: () => Promise<void>, optimisticPatch?: (current: TrustCenterStatus) => TrustCenterStatus) => {
    setActionKey(key);
    setPendingSync(true);
    const previous = previousStatusRef.current;
    if (optimisticPatch && previous) {
      const optimistic = optimisticPatch(previous);
      setTrustStatus(optimistic);
      previousStatusRef.current = optimistic;
    }
    try {
      await work();
      toast.success(t('trustCenterExpanded.validationSyncComplete'));
    } catch (error) {
      if (previous) {
        setTrustStatus(previous);
        previousStatusRef.current = previous;
      }
      toast.error(toErrorMessage(error));
    } finally {
      setActionKey(null);
      setPendingSync(false);
    }
  };

  const handleNextAction = () => {
    switch (effectiveStatus?.nextStepId) {
      case 'identity':
        identityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'email':
      case 'phone':
        contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'driver_documents':
        documentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'wallet_standing':
        walletRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      default:
        workflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
    }
  };

  const handleResendEmail = async () => {
    if (!user.email) {
      toast.error(t('trustCenterExpanded.validationRequired'));
      return;
    }

    await runAction('email', async () => {
      await resendTrustEmailConfirmation(user.email);
      toast.success(t('trustCenterExpanded.sendConfirmation') + ' ' + user.email);
      await reloadTrustStatus(true);
    });
  };

  const handleStartPhone = async () => {
    const normalizedPhone = phoneInput.trim();
    if (!normalizedPhone) {
      setValidationErrors((prev) => ({ ...prev, phone: t('trustCenterExpanded.validationRequired') }));
      return;
    }
    setValidationErrors((prev) => ({ ...prev, phone: null }));

    await runAction('phone-start', async () => {
      const result = await startTrustPhoneVerification({ phoneNumber: normalizedPhone });
      updateUser({ phone: result.phoneNumber, phoneVerified: false });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success(t('trustCenterExpanded.sendCode') + ' ' + result.phoneNumber);
    }, (current) => applyOptimisticStepUpdate(current, 'phone', 'in_progress'));
  };

  const handleConfirmPhone = async () => {
    if (!phoneCode.trim()) {
      setValidationErrors((prev) => ({ ...prev, phoneCode: t('trustCenterExpanded.validationRequired') }));
      return;
    }
    setValidationErrors((prev) => ({ ...prev, phoneCode: null }));

    await runAction('phone-confirm', async () => {
      const result = await confirmTrustPhoneVerification({ code: phoneCode.trim() });
      setPhoneCode('');
      updateUser({
        phone: result.phoneNumber,
        phoneVerified: true,
      });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success(t('trustCenterExpanded.confirmPhone'));
    }, (current) => applyOptimisticStepUpdate(current, 'phone', 'completed'));
  };

  const handleSubmitIdentity = async () => {
    if (identityReference.trim().length < 6) {
      setValidationErrors((prev) => ({ ...prev, identityReference: t('trustCenterExpanded.validationTooShort').replace('{min}', '6') }));
      return;
    }
    setValidationErrors((prev) => ({ ...prev, identityReference: null }));

    await runAction('identity', async () => {
      await submitTrustIdentityVerification({
        providerReference: identityReference.trim(),
        documentReference: identityDocumentReference.trim() || undefined,
      });
      updateUser({ verificationLevel: 'level_1' });
      await reloadTrustStatus(true);
      await refreshProfile();
      await loadReviewHistory();
      toast.success(t('trustCenterExpanded.submitForReview'));
    }, (current) => applyOptimisticStepUpdate(current, 'identity', 'in_progress'));
  };

  const handleEnableDriverMode = async () => {
    setConfirmState({
      open: true,
      title: t('trustCenterExpanded.enableDriverMode'),
      description:
        t('trustCenterExpanded.identityHelpBody'),
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        await runAction('driver-mode', async () => {
          await enableTrustDriverMode();
          updateUser({ role: 'driver' });
          await refreshProfile();
          await reloadTrustStatus(true);
          toast.success(t('trustCenterExpanded.enableDriverMode') + ' ' + t('trustCenterExpanded.capabilityReady'));
        });
      },
    });
  };

  const handleSubmitDriverDocuments = async () => {
    if (licenseNumber.trim().length < 6) {
      setValidationErrors((prev) => ({ ...prev, licenseNumber: t('trustCenterExpanded.validationTooShort').replace('{min}', '6') }));
      return;
    }
    setValidationErrors((prev) => ({ ...prev, licenseNumber: null }));

    setConfirmState({      open: true,
      title: t('trustCenterExpanded.driverDocumentsTitle'),
      description:
        t('trustCenterExpanded.submitDocuments') + '. ' + t('trustCenterExpanded.reviewFlowBelow'),
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        await runAction('driver-documents', async () => {
          await submitTrustDriverDocuments({
            licenseNumber: licenseNumber.trim(),
            documentReference: driverDocumentReference.trim() || undefined,
          });
          updateUser({ verificationLevel: 'level_2' });
          await reloadTrustStatus(true);
          await refreshProfile();
          await loadReviewHistory();
          toast.success(t('trustCenterExpanded.submitDocuments'));
        }, (current) => applyOptimisticStepUpdate(current, 'driver_documents', 'in_progress'));
      },
    });
  };

  const identityStep = effectiveStatus?.steps.identity;
  const emailStep = effectiveStatus?.steps.email;
  const phoneStep = effectiveStatus?.steps.phone;
  const driverStep = effectiveStatus?.steps.driverDocuments;
  const walletStandingStep = effectiveStatus?.steps.walletStanding;

  return (
    <PageShell maxWidth={880} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }} aria-live="polite">
        {initialLoading && !trustStatus ? (
          <TrustSkeleton />
        ) : (
          <>
            {showOnboarding && (
              <TrustOnboarding
                t={t}
                onDismiss={() => setOnboardingDismissed(true)}
                onStart={() => {
                  setOnboardingDismissed(true);
                  handleNextAction();
                }}
              />
            )}
            <div
              aria-hidden="true"
              style={{
                position: 'relative',
                marginBottom: -SPACE[6],
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: GRAD_AURORA,
                  opacity: 0.7,
                  filter: 'blur(40px)',
                  transform: 'scale(1.05)',
                }}
              />
            </div>
            <PageHero
          eyebrow={t('trustCenterExpanded.eyebrow')}
          icon={<StatusBadge label={heroLabel} accent={heroAccent} />}
          title={t('trustCenterExpanded.title')}
          description={
            effectiveStatus
              ? effectiveStatus.nextStepId
                ? t('trustCenterExpanded.remainingChecks').replace(
                    '{remaining}',
                    String(effectiveStatus.totalSteps - effectiveStatus.completedSteps),
                  )
                : t('trustCenterExpanded.allResolved')
              : t('trustCenterExpanded.loadingState')
          }
          accent={heroAccent}
          actions={
            <>
              <WaselButton onClick={() => { void handleNextAction(); }} variant="primary">
                {effectiveStatus?.nextStepId
                  ? t('trustCenterExpanded.openNextStep')
                  : t('trustCenterExpanded.reviewSteps')}
              </WaselButton>
              <WaselButton
                variant="outline"
                loading={statusLoading}
                onClick={() => {
                  void reloadTrustStatus();
                }}
              >
                {t('trustCenterExpanded.refreshStatus')}
              </WaselButton>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <WaselLogo size={28} theme="dark" />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: SPACE[3],
                  flexWrap: 'wrap',
                }}
              >
                <StatusBadge
                  label={
                    effectiveStatus
                      ? t('trustCenterExpanded.stepCounter')
                          .replace('{completed}', String(effectiveStatus.completedSteps))
                          .replace('{total}', String(effectiveStatus.totalSteps))
                      : t('trustCenterExpanded.stepCounter')
                          .replace('{completed}', '0')
                          .replace('{total}', '5')
                  }
                  accent={C.cyan}
                />
                <StatusBadge
                  label={t('trustCenterExpanded.unlocked').replace(
                    '{count}',
                    String(unlockedCount),
                  )}
                  accent={C.green}
                />
              </div>
              <TrustScoreDisplay
                score={user.trustScore}
                label={t('trustCenterExpanded.trustScore')}
                scoreLabel={
                  user.trustScore >= 80
                    ? t('trustCenterExpanded.scoreStrong')
                    : user.trustScore >= 50
                      ? t('trustCenterExpanded.scoreFair')
                      : t('trustCenterExpanded.scoreWeak')
                }
                dir={ar ? 'rtl' : 'ltr'}
              />
              <TrustScoreExplanation score={user.trustScore} t={t} compact />
              <div style={{ color: C.textMuted, fontSize: TYPE.size.sm, lineHeight: TYPE.lineHeight.relaxed, fontFamily: F }}>
                {t('trustCenterExpanded.eachCardShowsState')}
              </div>
            </div>
          }
        />

        {pendingSync && (
          <div
            role="status"
            style={{
              padding: `${SPACE[3]} ${SPACE[4]}`,
              borderRadius: R.lg,
              border: `1px solid ${C.cyan}33`,
              background: `${C.cyan}12`,
              color: C.cyan,
              fontSize: TYPE.size.sm,
              fontFamily: F,
            }}
          >
            {t('trustCenterExpanded.validationPendingSync')}
          </div>
        )}

        <VerificationSteps
          steps={(effectiveStatus?.steps ?? {}) as Record<string, { state: string; detail?: string }>}
          t={t}
          dir={ar ? 'rtl' : 'ltr'}
        />

        <div
          className="trust-metrics-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: SPACE[4],
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label={t('trustCenterExpanded.trustScore')}
            value={`${user.trustScore}/100`}
            detail={t('trustCenterExpanded.trustScoreDetail')}
            icon={<Shield size={18} />}
            accent={heroAccent}
          />
          <MetricCard
            label={t('trustCenterExpanded.checksDone')}
            value={
              effectiveStatus
                ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps}`
                : '0/5'
            }
            detail={t('trustCenterExpanded.checksDoneDetail')}
            icon={<CheckCircle2 size={18} />}
            accent={C.cyan}
          />
          <MetricCard
            label={t('trustCenterExpanded.blockedChecks')}
            value={`${effectiveStatus?.blockedSteps.length ?? 0}`}
            detail={t('trustCenterExpanded.failedStepsDetail')}
            icon={<Activity size={18} />}
            accent={(effectiveStatus?.blockedSteps.length ?? 0) > 0 ? C.error : C.green}
          />
          <MetricCard
            label={t('trustCenterExpanded.walletStatus')}
            value={walletTone.label}
            detail={t('trustCenterExpanded.walletDetail')}
            icon={<Wallet size={18} />}
            accent={walletTone.color}
          />
        </div>

        <SectionCard
          title={t('trustCenterExpanded.nextUnlock')}
          subtitle={t('trustCenterExpanded.capabilitiesStillGated')}
          icon={<BadgeCheck size={16} color={heroAccent} />}
        >
          <div
            className="trust-capability-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: SPACE[4],
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: SPACE[4],
                padding: SPACE[5],
                borderRadius: R.xxl,
                border: `1px solid ${heroAccent}24`,
                background: `radial-gradient(circle at top left, ${heroAccent}12, transparent 34%), ${C.card}`,
                boxShadow: SH.md,
              }}
            >
              <div
                style={{
                  color: heroAccent,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  fontFamily: F,
                }}
              >
                {t('trustCenterExpanded.nextUnlock')}
              </div>
              <div
                style={{
                  color: C.text,
                  fontSize: TYPE.size.xl,
                  fontWeight: TYPE.weight.ultra,
                  fontFamily: F,
                }}
              >
                {getTrustStepTitle(effectiveStatus?.nextStepId ?? null, t)}
              </div>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.7,
                  fontFamily: F,
                }}
              >
                {getNextTrustStepDetail(effectiveStatus ?? null, t)}
              </div>
               {effectiveStatus?.blockedSteps.length ? (
                 <div
                   style={{
                     display: 'flex',
                     alignItems: 'flex-start',
                     gap: SPACE[3],
                     padding: `${SPACE[3]} ${SPACE[4]}`,
                     borderRadius: R.lg,
                     border: `1px solid ${C.error}33`,
                     borderInlineStart: `3px solid ${C.error}`,
                     background: `${C.error}12`,
                     color: C.error,
                     fontSize: TYPE.size.sm,
                     lineHeight: TYPE.lineHeight.relaxed,
                     fontFamily: F,
                   }}
                 >
                   <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                   <span>
                     {t('trustCenterExpanded.blockedChecksNeeded').replace(
                       '{count}',
                       String(effectiveStatus.blockedSteps.length),
                     )}
                   </span>
                 </div>
               ) : null}
            </div>

            <div
              style={{
                display: 'grid',
                gap: SPACE[4],
                padding: SPACE[5],
                borderRadius: R.xxl,
                border: `1px solid ${C.border}`,
                background: `linear-gradient(180deg, ${C.card}, rgba(9,22,34,0.92))`,
                boxShadow: SH.sm,
              }}
            >
              <div
                style={{
                  color: C.cyan,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                  fontFamily: F,
                }}
              >
                {t('trustCenterExpanded.capabilitiesStillGated')}
              </div>
               {lockedCapabilities.length > 0 ? (
                 lockedCapabilities.map(item => (
                   <div
                     key={item.title}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'space-between',
                       gap: SPACE[3],
                       padding: `${SPACE[3]} ${SPACE[4]}`,
                       borderRadius: R.lg,
                       border: `1px solid ${C.border}`,
                       borderInlineStart: `3px solid ${heroAccent}`,
                       background: C.card,
                       flexWrap: 'wrap',
                     }}
                   >
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], minWidth: 0 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 42,
                          height: 42,
                          borderRadius: R.lg,
                          color: heroAccent,
                          background: `${heroAccent}18`,
                          border: `1px solid ${heroAccent}28`,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </span>
                      <span style={{ color: C.text, fontSize: TYPE.size.sm, fontFamily: F }}>
                        {item.title}
                      </span>
                    </div>
                    <StatusBadge
                      label={t('trustCenterExpanded.waitingOnNextStep')}
                      accent={heroAccent}
                    />
                  </div>
                ))
              ) : (
                <div
                  style={{
                    color: C.textMuted,
                    fontSize: TYPE.size.sm,
                    lineHeight: TYPE.lineHeight.relaxed,
                    fontFamily: F,
                  }}
                >
                  {t('trustCenterExpanded.noCapabilitiesGated')}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div ref={workflowRef} style={{ display: 'grid', gap: SPACE[5], marginBottom: SPACE[6] }}>
          <SectionCard
            title={t('trustCenterExpanded.subtitle')}
            subtitle={t('trustCenterExpanded.workflowStepSubtitle')}
            icon={<Activity size={16} color={C.cyan} />}
          >
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <div ref={identityRef}>
                <StepCard
                  title={t('trustCenterExpanded.identity')}
                  subtitle={identityStep?.detail ?? t('trustCenterExpanded.reviewFlowBelow')}
                  state={identityStep?.state ?? 'not_started'}
                  badgeLabel={getStepBadge(identityStep?.state ?? 'not_started', t).label}
                  icon={
                    <Shield
                      size={16}
                      color={stateAccent(identityStep?.state ?? 'not_started')}
                    />
                  }
                  footer={
                    <TrustActionRow
                      primary={
                        <WaselButton
                          onClick={() => {
                            void handleSubmitIdentity();
                          }}
                          loading={actionKey === 'identity'}
                          disabled={
                            actionKey === 'identity' ||
                            identityStep?.state === 'in_progress'
                          }
                          variant="primary"
                        >
                          {identityStep?.state === 'failed'
                            ? t('trustCenterExpanded.resubmit')
                            : t('trustCenterExpanded.submitForReview')}
                        </WaselButton>
                      }
                      refresh={() => {
                        void reloadTrustStatus();
                      }}
                      refreshLabel={t('trustCenterExpanded.refreshStatus')}
                    />
                  }
                >
                  {identityStep?.failureReason ? (
                    <FailureNotice message={identityStep.failureReason} />
                  ) : null}
                  <WaselInput
                    id="identity-reference"
                    label={t('trustCenterExpanded.sanadReference')}
                    value={identityReference}
                    onChange={(val) => setIdentityReference(val)}
                    dir={ar ? 'rtl' : 'ltr'}
                    aria-invalid={Boolean(validationErrors.identityReference)}
                    aria-describedby="identity-reference-error"
                  />
                  {validationErrors.identityReference ? (
                    <div id="identity-reference-error" style={{ color: C.error, fontSize: TYPE.size.xs, fontFamily: F, marginTop: SPACE[1] }}>
                      {validationErrors.identityReference}
                    </div>
                  ) : null}
                  <WaselInput
                    id="identity-document-ref"
                    label={t('trustCenterExpanded.documentReferenceOptional')}
                    value={identityDocumentReference}
                    onChange={(val) => setIdentityDocumentReference(val)}
                    dir={ar ? 'rtl' : 'ltr'}
                  />
                  {formatTimestamp(identityStep?.updatedAt) ? (
                    <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                      {t('trustCenterExpanded.lastUpdate')} {formatTimestamp(identityStep?.updatedAt)}
                    </div>
                  ) : null}
                </StepCard>
              </div>

              <div ref={contactRef}>
                <StepCard
                  title={t('trustCenterExpanded.emailPhoneTitle')}
                  subtitle={t('trustCenterExpanded.emailPhoneSubtitle')}
                  state={
                    phoneStep?.state === 'failed' || emailStep?.state === 'failed'
                      ? 'failed'
                      : phoneStep?.state === 'completed' && emailStep?.state === 'completed'
                        ? 'completed'
                        : phoneStep?.state === 'in_progress' || emailStep?.state === 'in_progress'
                          ? 'in_progress'
                          : 'not_started'
                  }
                  badgeLabel={
                    phoneStep?.state === 'failed' || emailStep?.state === 'failed'
                      ? t('trustCenterExpanded.failed')
                      : phoneStep?.state === 'completed' && emailStep?.state === 'completed'
                        ? t('trustCenterExpanded.completed')
                        : phoneStep?.state === 'in_progress' || emailStep?.state === 'in_progress'
                          ? t('trustCenterExpanded.inProgress')
                          : t('trustCenterExpanded.notStarted')
                  }
                  icon={<MailCheck size={16} color={C.cyan} />}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: SPACE[4],
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gap: SPACE[4],
                        padding: SPACE[4],
                        borderRadius: R.xl,
                        border: `1px solid ${stateAccent(emailStep?.state ?? 'not_started')}24`,
                        background: `radial-gradient(circle at top left, ${stateAccent(emailStep?.state ?? 'not_started')}12, transparent 34%), ${C.card}`,
                        boxShadow: SH.sm,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: TYPE.weight.bold, fontFamily: F }}>
                          {t('trustCenterExpanded.emailConfirmation')}
                        </div>
                        <StatusBadge label={emailBadge.label} accent={emailBadge.accent} />
                      </div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          lineHeight: 1.6,
                        }}
                      >
                        {effectiveStatus?.steps.email.detail}
                      </div>
                      <div style={{ color: C.text, fontSize: TYPE.size.sm, fontFamily: F }}>
                        {user.email || effectiveStatus?.steps.email.meta.email || t('trustCenterExpanded.email')}
                      </div>
                      <TrustActionRow
                        primary={
                          <WaselButton
                            onClick={() => {
                              void handleResendEmail();
                            }}
                            loading={actionKey === 'email'}
                            disabled={actionKey === 'email' || effectiveStatus?.steps.email.state === 'completed'}
                            variant="primary"
                          >
                            {effectiveStatus?.steps.email.state === 'completed'
                              ? t('trustCenterExpanded.confirmed')
                              : t('trustCenterExpanded.sendConfirmation')}
                          </WaselButton>
                        }
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: SPACE[4],
                        padding: SPACE[4],
                        borderRadius: R.xl,
                        border: `1px solid ${stateAccent(phoneStep?.state ?? 'not_started')}24`,
                        background: `radial-gradient(circle at top left, ${stateAccent(phoneStep?.state ?? 'not_started')}12, transparent 34%), ${C.card}`,
                        boxShadow: SH.sm,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: TYPE.weight.bold, fontFamily: F }}>
                          {t('trustCenterExpanded.phoneConfirmation')}
                        </div>
                        <StatusBadge label={phoneBadge.label} accent={phoneBadge.accent} />
                      </div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          lineHeight: 1.6,
                        }}
                      >
                        {effectiveStatus?.steps.phone.detail}
                      </div>
                      {phoneStep?.failureReason ? (
                        <FailureNotice message={phoneStep.failureReason} />
                      ) : null}
                      <WaselInput
                        id="phone-number"
                        label={t('trustCenterExpanded.phoneNumberLabel')}
                        value={phoneInput}
                        onChange={(val) => setPhoneInput(val)}
                        type="tel"
                        dir="ltr"
                        aria-invalid={Boolean(validationErrors.phone)}
                        aria-describedby="phone-number-error"
                      />
                      {validationErrors.phone ? (
                        <div id="phone-number-error" style={{ color: C.error, fontSize: TYPE.size.xs, fontFamily: F, marginTop: SPACE[1] }}>
                          {validationErrors.phone}
                        </div>
                      ) : null}
                      <TrustActionRow
                        primary={
                          <WaselButton
                            onClick={() => {
                              void handleStartPhone();
                            }}
                            loading={actionKey === 'phone-start'}
                            disabled={actionKey === 'phone-start'}
                            variant="primary"
                          >
                            {phoneStep?.state === 'in_progress'
                              ? t('trustCenterExpanded.resendCode')
                              : t('trustCenterExpanded.sendCode')}
                          </WaselButton>
                        }
                      />
                      {phoneStep?.state === 'in_progress' || phoneStep?.state === 'failed' ? (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <WaselInput
                            id="phone-code"
                            label={t('trustCenterExpanded.enterVerificationCode')}
                            value={phoneCode}
                            onChange={(val) => setPhoneCode(val)}
                            type="text"
                            dir="ltr"
                            aria-invalid={Boolean(validationErrors.phoneCode)}
                            aria-describedby="phone-code-error"
                          />
                          {validationErrors.phoneCode ? (
                            <div id="phone-code-error" style={{ color: C.error, fontSize: TYPE.size.xs, fontFamily: F, marginTop: SPACE[1] }}>
                              {validationErrors.phoneCode}
                            </div>
                          ) : null}
                          <WaselButton
                            onClick={() => {
                              void handleConfirmPhone();
                            }}
                            loading={actionKey === 'phone-confirm'}
                            disabled={actionKey === 'phone-confirm'}
                            variant="primary"
                          >
                            {t('trustCenterExpanded.confirmPhone')}
                          </WaselButton>
                          {formatTimestamp(phoneStep?.meta.expiresAt) ? (
                            <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                              {t('trustCenterExpanded.codeExpires')}{' '}
                              {formatTimestamp(phoneStep?.meta.expiresAt)}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </StepCard>
              </div>

              <div ref={documentsRef}>
                <StepCard
                  title={t('trustCenterExpanded.driverDocumentsTitle')}
                  subtitle={
                    driverStep?.detail ?? t('trustCenterExpanded.driverDocumentsTitle')
                  }
                  state={driverStep?.state ?? 'not_started'}
                  badgeLabel={getStepBadge(driverStep?.state ?? 'not_started', t).label}
                  icon={
                    <FileCheck
                      size={16}
                      color={stateAccent(driverStep?.state ?? 'not_started')}
                    />
                  }
                >
                  <div style={{ display: 'grid', gap: 10 }}>
                    {driverStep?.failureReason ? (
                      <FailureNotice message={driverStep.failureReason} />
                    ) : null}
                    {driverStep?.meta.role === 'rider' ? (
                      <TrustActionRow
                        primary={
                          <WaselButton
                            onClick={() => {
                              void handleEnableDriverMode();
                            }}
                            loading={actionKey === 'driver-mode'}
                            disabled={actionKey === 'driver-mode'}
                            variant="primary"
                          >
                            {t('trustCenterExpanded.enableDriverMode')}
                          </WaselButton>
                        }
                      />
                    ) : (
                      <>
                        <WaselInput
                          id="driver-license"
                          label={t('trustCenterExpanded.driverLicenseNumber')}
                          value={licenseNumber}
                          onChange={(val) => setLicenseNumber(val)}
                          dir={ar ? 'rtl' : 'ltr'}
                          aria-invalid={Boolean(validationErrors.licenseNumber)}
                          aria-describedby="driver-license-error"
                        />
                        {validationErrors.licenseNumber ? (
                          <div id="driver-license-error" style={{ color: C.error, fontSize: TYPE.size.xs, fontFamily: F, marginTop: SPACE[1] }}>
                            {validationErrors.licenseNumber}
                          </div>
                        ) : null}
                        <WaselInput
                          id="driver-document-ref"
                          label={t('trustCenterExpanded.documentReferenceOptional')}
                          value={driverDocumentReference}
                          onChange={(val) => setDriverDocumentReference(val)}
                          dir={ar ? 'rtl' : 'ltr'}
                        />
                        <TrustActionRow
                          primary={
                            <WaselButton
                              onClick={() => {
                                void handleSubmitDriverDocuments();
                              }}
                              loading={actionKey === 'driver-documents'}
                              disabled={
                                actionKey === 'driver-documents' ||
                                driverStep?.state === 'in_progress'
                              }
                              variant="primary"
                            >
                              {driverStep?.state === 'failed'
                                ? t('trustCenterExpanded.resubmit')
                                : t('trustCenterExpanded.submitDocuments')}
                            </WaselButton>
                          }
                        />
                      </>
                    )}
                    {formatTimestamp(driverStep?.updatedAt) ? (
                      <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                        {t('trustCenterExpanded.lastUpdate')} {formatTimestamp(driverStep?.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </StepCard>
              </div>

              <div ref={walletRef}>
                <StepCard
                  title={t('trustCenterExpanded.walletStandingTitle')}
                  subtitle={
                    walletStandingStep?.detail ?? t('trustCenterExpanded.walletStandingTitle')
                  }
                  state={walletStandingStep?.state ?? 'failed'}
                  badgeLabel={getStepBadge(walletStandingStep?.state ?? 'failed', t).label}
                  icon={
                    <Wallet
                      size={16}
                      color={stateAccent(walletStandingStep?.state ?? 'failed')}
                    />
                  }
                  footer={
                    <TrustActionRow
                      primary={
                        <WaselButton onClick={() => { void nav('/app/wallet'); }} variant="primary">
                          {t('trustCenterExpanded.openWallet')}
                        </WaselButton>
                      }
                      secondary={
                        <WaselButton
                          variant="outline"
                          onClick={() => { void nav('/app/settings'); }}
                        >
                          {t('trustCenterExpanded.accountSettings')}
                        </WaselButton>
                      }
                    />
                  }
                >
                  {walletStandingStep?.failureReason ? (
                    <FailureNotice message={walletStandingStep.failureReason} />
                  ) : null}
                </StepCard>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={t('trustCenterExpanded.reviewHistoryTitle')}
          subtitle={t('trustCenterExpanded.reviewHistorySubtitle')}
          icon={<Activity size={16} color={C.cyan} />}
        >
          <ReviewTimeline items={reviewHistory} t={t} />
        </SectionCard>

        <SectionCard
          title={t('trustCenterExpanded.capabilityMatrixTitle')}
          subtitle={t('trustCenterExpanded.capabilityMatrixSubtitle')}
          icon={<BadgeCheck size={16} color={C.green} />}
        >
          <div style={{ display: 'grid', gap: SPACE[3] }}>
            {capabilityRows.map(item => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: SPACE[3],
                  alignItems: 'center',
                  padding: `${SPACE[4]} ${SPACE[4]}`,
                  borderRadius: R.xl,
                  border: `1px solid ${item.gate.allowed ? C.green : C.cyan}24`,
                  borderInlineStart: `3px solid ${item.gate.allowed ? C.green : C.cyan}`,
                  background: `linear-gradient(180deg, ${C.card}, rgba(9,22,34,0.92))`,
                  boxShadow: SH.sm,
                  flexWrap: 'wrap',
                }}
              >
               <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3], minWidth: 0 }}>
                 <span
                   style={{
                     display: 'inline-flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     width: 42,
                     height: 42,
                     borderRadius: R.lg,
                     color: item.gate.allowed ? C.green : C.cyan,
                     background: `${item.gate.allowed ? C.green : C.cyan}18`,
                     border: `1px solid ${item.gate.allowed ? C.green : C.cyan}28`,
                     flexShrink: 0,
                   }}
                 >
                   {item.icon}
                 </span>
                 <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                   <div style={{ color: C.text, fontWeight: TYPE.weight.bold, fontFamily: F }}>
                     {item.title}
                   </div>
                   <div
                     style={{
                       color: C.textMuted,
                       fontSize: TYPE.size.sm,
                       fontFamily: F,
                       lineHeight: TYPE.lineHeight.relaxed,
                     }}
                   >
                     {item.gate.allowed
                       ? t('trustCenterExpanded.capabilityReady')
                       : (item.gate.reason ??
                         item.gate.recommendation ??
                         t('trustCenterExpanded.oneMoreStep'))}
                   </div>
                 </div>
               </div>
               <StatusBadge
                 label={item.gate.allowed ? t('trustCenterExpanded.open') : t('trustCenterExpanded.locked')}
                 accent={item.gate.allowed ? C.green : C.cyan}
               />
             </div>
            ))}
          </div>
        </SectionCard>
      </>
      )}
      <WaselDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        size="sm"
        onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
        closeLabel={t('common.close')}
        footer={
          <>
            <WaselButton
              variant="outline"
              onClick={() => setConfirmState(prev => ({ ...prev, open: false }))}
            >
              {t('common.cancel')}
            </WaselButton>
            <WaselButton variant="primary" onClick={confirmState.onConfirm}>
              {t('common.confirm')}
            </WaselButton>
          </>
        }
      />
      </div>
    </PageShell>
  );
}
