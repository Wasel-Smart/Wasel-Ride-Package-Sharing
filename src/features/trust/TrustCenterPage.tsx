import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  FileCheck,
  Shield,
  Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { WaselStateCard } from '../../components/system/WaselStateCard';
import {
  DataRow,
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../services/trustRules';
import { C, SPACE } from '../../utils/wasel-ds';

function getTrustStepCopy(
  id: 'account_role' | 'phone' | 'email' | 'identity' | 'driver_clearance',
  ar: boolean,
) {
  switch (id) {
    case 'account_role':
      return {
        label: ar ? 'تفعيل وضع السائق' : 'Driver mode',
        description: ar ? 'ابدأ من دور السائق قبل أي خطوة أخرى.' : 'Turn on Driver mode first.',
      };
    case 'phone':
      return {
        label: ar ? 'تأكيد الهاتف' : 'Phone verified',
        description: ar ? 'الهاتف يفتح التنبيهات والتنسيق المباشر.' : 'Required for live trip alerts.',
      };
    case 'email':
      return {
        label: ar ? 'تأكيد البريد' : 'Email verified',
        description: ar ? 'البريد يحمي الاسترداد والفواتير.' : 'Needed for receipts and recovery.',
      };
    case 'identity':
      return {
        label: ar ? 'الهوية أو سند' : 'Identity verified',
        description: ar ? 'مستوى 2 يفتح مراجعة الرحلات.' : 'Level 2 unlocks ride review.',
      };
    default:
      return {
        label: ar ? 'تصريح السائق' : 'Driver clearance',
        description: ar ? 'الاعتماد النهائي للرحلات المباشرة.' : 'Final approval for live rides.',
      };
  }
}

export default function TrustCenterPage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  if (!user) {
    return (
      <WaselStateCard
        eyebrow={ar ? 'الثقة' : 'Trust'}
        title={ar ? 'سجل الدخول لفتح مركز الثقة' : 'Sign in to open Trust Center'}
        description={
          ar
            ? 'التحقق والجاهزية والقدرات المفتوحة تظهر هنا في شاشة واحدة.'
            : 'Verification, readiness, and unlocked actions appear here in one view.'
        }
        icon={Shield}
        minHeight="60vh"
        actions={
          <Button
            onClick={() => nav('/app/auth')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {ar ? 'تسجيل الدخول' : 'Sign in'}
          </Button>
        }
      />
    );
  }

  const verificationTone =
    user.verificationLevel === 'level_3' || user.verificationLevel === 'level_2'
      ? { color: C.green, label: ar ? 'موثق' : 'Verified' }
      : user.verificationLevel === 'level_1'
        ? { color: C.gold, label: ar ? 'جزئي' : 'Partial' }
        : { color: C.error, label: ar ? 'يحتاج إكمال' : 'Action needed' };

  const driverReadiness = getDriverReadinessSummary(user);
  const incompleteSteps = driverReadiness.steps.filter(step => !step.complete);
  const completedSteps = driverReadiness.steps.length - incompleteSteps.length;
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
  const nextAction =
    driverReadiness.status === 'ready'
      ? { label: ar ? 'فتح لوحة السائق' : 'Open Driver', to: '/app/driver' }
      : driverReadiness.status === 'complete_profile'
        ? { label: ar ? 'تأكيد الحساب' : 'Verify account', to: '/app/settings' }
        : driverReadiness.status === 'complete_verification'
          ? { label: ar ? 'إكمال التحقق' : 'Finish verification', to: '/app/settings' }
          : driverReadiness.status === 'pending_review'
            ? { label: ar ? 'مراجعة الحالة' : 'Review status', to: '/app/driver' }
            : { label: ar ? 'بدء الإعداد' : 'Start setup', to: '/app/settings' };
  const heroDescription =
    driverReadiness.status === 'ready'
      ? ar
        ? 'الهوية والثقة والدفع جاهزة. المستخدم يفهم وضعه مباشرة من الأرقام.'
        : 'Identity, trust, and payouts are ready. Users can understand account status from the numbers alone.'
      : ar
        ? `أكمل ${incompleteSteps.length} خطوات لفتح الرحلات والطرود والمدفوعات بثقة واضحة.`
        : `Complete ${incompleteSteps.length} more checks to unlock rides, packages, and payouts with clear confidence.`;
  const localizedSteps = driverReadiness.steps.map(step => ({
    ...step,
    ...getTrustStepCopy(step.id, ar),
  }));
  const trustSignals = [
    {
      title: ar ? 'هوية واضحة' : 'Visible identity',
      detail: ar ? 'التحقق يظهر كحالة مباشرة بدل شرح طويل.' : 'Verification reads like a direct state, not a paragraph.',
      accent: C.cyan,
    },
    {
      title: ar ? 'قدرات مفتوحة' : 'Unlocked actions',
      detail: ar ? 'الرحلات والطرود والمدفوعات تظهر كجاهزة أو غير جاهزة.' : 'Rides, parcels, and payouts show as open or blocked.',
      accent: C.gold,
    },
    {
      title: ar ? 'خطوة تالية واحدة' : 'One next step',
      detail: ar ? 'المستخدم يرى ما الذي ينقصه فوراً.' : 'The missing requirement is visible immediately.',
      accent: C.green,
    },
  ];
  const walletTone =
    user.walletStatus === 'closed'
      ? { label: ar ? 'مغلقة' : 'Closed', color: C.error }
      : user.walletStatus === 'frozen'
      ? { label: ar ? 'مجمدة' : 'Frozen', color: C.error }
      : user.walletStatus === 'limited'
        ? { label: ar ? 'محدودة' : 'Limited', color: C.gold }
        : { label: ar ? 'نشطة' : 'Active', color: C.green };

  return (
    <PageShell maxWidth={760} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'مؤشر الثقة' : 'Trust Index'}
          icon={<StatusBadge label={verificationTone.label} accent={verificationTone.color} />}
          title={
            ar ? 'الثقة تصبح أسهل عندما تتحول إلى أرقام' : 'Trust becomes easier when it turns into numbers'
          }
          description={heroDescription}
          accent={verificationTone.color}
          actions={
            <>
              <Button
                onClick={() => nav(nextAction.to)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {nextAction.label}
              </Button>
              <Button
                variant="outline"
                onClick={() => nav('/app/settings')}
                className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                {ar ? 'الإعدادات' : 'Settings'}
              </Button>
            </>
          }
          aside={
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <StatusBadge
                  label={ar ? `${completedSteps}/5 مكتمل` : `${completedSteps}/5 complete`}
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
                  ? 'كل نقطة توضح للمستخدم ما الذي يعمل الآن وما الذي يحتاجه بعد ذلك.'
                  : 'Each point tells users what works now and what they still need next.'}
              </div>
            </div>
          }
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: SPACE[4],
            marginBottom: SPACE[6],
          }}
        >
          <MetricCard
            label={ar ? 'درجة الثقة' : 'Trust score'}
            value={`${user.trustScore}/100`}
            detail={ar ? 'الرقم الذي يترجم الثقة داخل التطبيق.' : 'The number behind in-app trust.'}
            icon={<Shield size={18} />}
            accent={verificationTone.color}
          />
          <MetricCard
            label={ar ? 'التحقق المكتمل' : 'Checks done'}
            value={`${completedSteps}/${driverReadiness.steps.length}`}
            detail={ar ? 'هوية واتصال واعتماد.' : 'Identity, contact, and clearance.'}
            icon={<CheckCircle2 size={18} />}
            accent={C.cyan}
          />
          <MetricCard
            label={ar ? 'القدرات المفتوحة' : 'Actions open'}
            value={`${unlockedCount}/${capabilityRows.length}`}
            detail={ar ? 'رحلات وطرود ومدفوعات ودعم.' : 'Rides, parcels, payouts, and support.'}
            icon={<BadgeCheck size={18} />}
            accent={C.green}
          />
          <MetricCard
            label={ar ? 'حالة المحفظة' : 'Wallet status'}
            value={walletTone.label}
            detail={ar ? 'المحفظة السليمة تحافظ على تدفق العمليات.' : 'Healthy wallet status keeps operations available.'}
            icon={<Wallet size={18} />}
            accent={walletTone.color}
          />
        </div>

        <SectionCard
          title={ar ? 'مصفوفة القدرات' : 'Capability matrix'}
          subtitle={
            ar
              ? 'هذه الشاشة تعرض ما هو مفتوح الآن بشكل مباشر.'
              : 'This screen shows exactly what is available right now.'
          }
          icon={<Activity size={16} color={C.cyan} />}
          contentPadding="0"
        >
          {capabilityRows.map(item => (
            <DataRow
              key={item.title}
              label={item.title}
              value={
                item.gate.allowed
                  ? ar
                    ? 'جاهز الآن'
                    : 'Ready now'
                  : item.gate.recommendation ?? (ar ? 'خطوة إضافية' : 'One more step')
              }
              icon={item.gate.allowed ? <BadgeCheck size={16} /> : <AlertTriangle size={16} />}
              badge={
                <StatusBadge
                  label={item.gate.allowed ? (ar ? 'مفتوح' : 'Open') : ar ? 'مغلق' : 'Locked'}
                  accent={item.gate.allowed ? C.green : C.gold}
                />
              }
              onClick={() => nav(item.gate.allowed ? '/app/driver' : '/app/settings')}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={ar ? 'جاهزية السائق' : 'Driver readiness'}
          subtitle={
            ar
              ? 'كل خطوة تقود المستخدم مباشرة إلى الإجراء التالي.'
              : 'Each step points directly to the next action.'
          }
          icon={<CarFront size={16} color={C.gold} />}
          contentPadding="0"
        >
          {localizedSteps.map(step => (
            <DataRow
              key={step.id}
              label={step.label}
              value={step.description}
              icon={step.complete ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
              badge={
                <StatusBadge
                  label={step.complete ? (ar ? 'مكتمل' : 'Done') : ar ? 'مطلوب' : 'Needed'}
                  accent={step.complete ? C.green : C.gold}
                />
              }
              onClick={() => nav(step.complete ? '/app/driver' : '/app/settings')}
            />
          ))}
        </SectionCard>

        <SectionCard
          title={ar ? 'إشارات الثقة التي يراها المستخدم' : 'Trust signals users can read fast'}
          subtitle={
            ar
              ? 'هوية واضحة، قدرات واضحة، ومسار واحد للخطوة التالية.'
              : 'Clear identity, clear capabilities, and one direct next step.'
          }
          icon={<Shield size={16} color={C.green} />}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: SPACE[4],
            }}
          >
            {trustSignals.map(signal => (
              <div
                key={signal.title}
                style={{
                  minWidth: 0,
                  padding: `${SPACE[4]} ${SPACE[4]}`,
                  borderRadius: 18,
                  border: `1px solid ${signal.accent}24`,
                  background: `radial-gradient(circle at top left, ${signal.accent}14, transparent 32%), rgba(255,255,255,0.03)`,
                }}
              >
                <div
                  style={{
                    color: signal.accent,
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  {signal.title}
                </div>
                <div style={{ color: C.textMuted, fontSize: '0.84rem', lineHeight: 1.65 }}>
                  {signal.detail}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
