import { motion } from 'motion/react';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Clock3,
  MapPinned,
  Package,
  Shield,
  Sparkles,
  Star,
  Waves,
  Zap,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselHeroMark, WaselLogo } from '../../components/wasel-ds/WaselLogo';

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
  { value: '2-in-1', label: 'rides and parcels' },
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
    title: 'Parcel network',
    copy: 'Turn active trips into a practical delivery layer for packages, returns, and on-route logistics.',
    color: C.gold,
  },
  {
    icon: Bus,
    title: 'Scheduled movement',
    copy: 'Support fixed corridors and recurring travel patterns without losing the flexibility of the platform.',
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

const trustPoints = [
  'Built around one clear mobility story instead of disconnected screens',
  'Balances rides, parcels, and trust signals in a single branded journey',
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

      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '38px 24px 72px' }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
        >
          <WaselLogo size={44} theme="light" />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 999,
              background: 'rgba(85,233,255,0.08)',
              border: `1px solid ${C.border}`,
              color: C.muted,
              fontSize: '0.76rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} color={C.cyan} />
            Built for Jordan-first mobility
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
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 999,
                background: 'rgba(30,161,255,0.08)',
                border: '1px solid rgba(30,161,255,0.16)',
                color: C.cyan,
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              <Waves size={14} />
              Connected mobility network
            </div>

            <h1
              style={{
                margin: '18px 0 16px',
                fontSize: 'clamp(2.7rem, 6vw, 5.4rem)',
                lineHeight: 0.94,
                letterSpacing: '-0.06em',
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
                rides, parcels, and trust in one system
              </span>
            </h1>

            <p style={{ maxWidth: 700, fontSize: '1.03rem', lineHeight: 1.8, color: C.muted, margin: 0 }}>
              Wasel is designed to feel like a premium mobility product from the first screen.
              It brings intercity rides, parcel movement, route discovery, and verified trust into a single experience that makes sense for real users.
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
                    borderRadius: 18,
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.035)',
                    border: `1px solid ${C.border}`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ fontSize: '1.15rem', fontWeight: 950, color: C.text }}>{item.value}</div>
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <div
              style={{
                width: 'min(100%, 480px)',
                borderRadius: 36,
                padding: 28,
                background: `
                  linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025)),
                  ${C.panelStrong}
                `,
                border: `1px solid ${C.border}`,
                boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(18px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 50% 20%, rgba(85,233,255,0.12), transparent 42%)',
                }}
              />
              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 420 }}>
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, 0.8, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <WaselHeroMark size={280} />
                </motion.div>
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {[
                  { label: 'Brand', value: 'Refined' },
                  { label: 'Layout', value: 'Launch-ready' },
                  { label: 'Identity', value: 'Unified' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: '12px 10px',
                      background: C.panel,
                      border: `1px solid rgba(255,255,255,0.06)`,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ color: C.soft, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.label}
                    </div>
                    <div style={{ marginTop: 5, color: C.text, fontWeight: 900 }}>{item.value}</div>
                  </div>
                ))}
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
            }}
          >
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              What the product core looks like
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              {routePreview.map((item) => (
                <div
                  key={`${item.from}-${item.to}`}
                  style={{
                    borderRadius: 18,
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(255,255,255,0.06)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPinned size={16} color={C.cyan} />
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
              A first screen that explains the product fast
            </h3>
            <p style={{ margin: 0, color: C.muted, lineHeight: 1.7, fontSize: '0.9rem' }}>
              The landing now reflects the actual core of Wasel: a premium mobility brand with routing, parcels, verified trust, and clear calls to action.
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
