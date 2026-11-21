import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bus,
  Check,
  CircleDollarSign,
  Clock,
  PackageCheck,
  Route,
  Shield,
  Users,
} from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { C, POPULAR_ROUTES, R, SH, TYPE, F } from '../HomePageShared';
import { tx } from '../../../locales/tx';

interface LandingSectionsProps {
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}
const featureCards = [
  {
    icon: Shield,
    titleKey: 'featuresVerified',
    descKey: 'featuresVerifiedDesc',
    accent: 'var(--primary)',
  },
  {
    icon: CircleDollarSign,
    titleKey: 'featuresAffordable',
    descKey: 'featuresAffordableDesc',
    accent: C.gold,
  },
  {
    icon: Route,
    titleKey: 'featuresFlexible',
    descKey: 'featuresFlexibleDesc',
    accent: C.orange,
  },
  {
    icon: Users,
    titleKey: 'featuresSupport',
    descKey: 'featuresSupportDesc',
    accent: C.green,
  },
  {
    icon: BadgeCheck,
    titleKey: 'featuresSecure',
    descKey: 'featuresSecureDesc',
    accent: C.blue,
  },
  {
    icon: Clock,
    titleKey: 'featuresTracking',
    descKey: 'featuresTrackingDesc',
    accent: C.purple,
  },
] as const;

// Every tile must land on a route the router actually declares, and every
// tile must describe something Wasel really does. The four ways to move
// below are the product's real core navigation (see config/user-navigation.ts):
// find a ride, offer seats, send a parcel, and the scheduled bus backup.
// Earlier revisions also advertised freight, school transport and luxury
// chauffeurs, which have no page behind them, so they are gone.
const bentoTiles = [
  {
    icon: Route,
    titleKey: 'homeSections.bentoRidersTitle',
    descKey: 'homeSections.bentoRidersDesc',
    points: [
      'homeSections.bentoRidersPoint1',
      'homeSections.bentoRidersPoint2',
      'homeSections.bentoRidersPoint3',
    ],
    ctaKey: 'homeSections.findRideCTA',
    accent: 'var(--primary)',
    path: '/find-ride',
    hero: true,
  },
  {
    icon: CircleDollarSign,
    titleKey: 'homeSections.bentoDriversTitle',
    descKey: 'homeSections.bentoDriversDesc',
    points: [
      'homeSections.bentoDriversPoint1',
      'homeSections.bentoDriversPoint2',
      'homeSections.bentoDriversPoint3',
    ],
    ctaKey: 'homeSections.offerRideCTA',
    accent: C.gold,
    path: '/offer-ride',
    hero: false,
  },
  {
    icon: PackageCheck,
    titleKey: 'homeSections.bentoParcelsTitle',
    descKey: 'homeSections.bentoParcelsDesc',
    points: [
      'homeSections.bentoParcelsPoint1',
      'homeSections.bentoParcelsPoint2',
      'homeSections.bentoParcelsPoint3',
    ],
    ctaKey: 'homeSections.sendPackageKicker',
    accent: C.orange,
    path: '/packages',
    hero: false,
  },
  {
    icon: Bus,
    titleKey: 'homeSections.bentoBusTitle',
    descKey: 'homeSections.bentoBusDesc',
    points: [
      'homeSections.bentoBusPoint1',
      'homeSections.bentoBusPoint2',
      'homeSections.bentoBusPoint3',
    ],
    ctaKey: 'homeSections.busFallbackKicker',
    accent: C.green,
    path: '/bus',
    hero: false,
  },
] as const;

// Counts are derived from data the app already ships, never invented. The
// ways-to-move count is the length of the service list above; corridor and
// city counts are computed from POPULAR_ROUTES; five trust checks is the
// documented trust model (identity, email, phone, driver documents, wallet).
const SERVICE_COUNT = bentoTiles.length;
const CORRIDOR_COUNT = POPULAR_ROUTES.length;
const CITY_COUNT = new Set(POPULAR_ROUTES.map(r => r.to)).size;
const TRUST_CHECK_COUNT = 5;

const stats = [
  { value: String(SERVICE_COUNT), labelKey: 'statsServices', accent: 'var(--primary)' },
  { value: String(CORRIDOR_COUNT), labelKey: 'statsCorridors', accent: C.gold },
  { value: String(CITY_COUNT), labelKey: 'statsCities', accent: C.orange },
  { value: String(TRUST_CHECK_COUNT), labelKey: 'homeSections.statTrustChecks', accent: C.green },
] as const;

