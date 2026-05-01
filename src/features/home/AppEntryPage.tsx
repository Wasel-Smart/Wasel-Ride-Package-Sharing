import { motion } from 'motion/react';
import {
  ArrowRight,
  Bus,
  Clock3,
  MapPinned,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { getFeaturedCorridors, type CorridorOpportunity } from '../../config/wasel-movement-network';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import { C as DS, F, GRAD, GRAD_GOLD, SH } from '../../utils/wasel-ds';

const C = {
  bg: DS.bg,
  bgDeep: DS.bgDeep,
  border: DS.border,
  borderSoft: DS.borderFaint,
  text: DS.text,
  muted: DS.textSub,
  soft: DS.textMuted,
  cyan: DS.cyan,
  cyanSoft: DS.cyanDark,
  gold: DS.gold,
  green: DS.green,
} as const;

const FONT = F;

const SERVICES = [
  {
    title: 'Find a ride',
    detail: 'Grouped seats, cleaner pickup decisions, and less back-and-forth before you book.',
    icon: Users,
    tone: DS.cyan,
    path: '/app/find-ride',
    signal: 'Live seat waves',
  },
  {
    title: 'Offer a ride',
    detail: 'Open supply fast, fill seats clearly, and keep route economics visible from the start.',
    icon: Truck,
    tone: DS.green,
    path: '/app/offer-ride',
    signal: 'Driver-side clarity',
  },
  {
    title: 'Send a package',
    detail: 'Turn the same corridor into parcel movement without adding a second product to learn.',
    icon: Package,
    tone: DS.gold,
    path: '/app/packages',
    signal: 'Route-linked parcels',
  },
  {
    title: 'Book a bus',
    detail: 'Official departures, timing confidence, and a calmer fallback when shared supply is full.',
    icon: Bus,
    tone: DS.cyanDark,
    path: '/app/bus',
    signal: 'Scheduled departures',
  },
] as const;

const PROOF_CARDS = [
  {
    title: 'One surface, not four disconnected tools',
    detail: 'Wasel keeps rides, bus departures, and parcels inside one route logic, so the product feels coherent immediately.',
    icon: Sparkles,
    tone: DS.cyan,
  },
  {
    title: 'Route-first decisions',
    detail: 'The important answer shows up first: where the corridor is moving, what it costs, and how confident the next departure looks.',
    icon: Route,
    tone: DS.green,
  },
  {
    title: 'Trust at the point of action',
    detail: 'Pricing, route behavior, and the next step stay visible before the user commits, which lowers hesitation everywhere.',
    icon: ShieldCheck,
    tone: DS.gold,
  },
] as const;

function tierLabel(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function buildRouteStops(corridor?: CorridorOpportunity | null) {
  if (!corridor) return [];

  const labels = [corridor.from, ...(corridor.pickupPoints ?? []).slice(0, 2), corridor.to];
  const unique = labels.filter((label, index) => label && labels.indexOf(label) === index).slice(0, 4);

  return unique.map((label, index) => ({
    label,
    role: index === 0 ? 'Origin' : index === unique.length - 1 ? 'Arrival' : 'Pickup',
  }));
}

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const corridors = useMemo(() => getFeaturedCorridors(3), []);
  const membership = useMemo(() => getMovementMembershipSnapshot(), []);

  const primaryLabel = user ? 'Open the network' : 'Get started';
  const primaryPath = user ? '/app/find-ride' : '/app/auth?returnTo=/app/find-ride';

  const spotlightCorridor = membership.dailyRoute ?? corridors[0];
  const corridorCards = spotlightCorridor
    ? [spotlightCorridor, ...corridors.filter((corridor) => corridor.id !== spotlightCorridor.id)].slice(0, 3)
    : corridors;
  const routeLayers = spotlightCorridor?.movementLayers?.slice(0, 3) ?? [];
  const routeStops = buildRouteStops(spotlightCorridor);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        :root { color-scheme: dark; }
        @media (max-width: 1140px) {
          .landing-hero-grid,
          .landing-proof-grid,
          .landing-corridor-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-service-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .landing-service-grid,
          .landing-proof-grid,
          .landing-corridor-grid,
          .landing-stats-grid,
          .landing-route-track,
          .landing-signal-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-cta {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .landing-topbar {
            align-items: flex-start !important;
          }
          .landing-hero-title {
            font-size: clamp(2.7rem, 15vw, 4.35rem) !important;
          }
          .landing-route-line {
            display: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 12% 16%, rgba(88,221,255,0.2), transparent 25%),
            radial-gradient(circle at 84% 14%, rgba(255,190,92,0.18), transparent 22%),
            radial-gradient(circle at 72% 62%, rgba(71,214,158,0.14), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 110,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 1180px)',
          height: 500,
          borderRadius: 52,
          background: 'radial-gradient(circle at center, rgba(88,221,255,0.08), rgba(4,11,18,0))',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '32px 24px 88px' }}>
        <motion.div
          className="landing-topbar"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <WaselLogo size={44} theme="light" />
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.cyan }}>
                Jordan mobility layer
              </div>
              <div style={{ color: C.soft, fontSize: '0.88rem' }}>
                One route graph for rides, parcels, and bus planning.
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              color: C.soft,
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
            }}
          >
            Jordan-first mobility
          </span>
        </motion.div>

        <div className="landing-hero-grid" style={{ display: 'grid', gridTemplateColumns: '0.98fr 1.02fr', gap: 28, alignItems: 'stretch', marginTop: 34 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            style={{
              borderRadius: 36,
              padding: '32px 32px 30px',
              border: `1px solid ${C.border}`,
              background: 'linear-gradient(180deg, rgba(11,29,45,0.9), rgba(8,22,35,0.88))',
              boxShadow: SH.xl,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(88,221,255,0.08), rgba(255,190,92,0.03) 50%, rgba(71,214,158,0.08))',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 9999,
                    background: 'rgba(88,221,255,0.1)',
                    border: `1px solid ${C.border}`,
                    color: C.cyanSoft,
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <Sparkles size={14} />
                  One road, many moves
                </span>

              </div>

              <h1
                className="landing-hero-title"
                style={{
                  margin: '22px 0 14px',
                  fontSize: 'clamp(3.35rem, 6.4vw, 5.8rem)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.075em',
                  fontWeight: 950,
                  maxWidth: 760,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #D2F7FF 25%, #67E8FF 58%, #6BF0C8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  One road,
                </span>
                <span style={{ display: 'block', color: C.text, marginTop: 10 }}>
                  many moves.
                </span>
              </h1>

              <p style={{ maxWidth: 560, fontSize: '1rem', lineHeight: 1.8, color: C.muted, margin: 0 }}>
                Open one corridor. Ride it, ship on it, or fall back to the bus line around it.
              </p>

              <div className="landing-cta" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 28, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate(primaryPath)}
                  style={{
                    height: 56,
                    padding: '0 22px',
                    border: 'none',
                    borderRadius: 18,
                    background: GRAD,
                    color: C.bgDeep,
                    fontWeight: 900,
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: SH.cyanL,
                  }}
                >
                  {primaryLabel}
                  <ArrowRight size={17} />
                </button>

                <button
                  onClick={() => navigate('/app/bus')}
                  style={{
                    height: 56,
                    padding: '0 20px',
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  See bus departures
                </button>
              </div>

              <div className="landing-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 22 }}>
                {[
                  { value: `${membership.movementCredits}`, label: 'Credits', tone: C.cyanSoft },
                  { value: `${membership.streakDays}d`, label: 'Streak', tone: C.green },
                  { value: tierLabel(membership.loyaltyTier), label: 'Tier', tone: C.gold },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.035)',
                      border: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <div style={{ color: C.soft, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                    <div style={{ marginTop: 6, fontSize: '1rem', fontWeight: 900, color: item.tone }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              borderRadius: 36,
              padding: 26,
              background: 'linear-gradient(180deg, rgba(16,37,58,0.97), rgba(6,19,31,0.98))',
              border: `1px solid ${C.border}`,
              boxShadow: SH.xl,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.cyan }}>
                  Route thread
                </div>
                <div style={{ marginTop: 8, fontSize: '1.58rem', fontWeight: 900, lineHeight: 1.02 }}>
                  {spotlightCorridor?.label ?? 'Live corridor'}
                </div>
                <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.7, fontSize: '0.92rem', maxWidth: 440 }}>
                  The whole product should make sense from one corridor.
                </div>
              </div>

              <div
                style={{
                  minWidth: 154,
                  borderRadius: 20,
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.borderSoft}`,
                }}
              >
                <div style={{ color: C.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Shared fare</div>
                <div style={{ marginTop: 6, fontSize: '1.38rem', fontWeight: 950, color: C.gold }}>{spotlightCorridor?.sharedPriceJod ?? '--'} JOD</div>
                <div style={{ marginTop: 4, color: C.soft, fontSize: '0.78rem' }}>{spotlightCorridor?.savingsPercent ?? '--'}% below solo reference</div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                borderRadius: 28,
                padding: '22px 20px 18px',
                background: 'linear-gradient(180deg, rgba(88,221,255,0.08), rgba(255,255,255,0.02))',
                border: `1px solid ${C.border}`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at 18% 20%, rgba(88,221,255,0.18), transparent 26%), radial-gradient(circle at 82% 78%, rgba(255,190,92,0.12), transparent 24%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ color: C.cyanSoft, fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Route thread
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '7px 12px',
                      borderRadius: 9999,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${C.borderSoft}`,
                      color: C.soft,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    Daily route active
                  </span>
                </div>

                <div style={{ marginTop: 10, color: C.soft, fontSize: '0.82rem', lineHeight: 1.6 }}>
                  {routeLayers.length > 0 ? routeLayers.join(' | ') : 'Riders | parcels | daily errands'}
                </div>

                <div style={{ position: 'relative', marginTop: 18 }}>
                  <div
                    className="landing-route-line"
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '9%',
                      right: '9%',
                      top: 52,
                      height: 2,
                      background: 'linear-gradient(90deg, rgba(88,221,255,0.16), rgba(255,190,92,0.26), rgba(71,214,158,0.16))',
                    }}
                  />

                  <div
                    className="landing-route-track"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${Math.max(routeStops.length, 1)}, minmax(0, 1fr))`,
                      gap: 12,
                    }}
                  >
                    {routeStops.map((stop, index) => (
                      <div
                        key={`${stop.role}-${stop.label}`}
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          borderRadius: 22,
                          padding: '12px 12px 13px',
                          background: index === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.045)',
                          border: `1px solid ${index === routeStops.length - 1 ? 'rgba(255,190,92,0.2)' : C.borderSoft}`,
                          minHeight: 92,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 9999,
                            background: index === routeStops.length - 1 ? C.gold : index === 0 ? C.cyan : C.green,
                            boxShadow: index === routeStops.length - 1 ? SH.gold : SH.cyan,
                            marginBottom: 14,
                          }}
                        />
                        <div style={{ color: C.soft, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{stop.role}</div>
                        <div style={{ marginTop: 6, fontWeight: 900, lineHeight: 1.2, fontSize: '0.92rem' }}>{stop.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="landing-signal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 18 }}>
                  {[
                    {
                      icon: Clock3,
                      label: 'Auto-group',
                      value: spotlightCorridor?.autoGroupWindow ?? 'Demand-based grouping',
                    },
                    {
                      icon: MapPinned,
                      label: 'Pickup anchor',
                      value: spotlightCorridor?.pickupPoints?.[0] ?? 'Closest active stop',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 18,
                          padding: '12px 12px 11px',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${C.borderSoft}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.cyanSoft, fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          <Icon size={14} />
                          {item.label}
                        </div>
                        <div style={{ marginTop: 8, color: C.muted, fontSize: '0.84rem', lineHeight: 1.6 }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                borderRadius: 20,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${C.borderSoft}`,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: membership.plusActive ? 'Plus active' : 'Starter ready', value: tierLabel(membership.loyaltyTier), color: C.gold },
                { label: 'Credits', value: `${membership.movementCredits}`, color: C.cyanSoft },
                { label: 'Streak', value: `${membership.streakDays}d`, color: C.green },
              ].map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  style={{
                    flex: '1 1 120px',
                    borderRadius: 16,
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.025)',
                    border: `1px solid ${C.borderSoft}`,
                  }}
                >
                  <div style={{ color: C.soft, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ marginTop: 5, color: item.color, fontWeight: 900, fontSize: '0.9rem' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }} style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold }}>
                Core services
              </div>
              <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(1.8rem, 3vw, 2.7rem)', lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                Every action should feel like the same product.
              </h2>
            </div>
            <div style={{ maxWidth: 430, color: C.muted, lineHeight: 1.75, fontSize: '0.94rem' }}>
              The interface stays route-first across all four modes, so users can switch context without losing their place.
            </div>
          </div>

          <div className="landing-service-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginTop: 18 }}>
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.title}
                  onClick={() => navigate(service.path)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 28,
                    padding: '22px 20px 20px',
                    background: 'linear-gradient(180deg, rgba(16,37,58,0.78), rgba(8,22,35,0.92))',
                    border: `1px solid ${C.borderSoft}`,
                    backdropFilter: 'blur(14px)',
                    cursor: 'pointer',
                    boxShadow: SH.card,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 16, display: 'grid', placeItems: 'center', background: `${service.tone}14`, border: `1px solid ${service.tone}28` }}>
                      <Icon size={19} color={service.tone} />
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 9999,
                        background: 'rgba(255,255,255,0.04)',
                        color: C.soft,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {service.signal}
                    </span>
                  </div>

                  <div style={{ marginTop: 18, fontWeight: 900, fontSize: '1.06rem', lineHeight: 1.18 }}>{service.title}</div>
                  <div style={{ marginTop: 9, color: C.muted, fontSize: '0.88rem', lineHeight: 1.74 }}>{service.detail}</div>

                  <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, color: service.tone, fontWeight: 800, fontSize: '0.84rem' }}>
                    Open service
                    <ArrowRight size={15} />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }} style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.cyan }}>
                Why this lands fast
              </div>
              <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(1.65rem, 2.8vw, 2.4rem)', lineHeight: 1.04, letterSpacing: '-0.045em' }}>
                The page explains the system in one pass.
              </h2>
            </div>
            <div style={{ maxWidth: 410, color: C.muted, lineHeight: 1.7, fontSize: '0.92rem' }}>
              The first screen leads with route clarity. These cards explain why that feels better without competing with the hero.
            </div>
          </div>

          <div className="landing-proof-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 16 }}>
            {PROOF_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  style={{
                    borderRadius: 24,
                    padding: '18px 18px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.borderSoft}`,
                    boxShadow: SH.navy,
                  }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${card.tone}16`, border: `1px solid ${card.tone}26`, color: card.tone }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ marginTop: 14, fontWeight: 900, fontSize: '1rem', lineHeight: 1.25 }}>{card.title}</div>
                  <div style={{ marginTop: 8, color: C.muted, fontSize: '0.86rem', lineHeight: 1.72 }}>{card.detail}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} style={{ marginTop: 34 }}>
          <div
            style={{
              borderRadius: 34,
              padding: '24px 24px 26px',
              background: 'linear-gradient(180deg, rgba(9,24,38,0.96), rgba(4,11,18,0.98))',
              border: `1px solid ${C.border}`,
              boxShadow: SH.xl,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.cyan }}>
                  Live corridors
                </div>
                <h2 style={{ margin: '10px 0 0', fontSize: 'clamp(1.85rem, 3vw, 2.8rem)', lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                  Specific routes make the product feel real.
                </h2>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  padding: '14px 16px',
                  minWidth: 220,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.borderSoft}`,
                }}
              >
                <div style={{ color: C.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily route focus</div>
                <div style={{ marginTop: 6, fontWeight: 900, fontSize: '1.02rem' }}>{spotlightCorridor?.label ?? 'Amman -> Irbid'}</div>
                <div style={{ marginTop: 4, color: C.muted, fontSize: '0.82rem' }}>
                  Shared movement compounds when the same corridor stays easy to reopen.
                </div>
              </div>
            </div>

            <div className="landing-corridor-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 20 }}>
              {corridorCards.map((corridor, index) => (
                <button
                  key={corridor.id}
                  onClick={() => navigate(`/app/find-ride?from=${encodeURIComponent(corridor.from)}&to=${encodeURIComponent(corridor.to)}&search=1`)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 28,
                    padding: '20px 18px 18px',
                    background: index === 0 ? 'linear-gradient(180deg, rgba(88,221,255,0.12), rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${index === 0 ? C.border : C.borderSoft}`,
                    cursor: 'pointer',
                    boxShadow: SH.navy,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                    <div>
                      <div style={{ color: index === 0 ? C.cyanSoft : C.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                        {index === 0 ? 'Spotlight corridor' : 'Featured corridor'}
                      </div>
                      <div style={{ marginTop: 8, fontSize: '1.12rem', fontWeight: 900, lineHeight: 1.14 }}>{corridor.label}</div>
                    </div>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 9999,
                        background: index === 0 ? 'rgba(255,190,92,0.12)' : 'rgba(255,255,255,0.05)',
                        color: index === 0 ? C.gold : C.soft,
                        fontSize: '0.76rem',
                        fontWeight: 800,
                      }}
                    >
                      {corridor.savingsPercent}% saved
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                    {[
                      { label: 'Shared fare', value: `${corridor.sharedPriceJod} JOD` },
                      { label: 'Driver boost', value: `+${corridor.driverBoostJod} JOD` },
                      { label: 'Confidence', value: `${corridor.attachRatePercent}% attach rate` },
                    ].map((row) => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                          borderRadius: 16,
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${C.borderSoft}`,
                        }}
                      >
                        <span style={{ color: C.soft, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{row.label}</span>
                        <span style={{ color: C.text, fontWeight: 850, fontSize: '0.86rem' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 16, color: C.muted, fontSize: '0.84rem', lineHeight: 1.68 }}>{corridor.autoGroupWindow}</div>

                  <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, color: index === 0 ? C.gold : C.cyanSoft, fontWeight: 800, fontSize: '0.84rem' }}>
                    Explore this corridor
                    <ArrowRight size={15} />
                  </div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                borderRadius: 24,
                padding: '18px 18px 16px',
                background: 'linear-gradient(135deg, rgba(255,190,92,0.14), rgba(255,147,106,0.08))',
                border: `1px solid rgba(255,190,92,0.18)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ color: C.gold, fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.11em', textTransform: 'uppercase' }}>
                  Fast next step
                </div>
                <div style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 900 }}>
                  Start with the route, then let the mode follow.
                </div>
                <div style={{ marginTop: 6, color: C.muted, lineHeight: 1.65, fontSize: '0.88rem', maxWidth: 620 }}>
                  That is the difference between a landing page that only looks polished and one that explains the product at a glance.
                </div>
              </div>

              <button
                onClick={() => navigate(primaryPath)}
                style={{
                  height: 54,
                  padding: '0 22px',
                  border: 'none',
                  borderRadius: 18,
                  background: GRAD_GOLD,
                  color: C.bgDeep,
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: SH.gold,
                }}
              >
                Launch Wasel
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
