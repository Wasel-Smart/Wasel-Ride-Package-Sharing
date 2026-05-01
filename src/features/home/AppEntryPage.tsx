import { motion } from 'motion/react';
import { ArrowRight, Bus, Package, ShieldCheck, Truck, Users } from 'lucide-react';
import { useMemo } from 'react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { getFeaturedCorridors } from '../../config/wasel-movement-network';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';

const C = {
  bg: '#111316',
  panel: '#181C22',
  panelSoft: 'rgba(247,241,232,0.04)',
  border: 'rgba(244,239,232,0.14)',
  borderSoft: 'rgba(244,239,232,0.08)',
  ivory: '#F7F1E8',
  bronze: '#B88A52',
  sage: '#7F9370',
  text: '#F7F1E8',
  muted: 'rgba(247,241,232,0.74)',
  soft: 'rgba(223,215,205,0.54)',
} as const;

const FONT = "'Plus Jakarta Sans', 'Inter', 'Helvetica Neue', 'Cairo', sans-serif";

const SERVICES = [
  { title: 'Find a ride', detail: 'Check live seats across active corridors.', icon: Users, tone: C.ivory, path: '/app/find-ride' },
  { title: 'Offer a ride', detail: 'Post seats fast and confirm passengers clearly.', icon: Truck, tone: C.sage, path: '/app/offer-ride' },
  { title: 'Send a package', detail: 'Create parcel requests without extra explanation.', icon: Package, tone: C.bronze, path: '/app/packages' },
  { title: 'Book a bus', detail: 'View official departures and route timing.', icon: Bus, tone: C.ivory, path: '/app/bus' },
] as const;

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const corridors = useMemo(() => getFeaturedCorridors(3), []);
  const membership = useMemo(() => getMovementMembershipSnapshot(), []);

  const primaryLabel = user ? 'Open app' : 'Get started';
  const primaryPath = user ? '/app/find-ride' : '/app/auth?returnTo=/app/find-ride';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: FONT, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        :root { color-scheme: dark; }
        @media (max-width: 1080px) {
          .landing-hero-grid,
          .landing-story-grid,
          .landing-corridor-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-stat-grid,
          .landing-service-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .landing-stat-grid,
          .landing-service-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-cta {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .landing-hero-title {
            font-size: clamp(2.4rem, 13vw, 4rem) !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 12% 18%, rgba(244,239,232,0.14), transparent 26%),
            radial-gradient(circle at 84% 12%, rgba(184,138,82,0.16), transparent 24%),
            radial-gradient(circle at 78% 70%, rgba(127,147,112,0.14), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '36px 24px 84px' }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <WaselLogo size={44} theme="light" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Simple', 'Trusted', 'Unified'].map((label) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 12px', borderRadius: 9999, background: C.panelSoft, border: `1px solid ${C.border}`, color: C.soft, fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="landing-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 28, alignItems: 'start', marginTop: 40 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 9999, background: 'rgba(244,239,232,0.07)', border: `1px solid ${C.border}`, color: C.ivory, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Wasel wordmark identity
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: C.soft, fontSize: '0.82rem', fontWeight: 700 }}>
                <ShieldCheck size={14} color={C.bronze} />
                Clean routes and clear actions
              </span>
            </div>

            <h1 className="landing-hero-title" style={{ margin: '18px 0 14px', fontSize: 'clamp(3rem, 6vw, 5.4rem)', lineHeight: 0.94, letterSpacing: '-0.07em', fontWeight: 950, maxWidth: 760 }}>
              <span style={{ display: 'block', background: 'linear-gradient(135deg, #FFFFFF 0%, #F7F1E8 28%, #D2B18A 64%, #7F9370 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Move simply.
              </span>
              <span style={{ display: 'block', color: C.text, marginTop: 8 }}>Ride, parcel, and bus in one calm flow.</span>
            </h1>

            <p style={{ maxWidth: 720, fontSize: '1.02rem', lineHeight: 1.82, color: C.muted, margin: 0 }}>
              Wasel now starts from a single mark and a simpler promise: help people decide quickly, act quickly, and trust what they see.
            </p>

            <div className="landing-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 24, maxWidth: 760 }}>
              {[
                { value: '3', label: 'main services', tone: C.ivory },
                { value: '12', label: 'corridors', tone: C.sage },
                { value: '4', label: 'service types', tone: C.bronze },
                { value: `${membership.movementCredits}`, label: 'credits', tone: C.ivory },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: 20, padding: '16px 16px 15px', background: 'linear-gradient(180deg, rgba(247,241,232,0.045), rgba(247,241,232,0.02))', border: `1px solid ${C.border}`, boxShadow: '0 10px 24px rgba(0,0,0,0.16)' }}>
                  <div style={{ fontSize: '1.22rem', fontWeight: 950, color: item.tone, letterSpacing: '-0.03em' }}>{item.value}</div>
                  <div style={{ marginTop: 4, fontSize: '0.76rem', color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div className="landing-cta" style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 28, flexWrap: 'wrap' }}>
              <button onClick={() => navigate(primaryPath)} style={{ height: 54, padding: '0 22px', border: 'none', borderRadius: 16, background: 'linear-gradient(135deg, #D2B18A 0%, #B88A52 55%, #86623B 100%)', color: '#111316', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 16px 36px rgba(184,138,82,0.24)' }}>
                {primaryLabel}
                <ArrowRight size={17} />
              </button>

              <button onClick={() => navigate('/app/bus')} style={{ height: 54, padding: '0 20px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.text, fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer' }}>
                See bus departures
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} style={{ borderRadius: 28, padding: 24, background: 'linear-gradient(180deg, rgba(24,28,34,0.96), rgba(17,19,22,0.98))', border: `1px solid ${C.border}`, boxShadow: '0 26px 70px rgba(0,0,0,0.34)' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.bronze }}>
              Live routes
            </div>
            <div style={{ marginTop: 6, fontSize: '1.2rem', fontWeight: 900 }}>
              Better corridors should be obvious the moment the page opens.
            </div>

            <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
              {corridors.map((corridor) => (
                <button key={corridor.id} onClick={() => navigate(`/app/find-ride?from=${encodeURIComponent(corridor.from)}&to=${encodeURIComponent(corridor.to)}&search=1`)} style={{ textAlign: 'left', borderRadius: 20, padding: '16px 16px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.borderSoft}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{corridor.label}</div>
                      <div style={{ marginTop: 5, color: C.soft, fontSize: '0.8rem', lineHeight: 1.6 }}>{corridor.autoGroupWindow}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: C.bronze, fontWeight: 900, fontSize: '1rem' }}>{corridor.sharedPriceJod} JOD</div>
                      <div style={{ color: C.soft, fontSize: '0.72rem' }}>{corridor.savingsPercent}% saved</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.14 }} style={{ marginTop: 26 }}>
          <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.bronze }}>
            Core services
          </div>
          <div className="landing-service-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginTop: 14 }}>
            {SERVICES.map((service) => {
              const Icon = service.icon;
              return (
                <button key={service.title} onClick={() => navigate(service.path)} style={{ textAlign: 'left', borderRadius: 24, padding: '18px 18px 20px', background: 'rgba(24,28,34,0.78)', border: `1px solid ${C.borderSoft}`, backdropFilter: 'blur(14px)', cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${service.tone}14`, border: `1px solid ${service.tone}28` }}>
                    <Icon size={18} color={service.tone} />
                  </div>
                  <div style={{ marginTop: 14, fontWeight: 900, fontSize: '1rem' }}>{service.title}</div>
                  <div style={{ marginTop: 8, color: C.muted, fontSize: '0.84rem', lineHeight: 1.7 }}>{service.detail}</div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} style={{ marginTop: 22 }}>
          <div className="landing-story-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 14 }}>
            <div style={{ borderRadius: 28, padding: '24px 24px', background: 'linear-gradient(135deg, rgba(244,239,232,0.08), rgba(184,138,82,0.06))', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.ivory, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Unified brand
              </div>
              <h3 style={{ margin: '12px 0 8px', fontSize: '1.44rem', lineHeight: 1.08 }}>
                One logo, one voice, one calmer product surface.
              </h3>
              <p style={{ margin: 0, color: C.muted, lineHeight: 1.75, fontSize: '0.94rem' }}>
                The new wordmark moves the app away from internal-looking neon metaphors and toward something quieter, cleaner, and more memorable.
              </p>
            </div>

            <div style={{ borderRadius: 28, padding: '24px 24px', background: 'rgba(24,28,34,0.82)', border: '1px solid rgba(244,239,232,0.07)' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: C.bronze, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Daily account
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {[
                  `Movement credits: ${membership.movementCredits}`,
                  `Loyalty tier: ${membership.loyaltyTier}`,
                  `Daily route: ${membership.dailyRoute?.label ?? 'Not set yet'}`,
                ].map((line) => (
                  <div key={line} style={{ borderRadius: 16, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: C.text, fontWeight: 700, lineHeight: 1.55 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
