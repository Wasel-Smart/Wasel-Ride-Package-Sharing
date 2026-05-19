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
      return { label: ar ? 'مكتمل' : 'Completed', accent: C.green };
    case 'in_progress':
      return { label: ar ? 'قيد التنفيذ' : 'In Progress', accent: C.cyan };
    case 'failed':
      return { label: ar ? 'فشل' : 'Failed', accent: C.error };
    default:
      return { label: ar ? 'لم يبدأ' : 'Not Started', accent: C.gold };
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
      return ar ? 'الهوية / سند' : 'Identity / Sanad';
    case 'email':
      return ar ? 'البريد الإلكتروني' : 'Email';
    case 'phone':
      return ar ? 'الهاتف' : 'Phone';
    case 'driver_documents':
      return ar ? 'وثائق السائق' : 'Driver documents';
    case 'wallet_standing':
      return ar ? 'سلامة المحفظة' : 'Wallet standing';
    default:
      return ar ? 'جاهز' : 'Ready';
  }
}

function getNextTrustStepDetail(status: TrustCenterStatus | null, ar: boolean): string {
  if (!status?.nextStepId) {
    return ar
      ? 'كل القدرات الأساسية جاهزة الآن ولا توجد خطوة تشغيلية معلقة.'
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
      return ar ? 'راجع سير التحقق أدناه.' : 'Review the verification flow below.';
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
    { title: ar ? 'نشر رحلة' : 'Post rides', gate: evaluateTrustCapability(user, 'offer_ride') },
    {
      title: ar ? 'حمل الطرود' : 'Carry packages',
      gate: evaluateTrustCapability(user, 'carry_packages'),
    },
    {
      title: ar ? 'استلام الدفعات' : 'Receive payouts',
      gate: evaluateTrustCapability(user, 'receive_payouts'),
    },
    {
      title: ar ? 'الدعم السريع' : 'Priority support',
      gate: evaluateTrustCapability(user, 'priority_support'),
    },
  ];
  const unlockedCount = capabilityRows.filter(item => item.gate.allowed).length;
  const lockedCapabilities = capabilityRows.filter(item => !item.gate.allowed);
  const walletStep = effectiveStatus?.steps.walletStanding;
  const walletTone =
    walletStep?.meta.walletStatus === 'closed'
      ? { label: ar ? 'مغلقة' : 'Closed', color: C.error }
      : walletStep?.meta.walletStatus === 'frozen'
        ? { label: ar ? 'مجمدة' : 'Frozen', color: C.error }
        : walletStep?.meta.walletStatus === 'limited'
          ? { label: ar ? 'محدودة' : 'Limited', color: C.gold }
          : walletStep?.meta.walletStatus === 'unavailable'
            ? { label: ar ? 'غير متاحة' : 'Unavailable', color: C.error }
            : { label: ar ? 'نشطة' : 'Active', color: C.green };
  const heroAccent = effectiveStatus?.blockedSteps.length
    ? C.error
    : effectiveStatus?.nextStepId
      ? C.gold
      : C.green;
  const heroLabel = effectiveStatus?.blockedSteps.length
    ? ar
      ? 'تحتاج متابعة'
      : 'Needs review'
    : effectiveStatus?.nextStepId
      ? ar
        ? 'إجراء مطلوب'
        : 'Action needed'
      : ar
        ? 'جاهز'
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
          eyebrow={ar ? 'مركز الثقة' : 'Trust Center'}
          icon={<StatusBadge label={heroLabel} accent={heroAccent} />}
          title={
            ar
              ? 'كل خطوة يجب أن تنتهي بحالة واضحة'
              : 'Every trust check should end in a clear state'
          }
          description={
            effectiveStatus
              ? effectiveStatus.nextStepId
                ? ar
                  ? `أكمل ${effectiveStatus.totalSteps - effectiveStatus.completedSteps} خطوات متبقية وتجنب أي حالة معلقة.`
                  : `Complete ${effectiveStatus.totalSteps - effectiveStatus.completedSteps} remaining checks and avoid any stuck state.`
                : ar
                  ? 'جميع خطوات الثقة الآن محسومة ويمكن للمستخدم فهم وضع الحساب فوراً.'
                  : 'Every trust step is now resolved clearly and the account state is readable at a glance.'
              : ar
                ? 'تحميل حالة الثقة الحالية...'
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
                    ? 'افتح الخطوة التالية'
                    : 'Open next step'
                  : ar
                    ? 'راجع الخطوات'
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
                    {ar ? 'يتم التحديث' : 'Refreshing'}
                  </span>
                ) : ar ? (
                  'تحديث الحالة'
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
                      ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps} ${ar ? 'مكتمل' : 'complete'}`
                      : `0/5 ${ar ? 'مكتمل' : 'complete'}`
                  }
                  accent={C.cyan}
                />
                <StatusBadge
                  label={ar ? `${unlockedCount}/4 مفتوح` : `${unlockedCount}/4 open`}
                  accent={C.green}
                />
              </div>
              <div style={{ color: '#FFFFFF', fontSize: '1.8rem', fontWeight: 900 }}>
                {user.trustScore}/100
              </div>
              <div style={{ color: C.textMuted, fontSize: '0.88rem', lineHeight: 1.7 }}>
                {ar
                  ? 'كل بطاقة أدناه توضح ما إذا كانت الخطوة لم تبدأ أو قيد التنفيذ أو مكتملة أو فاشلة، مع سبب واضح.'
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
            label={ar ? 'درجة الثقة' : 'Trust score'}
            value={`${user.trustScore}/100`}
            detail={ar ? 'الرقم الذي يترجم الثقة داخل التطبيق.' : 'The number behind in-app trust.'}
            icon={<Shield size={18} />}
            accent={heroAccent}
          />
          <MetricCard
            label={ar ? 'التحقق المكتمل' : 'Checks done'}
            value={
              effectiveStatus
                ? `${effectiveStatus.completedSteps}/${effectiveStatus.totalSteps}`
                : '0/5'
            }
            detail={ar ? 'هوية واتصال ووثائق ومحفظة.' : 'Identity, contact, documents, and wallet.'}
            icon={<CheckCircle2 size={18} />}
            accent={C.cyan}
          />
          <MetricCard
            label={ar ? 'الخطوات المحظورة' : 'Blocked checks'}
            value={`${effectiveStatus?.blockedSteps.length ?? 0}`}
            detail={
              ar
                ? 'أي خطوة فاشلة تظهر بسبب واضح ولا تبقى معلقة.'
                : 'Failed steps show a reason instead of staying stuck.'
            }
            icon={<AlertTriangle size={18} />}
            accent={(effectiveStatus?.blockedSteps.length ?? 0) > 0 ? C.error : C.green}
          />
          <MetricCard
            label={ar ? 'حالة المحفظة' : 'Wallet status'}
            value={walletTone.label}
            detail={
              ar
                ? 'المحفظة السليمة تحافظ على تدفق العمليات.'
                : 'Healthy wallet standing keeps operations available.'
            }
            icon={<Wallet size={18} />}
            accent={walletTone.color}
          />
        </div>

        <SectionCard
          title={ar ? 'ما الذي يفتح بعد هذه الخطوة؟' : 'What unlocks after this step?'}
          subtitle={
            ar
              ? 'اربط الإجراء التالي بالقدرات التي ستصبح متاحة أو أوضح عند اكتماله.'
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
                {ar ? 'الخطوة التالية' : 'Next unlock'}
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
                {ar ? 'القدرات المقفلة الآن' : 'Capabilities still gated'}
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
                      label={ar ? 'بانتظار الخطوة' : 'Waiting on next step'}
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
            title={ar ? 'سير التحقق العملي' : 'Actionable verification flow'}
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
                  title={ar ? 'الهوية / سند' : 'Identity / Sanad'}
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
                            ? 'جارٍ الإرسال'
                            : 'Submitting'
                          : effectiveStatus?.steps.identity.state === 'failed'
                            ? ar
                              ? 'إعادة الإرسال'
                              : 'Resubmit'
                            : ar
                              ? 'إرسال للمراجعة'
                              : 'Submit for review'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          void reloadTrustStatus();
                        }}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {ar ? 'تحديث' : 'Refresh'}
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
                          {ar ? 'تأكيد البريد' : 'Email confirmation'}
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
                              ? 'يتم الإرسال'
                              : 'Sending'
                            : effectiveStatus?.steps.email.state === 'completed'
                              ? ar
                                ? 'تم التأكيد'
                                : 'Confirmed'
                              : ar
                                ? 'إرسال رابط التأكيد'
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
                          {ar ? 'تأكيد الهاتف' : 'Phone confirmation'}
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
                              ? 'يتم الإرسال'
                              : 'Sending'
                            : effectiveStatus?.steps.phone.state === 'in_progress'
                              ? ar
                                ? 'إعادة إرسال الكود'
                                : 'Resend code'
                              : ar
                                ? 'إرسال الكود'
                                : 'Send code'}
                        </Button>
                      </div>
                      {(effectiveStatus?.steps.phone.state === 'in_progress' ||
                        effectiveStatus?.steps.phone.state === 'failed') && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          <FormField
                            value={phoneCode}
                            onChange={setPhoneCode}
                            placeholder={ar ? 'أدخل كود التحقق' : 'Enter verification code'}
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
                                ? 'جارٍ التأكيد'
                                : 'Confirming'
                              : ar
                                ? 'تأكيد الهاتف'
                                : 'Confirm phone'}
                          </Button>
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
                              ? 'يتم التفعيل'
                              : 'Enabling'
                            : ar
                              ? 'تفعيل وضع السائق'
                              : 'Enable Driver mode'}
                        </Button>
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
                                ? 'جارٍ الإرسال'
                                : 'Submitting'
                              : effectiveStatus?.steps.driverDocuments.state === 'failed'
                                ? ar
                                  ? 'إعادة الإرسال'
                                  : 'Resubmit'
                                : ar
                                  ? 'إرسال الوثائق'
                                  : 'Submit documents'}
                          </Button>
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
                        {ar ? 'افتح المحفظة' : 'Open wallet'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => nav('/app/settings?section=account')}
                        className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      >
                        {ar ? 'إعدادات الحساب' : 'Account settings'}
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
