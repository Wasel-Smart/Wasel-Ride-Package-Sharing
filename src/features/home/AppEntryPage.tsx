import { motion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  Network,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import {
  getFeaturedCorridors,
  getHabitLoopPrograms,
  getMarketplaceNodes,
  getMovementDefensibilityLines,
  getMovementLayers,
  getWaselCategoryPosition,
} from '../../config/wasel-movement-network';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';

const C = {
  bg: '#040C18',
  border: 'rgba(85, 233, 255, 0.16)',
  borderSoft: 'rgba(255,255,255,0.08)',
  cyan: '#55E9FF',
  green: '#33E85F',
  gold: '#F5B11E',
  text: '#EFF6FF',
  muted: 'rgba(239,246,255,0.74)',
  soft: 'rgba(239,246,255,0.54)',
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', 'Cairo', sans-serif";

const ICONS = {
  people: Users,
  goods: Package,
  services: Sparkles,
  data: Brain,
} as const;

const MARKETPLACE_ICONS = {
  riders: Users,
  drivers: Route,
  businesses: Network,
  'truck-owners': Truck,
  'service-providers': Sparkles,
} as const;

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const category = useMemo(() => getWaselCategoryPosition(), []);
  const movementLayers = useMemo(() => getMovementLayers(), []);
  const featuredCorridors = useMemo(() => getFeaturedCorridors(6), []);
  const marketplaceNodes = useMemo(() => getMarketplaceNodes(), []);
  const habitLoops = useMemo(() => getHabitLoopPrograms(), []);
  const moatLines = useMemo(() => getMovementDefensibilityLines(), []);
  const membership = useMemo(() => getMovementMembershipSnapshot(), []);

  const primaryLabel = user ? 'Open my movement network' : 'Start with a shared route';
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
        @media (max-width: 1080px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; }
          .landing-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-layer-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-corridor-grid { grid-template-columns: 1fr !important; }
          .landing-marketplace-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .landing-loop-grid { grid-template-columns: 1fr !important; }
          .landing-footer-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .landing-stat-grid { grid-template-columns: 1fr !important; }
          .landing-layer-grid { grid-template-columns: 1fr !important; }
          .landing-marketplace-grid { grid-template-columns: 1fr !important; }
          .landing-cta { flex-direction: column !important; align-items: stretch !important; }
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
            radial-gradient(circle at 12% 18%, rgba(85,233,255,0.16), transparent 26%),
            radial-gradient(circle at 84% 12%, rgba(245,177,30,0.14), transparent 24%),
            radial-gradient(circle at 78% 70%, rgba(51,232,95,0.12), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', padding: '36px 24px 88px' }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
        >
          <WaselLogo size={44} theme="light" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['People', 'Goods', 'Services', 'Data'].map((label) => (
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
          className="landing-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.08fr 0.92fr',
            gap: 32,
            alignItems: 'start',
            marginTop: 42,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
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
                {category.categoryLabel}
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
                <ShieldCheck size={14} color={C.gold} />
                Routes plus cost sharing is the moat
              </span>
            </div>

            <h1
              className="landing-hero-title"
              style={{
                margin: '20px 0 14px',
                fontSize: 'clamp(2.9rem, 6vw, 5.8rem)',
                lineHeight: 0.92,
                letterSpacing: '-0.07em',
                fontWeight: 950,
                maxWidth: 780,
              }}
            >
              <span
                style={{
                  display: 'block',
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #CFFAFF 26%, #55E9FF 62%, #33E85F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                The operating system of movement in Jordan
              </span>
              <span style={{ display: 'block', color: C.text, marginTop: 10 }}>
                routes, intelligence, and shared economics in one network
              </span>
            </h1>

            <p style={{ maxWidth: 760, fontSize: '1.02rem', lineHeight: 1.82, color: C.muted, margin: 0 }}>
              {category.promise} Instead of competing as another ride app, Wasel now owns corridors,
              predicts demand, auto-groups riders, opens logistics and service capacity, and keeps learning how Jordan moves.
            </p>

            <div
              className="landing-stat-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
                marginTop: 24,
                maxWidth: 780,
              }}
            >
              {[
                { value: '12', label: 'priority corridors', tone: C.cyan },
                { value: '4', label: 'movement layers', tone: C.green },
                { value: '5', label: 'marketplace nodes', tone: C.gold },
                { value: `${membership.movementCredits}`, label: 'movement credits ready', tone: C.cyan },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: 20,
                    padding: '16px 16px 15px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                    border: `1px solid ${C.border}`,
                    boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
                  }}
                >
                  <div style={{ fontSize: '1.24rem', fontWeight: 950, color: item.tone, letterSpacing: '-0.03em' }}>{item.value}</div>
                  <div style={{ marginTop: 4, fontSize: '0.76rem', color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="landing-cta" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate(primaryPath)}
                style={{
                  height: 54,
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
                onClick={() => navigate('/app/mobility-os')}
                style={{
                  height: 54,
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
                Open Movement OS
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              borderRadius: 30,
              padding: 24,
              background: 'linear-gradient(180deg, rgba(9,20,36,0.92), rgba(6,14,28,0.98))',
              border: `1px solid ${C.border}`,
              boxShadow: '0 26px 70px rgba(0,0,0,0.34)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(85,233,255,0.12)',
                  border: `1px solid ${C.border}`,
                }}
              >
                <Brain size={18} color={C.cyan} />
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.cyan }}>
                  Wasel Brain
                </div>
                <div style={{ marginTop: 4, fontSize: '1.15rem', fontWeight: 900 }}>
                  Demand is predicted before a rider searches
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              {featuredCorridors.slice(0, 4).map((corridor, index) => (
                <button
                  key={corridor.id}
                  onClick={() => navigate(`/app/find-ride?from=${encodeURIComponent(corridor.from)}&to=${encodeURIComponent(corridor.to)}&search=1`)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 20,
                    padding: '16px 16px 14px',
                    background: index === 0
                      ? 'linear-gradient(135deg, rgba(85,233,255,0.12), rgba(255,255,255,0.03))'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${index === 0 ? 'rgba(85,233,255,0.28)' : C.borderSoft}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>{corridor.label}</div>
                      <div style={{ marginTop: 6, color: C.soft, fontSize: '0.8rem', lineHeight: 1.6 }}>
                        {corridor.autoGroupWindow}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: C.green, fontWeight: 900, fontSize: '1.1rem' }}>{corridor.savingsPercent}%</div>
                      <div style={{ color: C.soft, fontSize: '0.72rem' }}>cheaper than solo movement</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(51,232,95,0.12)', border: '1px solid rgba(51,232,95,0.22)', color: C.green, fontSize: '0.72rem', fontWeight: 700 }}>
                      Demand {corridor.predictedDemandScore}
                    </span>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(245,177,30,0.12)', border: '1px solid rgba(245,177,30,0.22)', color: C.gold, fontSize: '0.72rem', fontWeight: 700 }}>
                      From {corridor.sharedPriceJod} JOD
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16, borderRadius: 18, padding: '16px 18px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderSoft}` }}>
              <div style={{ color: C.soft, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Current daily route</div>
              <div style={{ marginTop: 8, fontWeight: 800, fontSize: '1rem' }}>
                {membership.dailyRoute?.label ?? 'Amman -> Irbid'}
              </div>
              <div style={{ marginTop: 6, color: C.muted, fontSize: '0.82rem', lineHeight: 1.7 }}>
                Credits, subscriptions, and repeat corridors are what make Wasel sticky enough to become a movement habit.
              </div>
            </div>
          </motion.div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          style={{ marginTop: 34 }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.cyan }}>
            Movement layers
          </div>
          <div className="landing-layer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 14 }}>
            {movementLayers.map((layer) => {
              const Icon = ICONS[layer.id];
              return (
                <div
                  key={layer.id}
                  style={{
                    borderRadius: 24,
                    padding: '18px 18px 20px',
                    background: 'rgba(8, 20, 40, 0.78)',
                    border: `1px solid ${C.borderSoft}`,
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
                      background: 'rgba(85,233,255,0.12)',
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <Icon size={18} color={C.cyan} />
                  </div>
                  <div style={{ marginTop: 14, fontWeight: 900, fontSize: '1rem' }}>{layer.title}</div>
                  <p style={{ margin: '8px 0 0', color: C.muted, fontSize: '0.84rem', lineHeight: 1.7 }}>{layer.summary}</p>
                  <div style={{ marginTop: 12, color: C.green, fontSize: '0.76rem', lineHeight: 1.6, fontWeight: 700 }}>
                    {layer.valueLine}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.14 }}
          style={{ marginTop: 22 }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold }}>
            Route intelligence engine
          </div>
          <div className="landing-corridor-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginTop: 14 }}>
            {featuredCorridors.map((corridor) => (
              <div
                key={corridor.id}
                style={{
                  borderRadius: 26,
                  padding: '20px 22px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                  border: `1px solid ${C.border}`,
                  backdropFilter: 'blur(14px)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1rem' }}>{corridor.label}</div>
                    <div style={{ marginTop: 5, color: C.soft, fontSize: '0.78rem' }}>
                      {corridor.distanceKm} km | {corridor.durationMin} min
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: C.cyan, fontWeight: 900, fontSize: '1.05rem' }}>{corridor.sharedPriceJod} JOD</div>
                    <div style={{ color: C.soft, fontSize: '0.72rem' }}>shared seat target</div>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                  <div style={{ color: C.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
                    {corridor.intelligenceSignals[0]}
                  </div>
                  <div style={{ color: C.soft, fontSize: '0.8rem', lineHeight: 1.6 }}>
                    Pickup nodes: {corridor.pickupPoints.join(' | ')}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(85,233,255,0.12)', border: `1px solid ${C.border}`, color: C.cyan, fontSize: '0.72rem', fontWeight: 700 }}>
                    Demand {corridor.predictedDemandScore}
                  </span>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(51,232,95,0.12)', border: '1px solid rgba(51,232,95,0.22)', color: C.green, fontSize: '0.72rem', fontWeight: 700 }}>
                    {corridor.savingsPercent}% saved
                  </span>
                  <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(245,177,30,0.12)', border: '1px solid rgba(245,177,30,0.22)', color: C.gold, fontSize: '0.72rem', fontWeight: 700 }}>
                    Driver boost {corridor.driverBoostJod} JOD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          style={{ marginTop: 22 }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.green }}>
            Marketplace expansion
          </div>
          <div className="landing-marketplace-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 14 }}>
            {marketplaceNodes.map((node) => {
              const Icon = MARKETPLACE_ICONS[node.id];
              return (
                <div
                  key={node.id}
                  style={{
                    borderRadius: 22,
                    padding: '18px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.borderSoft}`,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(51,232,95,0.12)',
                      border: '1px solid rgba(51,232,95,0.2)',
                    }}
                  >
                    <Icon size={18} color={C.green} />
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 800, fontSize: '0.94rem' }}>{node.title}</div>
                  <p style={{ margin: '8px 0 0', color: C.muted, fontSize: '0.78rem', lineHeight: 1.65 }}>{node.summary}</p>
                  <div style={{ marginTop: 12, color: C.gold, fontSize: '0.72rem', lineHeight: 1.55, fontWeight: 700 }}>
                    {node.moat}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.26 }}
          style={{ marginTop: 22 }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.cyan }}>
            Habit loop
          </div>
          <div className="landing-loop-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginTop: 14 }}>
            <div
              style={{
                borderRadius: 28,
                padding: '22px 24px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025))',
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>
                We win when the default thought becomes: "I do not move without Wasel."
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {habitLoops.map((loop) => (
                  <div
                    key={loop.id}
                    style={{
                      borderRadius: 18,
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{loop.title}</div>
                    <div style={{ marginTop: 6, color: C.muted, fontSize: '0.8rem', lineHeight: 1.65 }}>{loop.summary}</div>
                    <div style={{ marginTop: 10, color: C.green, fontSize: '0.74rem', lineHeight: 1.55, fontWeight: 700 }}>{loop.outcome}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: 28,
                padding: '22px 24px',
                background: 'rgba(8,20,40,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Membership pulse
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {[
                  `Movement credits: ${membership.movementCredits}`,
                  `Loyalty tier: ${membership.loyaltyTier}`,
                  `Daily route: ${membership.dailyRoute?.label ?? 'Amman -> Irbid'}`,
                  `Commuter pass: ${membership.commuterPassRoute?.label ?? 'Not started yet'}`,
                ].map((line) => (
                  <div
                    key={line}
                    style={{
                      borderRadius: 16,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: C.text,
                      fontWeight: 700,
                      lineHeight: 1.55,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, color: C.muted, fontSize: '0.82rem', lineHeight: 1.7 }}>
                Commuter passes, route credits, and loyalty rewards are what turn route usage into a defensible habit loop.
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32 }}
          style={{ marginTop: 22 }}
        >
          <div className="landing-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
            <div
              style={{
                borderRadius: 28,
                padding: '24px 24px',
                background: 'linear-gradient(135deg, rgba(85,233,255,0.08), rgba(51,232,95,0.06))',
                border: `1px solid ${C.border}`,
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.cyan, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Category creation
              </div>
              <h3 style={{ margin: '12px 0 8px', fontSize: '1.5rem', lineHeight: 1.05 }}>
                Wasel is no longer "a ride-sharing app."
              </h3>
              <p style={{ margin: 0, color: C.muted, lineHeight: 1.75, fontSize: '0.94rem' }}>
                The product is now positioned as {category.infrastructureLabel}. It owns how Jordan moves by combining corridor intelligence,
                cost sharing, movement layers, and network density into one operating model.
              </p>
              <div style={{ marginTop: 14, color: C.gold, fontWeight: 800, fontSize: '0.84rem' }}>
                Killer advantage: {category.killerAdvantage}
              </div>
            </div>

            <div
              style={{
                borderRadius: 28,
                padding: '24px 24px',
                background: 'rgba(8,20,40,0.82)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.gold, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Defensibility
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {moatLines.map((line) => (
                  <div
                    key={line}
                    style={{
                      borderRadius: 16,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: C.text,
                      lineHeight: 1.65,
                      fontSize: '0.82rem',
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
