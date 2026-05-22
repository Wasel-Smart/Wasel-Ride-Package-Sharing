import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  FileCheck,
  LoaderCircle,
  MailCheck,
  Shield,
  Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
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

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Trust Center request failed.';
}

function getStepBadge(state: TrustStepState, ar: boolean) {
  switch (state) {
    case 'completed':
      return { label: ar ? 'Ù…ÙƒØªÙ…Ù„' : 'Completed', accent: C.green };
    case 'in_progress':
      return { label: ar ? 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°' : 'In Progress', accent: C.cyan };
    case 'failed':
      return { label: ar ? 'ÙØ´Ù„' : 'Failed', accent: C.error };
    default:
      return { label: ar ? 'Ù„Ù… ÙŠØ¨Ø¯Ø£' : 'Not Started', accent: C.gold };
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

function getTrustStepTitle(stepId: TrustStepId | null, ar: boolean): string {
  switch (stepId) {
    case 'identity':
      return ar ? 'Ø§Ù„Ù‡ÙˆÙŠØ© / Ø³Ù†Ø¯' : 'Identity / Sanad';
    case 'email':
      return ar ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Email';
    case 'phone':
      return ar ? 'Ø§Ù„Ù‡Ø§ØªÙ' : 'Phone';
    case 'driver_documents':
      return ar ? 'ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø³Ø§Ø¦Ù‚' : 'Driver documents';
    case 'wallet_standing':
      return ar ? 'Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Wallet standing';
    default:
      return ar ? 'Ø¬Ø§Ù‡Ø²' : 'Ready';
  }
}

function getNextTrustStepDetail(status: TrustCenterStatus | null, ar: boolean): string {
  if (!status?.nextStepId) {
    return ar
      ? 'ÙƒÙ„ Ø§Ù„Ù‚Ø¯Ø±Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ø¬Ø§Ù‡Ø²Ø© Ø§Ù„Ø¢Ù† ÙˆÙ„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø·ÙˆØ© ØªØ´ØºÙŠÙ„ÙŠØ© Ù…Ø¹Ù„Ù‚Ø©.'
      : 'Every core capability is ready now and no operational trust step is pending.';
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
      return ar ? 'Ø±Ø§Ø¬Ø¹ Ø³ÙŠØ± Ø§Ù„ØªØ­Ù‚Ù‚ Ø£Ø¯Ù†Ø§Ù‡.' : 'Review the verification flow below.';
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
        background: 'rgba(255,255,255,0.04)',
        color: '#EFF6FF',
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
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  state: TrustStepState;
  icon: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const accent = getPanelAccent(state);

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[4],
        padding: SPACE[4],
        borderRadius: 20,
        border: `1px solid ${accent}24`,
        background: `radial-gradient(circle at top left, ${accent}12, transparent 32%), rgba(255,255,255,0.03)`,
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
              color: '#EFF6FF',
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
        <StatusBadge
          label={getStepBadge(state, false).label}
          accent={getStepBadge(state, false).accent}
        />
      </div>
      {children}
      {footer}
    </div>
  );
}

export default function TrustCenterPage() {
  const { language } = useLanguage();
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

  const reloadTrustStatus = async (silent = false) => {
    if (!user) return;
    if (!silent) setStatusLoading(true);

    try {
      const nextStatus = await getTrustCenterStatus(user);
      setTrustStatus(nextStatus);
    } catch (error) {
      if (!silent) {
        toast.error(toErrorMessage(error));
      }
      setTrustStatus(buildFallbackTrustCenterStatus(user));
    } finally {
      if (!silent) setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setTrustStatus(null);
      return;
    }
    void reloadTrustStatus();
  }, [user?.id]);

  if (!user) {
    return <ProtectedPagePreview pathname="/app/trust" />;
  }

  const capabilityRows = [
    { title: ar ? 'Ù†Ø´Ø± Ø±Ø­Ù„Ø©' : 'Post rides', gate: evaluateTrustCapability(user, 'offer_ride') },
    {
      title: ar ? 'Ø­Ù…Ù„ Ø§Ù„Ø·Ø±ÙˆØ¯' : 'Carry packages',
      gate: evaluateTrustCapability(user, 'carry_packages'),
    },
    {
      title: ar ? 'Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø¯ÙØ¹Ø§Øª' : 'Receive payouts',
      gate: evaluateTrustCapability(user, 'receive_payouts'),
    },
    {
      title: ar ? 'Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„Ø³Ø±ÙŠØ¹' : 'Priority support',
      gate: evaluateTrustCapability(user, 'priority_support'),
    },
  ];
  const unlockedCount = capabilityRows.filter(item => item.gate.allowed).length;
  const lockedCapabilities = capabilityRows.filter(item => !item.gate.allowed);
  const walletStep = effectiveStatus?.steps.walletStanding;
  const walletTone =
    walletStep?.meta.walletStatus === 'closed'
      ? { label: ar ? 'Ù…ØºÙ„Ù‚Ø©' : 'Closed', color: C.error }
      : walletStep?.meta.walletStatus === 'frozen'
        ? { label: ar ? 'Ù…Ø¬Ù…Ø¯Ø©' : 'Frozen', color: C.error }
        : walletStep?.meta.walletStatus === 'limited'
          ? { label: ar ? 'Ù…Ø­Ø¯ÙˆØ¯Ø©' : 'Limited', color: C.gold }
          : walletStep?.meta.walletStatus === 'unavailable'
            ? { label: ar ? 'ØºÙŠØ± Ù…ØªØ§Ø­Ø©' : 'Unavailable', color: C.error }
            : { label: ar ? 'Ù†Ø´Ø·Ø©' : 'Active', color: C.green };
  const heroAccent = effectiveStatus?.blockedSteps.length
    ? C.error
    : effectiveStatus?.nextStepId
      ? C.gold
      : C.green;
  const heroLabel = effectiveStatus?.blockedSteps.length
    ? ar
      ? 'ØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©'
      : 'Needs review'
    : effectiveStatus?.nextStepId
      ? ar
        ? 'Ø¥Ø¬Ø±Ø§Ø¡ Ù…Ø·Ù„ÙˆØ¨'
        : 'Action needed'
      : ar
        ? 'Ø¬Ø§Ù‡Ø²'
        : 'Ready';

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
    if (identityReference.trim().length < 4) {
      toast.error('Enter the Sanad reference before submitting.');
      return;
    }

    await runAction('identity', async () => {
      await submitTrustIdentityVerification({
        providerReference: identityReference.trim(),
        documentReference: identityDocumentReference.trim() || undefined,
      });
      await reloadTrustStatus(true);
      toast.success('Identity verification submitted for review.');
    });
  };

  const handleEnableDriverMode = async () => {
    await runAction('driver-mode', async () => {
      await enableTrustDriverMode();
      updateUser({ role: 'both' });
      await refreshProfile();
      await reloadTrustStatus(true);
      toast.success('Driver mode enabled. You can now submit driver documents.');
    });
  };

  const handleSubmitDriverDocuments = async () => {
    if (licenseNumber.trim().length < 4) {
      toast.error('Enter the driver license number before submitting.');
      return;
    }

    await runAction('driver-documents', async () => {
      await submitTrustDriverDocuments({
        licenseNumber: licenseNumber.trim(),
        documentReference: driverDocumentReference.trim() || undefined,
      });
      await reloadTrustStatus(true);
      toast.success('Driver documents submitted for review.');
    });
  };

  return (
    <PageShell maxWidth={880} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ù‚Ø©' : 'Trust Center'}
          icon={<StatusBadge label={heroLabel} accent={heroAccent} />}
          title={
            ar
              ? 'ÙƒÙ„ Ø®Ø·ÙˆØ© ÙŠØ¬Ø¨ Ø£Ù† ØªÙ†ØªÙ‡ÙŠ Ø¨Ø­Ø§Ù„Ø© ÙˆØ§Ø¶Ø­Ø©'
              : 'Every trust check should end in a clear state'
          }
          description={
            effectiveStatus
              ? effectiveStatus.nextStepId
                ? ar
                  ? `Ø£ÙƒÙ…Ù„ ${effectiveStatus.totalSteps - effectiveStatus.completedSteps} Ø®Ø·ÙˆØ§Øª Ù…ØªØ¨Ù‚ÙŠØ© ÙˆØªØ¬Ù†Ø¨ Ø£ÙŠ Ø­Ø§Ù„Ø© Ù…Ø¹Ù„Ù‚Ø©.`
                  : `Complete ${effectiveStatus.totalSteps - effectiveStatus.completedSteps} remaining checks and avoid any stuck state.`
                : ar
                  ? 'Ø¬Ù…ÙŠØ¹ Ø®Ø·ÙˆØ§Øª Ø§Ù„Ø«Ù‚Ø© Ø§Ù„Ø¢Ù† Ù…Ø­Ø³ÙˆÙ…Ø© ÙˆÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙÙ‡Ù… ÙˆØ¶Ø¹ Ø§Ù„Ø­Ø³Ø§Ø¨ ÙÙˆØ±Ø§Ù‹.'
                  : 'Every trust step is now resolved clearly and the account state is readable at a glance.'
              : ar
                ? 'ØªØ­Ù…ÙŠÙ„ Ø­Ø§Ù„Ø© Ø§Ù„Ø«Ù‚Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©...'
                : 'Loading the current trust state...'
          }
          accent={heroAccent}
          actions={
            <>
              <Button
                onClick={handleNextAction}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {effectiveStatus?.nextStepId
                  ? ar
                    ? 'Ø§ÙØªØ­ Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©'
                    : 'Open next step'
                  : ar
                    ? 'Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø®Ø·ÙˆØ§Øª'
                    : 'Review checks'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void reloadTrustStatus();
                }}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {statusLoading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <LoaderCircle size={14} className="animate-spin" />
                    {ar ? 'ÙŠØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ«' : 'Refreshing'}
                  </span>
                ) : ar ? (
                  'ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©'
                ) : (
                  'Refresh status'
                )}
              </Button>
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
                      ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps} ${ar ? 'Ù…ÙƒØªÙ…Ù„' : 'complete'}`
                      : `0/5 ${ar ? 'Ù…ÙƒØªÙ…Ù„' : 'complete'}`
                  }
                  accent={C.cyan}
                />
                <StatusBadge
                  label={ar ? `${unlockedCount}/4 Ù…ÙØªÙˆØ­` : `${unlockedCount}/4 open`}
                  accent={C.green}
                />
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 900 }}>
                {user.trustScore}/100
              </div>
              <div style={{ color: C.textMuted, fontSize: '0.88rem', lineHeight: 1.7 }}>
                {ar
                  ? 'ÙƒÙ„ Ø¨Ø·Ø§Ù‚Ø© Ø£Ø¯Ù†Ø§Ù‡ ØªÙˆØ¶Ø­ Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ø®Ø·ÙˆØ© Ù„Ù… ØªØ¨Ø¯Ø£ Ø£Ùˆ Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ° Ø£Ùˆ Ù…ÙƒØªÙ…Ù„Ø© Ø£Ùˆ ÙØ§Ø´Ù„Ø©ØŒ Ù…Ø¹ Ø³Ø¨Ø¨ ÙˆØ§Ø¶Ø­.'
                  : 'Each card below shows whether a step is Not Started, In Progress, Completed, or Failed, with a clear reason.'}
              </div>
            </div>
          }
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
            label={ar ? 'Ø¯Ø±Ø¬Ø© Ø§Ù„Ø«Ù‚Ø©' : 'Trust score'}
            value={`${user.trustScore}/100`}
            detail={ar ? 'Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø°ÙŠ ÙŠØªØ±Ø¬Ù… Ø§Ù„Ø«Ù‚Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚.' : 'The number behind in-app trust.'}
            icon={<Shield size={18} />}
            accent={heroAccent}
          />
          <MetricCard
            label={ar ? 'Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ù…ÙƒØªÙ…Ù„' : 'Checks done'}
            value={
              effectiveStatus
                ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps}`
                : '0/5'
            }
            detail={ar ? 'Ù‡ÙˆÙŠØ© ÙˆØ§ØªØµØ§Ù„ ÙˆÙˆØ«Ø§Ø¦Ù‚ ÙˆÙ…Ø­ÙØ¸Ø©.' : 'Identity, contact, documents, and wallet.'}
            icon={<CheckCircle2 size={18} />}
            accent={C.cyan}
          />
          <MetricCard
            label={ar ? 'Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø§Ù„Ù…Ø­Ø¸ÙˆØ±Ø©' : 'Blocked checks'}
            value={`${effectiveStatus?.blockedSteps.length ?? 0}`}
            detail={
              ar
                ? 'Ø£ÙŠ Ø®Ø·ÙˆØ© ÙØ§Ø´Ù„Ø© ØªØ¸Ù‡Ø± Ø¨Ø³Ø¨Ø¨ ÙˆØ§Ø¶Ø­ ÙˆÙ„Ø§ ØªØ¨Ù‚Ù‰ Ù…Ø¹Ù„Ù‚Ø©.'
                : 'Failed steps show a reason instead of staying stuck.'
            }
            icon={<AlertTriangle size={18} />}
            accent={(effectiveStatus?.blockedSteps.length ?? 0) > 0 ? C.error : C.green}
          />
          <MetricCard
            label={ar ? 'Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Wallet status'}
            value={walletTone.label}
            detail={
              ar
                ? 'Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø³Ù„ÙŠÙ…Ø© ØªØ­Ø§ÙØ¸ Ø¹Ù„Ù‰ ØªØ¯ÙÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª.'
                : 'Healthy wallet standing keeps operations available.'
            }
            icon={<Wallet size={18} />}
            accent={walletTone.color}
          />
        </div>

        <SectionCard
          title={ar ? 'Ù…Ø§ Ø§Ù„Ø°ÙŠ ÙŠÙØªØ­ Ø¨Ø¹Ø¯ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø·ÙˆØ©ØŸ' : 'What unlocks after this step?'}
          subtitle={
            ar
              ? 'Ø§Ø±Ø¨Ø· Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„ØªØ§Ù„ÙŠ Ø¨Ø§Ù„Ù‚Ø¯Ø±Ø§Øª Ø§Ù„ØªÙŠ Ø³ØªØµØ¨Ø­ Ù…ØªØ§Ø­Ø© Ø£Ùˆ Ø£ÙˆØ¶Ø­ Ø¹Ù†Ø¯ Ø§ÙƒØªÙ…Ø§Ù„Ù‡.'
              : 'Tie the next action directly to the capabilities that become available or clearer once it is done.'
          }
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
                background: `radial-gradient(circle at top left, ${heroAccent}12, transparent 36%), rgba(255,255,255,0.03)`,
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
                {ar ? 'Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©' : 'Next unlock'}
              </div>
              <div
                style={{
                  color: '#FFFFFF',
                  fontSize: TYPE.size.xl,
                  fontWeight: TYPE.weight.ultra,
                  fontFamily: F,
                }}
              >
                {getTrustStepTitle(effectiveStatus?.nextStepId ?? null, ar)}
              </div>
              <div
                style={{
                  color: C.textMuted,
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.7,
                  fontFamily: F,
                }}
              >
                {getNextTrustStepDetail(effectiveStatus ?? null, ar)}
              </div>
              {effectiveStatus?.blockedSteps.length ? (
                <div
                  style={{
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: `1px solid ${C.error}26`,
                    background: `${C.error}12`,
                    color: '#FECACA',
                    fontSize: TYPE.size.sm,
                    lineHeight: 1.65,
                    fontFamily: F,
                  }}
                >
                  {ar
                    ? `Ù‡Ù†Ø§Ùƒ ${effectiveStatus.blockedSteps.length} Ø®Ø·ÙˆØ© Ù…Ø­Ø¸ÙˆØ±Ø© ÙŠØ¬Ø¨ Ø­Ù„Ù‡Ø§ Ù‚Ø¨Ù„ Ø§Ø¹ØªØ¨Ø§Ø± Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¬Ø§Ù‡Ø²Ø§Ù‹ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„.`
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
                background: 'rgba(255,255,255,0.03)',
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
                {ar ? 'Ø§Ù„Ù‚Ø¯Ø±Ø§Øª Ø§Ù„Ù…Ù‚ÙÙ„Ø© Ø§Ù„Ø¢Ù†' : 'Capabilities still gated'}
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
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span style={{ color: '#FFFFFF', fontSize: TYPE.size.sm, fontFamily: F }}>
                      {item.title}
                    </span>
                    <StatusBadge
                      label={ar ? 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø®Ø·ÙˆØ©' : 'Waiting on next step'}
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
                    ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø¯Ø±Ø© Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ù‚ÙÙ„Ø© Ø§Ù„Ø¢Ù†. Ø§Ø³ØªØ®Ø¯Ù… Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø© Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ© ÙÙ‚Ø·.'
                    : 'No core capability is currently gated. Use this page for periodic review only.'}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        <div ref={workflowRef} style={{ display: 'grid', gap: SPACE[5], marginBottom: SPACE[6] }}>
          <SectionCard
            title={ar ? 'Ø³ÙŠØ± Ø§Ù„ØªØ­Ù‚Ù‚ Ø§Ù„Ø¹Ù…Ù„ÙŠ' : 'Actionable verification flow'}
            subtitle={
              ar
                ? 'ÙƒÙ„ Ø®Ø·ÙˆØ© Ù„Ø¯ÙŠÙ‡Ø§ Ø¥Ø¬Ø±Ø§Ø¡ ÙˆØ§Ø¶Ø­ ÙˆÙ„Ø§ ÙŠØ³Ù…Ø­ Ù„Ø£ÙŠ Ø­Ø§Ù„Ø© Ø£Ù† ØªØ¨Ù‚Ù‰ ØºÙŠØ± Ù…Ø­Ø³ÙˆÙ…Ø©.'
                : 'Each step has a direct action and no state is allowed to remain indeterminate.'
            }
            icon={<Activity size={16} color={C.cyan} />}
          >
            <div style={{ display: 'grid', gap: SPACE[4] }}>
              <div ref={identityRef}>
                <StepCard
                  title={ar ? 'Ø§Ù„Ù‡ÙˆÙŠØ© / Ø³Ù†Ø¯' : 'Identity / Sanad'}
                  subtitle={
                    effectiveStatus?.steps.identity.detail ??
                    'Submit Sanad verification to continue.'
                  }
                  state={effectiveStatus?.steps.identity.state ?? 'not_started'}
                  icon={
                    <Shield
                      size={16}
                      color={getPanelAccent(effectiveStatus?.steps.identity.state ?? 'not_started')}
                    />
                  }
                  footer={
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <Button
                        onClick={() => {
                          void handleSubmitIdentity();
                        }}
                        disabled={
                          actionKey === 'identity' ||
                          effectiveStatus?.steps.identity.state === 'in_progress'
                        }
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {actionKey === 'identity'
                          ? ar
                            ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                            : 'Submitting'
                          : effectiveStatus?.steps.identity.state === 'failed'
                            ? ar
                              ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                              : 'Resubmit'
                            : ar
                              ? 'Ø¥Ø±Ø³Ø§Ù„ Ù„Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©'
                              : 'Submit for review'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          void reloadTrustStatus();
                        }}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {ar ? 'ØªØ­Ø¯ÙŠØ«' : 'Refresh'}
                      </Button>
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
                          color: '#FECACA',
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
                      placeholder={ar ? 'Ù…Ø±Ø¬Ø¹ Ø³Ù†Ø¯ Ø£Ùˆ Ø±Ù‚Ù… Ø§Ù„Ø¬Ù„Ø³Ø©' : 'Sanad reference or session id'}
                    />
                    <FormField
                      value={identityDocumentReference}
                      onChange={setIdentityDocumentReference}
                      placeholder={ar ? 'Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)' : 'Document reference (optional)'}
                    />
                    {formatTimestamp(effectiveStatus?.steps.identity.updatedAt) ? (
                      <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                        {ar ? 'Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«:' : 'Last update:'}{' '}
                        {formatTimestamp(effectiveStatus?.steps.identity.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </StepCard>
              </div>

              <div ref={contactRef}>
                <StepCard
                  title={ar ? 'Ø§Ù„Ø¨Ø±ÙŠØ¯ ÙˆØ§Ù„Ù‡Ø§ØªÙ' : 'Email and phone'}
                  subtitle={
                    ar
                      ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¨Ø±ÙŠØ¯ ÙˆØ§Ù„Ù‡Ø§ØªÙ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØºÙŠÙ‘Ø± Ø§Ù„Ø­Ø§Ù„Ø© Ù…Ø¨Ø§Ø´Ø±Ø©.'
                      : 'Email and phone verification should move state immediately.'
                  }
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
                        background: 'rgba(255,255,255,0.02)',
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
                        <div
                          style={{ color: '#EFF6FF', fontWeight: TYPE.weight.bold, fontFamily: F }}
                        >
                          {ar ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¨Ø±ÙŠØ¯' : 'Email confirmation'}
                        </div>
                        <StatusBadge
                          label={
                            getStepBadge(effectiveStatus?.steps.email.state ?? 'not_started', ar)
                              .label
                          }
                          accent={
                            getStepBadge(effectiveStatus?.steps.email.state ?? 'not_started', ar)
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
                      <div style={{ color: '#EFF6FF', fontSize: TYPE.size.sm, fontFamily: F }}>
                        {user.email || effectiveStatus?.steps.email.meta.email || 'No email'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <Button
                          onClick={() => {
                            void handleResendEmail();
                          }}
                          disabled={
                            actionKey === 'email' ||
                            effectiveStatus?.steps.email.state === 'completed'
                          }
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {actionKey === 'email'
                            ? ar
                              ? 'ÙŠØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                              : 'Sending'
                            : effectiveStatus?.steps.email.state === 'completed'
                              ? ar
                                ? 'ØªÙ… Ø§Ù„ØªØ£ÙƒÙŠØ¯'
                                : 'Confirmed'
                              : ar
                                ? 'Ø¥Ø±Ø³Ø§Ù„ Ø±Ø§Ø¨Ø· Ø§Ù„ØªØ£ÙƒÙŠØ¯'
                                : 'Send confirmation'}
                        </Button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 10,
                        padding: SPACE[4],
                        borderRadius: 16,
                        border: `1px solid ${getPanelAccent(effectiveStatus?.steps.phone.state ?? 'not_started')}24`,
                        background: 'rgba(255,255,255,0.02)',
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
                        <div
                          style={{ color: '#EFF6FF', fontWeight: TYPE.weight.bold, fontFamily: F }}
                        >
                          {ar ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù‡Ø§ØªÙ' : 'Phone confirmation'}
                        </div>
                        <StatusBadge
                          label={
                            getStepBadge(effectiveStatus?.steps.phone.state ?? 'not_started', ar)
                              .label
                          }
                          accent={
                            getStepBadge(effectiveStatus?.steps.phone.state ?? 'not_started', ar)
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
                            color: '#FECACA',
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
                        <Button
                          onClick={() => {
                            void handleStartPhone();
                          }}
                          disabled={actionKey === 'phone-start'}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {actionKey === 'phone-start'
                            ? ar
                              ? 'ÙŠØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                              : 'Sending'
                            : effectiveStatus?.steps.phone.state === 'in_progress'
                              ? ar
                                ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ÙƒÙˆØ¯'
                                : 'Resend code'
                              : ar
                                ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ÙƒÙˆØ¯'
                                : 'Send code'}
                        </Button>
                      </div>
                      {(effectiveStatus?.steps.phone.state === 'in_progress' ||
                        effectiveStatus?.steps.phone.state === 'failed') && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <FormField
                            value={phoneCode}
                            onChange={setPhoneCode}
                            placeholder={ar ? 'Ø£Ø¯Ø®Ù„ ÙƒÙˆØ¯ Ø§Ù„ØªØ­Ù‚Ù‚' : 'Enter verification code'}
                          />
                          <Button
                            onClick={() => {
                              void handleConfirmPhone();
                            }}
                            disabled={actionKey === 'phone-confirm'}
                            className="bg-white text-slate-900 hover:bg-white/90"
                          >
                            {actionKey === 'phone-confirm'
                              ? ar
                                ? 'Ø¬Ø§Ø±Ù Ø§Ù„ØªØ£ÙƒÙŠØ¯'
                                : 'Confirming'
                              : ar
                                ? 'ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ù‡Ø§ØªÙ'
                                : 'Confirm phone'}
                          </Button>
                          {formatTimestamp(effectiveStatus?.steps.phone.meta.expiresAt) ? (
                            <div
                              style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}
                            >
                              {ar ? 'ÙŠÙ†ØªÙ‡ÙŠ Ø§Ù„ÙƒÙˆØ¯:' : 'Code expires:'}{' '}
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
                  title={ar ? 'ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø³Ø§Ø¦Ù‚' : 'Driver documents'}
                  subtitle={
                    effectiveStatus?.steps.driverDocuments.detail ??
                    'Submit driver license and compliance documents.'
                  }
                  state={effectiveStatus?.steps.driverDocuments.state ?? 'not_started'}
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
                          color: '#FECACA',
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
                        <Button
                          onClick={() => {
                            void handleEnableDriverMode();
                          }}
                          disabled={actionKey === 'driver-mode'}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {actionKey === 'driver-mode'
                            ? ar
                              ? 'ÙŠØªÙ… Ø§Ù„ØªÙØ¹ÙŠÙ„'
                              : 'Enabling'
                            : ar
                              ? 'ØªÙØ¹ÙŠÙ„ ÙˆØ¶Ø¹ Ø§Ù„Ø³Ø§Ø¦Ù‚'
                              : 'Enable Driver mode'}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <FormField
                          value={licenseNumber}
                          onChange={setLicenseNumber}
                          placeholder={ar ? 'Ø±Ù‚Ù… Ø±Ø®ØµØ© Ø§Ù„Ø³Ø§Ø¦Ù‚' : 'Driver license number'}
                        />
                        <FormField
                          value={driverDocumentReference}
                          onChange={setDriverDocumentReference}
                          placeholder={
                            ar ? 'Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)' : 'Document reference (optional)'
                          }
                        />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <Button
                            onClick={() => {
                              void handleSubmitDriverDocuments();
                            }}
                            disabled={
                              actionKey === 'driver-documents' ||
                              effectiveStatus?.steps.driverDocuments.state === 'in_progress'
                            }
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {actionKey === 'driver-documents'
                              ? ar
                                ? 'Ø¬Ø§Ø±Ù Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                                : 'Submitting'
                              : effectiveStatus?.steps.driverDocuments.state === 'failed'
                                ? ar
                                  ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„'
                                  : 'Resubmit'
                                : ar
                                  ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚'
                                  : 'Submit documents'}
                          </Button>
                        </div>
                      </>
                    )}
                    {formatTimestamp(effectiveStatus?.steps.driverDocuments.updatedAt) ? (
                      <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
                        {ar ? 'Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«:' : 'Last update:'}{' '}
                        {formatTimestamp(effectiveStatus?.steps.driverDocuments.updatedAt)}
                      </div>
                    ) : null}
                  </div>
                </StepCard>
              </div>

              <div ref={walletRef}>
                <StepCard
                  title={ar ? 'Ø³Ù„Ø§Ù…Ø© Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Wallet standing'}
                  subtitle={
                    effectiveStatus?.steps.walletStanding.detail ?? 'Wallet status unavailable.'
                  }
                  state={effectiveStatus?.steps.walletStanding.state ?? 'failed'}
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
                      <Button
                        onClick={() => nav('/app/wallet')}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {ar ? 'Ø§ÙØªØ­ Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Open wallet'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => nav('/app/settings?section=account')}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {ar ? 'Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø­Ø³Ø§Ø¨' : 'Account settings'}
                      </Button>
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
                        color: '#FECACA',
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
          title={ar ? 'Ø§Ù„Ù‚Ø¯Ø±Ø§Øª Ø§Ù„Ù…ÙØªÙˆØ­Ø© Ø§Ù„Ø¢Ù†' : 'Capability matrix'}
          subtitle={
            ar
              ? 'Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ© Ù„Ù„Ø«Ù‚Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªØ¸Ù‡Ø± ÙƒÙ‚Ø¯Ø±Ø§Øª Ù…ÙØªÙˆØ­Ø© Ø£Ùˆ Ù…ØºÙ„Ù‚Ø© Ø¨ÙˆØ¶ÙˆØ­.'
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
                  background: 'rgba(255,255,255,0.03)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
                  <div style={{ color: '#EFF6FF', fontWeight: TYPE.weight.bold, fontFamily: F }}>
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
                        ? 'Ø§Ù„Ø´Ø±Ø· Ù…ÙƒØªÙ…Ù„ ÙˆÙŠÙ…ÙƒÙ† ØªÙ†ÙÙŠØ° Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡ Ø§Ù„Ø¢Ù†.'
                        : 'This action is available right now.'
                      : (item.gate.reason ??
                        item.gate.recommendation ??
                        (ar ? 'Ø®Ø·ÙˆØ© Ø¥Ø¶Ø§ÙÙŠØ© Ù…Ø·Ù„ÙˆØ¨Ø©.' : 'One more step is required.'))}
                  </div>
                </div>
                <StatusBadge
                  label={item.gate.allowed ? (ar ? 'Ù…ÙØªÙˆØ­' : 'Open') : ar ? 'Ù…ØºÙ„Ù‚' : 'Locked'}
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

