import { motion } from 'motion/react';
import { ArrowRight, Clock3, Package, Route, ShieldCheck } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';

const C = {
  bg: '#040C18',
  border: 'rgba(85, 233, 255, 0.16)',
  borderSoft: 'rgba(255,255,255,0.08)',
  cyan: '#55E9FF',
  blue: '#1EA1FF',
  green: '#33E85F',
  gold: '#F5B11E',
  text: '#EFF6FF',
  muted: 'rgba(239,246,255,0.74)',
  soft: 'rgba(239,246,255,0.54)',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', 'Cairo', sans-serif";

const metrics = [
  { value: '12', label: 'priority corridors' },
  { value: '24/7', label: 'movement visibility' },
  { value: '3-in-1', label: 'rides, buses, parcels' },
  { value: 'Trust-led', label: 'verified journeys' },
] as const;

const trustPoints = [
  'One clear story: the same route can carry people and parcels without creating a messy experience.',
  'The map stays visual-first, while the meaning of each movement sits outside it where users can understand it quickly.',
  'Every action leads to one trusted workflow: discover, match, move, and complete the trip with confidence.',
] as const;

const workflowSteps = [
  {
    title: 'Choose the corridor',
    detail: 'A rider or sender starts with a city-to-city route instead of searching through disconnected transport options.',
  },
  {
    title: 'Match shared capacity',
    detail: 'Wasel groups riders, buses, and available seats on the same movement corridor to reduce cost and improve fill rate.',
  },
  {
    title: 'Track one movement stream',
    detail: 'Passenger flow and parcel flow stay visible in one system, so users understand where the trip is going and what it carries.',
  },
] as const;

const mapLegend = [
  {
    label: 'Passenger flow',
    color: C.cyan,
    detail: 'Bright motion paths show where rider demand is actively moving through the network.',
    icon: Route,
  },
  {
    label: 'Parcel flow',
    color: C.gold,
    detail: 'Parcel movement follows the same trusted corridors, so delivery feels native to the route instead of bolted on.',
    icon: Package,
  },
  {
    label: 'Verified route logic',
    color: C.green,
    detail: 'The workflow stays calm and understandable: route selection, seat matching, handoff, and trip completion.',
    icon: ShieldCheck,
  },
] as const;

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  const primaryLabel = user ? 'Open app' : 'Get started';
  const primaryPath = user ? '/app/find-ride' : '/app/auth?returnTo=/app/find-ride';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        @media (max-width: 1120px) {
          .landing-grid { grid-template-columns: 1fr !important; }
          .landing-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-cta { flex-direction: column !important; align-items: stretch !important; }
          .landing-support-grid { grid-template-columns: 1fr !important; }
          .landing-map-meta { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .landing-stats { grid-template-columns: 1fr !important; }
          .landing-hero-title { font-size: clamp(2.5rem, 13vw, 4.35rem) !important; }
          .landing-shell { padding-left: 18px !important; padding-right: 18px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 12% 18%, rgba(85,233,255,0.14), transparent 26%),
            radial-gradient(circle at 82% 16%, rgba(245,177,30,0.12), transparent 22%),
            radial-gradient(circle at 78% 72%, rgba(51,232,95,0.1), transparent 20%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 48% 0%, rgba(0,200,232,0.08), transparent 36%), radial-gradient(circle at 100% 100%, rgba(30,161,255,0.07), transparent 28%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="landing-shell"
        style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', padding: '40px 24px 82px' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <WaselLogo size={44} theme="light" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Shared rides', 'Bus corridors', 'Rider parcels'].map((label) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '7px 12px',
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.border}`,
                  color: C.soft,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <div
          className="landing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.03fr 0.97fr',
            gap: 34,
            alignItems: 'start',
            marginTop: 42,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 9999,
                  background: 'rgba(85,233,255,0.08)',
                  border: `1px solid ${C.border}`,
                  color: C.cyan,
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Premium mobility hub
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: C.soft,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                <Clock3 size={14} color={C.gold} />
                Clean landing with map-first storytelling
              </span>
            </div>

            <h1
              className="landing-hero-title"
              style={{
                margin: '20px 0 16px',
                fontSize: 'clamp(3rem, 6.2vw, 5.9rem)',
                lineHeight: 0.92,
                letterSpacing: '-0.075em',
                fontWeight: 950,
                maxWidth: 780,
              }}
            >
              <span
                style={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #CFFAFF 28%, #55E9FF 65%, #33E85F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Smarter with Wasel
              </span>
              <span style={{ display: 'block', color: C.text, marginTop: 8 }}>
                shared rides, buses, and rider-delivered packages in one system
              </span>
            </h1>

            <p style={{ maxWidth: 720, fontSize: '1.03rem', lineHeight: 1.8, color: C.muted, margin: 0 }}>
              Wasel keeps the first screen calm and premium. Users can immediately understand that one route can carry people,
              available seats, and trusted parcel handoff without jumping between different products or confusing transport flows.
            </p>

            <div
              className="landing-stats"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
                marginTop: 24,
                maxWidth: 760,
              }}
            >
              {metrics.map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 20,
                    padding: '15px 16px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                    border: `1px solid ${index === 0 ? C.border : C.borderSoft}`,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
                  }}
                >
                  <div style={{ fontSize: '1.18rem', fontWeight: 950, color: index === 0 ? C.cyan : C.text, letterSpacing: '-0.03em' }}>
                    {item.value}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: '0.75rem',
                      color: C.soft,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="landing-cta"
              style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 30, flexWrap: 'wrap' }}
            >
              <button
                onClick={() => navigate(primaryPath)}
                style={{
                  height: 52,
                  padding: '0 22px',
                  border: 'none',
                  borderRadius: 16,
                  background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
                  color: '#041018',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 16px 36px rgba(30,161,255,0.24)',
                }}
              >
                {primaryLabel}
                <ArrowRight size={17} />
              </button>

              <button
                onClick={() => navigate('/app/find-ride')}
                style={{
                  height: 52,
                  padding: '0 20px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                Explore rides
              </button>
            </div>

            <div
              className="landing-support-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginTop: 22,
                maxWidth: 780,
              }}
            >
              {trustPoints.map((item, index) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 22,
                    padding: '15px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${index === 1 ? C.border : C.borderSoft}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: index === 1 ? C.cyan : C.green,
                        boxShadow: `0 0 10px ${index === 1 ? C.cyan : C.green}`,
                      }}
                    />
                    <span
                      style={{
                        color: C.text,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {index === 1 ? 'Map principle' : 'User signal'}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: C.soft, fontSize: '0.82rem', lineHeight: 1.65 }}>{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.62 }}
            style={{ display: 'grid', gap: 16 }}
          >
            <MobilityOSLandingMap />

            <div
              className="landing-map-meta"
              style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 12 }}
            >
              <div
                style={{
                  borderRadius: 24,
                  padding: '18px 18px 16px',
                  background: 'rgba(255,255,255,0.035)',
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    color: C.cyan,
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  How to read the map
                </div>
                <p style={{ margin: '10px 0 0', color: C.muted, fontSize: '0.9rem', lineHeight: 1.7 }}>
                  The map itself stays free of text so the movement is easy to absorb at a glance. Explanation lives here,
                  where users can learn what each stream means without blocking the visual.
                </p>

                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  {mapLegend.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 18,
                          padding: '12px 13px',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${C.borderSoft}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              display: 'grid',
                              placeItems: 'center',
                              background: `${item.color}1A`,
                              border: `1px solid ${item.color}55`,
                              color: item.color,
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: C.text }}>{item.label}</div>
                            <div style={{ marginTop: 4, color: C.soft, fontSize: '0.79rem', lineHeight: 1.6 }}>{item.detail}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: '18px 18px 16px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.025))',
                  border: `1px solid ${C.borderSoft}`,
                }}
              >
                <div
                  style={{
                    color: C.gold,
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Workflow
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                  {workflowSteps.map((step, index) => (
                    <div
                      key={step.title}
                      style={{
                        borderRadius: 18,
                        padding: '13px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${index === 0 ? C.border : C.borderSoft}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 10,
                            display: 'grid',
                            placeItems: 'center',
                            background: index === 0 ? 'rgba(85,233,255,0.12)' : 'rgba(255,255,255,0.06)',
                            color: index === 0 ? C.cyan : C.text,
                            fontSize: '0.82rem',
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{step.title}</div>
                      </div>
                      <div style={{ marginTop: 8, color: C.soft, fontSize: '0.79rem', lineHeight: 1.6 }}>
                        {step.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
