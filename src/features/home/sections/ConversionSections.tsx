import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Headphones,
  Lock,
  MapPinned,
  MousePointerClick,
  Route,
  Shield,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { R, SH } from '../../../utils/wasel-ds';
import { C, SectionHeader } from '../HomePageShared';
import type { CorridorCard } from './types';
import { tx } from '../../../locales/tx';
import { toAppHref } from '../../../hooks/useIframeSafeNavigate';
import { handleSpaLinkClick } from '../../../utils/linkNavigation';

interface SectionNavigationProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

interface OutcomesSectionProps extends SectionNavigationProps {
  corridorCards: CorridorCard[];
}

// Accent policy (BRAND_GUIDELINES.md): cyan = primary, green = trust/success,
// orange = parcels. Gold/purple/blueLight accents were collapsed into cyan.
const proofMetrics = [
  { labelKey: 'homeContent.metric_flows_label', value: '4', detailKey: 'homeContent.metric_flows_detail', accent: 'var(--primary)' },
  { labelKey: 'homeContent.metric_trust_label', value: '5', detailKey: 'homeContent.metric_trust_detail', accent: C.green },
  { labelKey: 'homeContent.metric_ads_label', value: '0', detailKey: 'homeContent.metric_ads_detail', accent: 'var(--primary)' },
  { labelKey: 'homeContent.metric_ux_label', value: 'Live', valueAr: 'مباشر', detailKey: 'homeContent.metric_ux_detail', accent: 'var(--primary)' },
] as const;

const onboardingSteps = [
  { icon: Route, titleKey: 'homeContent.step_choose_title', detailKey: 'homeContent.step_choose_detail' },
  { icon: BarChart3, titleKey: 'homeContent.step_compare_title', detailKey: 'homeContent.step_compare_detail' },
  { icon: BadgeCheck, titleKey: 'homeContent.step_confirm_title', detailKey: 'homeContent.step_confirm_detail' },
  { icon: Headphones, titleKey: 'homeContent.step_track_title', detailKey: 'homeContent.step_track_detail' },
] as const;

const outcomeCards = [
  {
    labelKey: 'homeContent.outcome_riders_label',
    titleKey: 'homeContent.outcome_riders_title',
    detailKey: 'homeContent.outcome_riders_detail',
    ctaKey: 'homeContent.outcome_riders_cta',
    path: '/find-ride',
    accent: 'var(--primary)',
  },
  {
    labelKey: 'homeContent.outcome_drivers_label',
    titleKey: 'homeContent.outcome_drivers_title',
    detailKey: 'homeContent.outcome_drivers_detail',
    ctaKey: 'homeContent.outcome_drivers_cta',
    path: '/offer-ride',
    accent: 'var(--primary)',
  },
  {
    labelKey: 'homeContent.outcome_parcels_label',
    titleKey: 'homeContent.outcome_parcels_title',
    detailKey: 'homeContent.outcome_parcels_detail',
    ctaKey: 'homeContent.outcome_parcels_cta',
    path: '/packages',
    accent: C.orange,
  },
] as const;

const trustLinks = [
  { icon: Lock, titleKey: 'homeContent.trust_privacy_title', detailKey: 'homeContent.trust_privacy_detail', path: '/privacy', accent: 'var(--primary)' },
  { icon: ShieldCheck, titleKey: 'homeContent.trust_security_title', detailKey: 'homeContent.trust_security_detail', path: '/security', accent: C.green },
  { icon: Shield, titleKey: 'homeContent.trust_trust_title', detailKey: 'homeContent.trust_trust_detail', path: '/trust', accent: 'var(--primary)' },
  { icon: BadgeCheck, titleKey: 'homeContent.trust_terms_title', detailKey: 'homeContent.trust_terms_detail', path: '/terms', accent: 'var(--primary)' },
  { icon: Headphones, titleKey: 'homeContent.trust_support_title', detailKey: 'homeContent.trust_support_detail', path: '/support', accent: 'var(--primary)' },
] as const;

function ArrowCta({ label, accent, ar }: { label: string; accent: string; ar?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        color: accent,
        fontWeight: 800,
        fontSize: '0.8125rem',
      }}
    >
      {label}
      {ar ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
    </span>
  );
}

