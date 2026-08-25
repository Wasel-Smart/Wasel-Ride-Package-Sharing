import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Headphones,
  Lock,
  MousePointerClick,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { R, SH } from '../../../utils/wasel-ds';
import { C, SectionHeader } from '../HomePageShared';
import { useLanguage } from '../../../contexts/LanguageContext';
import { tx } from '../../../locales/tx';

interface SectionNavigationProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

function getProofMetrics(t: (key: string) => string, ar: boolean) {
  return [
    {
      label: t('conversionSections.proof_metric_core_flows_label'),
      value: t('conversionSections.proof_metric_core_flows_value'),
      detail: t('conversionSections.proof_metric_core_flows_detail'),
      accent: C.cyan,
    },
    {
      label: t('conversionSections.proof_metric_trust_checks_label'),
      value: t('conversionSections.proof_metric_trust_checks_value'),
      detail: t('conversionSections.proof_metric_trust_checks_detail'),
      accent: C.green,
    },
    {
      label: t('conversionSections.proof_metric_ad_resale_label'),
      value: t('conversionSections.proof_metric_ad_resale_value'),
      detail: t('conversionSections.proof_metric_ad_resale_detail'),
      accent: C.gold,
    },
    {
      label: t('conversionSections.proof_metric_ux_signals_label'),
      value: t('conversionSections.proof_metric_ux_signals_value'),
      detail: t('conversionSections.proof_metric_ux_signals_detail'),
      accent: C.blueLight,
    },
  ];
}

function getOnboardingSteps(t: (key: string) => string, ar: boolean) {
  return [
    {
      icon: Route,
      title: t('conversionSections.onboarding_step_1_title'),
      detail: t('conversionSections.onboarding_step_1_detail'),
    },
    {
      icon: BarChart3,
      title: t('conversionSections.onboarding_step_2_title'),
      detail: t('conversionSections.onboarding_step_2_detail'),
    },
    {
      icon: BadgeCheck,
      title: t('conversionSections.onboarding_step_3_title'),
      detail: t('conversionSections.onboarding_step_3_detail'),
    },
    {
      icon: Headphones,
      title: t('conversionSections.onboarding_step_4_title'),
      detail: t('conversionSections.onboarding_step_4_detail'),
    },
  ];
}

function getTrustLinks(t: (key: string) => string, ar: boolean) {
  return [
    {
      icon: Lock,
      title: t('conversionSections.trust_privacy_title'),
      detail: t('conversionSections.trust_privacy_detail'),
      path: '/app/privacy',
      accent: C.cyan,
    },
    {
      icon: ShieldCheck,
      title: t('conversionSections.trust_security_title'),
      detail: t('conversionSections.trust_security_detail'),
      path: '/app/security',
      accent: C.green,
    },
    {
      icon: BadgeCheck,
      title: t('conversionSections.trust_terms_title'),
      detail: t('conversionSections.trust_terms_detail'),
      path: '/app/terms',
      accent: C.gold,
    },
    {
      icon: Headphones,
      title: t('conversionSections.trust_support_title'),
      detail: t('conversionSections.trust_support_detail'),
      path: '/app/support',
      accent: C.blueLight,
    },
  ];
}

const onboardingStepsAr = [
  {
    icon: Route,
    title: 'اختار المسار',
    detail: 'ابدأ من عمّان، العقبة، إربد، الزرقاء، البحر الميت، البتراء، أو مسارك المحفوظ.',
  },
  {
    icon: BarChart3,
    title: 'قارن الخيارات الحقيقية',
    detail: 'شاهد المقاعد المتاحة، البديل المجدول، سعر المسار، وسياق الثقة معاً.',
  },
  {
    icon: BadgeCheck,
    title: 'أكد بثقة',
    detail: 'احجز، اعرض مقاعد، أو أرسل طرداً فقط بعد ظهور التفاصيل الصحيحة.',
  },
  {
    icon: Headphones,
    title: 'تتبع وحل',
    detail: 'التتبع المباشر، إثبات التسليم، حالة المحفظة، والدعم تبقى مرتبطة.',
  },
] as const;

