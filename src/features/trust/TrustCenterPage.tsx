import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileCheck,
  MailCheck,
  Shield,
  Wallet,
} from 'lucide-react';
import { WaselButton } from '../../components/wasel-ui/WaselButton';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  confirmTrustPhoneVerification,
  enableTrustDriverMode,
  getTrustCenterStatus,
  resendTrustEmailConfirmation,
  startTrustPhoneVerification,
  submitTrustDriverDocuments,
  submitTrustIdentityVerification,
} from '../../services/trustCenter';
import {
  buildFallbackTrustCenterStatus,
  type TrustCenterStatus,
  type TrustStepId,
  type TrustStepState,
} from '../../services/trustCenterModel';
import { evaluateTrustCapability } from '../../services/trustRules';
import { C, F, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';
import {
  TrustScoreDisplay,
  VerificationSteps,
} from './components';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Trust Center request failed.';
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

function getPanelAccent(state: TrustStepState) {
  switch (state) {
    case 'completed':
      return C.green;
    case 'in_progress':
      return C.cyan;
    case 'failed':
      return C.error;
    default:
      return C.gold;
  }
}

function formatTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function getTrustStepTitle(stepId: TrustStepId | null, t: (key: string) => string): string {
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

function FormField({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={event => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        minHeight: 42,
        padding: '0 12px',
        borderRadius: R.md,
        border: `1px solid ${C.border}`,
        background: C.elevated,
        color: C.text,
        fontFamily: F,
        outline: 'none',
        boxShadow: SH.none,
      }}
    />
  );
}

function StepCard({
  title,
  subtitle,
  state,
  icon,
  ar: _ar,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  state: TrustStepState;
  icon: ReactNode;
  ar: boolean;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLanguage();
  const accent = getPanelAccent(state);
  const badge = getStepBadge(state, t);

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[4],
        padding: SPACE[4],
        borderRadius: 20,
        border: `1px solid ${accent}24`,
        background: `radial-gradient(circle at top left, ${accent}12, transparent 32%), ${C.elevated}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: C.text,
              fontWeight: TYPE.weight.bold,
              fontFamily: F,
            }}
          >
            {icon}
            <span>{title}</span>
          </div>
          <div
            style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F, lineHeight: 1.6 }}
          >
            {subtitle}
          </div>
        </div>
        <StatusBadge label={badge.label} accent={badge.accent} />
      </div>
      {children}
      {footer}
    </div>
  );
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
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [phoneCode, setPhoneCode] = useState('');
  const [identityReference, setIdentityReference] = useState('');
  const [identityDocumentReference, setIdentityDocumentReference] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverDocumentReference, setDriverDocumentReference] = useState('');

  const fallbackStatus = useMemo(
    () => (user ? buildFallbackTrustCenterStatus(user) : null),
    [user],
  );
  const effectiveStatus = trustStatus ?? fallbackStatus;

  useEffect(() => {
    setPhoneInput(user?.phone ?? '');
  }, [user?.phone]);

  useEffect(() => {
    if (!effectiveStatus) return;

    const providerReference = effectiveStatus.steps.identity.meta.providerReference;
    const documentReference = effectiveStatus.steps.identity.meta.documentReference;
    const existingLicense = effectiveStatus.steps.driverDocuments.meta.licenseNumber;

    if (providerReference && !identityReference) setIdentityReference(providerReference);
    if (documentReference && !identityDocumentReference) {
      setIdentityDocumentReference(documentReference);
    }
    if (existingLicense && !licenseNumber) setLicenseNumber(existingLicense);
  }, [effectiveStatus, identityDocumentReference, identityReference, licenseNumber]);

  const reloadTrustStatus = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setStatusLoading(true);

    try {
      const nextStatus = await getTrustCenterStatus(user);
      setTrustStatus(nextStatus);
    } catch (error) {
      const fallback = buildFallbackTrustCenterStatus(user);
      setTrustStatus(fallback);
      if (!silent) {
        console.warn('[Trust Center] Using fallback status:', error);
      }
    } finally {
      if (!silent) setStatusLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTrustStatus(null);
      return;
    }
    void reloadTrustStatus(true);
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
      gate: evaluateTrustCapability(user, 'offer_ride'),
    },
    {
      title: t('trustCenterExpanded.carryPackages'),
      gate: evaluateTrustCapability(user, 'carry_packages'),
    },
    {
      title: t('trustCenterExpanded.receivePayouts'),
      gate: evaluateTrustCapability(user, 'receive_payouts'),
    },
    {
      title: t('trustCenterExpanded.prioritySupport'),
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
      ? C.gold
      : C.green;
  const heroLabel = effectiveStatus?.blockedSteps.length
    ? t('trustCenterExpanded.needsReview')
    : effectiveStatus?.nextStepId
      ? t('trustCenterExpanded.actionNeeded')
      : t('trustCenterExpanded.ready');

  const runAction = async (key: string, work: () => Promise<void>) => {
    setActionKey(key);
    try {
      await work();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setActionKey(null);
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
      toast.error('No email is associated with this account.');
      return;
    }

    await runAction('email', async () => {
      await resendTrustEmailConfirmation(user.email);
      toast.success(`Confirmation email sent to ${user.email}.`);
      await reloadTrustStatus(true);
    });
  };

  const handleStartPhone = async () => {
    const normalizedPhone = phoneInput.trim();
    if (!normalizedPhone) {
      toast.error('Enter a phone number before requesting a code.');
      return;
    }

    await runAction('phone-start', async () => {
      const result = await startTrustPhoneVerification({ phoneNumber: normalizedPhone });
      updateUser({ phone: result.phoneNumber, phoneVerified: false });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success(`Verification code sent to ${result.phoneNumber}.`);
    });
  };

  const handleConfirmPhone = async () => {
    if (!phoneCode.trim()) {
      toast.error('Enter the verification code first.');
      return;
    }

    await runAction('phone-confirm', async () => {
      const result = await confirmTrustPhoneVerification({ code: phoneCode.trim() });
      setPhoneCode('');
      updateUser({
        phone: result.phoneNumber,
        phoneVerified: true,
      });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success('Phone verification completed.');
    });
  };

  const handleSubmitIdentity = async () => {
    if (identityReference.trim().length < 6) {
      toast.error('Enter a valid Sanad reference (minimum 6 characters).');
      return;
    }

    await runAction('identity', async () => {
      await submitTrustIdentityVerification({
        providerReference: identityReference.trim(),
        documentReference: identityDocumentReference.trim() || undefined,
      });
      updateUser({ verificationLevel: 'level_1' });
      await reloadTrustStatus(true);
      await refreshProfile();
      toast.success('Identity verification submitted for review.');
    });
  };

  const handleEnableDriverMode = async () => {
    await runAction('driver-mode', async () => {
      await enableTrustDriverMode();
      updateUser({ role: 'driver' });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success('Driver mode enabled. You can now submit driver documents.');
    });
  };

  const handleSubmitDriverDocuments = async () => {
    if (licenseNumber.trim().length < 6) {
      toast.error('Enter a valid driver license number (minimum 6 characters).');
      return;
    }

    await runAction('driver-documents', async () => {
      await submitTrustDriverDocuments({
        licenseNumber: licenseNumber.trim(),
        documentReference: driverDocumentReference.trim() || undefined,
      });
      updateUser({ verificationLevel: 'level_2' });
      await reloadTrustStatus(true);
      await refreshProfile();
      toast.success('Driver documents submitted for review.');
    });
  };

  return (
    <PageShell maxWidth={880} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
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
              <WaselButton onClick={handleNextAction} variant="primary">
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
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <StatusBadge
                  label={
                    effectiveStatus
                      ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps} ${ar ? 'مكتمل' : 'complete'}`
                      : `0/5 ${ar ? 'مكتمل' : 'complete'}`
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
              <TrustScoreDisplay score={user.trustScore} label={t('trustCenterExpanded.trustScore')} />
              <div style={{ color: C.textMuted, fontSize: '0.88rem', lineHeight: 1.7 }}>
                {ar
                  ? 'كل بطاقة أدناه توضح ما إذا كانت الخطوة لم تبدأ أو قيد التنفيذ أو مكتملة أو فاشلة، مع سبب واضح.'
                  : t('trustCenterExpanded.eachCardShowsState')}
              </div>
            </div>
          }
        />

        {/* ── 5-segment progress bar ── */}
        <VerificationSteps
          steps={effectiveStatus?.steps ?? {}}
          t={t}
        />

        <div
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
            icon={<AlertTriangle size={18} />}
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
          title={t('trustCenterExpanded.title')}
          subtitle={t('trustCenterExpanded.subtitle')}
          icon={<BadgeCheck size={16} color={heroAccent} />}
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
                gap: SPACE[3],
                padding: SPACE[4],
                borderRadius: 20,
                border: `1px solid ${heroAccent}24`,
                background: `radial-gradient(circle at top left, ${heroAccent}12, transparent 36%), ${C.elevated}`,
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
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: `1px solid ${C.error}26`,
                    background: `${C.error}12`,
                    color: C.error,
                    fontSize: TYPE.size.sm,
                    lineHeight: 1.65,
                    fontFamily: F,
                  }}
                >
                  {ar
                    ? `هناك ${effectiveStatus.blockedSteps.length} خطوة محظورة يجب حلها قبل اعتبار الحساب جاهزاً بالكامل.`
                    : `${effectiveStatus.blockedSteps.length} blocked checks still need to be resolved before the account is fully ready.`}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: 'grid',
                gap: SPACE[3],
                padding: SPACE[4],
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: C.elevated,
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
                      gap: 10,
                      borderRadius: 14,
                      border: `1px solid ${C.border}`,
                      padding: '10px 12px',
                      background: C.card2,
                    }}
                  >
                    <span style={{ color: C.text, fontSize: TYPE.size.sm, fontFamily: F }}>
                      {item.title}
                    </span>
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
                    lineHeight: 1.7,
                    fontFamily: F,
                  }}
                >
                  {ar
                    ? 'لا توجد قدرة أساسية مقفلة الآن. استخدم هذه الصفحة للمراجعة الدورية فقط.'
                    : 'No core capability is currently gated. Use this page for periodic review only.'}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div ref={workflowRef} style={{ display: 'grid', gap: SPACE[5], marginBottom: SPACE[6] }}>
          <SectionCard
            title={t('trustCenterExpanded.subtitle')}
            subtitle={
              ar
                ? 'كل خطوة لديها إجراء واضح ولا يسمح لأي حالة أن تبقى غير محسومة.'
                : 'Each step has a direct action and no state is allowed to remain indeterminate.'
            }
            icon={<Activity size={16} color={C.cyan} />}
          >
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <div ref={identityRef}>
                <StepCard
                  title={t('trustCenterExpanded.identity')}
                  subtitle={
                    effectiveStatus?.steps.identity.detail ??
                    'Submit Sanad verification to continue.'
                  }
                  state={effectiveStatus?.steps.identity.state ?? 'not_started'}
                  ar={ar}
                  icon={
                    <Shield
                      size={16}
                      color={getPanelAccent(effectiveStatus?.steps.identity.state ?? 'not_started')}
                    />
                  }
                  footer={
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <WaselButton
                        onClick={() => {
                          void handleSubmitIdentity();
                        }}
                        loading={actionKey === 'identity'}
                        disabled={
                          actionKey === 'identity' ||
                          effectiveStatus?.steps.identity.state === 'in_progress'
                        }
                        variant="primary"
                      >
                        {effectiveStatus?.steps.identity.state === 'failed'
                          ? ar
                            ? 'إعادة الإرسال'
                            : 'Resubmit'
                          : ar
                            ? 'إرسال للمراجعة'
                            : 'Submit for review'}
                      </WaselButton>
                      <WaselButton
                        variant="outline"
                        onClick={() => {
                          void reloadTrustStatus();
                        }}
                      >
                        {t('common.refresh')}
                      </WaselButton>
                    </div>
                  }
                >
                  <div style={{ display: 'grid', gap: 10 }}>
                    {effectiveStatus?.steps.identity.failureReason ? (
                      <div
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.error}33`,
                          background: `${C.error}12`,
                          padding: '12px 14px',
                          color: C.error,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          lineHeight: 1.6,
                        }}
                      >
                        {effectiveStatus.steps.identity.failureReason}
                      </div>
                    ) : null}
                    <FormField
                      value={identityReference}
                      onChange={setIdentityReference}
                      placeholder={ar ? 'مرجع سند أو رقم الجلسة' : 'Sanad reference or session id'}
                    />
                    <FormField
                      value={identityDocumentReference}
                      onChange={setIdentityDocumentReference}
                      placeholder={ar ? 'مرجع المستند (اختياري)' : 'Document reference (optional)'}
                    />
                    {formatTimestamp(effectiveStatus?.steps.identity.updatedAt) ? (
                      <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                        {ar ? 'آخر تحديث:' : 'Last update:'}{' '}
                        {formatTimestamp(effectiveStatus?.steps.identity.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </StepCard>
              </div>

              <div ref={contactRef}>
                <StepCard
                  title={ar ? 'البريد والهاتف' : 'Email and phone'}
                  subtitle={
                    ar
                      ? 'تأكيد البريد والهاتف يجب أن يغيّر الحالة مباشرة.'
                      : 'Email and phone verification should move state immediately.'
                  }
                  ar={ar}
                  state={
                    effectiveStatus?.steps.phone.state === 'failed' ||
                    effectiveStatus?.steps.email.state === 'failed'
                      ? 'failed'
                      : effectiveStatus?.steps.phone.state === 'completed' &&
                          effectiveStatus?.steps.email.state === 'completed'
                        ? 'completed'
                        : effectiveStatus?.steps.phone.state === 'in_progress' ||
                            effectiveStatus?.steps.email.state === 'in_progress'
                          ? 'in_progress'
                          : 'not_started'
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
                        gap: 10,
                        padding: SPACE[4],
                        borderRadius: 16,
                        border: `1px solid ${getPanelAccent(effectiveStatus?.steps.email.state ?? 'not_started')}24`,
                        background: C.card2,
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
                        <StatusBadge
                          label={
                            getStepBadge(effectiveStatus?.steps.email.state ?? 'not_started', t)
                              .label
                          }
                          accent={
                            getStepBadge(effectiveStatus?.steps.email.state ?? 'not_started', t)
                              .accent
                          }
                        />
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
                        {user.email || effectiveStatus?.steps.email.meta.email || 'No email'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <WaselButton
                          onClick={() => {
                            void handleResendEmail();
                          }}
                          loading={actionKey === 'email'}
                          disabled={
                            actionKey === 'email' ||
                            effectiveStatus?.steps.email.state === 'completed'
                          }
                          variant="primary"
                        >
                          {effectiveStatus?.steps.email.state === 'completed'
                            ? t('trustCenterExpanded.confirmed')
                            : t('trustCenterExpanded.sendConfirmation')}
                        </WaselButton>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 10,
                        padding: SPACE[4],
                        borderRadius: 16,
                        border: `1px solid ${getPanelAccent(effectiveStatus?.steps.phone.state ?? 'not_started')}24`,
                        background: C.card2,
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
                          {ar ? 'تأكيد الهاتف' : 'Phone confirmation'}
                        </div>
                        <StatusBadge
                          label={
                            getStepBadge(effectiveStatus?.steps.phone.state ?? 'not_started', t)
                              .label
                          }
                          accent={
                            getStepBadge(effectiveStatus?.steps.phone.state ?? 'not_started', t)
                              .accent
                          }
                        />
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
                      {effectiveStatus?.steps.phone.failureReason ? (
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.error}33`,
                            background: `${C.error}12`,
                            padding: '12px 14px',
                            color: C.error,
                            fontSize: TYPE.size.sm,
                            fontFamily: F,
                            lineHeight: 1.6,
                          }}
                        >
                          {effectiveStatus.steps.phone.failureReason}
                        </div>
                      ) : null}
                      <FormField
                        value={phoneInput}
                        onChange={setPhoneInput}
                        placeholder="+962791234567"
                        type="tel"
                      />
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <WaselButton
                          onClick={() => {
                            void handleStartPhone();
                          }}
                          loading={actionKey === 'phone-start'}
                          disabled={actionKey === 'phone-start'}
                          variant="primary"
                        >
                          {effectiveStatus?.steps.phone.state === 'in_progress'
                            ? t('trustCenterExpanded.resendCode')
                            : t('trustCenterExpanded.sendCode')}
                        </WaselButton>
                      </div>
                      {(effectiveStatus?.steps.phone.state === 'in_progress' ||
                        effectiveStatus?.steps.phone.state === 'failed') && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <FormField
                            value={phoneCode}
                            onChange={setPhoneCode}
                            placeholder={t('trustCenterExpanded.enterVerificationCode')}
                          />
                          <WaselButton
                            onClick={() => {
                              void handleConfirmPhone();
                            }}
                            loading={actionKey === 'phone-confirm'}
                            disabled={actionKey === 'phone-confirm'}
                            variant="primary"
                          >
                            {ar ? 'تأكيد الهاتف' : 'Confirm phone'}
                          </WaselButton>
                          {formatTimestamp(effectiveStatus?.steps.phone.meta.expiresAt) ? (
                            <div
                              style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}
                            >
                              {ar ? 'ينتهي الكود:' : 'Code expires:'}{' '}
                              {formatTimestamp(effectiveStatus?.steps.phone.meta.expiresAt)}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </StepCard>
              </div>

              <div ref={documentsRef}>
                <StepCard
                  title={ar ? 'وثائق السائق' : 'Driver documents'}
                  subtitle={
                    effectiveStatus?.steps.driverDocuments.detail ??
                    'Submit driver license and compliance documents.'
                  }
                  state={effectiveStatus?.steps.driverDocuments.state ?? 'not_started'}
                  ar={ar}
                  icon={
                    <FileCheck
                      size={16}
                      color={getPanelAccent(
                        effectiveStatus?.steps.driverDocuments.state ?? 'not_started',
                      )}
                    />
                  }
                >
                  <div style={{ display: 'grid', gap: 10 }}>
                    {effectiveStatus?.steps.driverDocuments.failureReason ? (
                      <div
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.error}33`,
                          background: `${C.error}12`,
                          padding: '12px 14px',
                          color: C.error,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          lineHeight: 1.6,
                        }}
                      >
                        {effectiveStatus.steps.driverDocuments.failureReason}
                      </div>
                    ) : null}
                    {effectiveStatus?.steps.driverDocuments.meta.role === 'rider' ? (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <WaselButton
                          onClick={() => {
                            void handleEnableDriverMode();
                          }}
                          loading={actionKey === 'driver-mode'}
                          disabled={actionKey === 'driver-mode'}
                          variant="primary"
                        >
                          {ar ? 'تفعيل وضع السائق' : 'Enable Driver mode'}
                        </WaselButton>
                      </div>
                    ) : (
                      <>
                        <FormField
                          value={licenseNumber}
                          onChange={setLicenseNumber}
                          placeholder={ar ? 'رقم رخصة السائق' : 'Driver license number'}
                        />
                        <FormField
                          value={driverDocumentReference}
                          onChange={setDriverDocumentReference}
                          placeholder={
                            ar ? 'مرجع المستند (اختياري)' : 'Document reference (optional)'
                          }
                        />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <WaselButton
                            onClick={() => {
                              void handleSubmitDriverDocuments();
                            }}
                            loading={actionKey === 'driver-documents'}
                            disabled={
                              actionKey === 'driver-documents' ||
                              effectiveStatus?.steps.driverDocuments.state === 'in_progress'
                            }
                            variant="primary"
                          >
                            {effectiveStatus?.steps.driverDocuments.state === 'failed'
                              ? ar
                                ? 'إعادة الإرسال'
                                : 'Resubmit'
                              : ar
                                ? 'إرسال الوثائق'
                                : 'Submit documents'}
                          </WaselButton>
                        </div>
                      </>
                    )}
                    {formatTimestamp(effectiveStatus?.steps.driverDocuments.updatedAt) ? (
                      <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                        {ar ? 'آخر تحديث:' : 'Last update:'}{' '}
                        {formatTimestamp(effectiveStatus?.steps.driverDocuments.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </StepCard>
              </div>

              <div ref={walletRef}>
                <StepCard
                  title={ar ? 'سلامة المحفظة' : 'Wallet standing'}
                  subtitle={
                    effectiveStatus?.steps.walletStanding.detail ?? 'Wallet status unavailable.'
                  }
                  state={effectiveStatus?.steps.walletStanding.state ?? 'failed'}
                  ar={ar}
                  icon={
                    <Wallet
                      size={16}
                      color={getPanelAccent(
                        effectiveStatus?.steps.walletStanding.state ?? 'failed',
                      )}
                    />
                  }
                  footer={
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <WaselButton onClick={() => nav('/app/wallet')} variant="primary">
                        {ar ? 'افتح المحفظة' : 'Open wallet'}
                      </WaselButton>
                      <WaselButton
                        variant="outline"
                        onClick={() => nav('/app/settings?section=account')}
                      >
                        {ar ? 'إعدادات الحساب' : 'Account settings'}
                      </WaselButton>
                    </div>
                  }
                >
                  {effectiveStatus?.steps.walletStanding.failureReason ? (
                    <div
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${C.error}33`,
                        background: `${C.error}12`,
                        padding: '12px 14px',
                        color: C.error,
                        fontSize: TYPE.size.sm,
                        fontFamily: F,
                        lineHeight: 1.6,
                      }}
                    >
                      {effectiveStatus.steps.walletStanding.failureReason}
                    </div>
                  ) : null}
                </StepCard>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title={ar ? 'القدرات المفتوحة الآن' : 'Capability matrix'}
          subtitle={
            ar
              ? 'الحالة النهائية للثقة يجب أن تظهر كقدرات مفتوحة أو مغلقة بوضوح.'
              : 'Final trust state should read as open or blocked capabilities.'
          }
          icon={<BadgeCheck size={16} color={C.green} />}
        >
          <div style={{ display: 'grid', gap: SPACE[3] }}>
            {capabilityRows.map(item => (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  padding: `${SPACE[4]} ${SPACE[4]}`,
                  borderRadius: 16,
                  border: `1px solid ${item.gate.allowed ? C.green : C.gold}24`,
                  background: C.elevated,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: TYPE.weight.bold, fontFamily: F }}>
                    {item.title}
                  </div>
                  <div
                    style={{
                      color: C.textMuted,
                      fontSize: TYPE.size.sm,
                      fontFamily: F,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.gate.allowed
                      ? ar
                        ? 'الشرط مكتمل ويمكن تنفيذ الإجراء الآن.'
                        : 'This action is available right now.'
                      : (item.gate.reason ??
                        item.gate.recommendation ??
                        (ar ? 'خطوة إضافية مطلوبة.' : 'One more step is required.'))}
                  </div>
                </div>
                <StatusBadge
                  label={item.gate.allowed ? (ar ? 'مفتوح' : 'Open') : ar ? 'مغلق' : 'Locked'}
                  accent={item.gate.allowed ? C.green : C.gold}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
