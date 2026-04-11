import {
  BadgeCheck,
  CheckCircle2,
  FileCheck,
  Wallet,
} from 'lucide-react';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../services/trustRules';
import {
  TRUST_THEME,
  TrustCapabilityMatrix,
  TrustDriverReadinessCard,
  TrustHeroCard,
  TrustNextStepsCard,
  TrustPageScaffold,
  TrustPresencePanels,
  TrustSignalsCard,
  TrustVerificationList,
} from './components/TrustCenterSections';

export default function TrustCenterPage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: TRUST_THEME.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: TRUST_THEME.font,
        }}
      >
        <button
          type="button"
          onClick={() => nav('/app/auth')}
          style={{
            border: 'none',
            borderRadius: 12,
            background: `linear-gradient(135deg, ${TRUST_THEME.cyan}, #1E5FAE)`,
            color: '#041018',
            fontWeight: 800,
            padding: '12px 20px',
            cursor: 'pointer',
          }}
        >
          {ar ? 'سجّل دخولك لفتح مركز الثقة' : 'Sign in to open Trust Center'}
        </button>
      </div>
    );
  }

  const verificationTone =
    user.verificationLevel === 'level_3' || user.verificationLevel === 'level_2'
      ? { color: TRUST_THEME.green, label: ar ? 'موثّق' : 'Verified' }
      : user.verificationLevel === 'level_1'
        ? { color: TRUST_THEME.gold, label: ar ? 'موثّق جزئياً' : 'Partially verified' }
        : { color: TRUST_THEME.red, label: ar ? 'يحتاج مراجعة' : 'Needs attention' };

  const driverReadiness = getDriverReadinessSummary(user);
  const completedReadinessSteps = driverReadiness.steps.filter((step) => step.complete).length;
  const readinessLabel = ar
    ? `جاهزية السائق ${completedReadinessSteps}/${driverReadiness.steps.length}`
    : `Driver readiness ${completedReadinessSteps}/${driverReadiness.steps.length}`;

  const capabilityRows = [
    { title: ar ? 'نشر رحلة' : 'Post rides', gate: evaluateTrustCapability(user, 'offer_ride') },
    { title: ar ? 'حمل طرود' : 'Carry packages', gate: evaluateTrustCapability(user, 'carry_packages') },
    { title: ar ? 'استلام مدفوعات' : 'Receive payouts', gate: evaluateTrustCapability(user, 'receive_payouts') },
    { title: ar ? 'دعم الأولوية' : 'Priority support', gate: evaluateTrustCapability(user, 'priority_support') },
  ].map((item) => ({
    title: item.title,
    description: item.gate.allowed
      ? ar
        ? 'جاهز الآن'
        : 'Ready now'
      : item.gate.recommendation ?? (ar ? 'يحتاج خطوة أخرى' : 'Needs one more step'),
    allowed: item.gate.allowed,
    statusLabel: item.gate.allowed ? (ar ? 'مفعّل' : 'Enabled') : (ar ? 'محظور' : 'Blocked'),
  }));

  const trustSignals = [
    {
      title: ar ? 'دليل الرحلة' : 'Trip proof',
      desc: ar
        ? 'احتفظ بتفاصيل الحجز والوقت والمركبة ظاهرة داخل الرحلة.'
        : 'Keep booking, time, and vehicle details visible inside the journey.',
      accent: TRUST_THEME.cyan,
    },
    {
      title: ar ? 'تسليم الطرد' : 'Package handoff',
      desc: ar
        ? 'استخدم التتبع لتأكيد المرسل والراكب والمستلم على نفس المسار.'
        : 'Use tracking to confirm sender, rider, and receiver on the same corridor.',
      accent: TRUST_THEME.gold,
    },
    {
      title: ar ? 'صعود الباص' : 'Bus boarding',
      desc: ar
        ? 'اعرض الانطلاق والوجهة والتأكيد قبل الصعود حتى يبقى التنفيذ واضحاً.'
        : 'Show departure, destination, and confirmation before boarding so execution stays clear.',
      accent: TRUST_THEME.green,
    },
  ];

  const verificationRows = [
    {
      label: ar ? 'الهوية / سند' : 'Identity / Sanad',
      sub:
        user.sanadVerified || user.verified
          ? ar
            ? 'تم التحقق من الهوية لهذا الحساب.'
            : 'Identity is verified for this account.'
          : ar
            ? 'أكمل التحقق من الهوية في إعدادات الحساب.'
            : 'Finish identity verification from account settings.',
      icon: <BadgeCheck size={18} />,
      accent: user.sanadVerified || user.verified ? TRUST_THEME.green : TRUST_THEME.gold,
      onClick: () => nav('/app/settings'),
    },
    {
      label: ar ? 'البريد والهاتف' : 'Email and phone',
      sub:
        user.emailVerified && user.phoneVerified
          ? ar
            ? 'تم تأكيد البريد والهاتف.'
            : 'Email and phone are confirmed.'
          : ar
            ? 'أكد البريد والهاتف لرفع درجة الثقة.'
            : 'Confirm email and phone to raise trust.',
      icon: <CheckCircle2 size={18} />,
      accent: user.emailVerified && user.phoneVerified ? TRUST_THEME.green : TRUST_THEME.gold,
      onClick: () => nav('/app/settings'),
    },
    {
      label: ar ? 'وثائق السائق' : 'Driver documents',
      sub:
        user.verificationLevel === 'level_3'
          ? ar
            ? 'جاهز لعمليات الرحلات وحمل الطرود.'
            : 'Ready for ride operations and package carrying.'
          : ar
            ? 'أكمل جاهزية السائق قبل عمليات الرحلات الحية.'
            : 'Complete driver readiness before live ride operations.',
      icon: <FileCheck size={18} />,
      accent: user.verificationLevel === 'level_3' ? TRUST_THEME.green : TRUST_THEME.gold,
      onClick: () => nav('/app/driver'),
    },
    {
      label: ar ? 'حالة المحفظة' : 'Wallet standing',
      sub:
        user.walletStatus === 'active'
          ? ar
            ? 'المحفظة جاهزة للمدفوعات والتحصيلات.'
            : 'Wallet is ready for payments and payouts.'
          : ar
            ? 'قيود المحفظة تحتاج مراجعة.'
            : 'Wallet restrictions need review.',
      icon: <Wallet size={18} />,
      accent: user.walletStatus === 'active' ? TRUST_THEME.green : TRUST_THEME.red,
      onClick: () => nav('/app/wallet'),
    },
  ];

  const nextStepsBody = driverReadiness.status === 'ready'
    ? ar
      ? 'حسابك جاهز للعمل. حافظ على المحفظة والإشعارات وحالة السائق للبقاء مؤهلاً وظاهراً بشكل نشط.'
      : 'Your account is ready to operate. Keep wallet standing, notifications, and driver status healthy to stay eligible and visibly active.'
    : ar
      ? 'ابدأ من الإعدادات لتأكيد البريد والهاتف، ثم أكمل جاهزية السائق من صفحة السائق قبل نشر الرحلات الحية.'
      : 'Start in Settings to confirm email and phone, then complete driver readiness from the Driver page before live ride posting.';

  return (
    <TrustPageScaffold ar={ar}>
      {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && (
        <div style={{ marginBottom: 18 }}>
          <StakeholderSignalBanner
            dir={ar ? 'rtl' : 'ltr'}
            eyebrow={ar ? 'واصل · تواصل الثقة' : 'Wasel · trust comms'}
            title={
              ar
                ? 'مركز الثقة الآن يعمل كلوحة مشتركة بين المستخدم والثقة والدعم والعمليات'
                : 'Trust center now acts as a shared board between the user, trust, support, and operations'
            }
            detail={
              ar
                ? 'التحقق والجاهزية والصلاحيات التشغيلية لم تعد تبدو رسائل منفصلة. هذه الصفحة الآن تجمعها في لغة واحدة تظهر ما هو مفعّل وما يحتاج خطوة.'
                : 'Verification, readiness, and operational permissions no longer feel like separate messages. This page now brings them into one language showing what is enabled and what still needs a step.'
            }
            stakeholders={[
              { label: ar ? 'درجة الثقة' : 'Trust score', value: `${user?.trustScore ?? 0}/100`, tone: 'green' },
              { label: ar ? 'التحقق' : 'Verification', value: verificationTone.label, tone: user?.verified || user?.sanadVerified ? 'green' : 'amber' },
              { label: ar ? 'جاهزية السائق' : 'Driver readiness', value: `${completedReadinessSteps}/${driverReadiness.steps.length}`, tone: 'teal' },
              { label: ar ? 'المحفظة' : 'Wallet standing', value: user?.walletStatus === 'active' ? (ar ? 'جاهزة' : 'Ready') : (ar ? 'مقيّدة' : 'Restricted'), tone: user?.walletStatus === 'active' ? 'blue' : 'rose' },
            ]}
            statuses={[
              { label: ar ? 'نشر رحلة' : 'Ride posting', value: capabilityRows[0]?.statusLabel ?? 'Unknown', tone: capabilityRows[0]?.allowed ? 'green' : 'amber' },
              { label: ar ? 'حمل الطرود' : 'Package carrying', value: capabilityRows[1]?.statusLabel ?? 'Unknown', tone: capabilityRows[1]?.allowed ? 'green' : 'amber' },
              { label: ar ? 'دعم الأولوية' : 'Priority support', value: capabilityRows[3]?.statusLabel ?? 'Unknown', tone: capabilityRows[3]?.allowed ? 'green' : 'amber' },
            ]}
            lanes={[
              {
                label: ar ? 'مسار التحقق' : 'Verification lane',
                detail: ar
                  ? 'البريد والهاتف والهوية وجاهزية السائق كلها تغذي صلاحيات تشغيلية حقيقية.'
                  : 'Email, phone, identity, and driver readiness all feed directly into real operating permissions.',
              },
              {
                label: ar ? 'مسار الدعم' : 'Support lane',
                detail: ar
                  ? 'الثقة الأعلى تقلل ضجيج التصعيد وتجعل التدخل أسرع عند الحاجة.'
                  : 'Higher trust reduces escalation noise and makes intervention faster when it is needed.',
              },
              {
                label: ar ? 'مسار العمليات' : 'Operations lane',
                detail: ar
                  ? 'الصلاحيات هنا تحدد ما يمكن إطلاقه فعلاً عبر الرحلات والطرود والتحصيلات.'
                  : 'The capabilities here determine what can actually go live across rides, packages, and payouts.',
              },
            ]}
          />
        </div>
      )}

      <TrustHeroCard
        title={ar ? 'مركز الثقة والتحقق' : 'Trust & Verification Center'}
        description={
          ar
            ? 'راجع حالة التحقق وجاهزية التشغيل وإشارات الوجود التي تجعل هذا الحساب جاهزاً للنشاط الحقيقي داخل واصل.'
            : 'Review verification status, operational readiness, and proof-of-life signals that make this account ready for real activity inside Wasel.'
        }
        verificationTone={verificationTone}
        trustScoreLabel={ar ? `درجة الثقة ${user.trustScore}/100` : `Trust score ${user.trustScore}/100`}
        liveProfileLabel={ar ? 'ملف حي' : 'Live profile'}
        readinessLabel={readinessLabel}
      />

      <TrustPresencePanels
        ar={ar}
        contactTitle={ar ? 'تواصل واصل المباشر' : 'Direct Wasel contact'}
        contactDescription={
          ar
            ? 'الهاتف والبريد والواتساب متاحة هنا حتى تبقى الثقة عملية وسريعة عند الحاجة.'
            : 'Phone, email, and WhatsApp stay visible here so trust remains practical and fast when needed.'
        }
      />

      <TrustVerificationList items={verificationRows} />

      <TrustDriverReadinessCard
        title={ar ? 'جاهزية السائق' : 'Driver readiness'}
        headline={driverReadiness.headline}
        detail={driverReadiness.detail}
        steps={driverReadiness.steps}
        primaryActionLabel={ar ? 'فتح صفحة السائق' : 'Open Driver'}
        secondaryActionLabel={ar ? 'إعدادات الحساب' : 'Account settings'}
        onPrimaryAction={() => nav('/app/driver')}
        onSecondaryAction={() => nav('/app/settings')}
      />

      <TrustCapabilityMatrix
        title={ar ? 'مصفوفة الصلاحيات' : 'Capability matrix'}
        items={capabilityRows}
      />

      <TrustSignalsCard
        title={ar ? 'إشارات الثقة' : 'Trust signals'}
        items={trustSignals}
      />

      <TrustNextStepsCard
        title={ar ? 'الخطوات التالية' : 'Next steps'}
        body={nextStepsBody}
      />
    </TrustPageScaffold>
  );
}
