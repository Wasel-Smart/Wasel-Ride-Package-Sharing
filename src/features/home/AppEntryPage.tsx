import { motion } from 'motion/react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock3,
  Package,
  Shield,
  Star,
  Zap,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselIcon, WaselLogo } from '../../components/wasel-ds/WaselLogo';

const C = {
  bg: '#040C18',
  panel: 'rgba(8, 20, 40, 0.76)',
  panelStrong: 'rgba(10, 22, 40, 0.92)',
  border: 'rgba(85, 233, 255, 0.16)',
  borderStrong: 'rgba(85, 233, 255, 0.22)',
  cyan: '#55E9FF',
  blue: '#1EA1FF',
  green: '#33E85F',
  gold: '#F5B11E',
  text: '#EFF6FF',
  muted: 'rgba(239,246,255,0.72)',
  soft: 'rgba(239,246,255,0.52)',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', 'Cairo', sans-serif";

const metrics = [
  { value: '100+', label: 'corridors and city links' },
  { value: '24/7', label: 'live trip visibility' },
  { value: '3-in-1', label: 'rides, buses, and parcels' },
  { value: 'Trust-first', label: 'verified user journeys' },
] as const;

const pillars = [
  {
    icon: Zap,
    title: 'Fast ride discovery',
    copy: 'Find intercity seats quickly with a clean route flow, live availability, and low-friction booking.',
    color: C.cyan,
  },
  {
    icon: Package,
    title: 'Rider courier network',
    copy: 'Let riders carry parcels between sender and receiver on the same trip, so delivery is built on real rides.',
    color: C.gold,
  },
  {
    icon: Bus,
    title: 'Bus corridors',
    copy: 'Offer scheduled intercity buses alongside shared rides, so the app covers both flexible and fixed movement.',
    color: C.green,
  },
  {
    icon: Shield,
    title: 'Verified trust',
    copy: 'Keep safety, identity, and confidence visible from the first tap to the final handoff.',
    color: C.blue,
  },
] as const;

const routePreview = [
  { from: 'Amman', to: 'Aqaba', note: 'Popular long-haul corridor', price: 'from JOD 8' },
  { from: 'Amman', to: 'Irbid', note: 'High-frequency city link', price: 'from JOD 3' },
  { from: 'Amman', to: 'Jerash', note: 'Short-hop regional travel', price: 'from JOD 2' },
] as const;

const heroNetworkNodes = [
  { label: 'Irbid', top: 14, left: 70, color: C.gold, line: 'gold' },
  { label: 'Jerash', top: 34, left: 58, color: C.cyan, line: 'cyan' },
  { label: 'Zarqa', top: 52, left: 84, color: C.green, line: 'green' },
  { label: 'Madaba', top: 72, left: 50, color: C.green, line: 'green' },
  { label: 'Salt', top: 38, left: 18, color: C.blue, line: 'blue' },
  { label: 'Dead Sea', top: 66, left: 8, color: C.cyan, line: 'blue' },
] as const;

const trustPoints = [
  'Built around one clear story: shared rides plus parcel handoff on the same route',
  'Balances riders, senders, receivers, and trust signals in a single journey',
  'Feels premium, calm, and direct on both desktop and mobile',
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
        @media (max-width: 980px) {
          .landing-grid { grid-template-columns: 1fr !important; }
          .landing-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-pillars { grid-template-columns: 1fr !important; }
          .landing-split { grid-template-columns: 1fr !important; }
          .landing-cta { flex-direction: column !important; align-items: stretch !important; }
        }
        @media (max-width: 560px) {
          .landing-stats { grid-template-columns: 1fr !important; }
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
            radial-gradient(circle at 84% 12%, rgba(245,177,30,0.14), transparent 24%),
            radial-gradient(circle at 78% 72%, rgba(51,232,95,0.10), transparent 24%),
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
          background: 'radial-gradient(circle at 50% 0%, rgba(0,200,232,0.08), transparent 36%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '40px 24px 78px' }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
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
                  border: '1px solid rgba(85,233,255,0.16)',
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
            gridTemplateColumns: '1.08fr 0.92fr',
            gap: 36,
            alignItems: 'center',
            marginTop: 44,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <h1
              style={{
                margin: '20px 0 16px',
                fontSize: 'clamp(2.8rem, 6vw, 5.7rem)',
                lineHeight: 0.92,
                letterSpacing: '-0.07em',
                fontWeight: 950,
                maxWidth: 760,
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
                Move smarter with Wasel
              </span>
              <span style={{ display: 'block', color: C.text, marginTop: 8 }}>
                shared rides, buses, and rider-delivered packages in one system
              </span>
            </h1>

            <p style={{ maxWidth: 700, fontSize: '1.03rem', lineHeight: 1.8, color: C.muted, margin: 0 }}>
              Wasel is designed to feel like a premium mobility product from the first screen.
              It brings intercity rides, scheduled buses, parcel handoff through riders, route discovery, and verified trust into a single experience that makes sense for real users.
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
              {metrics.map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 20,
                    padding: '15px 16px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
                  }}
                >
                  <div style={{ fontSize: '1.18rem', fontWeight: 950, color: C.text, letterSpacing: '-0.03em' }}>{item.value}</div>
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

            <div className="landing-cta" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 30, flexWrap: 'wrap' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20, maxWidth: 760 }}>
              {trustPoints.map((item) => (
                <div
                  key={item}
                  style={{
                    borderRadius: 20,
                    padding: '14px 15px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
                    <span style={{ color: C.text, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trust signal</span>
                  </div>
                  <p style={{ margin: 0, color: C.soft, fontSize: '0.82rem', lineHeight: 1.65 }}>{item}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div
              style={{
                width: 'min(100%, 500px)',
                padding: 18,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                boxShadow: '0 18px 46px rgba(0,0,0,0.26)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 28,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `
                    radial-gradient(circle at 58% 34%, rgba(85,233,255,0.12), transparent 26%),
                    radial-gradient(circle at 74% 18%, rgba(245,177,30,0.14), transparent 18%),
                    radial-gradient(circle at 82% 56%, rgba(51,232,95,0.12), transparent 18%),
                    radial-gradient(circle at 18% 68%, rgba(30,161,255,0.10), transparent 20%)
                  `,
                }}
              />
              <div style={{ position: 'relative', minHeight: 520 }}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.82 }}
                >
                  <defs>
                    <linearGradient id="network-gold" x1="58" y1="42" x2="70" y2="14" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="rgba(245,177,30,0.18)" />
                      <stop offset="1" stopColor="rgba(245,177,30,0.72)" />
                    </linearGradient>
                    <linearGradient id="network-cyan" x1="58" y1="42" x2="58" y2="34" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="rgba(85,233,255,0.16)" />
                      <stop offset="1" stopColor="rgba(85,233,255,0.66)" />
                    </linearGradient>
                    <linearGradient id="network-green" x1="58" y1="42" x2="84" y2="52" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="rgba(85,233,255,0.12)" />
                      <stop offset="1" stopColor="rgba(24,215,200,0.48)" />
                    </linearGradient>
                    <linearGradient id="network-blue" x1="58" y1="42" x2="18" y2="38" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="rgba(30,161,255,0.16)" />
                      <stop offset="1" stopColor="rgba(30,161,255,0.72)" />
                    </linearGradient>
                  </defs>
                  <path d="M58 42 C62 34 65 26 70 14" stroke="url(#network-gold)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  <path d="M58 42 C58 39 58 37 58 34" stroke="url(#network-cyan)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  <path d="M58 42 C70 42 77 46 84 52" stroke="url(#network-green)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  <path d="M58 42 C55 53 53 63 50 72" stroke="url(#network-green)" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.8" />
                  <path d="M58 42 C42 42 28 40 18 38" stroke="url(#network-blue)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                  <path d="M58 42 C44 54 28 60 8 66" stroke="url(#network-blue)" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.72" />
                </svg>

                {heroNetworkNodes.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      position: 'absolute',
                      top: `${item.top}%`,
                      left: `${item.left}%`,
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      zIndex: 1,
                      opacity: 0.88,
                    }}
                  >
                    {item.color !== C.green && (
                      <div style={{ filter: `drop-shadow(0 0 10px ${item.color}20)` }}>
                        <WaselIcon size={17} />
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: C.text, fontWeight: 900, fontSize: '0.8rem', letterSpacing: '-0.02em' }}>{item.label}</div>
                    </div>
                  </div>
                ))}
                <div style={{
                  position: 'absolute',
                  left: 20,
                  bottom: 18,
                  padding: '10px 12px',
                  borderRadius: 16,
                  background: 'rgba(4,12,24,0.72)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: C.soft,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}>
                  Shared travel network
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="landing-pillars"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginTop: 34,
          }}
        >
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                style={{
                  borderRadius: 22,
                  padding: '18px 18px 20px',
                  background: C.panel,
                  border: `1px solid rgba(255,255,255,0.07)`,
                  backdropFilter: 'blur(14px)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${item.color}18`,
                    border: `1px solid ${item.color}30`,
                    color: item.color,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ marginTop: 14, fontWeight: 900, fontSize: '1rem' }}>{item.title}</div>
                <p style={{ margin: '8px 0 0', color: C.muted, fontSize: '0.84rem', lineHeight: 1.7 }}>{item.copy}</p>
              </div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="landing-split"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: 14,
            marginTop: 20,
          }}
        >
          <div
            style={{
              borderRadius: 26,
              padding: '22px 24px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
              border: `1px solid ${C.border}`,
              backdropFilter: 'blur(14px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 18,
                top: 56,
                bottom: 24,
                width: 36,
                pointerEvents: 'none',
                opacity: 0.52,
              }}
            >
              <svg
                viewBox="0 0 36 280"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              >
                <defs>
                  <linearGradient id="landing-route-pipe" x1="18" y1="18" x2="18" y2="262" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="rgba(85,233,255,0.55)" />
                    <stop offset="0.48" stopColor="rgba(30,161,255,0.34)" />
                    <stop offset="1" stopColor="rgba(24,215,200,0.18)" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 18 C18 58 18 68 18 96 C18 126 18 140 18 170 C18 198 18 214 18 248"
                  stroke="url(#landing-route-pipe)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {['10%', '47%', '84%'].map((top, index) => (
                <div
                  key={top}
                  style={{
                    position: 'absolute',
                    top,
                    left: 0,
                    transform: 'translateY(-50%)',
                    opacity: index === 1 ? 0.75 : 0.58,
                  }}
                >
                  <WaselIcon size={22} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              What the product core looks like
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {routePreview.map((item) => (
                <div
                  key={`${item.from}-${item.to}`}
                  style={{
                    borderRadius: 18,
                    padding: '14px 16px 14px 52px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.06)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WaselIcon size={18} />
                    <div>
                      <div style={{ fontWeight: 900, color: C.text }}>
                        {item.from} to {item.to}
                      </div>
                      <div style={{ color: C.soft, fontSize: '0.78rem', marginTop: 2 }}>{item.note}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: C.gold, fontSize: '0.86rem' }}>{item.price}</div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderRadius: 26,
              padding: '22px 24px',
              background: 'rgba(8,20,40,0.78)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Why this landing works
            </div>
            <h3 style={{ margin: '10px 0 8px', fontSize: '1.35rem', lineHeight: 1.05, color: C.text }}>
              A first screen that explains rides, buses, and parcel transport fast
            </h3>
            <p style={{ margin: 0, color: C.muted, lineHeight: 1.7, fontSize: '0.9rem' }}>
              The landing now reflects the actual core of Wasel: a BlaBlaCar-style shared ride marketplace with bus corridors and package delivery handled by the riders already traveling that route.
            </p>
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {trustPoints.map((point) => (
                <div key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <CheckCircle2 size={16} color={C.green} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ color: C.muted, lineHeight: 1.6, fontSize: '0.9rem' }}>{point}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, color: C.soft }}>
              <Star size={16} color={C.cyan} />
              <span style={{ fontSize: '0.84rem' }}>Designed to feel polished on desktop and mobile</span>
            </div>
            <button
              onClick={() => navigate('/app/find-ride')}
              style={{
                marginTop: 16,
                width: '100%',
                height: 48,
                border: 'none',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
                color: '#041018',
                fontWeight: 900,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              Open the user journey
            </button>
          </div>
        </motion.div>

        <div style={{ paddingBottom: 12 }} />
      </div>
    </div>
  );
}