export function ProofSection({ ar, onNavigate }: SectionNavigationProps) {
  const metrics = proofMetrics;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={tx('homeContent.proof_section_title')}
        icon="P"
        action={tx('homeContent.proof_section_action')}
        onAction={() => onNavigate('/app/trust', 'proof_trust')}
      />
      <div
        className="wasel-home-proof-grid"
        style={{
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        }}
      >
        <div
          className="wasel-home-proof-hero-card"
          style={{
            background: 'var(--card)',
            border: `1px solid ${'var(--border)'}`,
            boxShadow: SH.sm,
          }}
        >
          <div
            className="wasel-home-proof-hero-badge"
            style={{ color: 'var(--primary)' }}
          >
            <ShieldCheck size={14} />
            {tx('homeContent.proof_hero_badge')}
          </div>
          <h2 className="wasel-home-proof-hero-title">
            {tx('homeContent.proof_hero_title')}
          </h2>
          <p className="wasel-home-proof-hero-desc">
            {tx('homeContent.proof_hero_desc')}
          </p>
          <div className="wasel-home-proof-hero-actions">
            <WaselButton
              type="button"
              variant="primary"
              iconEnd={ar ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
              onClick={() => { void onNavigate('/app/auth?tab=register', 'proof_register'); }}
            >
              {tx('homeContent.proof_cta_register')}
            </WaselButton>
            <WaselButton
              type="button"
              variant="outline"
              onClick={() => { void onNavigate('/app/security', 'proof_security'); }}
              style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
            >
              {tx('homeContent.proof_cta_security')}
            </WaselButton>
          </div>
        </div>

        <div className="wasel-home-proof-metrics">
          {metrics.map(metric => (
            <div
              key={metric.labelKey}
              className="wasel-home-proof-metric-card"
              style={{
                borderColor: `${metric.accent}24`,
              }}
            >
              <div
                className="wasel-home-proof-metric-value"
                style={{ color: metric.accent }}
              >
                {ar && 'valueAr' in metric ? metric.valueAr : metric.value}
              </div>
              <div>
                <div className="wasel-home-proof-metric-label">{tx(metric.labelKey)}</div>
                <div className="wasel-home-proof-metric-detail">
                  {tx(metric.detailKey)}
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
  const steps = onboardingSteps;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader
        title={tx('homeContent.demo_section_title')}
        icon="D"
        action={tx('homeContent.demo_section_action')}
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
              key={step.titleKey}
              style={{
                minHeight: 190,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: R.xl,
                padding: '18px',
                background: index === 0 ? C.cyanDim : 'var(--card)',
                border: `1px solid ${index === 0 ? 'var(--border)' : 'var(--border)'}`,
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
                    color: index === 0 ? 'var(--background)' : 'var(--primary)',
                    background: index === 0 ? 'var(--primary)' : 'var(--secondary)',
                    border: `1px solid ${'var(--border)'}`,
                  }}
                >
                  <Icon size={18} />
                </span>
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', fontWeight: 800 }}>
                  0{index + 1}
                </span>
              </div>
              <div style={{ marginTop: 18, color: 'var(--foreground)', fontSize: '0.98rem', fontWeight: 800 }}>
                {tx(step.titleKey)}
              </div>
              <div
                style={{ marginTop: 8, color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: 1.62 }}
              >
                {tx(step.detailKey)}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta
                  ar={ar}
                  label={index === 0 ? tx('homeContent.step_begin_here') : tx('homeContent.step_included')}
                  accent={index === 0 ? 'var(--primary)' : 'var(--muted-foreground)'}
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
          background: 'var(--secondary)',
          border: `1px solid ${'var(--border)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)' }}>
          <MousePointerClick size={16} color={'var(--primary)'} />
          <span style={{ fontSize: '0.84rem', lineHeight: 1.55 }}>
            {tx('homeContent.demo_footer_note')}
          </span>
        </div>
        <WaselButton
          type="button"
          variant="outline"
          iconEnd={ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          onClick={() => { void onNavigate('/find-ride?demo=1', 'demo_start_footer'); }}
          style={{ background: 'var(--card)', color: 'var(--foreground)' }}
        >
          {tx('homeContent.demo_footer_cta')}
        </WaselButton>
      </div>
    </motion.section>
  );
}

export function OutcomesSection({ ar, corridorCards, onNavigate }: OutcomesSectionProps) {
  const cards = outcomeCards;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={tx('homeContent.outcomes_section_title')} icon="O" />
      <div
        className="wasel-home-outcome-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}
      >
        {cards.map(card => (
          <a
            key={card.titleKey}
            href={toAppHref(card.path)}
            onClick={event =>
              handleSpaLinkClick(event, () =>
                onNavigate(card.path, `outcome_${card.path.replace(/\//g, '')}`),
              )
            }
            style={{
              minHeight: 210,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'start',
              textDecoration: 'none',
              color: 'inherit',
              borderRadius: R.xl,
              padding: '20px',
              background: `linear-gradient(180deg, ${'var(--card)'}, ${'var(--secondary)'})`,
              border: `1px solid ${card.accent}24`,
              boxShadow: SH.sm,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: card.accent,
                fontSize: '0.8125rem',
                fontWeight: 800,
                letterSpacing: 0,
                textTransform: 'uppercase',
              }}
            >
              {tx(card.labelKey)}
            </div>
            <div
              style={{
                marginTop: 14,
                color: 'var(--foreground)',
                fontSize: '1.08rem',
                fontWeight: 800,
                lineHeight: 1.16,
              }}
            >
              {tx(card.titleKey)}
            </div>
            <div
              style={{ marginTop: 10, color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: 1.7 }}
            >
              {tx(card.detailKey)}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <ArrowCta ar={ar} label={tx(card.ctaKey)} accent={card.accent} />
            </div>
          </a>
        ))}
      </div>

      <div
        className="wasel-home-outcome-strip"
        style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)',
          gap: 14,
        }}
      >
        <div
          style={{
            borderRadius: R.xl,
            padding: '18px 20px',
            background: 'var(--secondary)',
            border: `1px solid ${'var(--border)'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--primary)',
              fontWeight: 850,
            }}
          >
            <TimerReset size={16} />
            {tx('conversionSections.less_time_coordinating')}
          </div>
          <p
            style={{
              margin: '10px 0 0',
              color: 'var(--muted-foreground)',
              lineHeight: 1.65,
              fontSize: '0.84rem',
            }}
          >
            {tx(
              'conversionSections.the_same_route_context_follows_booking_approval_parcel_handoff_tracking_wallet_and_support_that_is_the_operational_outcome_users_actually_feel',
            )}
          </p>
        </div>
        <div
          style={{
            borderRadius: R.xl,
            padding: '18px 20px',
            background: 'var(--secondary)',
            border: `1px solid ${'var(--border)'}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: C.green,
              fontWeight: 850,
            }}
          >
            <MapPinned size={16} />
            {tx('conversionSections.live_corridor_focus')}
          </div>
          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
            }}
          >
            {corridorCards.slice(0, 3).map(card => (
              <a
                key={card.key}
                href={toAppHref(card.path)}
                onClick={event => handleSpaLinkClick(event, () => { void onNavigate(card.path, 'outcome_corridor'); })}
                style={{
                  minHeight: 72,
                  textAlign: 'start',
                  textDecoration: 'none',
                  borderRadius: R.lg,
                  padding: '10px 12px',
                  background: 'var(--muted)',
                  border: `1px solid ${'var(--border)'}`,
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{card.title}</div>
                <div style={{ marginTop: 4, color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>
                  {card.meta}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function TrustPagesSection({ ar, onNavigate }: SectionNavigationProps) {
  const links = trustLinks;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={tx('homeContent.trust_section_title')} icon="S" />
      <div
        className="wasel-home-trust-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}
      >
        {links.map(link => {
          const Icon = link.icon;
          return (
            <a
              key={link.titleKey}
              href={toAppHref(link.path)}
              onClick={event => handleSpaLinkClick(event, () => onNavigate(link.path, `trust_${link.path.split('/').pop()}`))}
              style={{
                minHeight: 172,
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'start',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: R.xl,
                padding: '18px',
                background: 'var(--card)',
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
              <div style={{ marginTop: 16, color: 'var(--foreground)', fontWeight: 800 }}>{tx(link.titleKey)}</div>
              <div
                style={{ marginTop: 8, color: 'var(--muted-foreground)', fontSize: '0.8125rem', lineHeight: 1.62 }}
              >
                {tx(link.detailKey)}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta ar={ar} label={tx('homeContent.trust_open_page')} accent={link.accent} />
              </div>
            </a>
          );
        })}
      </div>
    </motion.section>
  );
}