const trustLinks = [
  {
    icon: Lock,
    title: 'Privacy',
    detail: 'What Wasel collects, why it is used, how users control it, and what is never sold.',
    path: '/app/privacy',
    accent: C.cyan,
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    detail: 'Account protection, encryption, two-factor setup, trust gates, and monitoring.',
    path: '/app/security',
    accent: C.green,
  },
  {
    icon: BadgeCheck,
    title: 'Terms',
    detail: 'Eligibility, payments, conduct, cancellation, dispute flow, and platform role.',
    path: '/app/terms',
    accent: C.gold,
  },
  {
    icon: Headphones,
    title: 'Support',
    detail: 'Escalation paths for rides, parcels, account access, payments, and safety issues.',
    path: '/app/support',
    accent: C.blueLight,
  },
] as const;

const trustLinksAr = [
  {
    icon: Lock,
    title: 'الخصوصية',
    detail: 'ما الذي يجمعه واصل، لماذا يستخدمه، كيف يتحكم المستخدمون به، وما الذي لا يتم بيعه أبداً.',
    path: '/app/privacy',
    accent: C.cyan,
  },
  {
    icon: ShieldCheck,
    title: 'الأمان',
    detail: 'حماية الحساب، التشفير، إعداد التحقق بخطوتين، بوابات الثقة، والمراقبة.',
    path: '/app/security',
    accent: C.green,
  },
  {
    icon: BadgeCheck,
    title: 'الشروط',
    detail: 'الأهلية، المدفوعات، السلوك، الإلغاء، مسار النزاعات، ودور المنصة.',
    path: '/app/terms',
    accent: C.gold,
  },
  {
    icon: Headphones,
    title: 'الدعم',
    detail: 'مسارات التصعيد للرحلات، الطرود، الوصول للحساب، المدفوعات، والسلامة.',
    path: '/app/support',
    accent: C.blueLight,
  },
] as const;

function ArrowCta({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: accent,
        fontWeight: 850,
        fontSize: '0.78rem',
      }}
    >
      {label}
      <ArrowRight size={13} />
    </span>
  );
}

