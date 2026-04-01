import { motion } from 'motion/react';
import {
  ArrowRight,
  Clock3,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';

const C = {
  bg: '#040C18',
  border: 'rgba(85, 233, 255, 0.16)',
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
          .landing-cta { flex-direction: column !important; align-items: stretch !important; }
          .landing-trust-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .landing-stats { grid-template-columns: 1fr !important; }
          .landing-hero-title { font-size: clamp(2.4rem, 13vw, 4rem) !important; }
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.soft, fontSize: '0.82rem', fontWeight: 700 }}>
                <Clock3 size={14} color={C.gold} />
                Original landing with map focus
              </span>
            </div>

            <h1
              className="landing-hero-title"
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

            <div className="landing-trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 20, maxWidth: 760 }}>
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
            <MobilityOSLandingMap />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
