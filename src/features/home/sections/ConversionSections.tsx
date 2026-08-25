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
  const { t } = useLanguage();
  const metrics = getProofMetrics(t, ar);

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={t('conversionSections.proof_title')}
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
            {t('conversionSections.proof_hero_badge')}
          </div>
          <h2
            className="wasel-home-proof-hero-title"
          >
            {t('conversionSections.proof_hero_title')}
          </h2>
          <p className="wasel-home-proof-hero-desc">
            {t('conversionSections.proof_hero_desc')}
          </p>
          <div className="wasel-home-proof-hero-actions">
            <WaselButton
              type="button"
              variant="primary"
              iconEnd={<ArrowRight size={15} />}
              onClick={() => onNavigate('/auth?tab=register', 'proof_register')}
            >
              {t('conversionSections.proof_cta_primary')}
            </WaselButton>
            <WaselButton
              type="button"
              variant="outline"
              onClick={() => onNavigate('/app/security', 'proof_security')}
              style={{ background: C.elevated, color: C.text }}
            >
              {t('conversionSections.proof_cta_secondary')}
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
  const { t } = useLanguage();
  const steps = getOnboardingSteps(t, ar);

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={t('conversionSections.onboarding_title')}
        icon="D"
        action={t('conversionSections.onboarding_action')}
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
                  label={index === 0 ? t('conversionSections.onboarding_step_cta_begin') : t('conversionSections.onboarding_step_cta_included')}
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
            {t('conversionSections.onboarding_footer_text')}
          </span>
        </div>
        <WaselButton
          type="button"
          variant="outline"
          iconEnd={<ArrowRight size={14} />}
          onClick={() => onNavigate('/find-ride?demo=1', 'demo_start_footer')}
          style={{ background: C.card, color: C.text }}
        >
          {t('conversionSections.onboarding_footer_cta')}
        </WaselButton>
      </div>
    </motion.section>
  );
}

export function TrustPagesSection({ ar, onNavigate }: SectionNavigationProps) {
  const { t } = useLanguage();
  const links = getTrustLinks(t, ar);

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={t('conversionSections.trust_title')} icon="S" />
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
                <ArrowCta label={t('conversionSections.trust_open')} accent={link.accent} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