export function ProofSection({ ar, onNavigate }: SectionNavigationProps) {
  const metrics = ar ? proofMetricsAr : proofMetrics;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={ar ? 'إثبات قبل التسجيل' : 'Proof before signup'}
        icon="P"
        action={ar ? 'افتح الثقة' : 'Open trust'}
        onAction={() => onNavigate('/app/trust', 'proof_trust')}
      />
      <div
        className="wasel-home-proof-grid"
        style={{
          gridTemplateColumns: '1.05fr 0.95fr',
        }}
      >
        <div
          className="wasel-home-proof-hero-card"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: SH.sm,
          }}
        >
          <div
            className="wasel-home-proof-hero-badge"
            style={{ color: C.cyan }}
          >
            <ShieldCheck size={14} />
            {ar ? 'مصداقية مدمجة' : 'Built-in credibility'}
          </div>
          <h2
            className="wasel-home-proof-hero-title"
          >
            {ar
              ? 'الثقة والدعم واقتصاديات المسار واضحة قبل أن يلتزم المستخدم.'
              : 'Trust, support, and route economics are visible before users commit.'}
          </h2>
          <p className="wasel-home-proof-hero-desc">
            {ar
              ? 'لا يطلب Wasel من الناس تنسيق الحركة بلا وضوح. يعرض المنتج سياق المسار وجاهزية الثقة ومسارات الدعم وضوابط الخصوصية في نفس نقاط قرار الحجز أو العرض أو الإرسال.'
              : 'Wasel does not ask people to coordinate movement blindly. The product exposes route context, trust readiness, support paths, and privacy controls at the same points where users decide whether to book, offer, or send.'}
          </p>
          <div className="wasel-home-proof-hero-actions">
            <WaselButton
              type="button"
              variant="primary"
              iconEnd={<ArrowRight size={15} />}
              onClick={() => onNavigate('/auth?tab=register', 'proof_register')}
            >
              {ar ? 'أنشئ حسابا موثوقا' : 'Create trusted account'}
            </WaselButton>
            <WaselButton
              type="button"
              variant="outline"
              onClick={() => onNavigate('/app/security', 'proof_security')}
              style={{ background: C.elevated, color: C.text }}
            >
              {ar ? 'راجع الأمان' : 'Review security'}
            </WaselButton>
          </div>
        </div>

        <div className="wasel-home-proof-metrics">
          {metrics.map(metric => (
            <div
              key={metric.label}
              className="wasel-home-proof-metric-card"
              style={{
                borderColor: `${metric.accent}24`,
              }}
            >
              <div
                className="wasel-home-proof-metric-value"
                style={{ color: metric.accent }}
              >
                {metric.value}
              </div>
              <div>
                <div className="wasel-home-proof-metric-label">{metric.label}</div>
                <div className="wasel-home-proof-metric-detail">
                  {metric.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function OnboardingDemoSection({ ar, onNavigate }: SectionNavigationProps) {
  const steps = ar ? onboardingStepsAr : onboardingSteps;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={ar ? 'تدفق تجريبي موجه' : 'Guided demo flow'}
        icon="D"
        action={ar ? 'ابدأ التجربة' : 'Start demo'}
        onAction={() => onNavigate('/find-ride?demo=1', 'demo_start_header')}
      />
      <div
        className="wasel-home-demo-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              style={{
                minHeight: 190,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: R.xl,
                padding: '18px',
                background: index === 0 ? C.cyanDim : C.card,
                border: `1px solid ${index === 0 ? C.borderHov : C.border}`,
                boxShadow: index === 0 ? SH.sm : SH.none,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 42,
                    height: 42,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: R.lg,
                    color: index === 0 ? C.bg : C.cyan,
                    background: index === 0 ? C.cyan : C.elevated,
                    border: `1px solid ${C.borderFaint}`,
                  }}
                >
                  <Icon size={18} />
                </span>
                <span style={{ color: C.textDim, fontSize: '0.72rem', fontWeight: 850 }}>
                  0{index + 1}
                </span>
              </div>
              <div style={{ marginTop: 18, color: C.text, fontSize: '0.98rem', fontWeight: 900 }}>
                {step.title}
              </div>
              <div
                style={{ marginTop: 8, color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.62 }}
              >
                {step.detail}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta
                  label={index === 0 ? (ar ? 'ابدأ هنا' : 'Begin here') : ar ? 'مشمول' : 'Included'}
                  accent={index === 0 ? C.cyan : C.textDim}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: R.xl,
          padding: '16px 18px',
          background: C.elevated,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.textMuted }}>
          <MousePointerClick size={16} color={C.cyan} />
          <span style={{ fontSize: '0.84rem', lineHeight: 1.55 }}>
            {ar
              ? 'يحافظ وضع التجربة على تدفق بسيط: المسار أولا، ثم قرار واضح في كل خطوة.'
              : 'Demo mode keeps the flow low-friction: route first, then one clear decision at a time.'}
          </span>
        </div>
        <WaselButton
          type="button"
          variant="outline"
          iconEnd={<ArrowRight size={14} />}
          onClick={() => onNavigate('/find-ride?demo=1', 'demo_start_footer')}
          style={{ background: C.card, color: C.text }}
        >
          {ar ? 'جرب البداية الموجهة' : 'Try the guided start'}
        </WaselButton>
      </div>
    </motion.section>
  );
}

export function TrustPagesSection({ ar, onNavigate }: SectionNavigationProps) {
  const links = ar ? trustLinksAr : trustLinks;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={ar ? 'صفحات الثقة' : 'Trust pages'} icon="S" />
      <div
        className="wasel-home-trust-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}
      >
        {links.map(link => {
          const Icon = link.icon;
          return (
            <button
              type="button"
              key={link.title}
              onClick={() => onNavigate(link.path, `trust_${link.title.toLowerCase()}`)}
              style={{
                minHeight: 172,
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'left',
                borderRadius: R.xl,
                padding: '18px',
                background: C.card,
                border: `1px solid ${link.accent}24`,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: R.lg,
                  color: link.accent,
                  background: `${link.accent}14`,
                  border: `1px solid ${link.accent}24`,
                }}
              >
                <Icon size={18} />
              </span>
              <div style={{ marginTop: 16, color: C.text, fontWeight: 900 }}>{link.title}</div>
              <div
                style={{ marginTop: 8, color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.62 }}
              >
                {link.detail}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta label={ar ? 'افتح الصفحة' : 'Open page'} accent={link.accent} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
