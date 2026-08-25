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
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { R, SH } from '../../../utils/wasel-ds';
import { C, SectionHeader } from '../HomePageShared';
import type { CorridorCard } from './types';
import { tx } from '../../../locales/tx';

interface SectionNavigationProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

interface OutcomesSectionProps extends SectionNavigationProps {
  corridorCards: CorridorCard[];
}

const proofMetrics = [
  { labelKey: 'homeContent.metric_flows_label', value: '4', detailKey: 'homeContent.metric_flows_detail', accent: C.cyan },
  { labelKey: 'homeContent.metric_trust_label', value: '5', detailKey: 'homeContent.metric_trust_detail', accent: C.green },
  { labelKey: 'homeContent.metric_ads_label', value: '0', detailKey: 'homeContent.metric_ads_detail', accent: C.gold },
  { labelKey: 'homeContent.metric_ux_label', value: 'Live', valueAr: 'مباشر', detailKey: 'homeContent.metric_ux_detail', accent: C.blueLight },
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
    accent: C.cyan,
  },
  {
    labelKey: 'homeContent.outcome_drivers_label',
    titleKey: 'homeContent.outcome_drivers_title',
    detailKey: 'homeContent.outcome_drivers_detail',
    ctaKey: 'homeContent.outcome_drivers_cta',
    path: '/offer-ride',
    accent: C.gold,
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
  { icon: Lock, titleKey: 'homeContent.trust_privacy_title', detailKey: 'homeContent.trust_privacy_detail', path: '/app/privacy', accent: C.cyan },
  { icon: ShieldCheck, titleKey: 'homeContent.trust_security_title', detailKey: 'homeContent.trust_security_detail', path: '/app/security', accent: C.green },
  { icon: BadgeCheck, titleKey: 'homeContent.trust_terms_title', detailKey: 'homeContent.trust_terms_detail', path: '/app/terms', accent: C.gold },
  { icon: Headphones, titleKey: 'homeContent.trust_support_title', detailKey: 'homeContent.trust_support_detail', path: '/app/support', accent: C.blueLight },
] as const;

function ArrowCta({ label, accent, ar }: { label: string; accent: string; ar?: boolean }) {
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
      {ar ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
    </span>
  );
}

export function ProofSection({ ar, onNavigate }: SectionNavigationProps) {
  const metrics = proofMetrics;

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
              iconEnd={ar ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
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
              key={step.titleKey}
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
                {tx(step.titleKey)}
              </div>
              <div
                style={{ marginTop: 8, color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.62 }}
              >
                {tx(step.detailKey)}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta
                  ar={ar}
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
          iconEnd={ar ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          onClick={() => onNavigate('/find-ride?demo=1', 'demo_start_footer')}
          style={{ background: C.card, color: C.text }}
        >
          {ar ? 'جرب البداية الموجهة' : 'Try the guided start'}
        </WaselButton>
      </div>
    </motion.section>
  );
}

export function OutcomesSection({ ar, corridorCards, onNavigate }: OutcomesSectionProps) {
  const cards = outcomeCards;

  return (
    <motion.section initial={false} className="wasel-home-section">
      <SectionHeader title={ar ? 'نتائج المنتج' : 'Product outcomes'} icon="O" />
      <div
        className="wasel-home-outcome-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}
      >
        {cards.map(card => (
          <button
            type="button"
            key={card.titleKey}
            onClick={() =>
              onNavigate(card.path, `outcome_${card.path.replace(/\//g, '')}`)
            }
            style={{
              minHeight: 210,
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left',
              borderRadius: R.xl,
              padding: '20px',
              background: `linear-gradient(180deg, ${C.card}, ${C.elevated})`,
              border: `1px solid ${card.accent}24`,
              boxShadow: SH.sm,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                color: card.accent,
                fontSize: '0.68rem',
                fontWeight: 850,
                letterSpacing: 0,
                textTransform: 'uppercase',
              }}
            >
              {tx(card.labelKey)}
            </div>
            <div
              style={{
                marginTop: 14,
                color: C.text,
                fontSize: '1.08rem',
                fontWeight: 950,
                lineHeight: 1.16,
              }}
            >
              {tx(card.titleKey)}
            </div>
            <div
              style={{ marginTop: 10, color: C.textMuted, fontSize: '0.83rem', lineHeight: 1.7 }}
            >
              {tx(card.detailKey)}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <ArrowCta ar={ar} label={tx(card.ctaKey)} accent={card.accent} />
            </div>
          </button>
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
            background: C.elevated,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: C.cyan,
              fontWeight: 850,
            }}
          >
            <TimerReset size={16} />
            {tx('conversionSections.less_time_coordinating')}
          </div>
          <p
            style={{
              margin: '10px 0 0',
              color: C.textMuted,
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
            background: C.elevated,
            border: `1px solid ${C.border}`,
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
              <button
                type="button"
                key={card.key}
                onClick={() => onNavigate(card.path, 'outcome_corridor')}
                style={{
                  minHeight: 72,
                  textAlign: 'left',
                  borderRadius: R.lg,
                  padding: '10px 12px',
                  background: C.card2,
                  border: `1px solid ${C.borderFaint}`,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 850 }}>{card.title}</div>
                <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.68rem' }}>
                  {card.meta}
                </div>
              </button>
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
              key={link.titleKey}
              onClick={() => onNavigate(link.path, `trust_${link.path.split('/').pop()}`)}
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
              <div style={{ marginTop: 16, color: C.text, fontWeight: 900 }}>{tx(link.titleKey)}</div>
              <div
                style={{ marginTop: 8, color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.62 }}
              >
                {tx(link.detailKey)}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                <ArrowCta ar={ar} label={ar ? 'افتح الصفحة' : 'Open page'} accent={link.accent} />
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