export function LandingSections({ ar, onNavigate }: LandingSectionsProps) {
  return (
    <>
      <motion.section
        initial={false}
        className="wasel-home-section"
        aria-labelledby="features-heading"
      >
        <div className="wasel-home-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wasel-home-section-icon" style={{ color: 'var(--primary)' }}>
              <Shield size={16} />
            </div>
            <h2 id="features-heading" className="wasel-home-section-title">
              {tx('featuresTitle')}
            </h2>
          </div>
        </div>
        <div
          className="wasel-home-features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: 16,
          }}
        >
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.titleKey}
                initial={false}
                whileHover={{ y: -4 }}
                style={{
                  borderRadius: R.xl,
                  padding: '24px',
                  background: 'var(--card)',
                  border: `1px solid ${feature.accent}24`,
                  boxShadow: SH.sm,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: R.lg,
                    background: `${feature.accent}14`,
                    border: `1px solid ${feature.accent}24`,
                    color: feature.accent,
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: TYPE.weight.black,
                    color: 'var(--foreground)',
                    lineHeight: 1.3,
                  }}
                >
                  {tx(feature.titleKey)}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: 'var(--muted-foreground)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                  }}
                >
                  {tx(feature.descKey)}
                </p>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={false}
        className="wasel-home-section"
        aria-labelledby="services-heading"
      >
        <div className="wasel-home-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="wasel-home-section-icon" style={{ color: C.gold }}>
              <Route size={16} />
            </div>
            <h2 id="services-heading" className="wasel-home-section-title">
              {tx('servicesTitle')}
            </h2>
          </div>
          <button
            type="button"
            className="wasel-home-section-action"
            onClick={() => void onNavigate('/app', 'services_browse_all')}
          >
            {tx('servicesSubtitle')}
          </button>
        </div>
        <div className="wasel-bento">
          {bentoTiles.map((tile) => {
            const Icon = tile.icon;
            const ArrowIcon = ar ? ArrowLeft : ArrowRight;
            return (
              <motion.button
                key={tile.titleKey}
                type="button"
                initial={false}
                whileHover={{ y: -3 }}
                onClick={() => void onNavigate(tile.path, `service_${tile.path.replace('/', '')}`)}
                className={tile.hero ? 'wasel-bento-tile wasel-bento-tile--hero' : 'wasel-bento-tile'}
                style={{
                  ['--tile-accent-dim' as string]: `${tile.accent}1a`,
                  color: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'start',
                }}
              >
                <div
                  className="wasel-bento-tile-icon"
                  style={{
                    background: `${tile.accent}14`,
                    border: `1px solid ${tile.accent}24`,
                    color: tile.accent,
                  }}
                >
                  <Icon size={22} />
                </div>
                <h3 className="wasel-bento-tile-title">
                  {tx(tile.titleKey)}
                </h3>
                <p className="wasel-bento-tile-desc">
                  {tx(tile.descKey)}
                </p>
                <div className="wasel-bento-points">
                  {tile.points.map((pointKey) => (
                    <div key={pointKey} className="wasel-bento-point">
                      <Check size={14} color={tile.accent} aria-hidden="true" />
                      {tx(pointKey)}
                    </div>
                  ))}
                </div>
                <div
                  className="wasel-bento-tile-cta"
                  style={{ color: tile.accent }}
                >
                  {tx(tile.ctaKey)}
                  <ArrowIcon size={13} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      <motion.section
        initial={false}
        className="wasel-home-section"
        aria-labelledby="stats-heading"
      >
        <div
          style={{
            borderRadius: R.xxl,
            padding: '32px 24px',
            background: `linear-gradient(180deg, ${C.cyanDim}, ${'var(--card)'})`,
            border: `1px solid ${C.cyanDim}`,
            boxShadow: SH.lg,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--primary)',
                marginBottom: 8,
              }}
            >
              {tx('homeSections.statsTitle')}
            </div>
            <h2 id="stats-heading" className="wasel-home-section-title" style={{ margin: 0, textAlign: 'center' }}>
              {tx('ctaTitle')}
            </h2>
          </div>
          <div
            className="wasel-home-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
              gap: 16,
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.labelKey}
                style={{
                  textAlign: 'center',
                  padding: '14px 10px',
                  minWidth: 0,
                  borderRadius: R.lg,
                  background: `${stat.accent}0d`,
                  border: `1px solid ${stat.accent}1f`,
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(1.75rem, 1.2rem + 2.4vw, 2.5rem)',
                    fontWeight: TYPE.weight.ultra,
                    color: stat.accent,
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    fontFamily: F,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: '0.85rem',
                    color: 'var(--muted-foreground)',
                    fontWeight: TYPE.weight.medium,
                  }}
                >
                  {tx(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <WaselButton
              type="button"
              variant="primary"
              size="lg"
              icon={<Route size={17} />}
              iconEnd={ar ? <Route size={16} style={{ transform: 'rotate(180deg)' }} /> : <Route size={16} />}
              onClick={() => void onNavigate('/app/auth?tab=register', 'stats_cta_register')}
            >
              {tx('ctaSignUpNow')}
            </WaselButton>
          </div>
        </div>
      </motion.section>
    </>
  );
}