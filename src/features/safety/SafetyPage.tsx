import { AlertTriangle, Headphones, Shield, ShieldCheck, Siren, UserCheck } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { Protected } from '../../pages/waselServiceShared';
import { C, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';

const GREEN = '#22C55E';
const CYAN = '#00C8E8';
const GOLD = '#F59E0B';
const RED = '#EF4444';

const SAFETY_STACK = [
  {
    icon: UserCheck,
    title: 'Verified identity',
    detail: 'Sensitive actions stay behind identity checks and trusted-account rules.',
    stat: '2-step',
    accent: GREEN,
  },
  {
    icon: Siren,
    title: 'Emergency help',
    detail: 'SOS and fast support stay one tap away during movement.',
    stat: '<60s',
    accent: RED,
  },
  {
    icon: Shield,
    title: 'Trip evidence',
    detail: 'Routes, tickets, and support events stay visible for issue resolution.',
    stat: '100%',
    accent: GOLD,
  },
  {
    icon: Headphones,
    title: 'Comfort controls',
    detail: 'Preferences and safety expectations appear before the trip begins.',
    stat: '4 rails',
    accent: CYAN,
  },
];

const RESPONSE_FLOW = [
  {
    label: 'Before booking',
    detail: 'Identity status, trust, and comfort settings appear first.',
    accent: GREEN,
  },
  {
    label: 'During trip',
    detail: 'SOS, route visibility, and handoff details stay active.',
    accent: CYAN,
  },
  {
    label: 'After trip',
    detail: 'Support, proof, and follow-up actions stay attached to the journey.',
    accent: GOLD,
  },
];

const VISIBLE_SIGNALS = [
  'Show verification before payment and before contact details unlock.',
  'Keep the emergency path clear, short, and always in the same place.',
  'Expose trip proof, ticket state, and support state without extra taps.',
  'Use calm labels and chips instead of long warnings or dense paragraphs.',
];

function stackCardStyle(accent: string) {
  return {
    borderRadius: R.xxl,
    border: `1px solid ${accent}24`,
    background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)`,
    boxShadow: SH.md,
    padding: SPACE[5],
  } as const;
}

export default function SafetyPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <Protected>
      <PageShell maxWidth={1120} dir={ar ? 'rtl' : 'ltr'}>
        <div style={{ paddingInline: SPACE[4] }}>
          <PageHero
            eyebrow="Safety Center"
            icon={<ShieldCheck size={18} />}
            title="Clear safety, visible trust, faster decisions."
            description="Safety works best when people understand it immediately. This surface keeps protection visible before booking, during movement, and after support is needed."
            accent={GREEN}
            aside={
              <div style={{ display: 'grid', gap: SPACE[3] }}>
                <StatusBadge label="Always visible" accent={GREEN} />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: SPACE[3],
                  }}
                >
                  {[
                    { label: 'Trust gates', value: '4', accent: GREEN },
                    { label: 'Response path', value: '1 tap', accent: CYAN },
                    { label: 'Trip proof', value: 'Live', accent: GOLD },
                    { label: 'Support state', value: 'Tracked', accent: RED },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{
                        borderRadius: R.xl,
                        border: `1px solid ${item.accent}24`,
                        background: `${item.accent}12`,
                        padding: `${SPACE[3]} ${SPACE[4]}`,
                      }}
                    >
                      <div
                        style={{
                          color: '#FFFFFF',
                          fontSize: TYPE.size.xl,
                          fontWeight: TYPE.weight.ultra,
                          lineHeight: TYPE.lineHeight.tight,
                        }}
                      >
                        {item.value}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: C.textMuted,
                          fontSize: TYPE.size.xs,
                          textTransform: 'uppercase',
                          letterSpacing: TYPE.letterSpacing.wide,
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: SPACE[6],
            }}
          >
            <MetricCard
              label="Verified accounts"
              value="100%"
              detail="Identity checks stay in the main trust flow."
              accent={GREEN}
              icon={<ShieldCheck size={18} />}
            />
            <MetricCard
              label="Emergency access"
              value="< 60s"
              detail="One clear route to help during active movement."
              accent={RED}
              icon={<Siren size={18} />}
            />
            <MetricCard
              label="Trip evidence"
              value="24h"
              detail="Support-proof trail stays attached to the journey."
              accent={GOLD}
              icon={<Shield size={18} />}
            />
            <MetricCard
              label="Comfort controls"
              value="4"
              detail="Preferences and trust rules stay easy to scan."
              accent={CYAN}
              icon={<Headphones size={18} />}
            />
          </div>

          <SectionCard
            title="Protection Stack"
            subtitle="The user should understand the core safety model in seconds."
            icon={<ShieldCheck size={18} color={GREEN} />}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {SAFETY_STACK.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.title} style={stackCardStyle(item.accent)}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: SPACE[3],
                        marginBottom: SPACE[4],
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 42,
                          height: 42,
                          borderRadius: R.lg,
                          background: `${item.accent}18`,
                          border: `1px solid ${item.accent}28`,
                          color: item.accent,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span
                        style={{
                          color: item.accent,
                          fontSize: TYPE.size.sm,
                          fontWeight: TYPE.weight.black,
                        }}
                      >
                        {item.stat}
                      </span>
                    </div>
                    <div
                      style={{
                        color: '#FFFFFF',
                        fontSize: TYPE.size.lg,
                        fontWeight: TYPE.weight.black,
                        letterSpacing: TYPE.letterSpacing.tight,
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        marginTop: SPACE[2],
                        color: C.textMuted,
                        fontSize: TYPE.size.sm,
                        lineHeight: TYPE.lineHeight.relaxed,
                      }}
                    >
                      {item.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Emergency Flow"
            subtitle="One page, one pattern, one predictable response model."
            icon={<AlertTriangle size={18} color={RED} />}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)',
                gap: 12,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {RESPONSE_FLOW.map((step, index) => (
                  <div key={step.label} style={stackCardStyle(step.accent)}>
                    <div
                      style={{
                        color: step.accent,
                        fontSize: TYPE.size.xs,
                        fontWeight: TYPE.weight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: TYPE.letterSpacing.wide,
                        marginBottom: SPACE[3],
                      }}
                    >
                      Step {index + 1}
                    </div>
                    <div
                      style={{
                        color: '#FFFFFF',
                        fontSize: TYPE.size.base,
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        marginTop: SPACE[2],
                        color: C.textMuted,
                        fontSize: TYPE.size.sm,
                        lineHeight: TYPE.lineHeight.relaxed,
                      }}
                    >
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div style={stackCardStyle(CYAN)}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: SPACE[3],
                    marginBottom: SPACE[4],
                  }}
                >
                  <div
                    style={{
                      color: '#FFFFFF',
                      fontSize: TYPE.size.lg,
                      fontWeight: TYPE.weight.black,
                    }}
                  >
                    User-facing rule
                  </div>
                  <StatusBadge label="Less text" accent={CYAN} />
                </div>
                <div
                  style={{
                    color: C.textMuted,
                    fontSize: TYPE.size.sm,
                    lineHeight: TYPE.lineHeight.relaxed,
                  }}
                >
                  The app should avoid long safety explanations. It should show status, readiness,
                  support state, and protection chips directly where the user is making a decision.
                </div>
                <div style={{ display: 'grid', gap: 10, marginTop: SPACE[4] }}>
                  {[
                    'Verification chip before contact details',
                    'SOS placement fixed across every active trip surface',
                    'Support and evidence tied to the exact journey card',
                  ].map(line => (
                    <div
                      key={line}
                      style={{
                        borderRadius: R.xl,
                        border: `1px solid ${C.borderFaint}`,
                        background: 'rgba(255,255,255,0.03)',
                        padding: `${SPACE[3]} ${SPACE[4]}`,
                        color: '#FFFFFF',
                        fontSize: TYPE.size.sm,
                        lineHeight: TYPE.lineHeight.relaxed,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Visible Before Booking"
            subtitle="These signals reduce confusion and increase trust without adding friction."
            icon={<Headphones size={18} color={CYAN} />}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              {VISIBLE_SIGNALS.map((line, index) => (
                <div
                  key={line}
                  style={{
                    borderRadius: R.xxl,
                    border: `1px solid ${C.border}`,
                    background:
                      'linear-gradient(145deg, rgba(16,37,58,0.92) 0%, rgba(11,29,45,0.94) 100%)',
                    boxShadow: SH.md,
                    padding: SPACE[5],
                  }}
                >
                  <div
                    style={{
                      color: CYAN,
                      fontSize: TYPE.size.xs,
                      fontWeight: TYPE.weight.bold,
                      textTransform: 'uppercase',
                      letterSpacing: TYPE.letterSpacing.wide,
                      marginBottom: SPACE[3],
                    }}
                  >
                    Signal {index + 1}
                  </div>
                  <div
                    style={{
                      color: '#FFFFFF',
                      fontSize: TYPE.size.sm,
                      lineHeight: TYPE.lineHeight.relaxed,
                    }}
                  >
                    {line}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </PageShell>
    </Protected>
  );
}
