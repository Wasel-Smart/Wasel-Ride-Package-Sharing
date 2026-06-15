import { motion } from 'motion/react';
import {
  ArrowRight,
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

interface SectionNavigationProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

interface OutcomesSectionProps extends SectionNavigationProps {
  corridorCards: CorridorCard[];
}

const proofMetrics = [
  {
    label: 'Core flows',
    value: '4',
    detail: 'Rides, driver supply, parcels, and scheduled bus fallback.',
    accent: C.cyan,
  },
  {
    label: 'Trust checks',
    value: '5',
    detail: 'Identity, email, phone, driver documents, and wallet standing.',
    accent: C.green,
  },
  {
    label: 'Ad resale',
    value: '0',
    detail: 'The privacy model is explicit: no advertising resale of user data.',
    accent: C.gold,
  },
  {
    label: 'UX signals',
    value: 'Live',
    detail: 'Web Vitals and funnel events are ready for consent-based iteration.',
    accent: C.blueLight,
  },
] as const;

const onboardingSteps = [
  {
    icon: Route,
    title: 'Choose the corridor',
    detail: 'Start with Amman, Aqaba, Irbid, Zarqa, Dead Sea, Petra, or your saved route.',
  },
  {
    icon: BarChart3,
    title: 'Compare real options',
    detail: 'See seat supply, scheduled fallback, route price, and trust context together.',
  },
  {
    icon: BadgeCheck,
    title: 'Confirm with confidence',
    detail: 'Book, offer seats, or send a parcel only after the right details are visible.',
  },
  {
    icon: Headphones,
    title: 'Track and resolve',
    detail: 'Live tracking, handoff proof, wallet status, and support stay attached.',
  },
] as const;

const outcomeCards = [
  {
    label: 'For riders',
    title: 'Pay less without guessing',
    detail: 'Route-level price, seats, and bus fallback help riders choose before committing.',
    cta: 'Find a route',
    path: '/find-ride',
    accent: C.cyan,
  },
  {
    label: 'For drivers',
    title: 'Turn empty seats into demand',
    detail: 'Drivers see request context, trust readiness, and route economics in one flow.',
    cta: 'Offer seats',
    path: '/offer-ride',
    accent: C.gold,
  },
  {
    label: 'For parcels',
    title: 'Move packages with proof',
    detail: 'Pickup, delivery, tracking, and support are part of the same corridor record.',
    cta: 'Send a parcel',
    path: '/packages',
    accent: C.orange,
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

function ArrowCta({
  label,
  accent,
}: {
  label: string;
  accent: string;
}) {
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
  return (
    <motion.section initial={false} style={{ marginTop: 34 }}>
      <SectionHeader
        title={ar ? 'إثبات قبل التسجيل' : 'Proof before signup'}
        icon="P"
        action={ar ? 'افتح الثقة' : 'Open trust'}
        onAction={() => onNavigate('/app/trust', 'proof_trust')}
      />
      <div
        className="wasel-home-proof-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 0.95fr',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
        <div
          style={{
            borderRadius: R.xxl,
            padding: '24px 24px 22px',
            background: C.card,
            border: `1px solid ${C.border}`,
            boxShadow: SH.sm,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: C.cyan,
              fontSize: '0.72rem',
              fontWeight: 850,
              letterSpacing: 0,
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={14} />
            {ar ? 'مصداقية مدمجة' : 'Built-in credibility'}
          </div>
          <h2
            style={{
              margin: '14px 0 0',
              color: C.text,
              fontSize: '1.75rem',
              lineHeight: 1.08,
              fontWeight: 950,
              letterSpacing: 0,
              maxWidth: 560,
            }}
          >
            {ar
              ? 'الثقة والدعم واقتصاديات المسار واضحة قبل أن يلتزم المستخدم.'
              : 'Trust, support, and route economics are visible before users commit.'}
          </h2>
          <p style={{ margin: '14px 0 0', color: C.textMuted, lineHeight: 1.72, maxWidth: 620 }}>
            {ar
              ? 'لا يطلب Wasel من الناس تنسيق الحركة بلا وضوح. يعرض المنتج سياق المسار وجاهزية الثقة ومسارات الدعم وضوابط الخصوصية في نفس نقاط قرار الحجز أو العرض أو الإرسال.'
              : 'Wasel does not ask people to coordinate movement blindly. The product exposes route context, trust readiness, support paths, and privacy controls at the same points where users decide whether to book, offer, or send.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
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

        <div className="wasel-home-proof-metrics" style={{ display: 'grid', gap: 12 }}>
          {proofMetrics.map(metric => (
            <div
              key={metric.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '88px minmax(0, 1fr)',
                gap: 14,
                alignItems: 'center',
                borderRadius: R.xl,
                padding: '16px 18px',
                background: C.elevated,
                border: `1px solid ${metric.accent}24`,
              }}
            >
              <div
                style={{
                  color: metric.accent,
                  fontSize: '1.35rem',
                  fontWeight: 950,
                  lineHeight: 1,
                }}
              >
                {metric.value}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 850 }}>{metric.label}</div>
                <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.55 }}>
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
  return (
    <motion.section initial={false} style={{ marginTop: 38 }}>
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
        {onboardingSteps.map((step, index) => {
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
              <div style={{ marginTop: 8, color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.62 }}>
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

export function OutcomesSection({ ar, corridorCards, onNavigate }: OutcomesSectionProps) {
  return (
    <motion.section initial={false} style={{ marginTop: 38 }}>
      <SectionHeader title={ar ? 'نتائج المنتج' : 'Product outcomes'} icon="O" />
      <div
        className="wasel-home-outcome-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}
      >
        {outcomeCards.map(card => (
          <button
            type="button"
            key={card.title}
            onClick={() => onNavigate(card.path, `outcome_${card.label.toLowerCase().replace(/\s+/g, '_')}`)}
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
              {card.label}
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
              {card.title}
            </div>
            <div style={{ marginTop: 10, color: C.textMuted, fontSize: '0.83rem', lineHeight: 1.7 }}>
              {card.detail}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <ArrowCta label={card.cta} accent={card.accent} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.cyan, fontWeight: 850 }}>
            <TimerReset size={16} />
            Less time coordinating
          </div>
          <p style={{ margin: '10px 0 0', color: C.textMuted, lineHeight: 1.65, fontSize: '0.84rem' }}>
            The same route context follows booking, approval, parcel handoff, tracking, wallet, and
            support. That is the operational outcome users actually feel.
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.green, fontWeight: 850 }}>
            <MapPinned size={16} />
            Live corridor focus
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
                <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.68rem' }}>{card.meta}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function TrustPagesSection({ ar, onNavigate }: SectionNavigationProps) {
  return (
    <motion.section initial={false} style={{ marginTop: 38 }}>
      <SectionHeader title={ar ? 'صفحات الثقة' : 'Trust pages'} icon="S" />
      <div
        className="wasel-home-trust-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}
      >
        {trustLinks.map(link => {
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
              <div style={{ marginTop: 8, color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.62 }}>
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
