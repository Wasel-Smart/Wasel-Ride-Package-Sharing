import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router';
import {
  Bus,
  Calendar,
  Car,
  ChevronRight,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  LayoutContainer,
  SectionWrapper,
  Select,
  Tabs,
  type TabItem,
} from '../../design-system/components';
import { BrandLockup, CardShell } from '../../components/brand';
import ProfilePageSurface from '../../features/profile/ProfilePage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { DeferredLandingMap } from '../../features/home/DeferredLandingMap';
import { useBusSearch } from '../../modules/bus/bus.hooks';
import { useRideSearch } from '../../modules/rides/ride.hooks';
import type { RideResult, RideType } from '../../modules/rides/ride.types';
import { useTrips } from '../../modules/trips/trip.hooks';
import {
  createConnectedPackage,
  getConnectedStats,
  getPackageByTrackingId,
  type PackageRequest,
} from '../../services/journeyLogistics';
import { createConnectedRide } from '../../services/journeyLogistics';
import { buildAuthPagePath, normalizeAuthReturnTo } from '../../utils/authFlow';

type OverviewCard = {
  detail: string;
  title: string;
};

type OverviewConfig = {
  cards: OverviewCard[];
  ctaLabel: string;
  ctaPath: string;
  description: string;
  eyebrow: string;
  title: string;
};

type BrandPillItem = {
  icon: ReactNode;
  label: string;
};

type HeroFeatureItem = {
  detail: string;
  icon: ReactNode;
  title: string;
};

const CITY_OPTIONS = [
  { label: 'Amman', value: 'Amman' },
  { label: 'Irbid', value: 'Irbid' },
  { label: 'Aqaba', value: 'Aqaba' },
  { label: 'Zarqa', value: 'Zarqa' },
  { label: 'Jerash', value: 'Jerash' },
  { label: 'Salt', value: 'Salt' },
] as const;

const RIDE_TYPE_OPTIONS = [
  { label: 'Any ride', value: 'any' },
  { label: 'Economy', value: 'economy' },
  { label: 'Comfort', value: 'comfort' },
  { label: 'Family', value: 'family' },
] as const;

const LANDING_RETURN_TO = '/app/find-ride?from=Amman&to=Irbid&search=1';

const overviewConfigs: Record<string, OverviewConfig> = {
  analytics: {
    eyebrow: 'Corridor proof',
    title: 'Analytics dashboard',
    description: 'Read adoption, corridor pull, and route trust from one surface.',
    ctaLabel: 'Open trips',
    ctaPath: '/app/my-trips',
    cards: [
      { title: 'Demand view', detail: 'See where rides, packages, and supply keep stacking.' },
      {
        title: 'Proof loop',
        detail: 'Watch route clarity, fill rate, and repeat use in one frame.',
      },
      { title: 'Support load', detail: 'Track where customer friction is starting to build.' },
    ],
  },
  execution: {
    eyebrow: 'Operations',
    title: 'Execution OS',
    description:
      'Coordinate field actions, support, and route decisions without changing language.',
    ctaLabel: 'Open notifications',
    ctaPath: '/app/notifications',
    cards: [
      { title: 'Field queue', detail: 'Keep the next operational move visible.' },
      { title: 'Support handoff', detail: 'Give support one source of truth for urgent cases.' },
      {
        title: 'Service rhythm',
        detail: 'Align riders, drivers, and operations around the same signal.',
      },
    ],
  },
  mobility: {
    eyebrow: 'Network',
    title: 'Mobility OS',
    description: 'Keep the Jordan corridor visible while you switch between flows.',
    ctaLabel: 'Open bus',
    ctaPath: '/app/bus',
    cards: [
      {
        title: 'Live map',
        detail: 'The route stays in the background instead of taking over the page.',
      },
      {
        title: 'Shared inventory',
        detail: 'Rides, buses, and packages read from the same network.',
      },
      { title: 'Decision clarity', detail: 'The next action stays obvious on every screen.' },
    ],
  },
  intelligence: {
    eyebrow: 'Signal layer',
    title: 'AI intelligence',
    description: 'Surface demand, timing, and route confidence in simple language.',
    ctaLabel: 'Open analytics',
    ctaPath: '/app/analytics',
    cards: [
      { title: 'Demand pulse', detail: 'Spot which corridor needs more supply now.' },
      { title: 'Price guide', detail: 'Keep fares understandable before a route opens.' },
      { title: 'Trust signal', detail: 'Show why one route is safer or stronger than another.' },
    ],
  },
  trust: {
    eyebrow: 'Trust',
    title: 'Trust center',
    description: 'Verification, support, and safety language now live in one system.',
    ctaLabel: 'Open settings',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Verification', detail: 'Show readiness without adding extra friction.' },
      { title: 'Safety', detail: 'Keep urgent tools close to the main action.' },
      { title: 'Support', detail: 'Make the help path visible before a user asks.' },
    ],
  },
  safety: {
    eyebrow: 'Safety',
    title: 'Safety tools',
    description: 'Critical support stays visible and easy to reach across the app.',
    ctaLabel: 'Call support',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Live alerts', detail: 'High-priority issues stand out fast.' },
      { title: 'Trusted contacts', detail: 'Keep emergency paths obvious.' },
      { title: 'Trip status', detail: 'Tie the safety message to the current route.' },
    ],
  },
  plus: {
    eyebrow: 'Membership',
    title: 'Wasel Plus',
    description: 'Rewards, priority support, and premium routing in the same visual language.',
    ctaLabel: 'Open wallet',
    ctaPath: '/app/wallet',
    cards: [
      { title: 'Priority help', detail: 'Reach support faster on busy corridors.' },
      { title: 'Reward loop', detail: 'Keep membership value easy to read.' },
      { title: 'Premium routing', detail: 'Show what a premium move gives the user.' },
    ],
  },
  profile: {
    eyebrow: 'Profile',
    title: 'Profile',
    description: 'Keep your account details short, trusted, and easy to update.',
    ctaLabel: 'Open settings',
    ctaPath: '/app/settings',
    cards: [
      { title: 'Account identity', detail: 'One account across rides, packages, bus, and wallet.' },
      { title: 'Verification state', detail: 'Show what is confirmed and what still needs work.' },
      { title: 'Support context', detail: 'Keep the contact path close to the profile summary.' },
    ],
  },
  notifications: {
    eyebrow: 'Alerts',
    title: 'Notifications',
    description: 'Trip, support, and wallet updates now use the same hierarchy.',
    ctaLabel: 'Open trips',
    ctaPath: '/app/my-trips',
    cards: [
      { title: 'Trip updates', detail: 'Live ride, bus, and package changes stay grouped.' },
      { title: 'Support actions', detail: 'Urgent replies stand above passive updates.' },
      { title: 'Wallet alerts', detail: 'Payment state stays direct and readable.' },
    ],
  },
  driver: {
    eyebrow: 'Driver mode',
    title: 'Driver dashboard',
    description: 'Supply, readiness, and upcoming rider actions in one place.',
    ctaLabel: 'Offer route',
    ctaPath: '/app/offer-ride',
    cards: [
      { title: 'Route supply', detail: 'Open the next route with one primary action.' },
      { title: 'Readiness', detail: 'Know what is still missing before going live.' },
      { title: 'Incoming demand', detail: 'Keep requests visible without clutter.' },
    ],
  },
  innovation: {
    eyebrow: 'Product',
    title: 'Innovation hub',
    description: 'Explore experiments without breaking the main system language.',
    ctaLabel: 'Back to landing',
    ctaPath: '/',
    cards: [
      { title: 'New patterns', detail: 'Test ideas inside the same shared structure.' },
      { title: 'Route concepts', detail: 'Keep prototypes tied to the core corridor story.' },
      { title: 'Feature proof', detail: 'Show why a new concept deserves to exist.' },
    ],
  },
  moderation: {
    eyebrow: 'Operations',
    title: 'Moderation',
    description: 'Review trust, quality, and support issues without visual noise.',
    ctaLabel: 'Open trust center',
    ctaPath: '/app/trust',
    cards: [
      { title: 'Queue first', detail: 'Make the next moderation action obvious.' },
      { title: 'Context nearby', detail: 'Put route, user, and support context together.' },
      { title: 'One decision path', detail: 'Reduce scattered moderation controls.' },
    ],
  },
};

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="ds-page__header">
      <div className="ds-eyebrow">
        <Sparkles size={14} />
        {eyebrow}
      </div>
      <h1 className="ds-title">{title}</h1>
      <p className="ds-copy">{description}</p>
      {action ? <div className="ds-minor-actions">{action}</div> : null}
    </div>
  );
}

function MetricGrid({ items }: { items: Array<{ detail: string; label: string; value: string }> }) {
  return (
    <div className="ds-kpi-grid">
      {items.map(item => (
        <Card className="ds-kpi-item" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <span>{item.detail}</span>
        </Card>
      ))}
    </div>
  );
}

function ProtectedPage({ children }: { children: ReactNode }) {
  const { loading, user } = useLocalAuth();
  const location = useLocation();

  if (loading) {
    return (
      <LayoutContainer>
        <div className="ds-page">
          <Card>
            <h1 className="ds-section-title">Loading Wasel</h1>
            <p className="ds-copy ds-copy--tight">Preparing the live corridor.</p>
          </Card>
        </div>
      </LayoutContainer>
    );
  }

  if (!user) {
    const returnTo = normalizeAuthReturnTo(
      `${location.pathname}${location.search}${location.hash}`,
      '/app/find-ride',
    );
    return <Navigate replace to={buildAuthPagePath('signin', returnTo)} />;
  }

  return <>{children}</>;
}

function SupportActions() {
  return (
    <div className="ds-support-actions">
      <Button variant="ghost">
        <Phone size={16} />
        Call support
      </Button>
      <Button variant="ghost">
        <Mail size={16} />
        Email us
      </Button>
    </div>
  );
}

function HeroStats({ items }: { items: Array<{ detail: string; label: string; value: string }> }) {
  return (
    <div className="ds-feature-grid ds-hero-stat-grid">
      {items.map(item => (
        <Card className="ds-hero-stat-card" key={item.label}>
          <span className="ds-hero-stat-card__label">{item.label}</span>
          <strong className="ds-hero-stat-card__value">{item.value}</strong>
          <span className="ds-hero-stat-card__detail">{item.detail}</span>
        </Card>
      ))}
    </div>
  );
}

function BrandPillRow({ items }: { items: BrandPillItem[] }) {
  return (
    <div className="ds-brand-pill-row" aria-label="Brand highlights">
      {items.map(item => (
        <span className="ds-brand-pill" key={item.label}>
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function HeroFeatureGrid({ items }: { items: HeroFeatureItem[] }) {
  return (
    <div className="ds-hero-feature-grid">
      {items.map(item => (
        <Card className="ds-hero-feature-card" key={item.title}>
          <span className="ds-hero-feature-card__icon">{item.icon}</span>
          <div className="ds-hero-feature-card__title">{item.title}</div>
          <p className="ds-hero-feature-card__detail">{item.detail}</p>
        </Card>
      ))}
    </div>
  );
}

function ActionCards({
  items,
  onNavigate,
}: {
  items: Array<{ detail: string; icon: ReactNode; path: string; title: string }>;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="ds-action-grid">
      {items.map(item => (
        <Card className="ds-route-card" key={item.title}>
          <div className="ds-list-item__icon">{item.icon}</div>
          <div>
            <h2 className="ds-card__title">{item.title}</h2>
            <p className="ds-copy ds-copy--tight">{item.detail}</p>
          </div>
          <Button onClick={() => onNavigate(item.path)} variant="ghost">
            Open
            <ChevronRight size={16} />
          </Button>
        </Card>
      ))}
    </div>
  );
}

function MapHeroPanel({
  children,
  mapVariant = 'ambient',
  signals = ['Ride flow live', 'Package lanes active', 'Mobility OS synced'],
}: {
  children: ReactNode;
  mapVariant?: 'ambient' | 'full';
  signals?: string[];
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <Card className="ds-hero-panel">
      <div aria-hidden="true" className="ds-hero-panel__media">
        <div className="ds-map-stage">
          <DeferredLandingMap ar={ar} eager variant={mapVariant} />
        </div>
      </div>
      <div className="ds-hero-panel__content">
        {children}
        <div className="ds-hero-panel__signals" aria-label="Live network status">
          {signals.map(label => (
            <span key={label} className="ds-hero-panel__signal-chip">
              <span aria-hidden="true" className="ds-hero-panel__signal-bar" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SimpleOverviewPage({ configKey }: { configKey: keyof typeof overviewConfigs }) {
  const navigate = useIframeSafeNavigate();
  const config = overviewConfigs[configKey];

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            action={<Button onClick={() => navigate(config.ctaPath)}>{config.ctaLabel}</Button>}
            description={config.description}
            eyebrow={config.eyebrow}
            title={config.title}
          />
          <ActionCards
            items={config.cards.map(card => ({
              ...card,
              icon: <Sparkles size={18} />,
              path: config.ctaPath,
            }))}
            onNavigate={navigate}
          />
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function LandingPage() {
  const { signInWithFacebook, signInWithGoogle } = useAuth();
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const [mode, setMode] = useState<'ride' | 'package'>('ride');
  const [route, setRoute] = useState({ date: '', from: 'Amman', to: 'Irbid' });

  const primaryActionLabel = mode === 'ride' ? 'Find a ride' : 'Open packages';
  const primaryActionPath =
    mode === 'ride'
      ? `/app/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&search=1`
      : `/app/packages?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`;
  const emailPath = buildAuthPagePath('signin', LANDING_RETURN_TO);
  const landingHighlights: BrandPillItem[] = [
    { icon: <MapPin size={14} />, label: 'Jordan corridor view' },
    { icon: <Package size={14} />, label: 'Rides and packages together' },
    { icon: <Shield size={14} />, label: 'Trust stays nearby' },
  ];
  const landingFeatures: HeroFeatureItem[] = [
    {
      icon: <Search size={18} />,
      title: 'Start with the route',
      detail: 'The first screen shows the corridor clearly before any booking choice takes over.',
    },
    {
      icon: <Package size={18} />,
      title: 'One shared service language',
      detail: 'Rides, packages, and bus all keep the same visual hierarchy and the same account.',
    },
    {
      icon: <Shield size={18} />,
      title: 'Support in the same shell',
      detail:
        'Recovery, support, and next steps stay visible instead of feeling like separate products.',
    },
  ];
  const landingSignals =
    mode === 'ride'
      ? ['Ride routes live', 'Seats and timings visible', 'Support one tap away']
      : ['Package lanes live', 'Shared corridor handoff', 'Support one tap away'];

  return (
    <LayoutContainer width="wide">
      <main className="ds-page" role="main">
        <header className="ds-shell-header__inner">
          <button className="ds-shell-header__brand" onClick={() => navigate('/')} type="button">
            <BrandLockup showTagline size="lg" surface="dark" tagline="LIVE MOBILITY NETWORK" />
          </button>
          <div className="ds-shell-header__actions">
            <SupportActions />
            {!user ? (
              <Button onClick={() => navigate(buildAuthPagePath('signin', '/app/find-ride'))}>
                Sign in
              </Button>
            ) : null}
          </div>
        </header>

        <section className="ds-landing-grid">
          <div className="ds-stack ds-hero-stack">
            <div className="ds-eyebrow">
              <Sparkles size={14} />
              Jordan mobility network
            </div>
            <h1 className="ds-title ds-title--landing">
              One clear Wasel route layer for every move.
            </h1>
            <p className="ds-copy">
              Start with the map, then open rides, packages, buses, or support without changing the
              product language. Wasel keeps the corridor readable from the first glance.
            </p>
            <BrandPillRow items={landingHighlights} />
            <HeroFeatureGrid items={landingFeatures} />
            <HeroStats
              items={[
                { label: 'Core services', value: '4', detail: 'Rides, bus, packages, and wallet.' },
                {
                  label: 'Mapped cities',
                  value: '12',
                  detail: 'North-to-south corridor context stays visible.',
                },
                {
                  label: 'Live support',
                  value: '24/7',
                  detail: 'Recovery and help stay close to the route.',
                },
              ]}
            />
          </div>

          <MapHeroPanel mapVariant="ambient" signals={landingSignals}>
            <div className="ds-hero-panel__intro">
              <div className="ds-panel-kicker">Live route planner</div>
              <h2 className="ds-section-title">Choose one corridor and open the right flow.</h2>
              <p className="ds-copy ds-copy--tight">
                Rides and packages share the same Wasel layout, so the planner feels familiar before
                and after sign-in.
              </p>
            </div>
            <Tabs
              items={
                [
                  {
                    content: (
                      <p className="ds-copy ds-copy--tight">
                        Choose a corridor, then open the live ride flow.
                      </p>
                    ),
                    label: 'Rides',
                    value: 'ride',
                  },
                  {
                    content: (
                      <p className="ds-copy ds-copy--tight">
                        Start from the same corridor, then open the package flow.
                      </p>
                    ),
                    label: 'Packages',
                    value: 'package',
                  },
                ] satisfies TabItem<'ride' | 'package'>[]
              }
              label="Services"
              onChange={setMode}
              value={mode}
            />

            <div className="ds-step-rail">
              {[
                { detail: 'Choose the corridor.', label: 'Select route' },
                {
                  detail: mode === 'ride' ? 'Pick timing.' : 'Keep the parcel simple.',
                  label: 'Set timing',
                },
                { detail: 'Open the main flow.', label: 'Move now' },
              ].map((step, index) => (
                <div className="ds-step-rail__item" data-active={index === 0} key={step.label}>
                  <span className="ds-step-rail__index">{index + 1}</span>
                  <div>
                    <strong>{step.label}</strong>
                    <div className="ds-caption">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ds-form-grid">
              <Select
                label="Leaving from"
                onChange={event => setRoute(current => ({ ...current, from: event.target.value }))}
                options={CITY_OPTIONS.map(city => ({ label: city.label, value: city.value }))}
                value={route.from}
              />
              <Select
                label="Going to"
                onChange={event => setRoute(current => ({ ...current, to: event.target.value }))}
                options={CITY_OPTIONS.map(city => ({ label: city.label, value: city.value }))}
                value={route.to}
              />
              <Input
                label="When"
                onChange={event => setRoute(current => ({ ...current, date: event.target.value }))}
                type="date"
                value={route.date}
              />
            </div>

            <div className="ds-minor-actions">
              <Button fullWidth onClick={() => navigate(primaryActionPath)}>
                {primaryActionLabel}
              </Button>
              <Button fullWidth onClick={() => navigate('/app/offer-ride')} variant="secondary">
                Offer your ride
              </Button>
            </div>

            {!user ? (
              <div className="ds-social-grid">
                <Button
                  fullWidth
                  onClick={() => void signInWithGoogle(LANDING_RETURN_TO)}
                  variant="secondary"
                >
                  Continue with Google
                </Button>
                <Button
                  fullWidth
                  onClick={() => void signInWithFacebook(LANDING_RETURN_TO)}
                  variant="secondary"
                >
                  Continue with Facebook
                </Button>
                <Button fullWidth onClick={() => navigate(emailPath)} variant="ghost">
                  Continue with email
                </Button>
              </div>
            ) : null}
          </MapHeroPanel>
        </section>

        <SectionWrapper
          description="Three simple ways to understand Wasel in a few seconds."
          eyebrow={
            <>
              <Sparkles size={14} />
              Choose your flow
            </>
          }
          title="Choose your flow"
        >
          <ActionCards
            items={[
              {
                detail: 'Compare the corridor, timing, and seat.',
                icon: <Search size={18} />,
                path: primaryActionPath,
                title: 'Find a ride',
              },
              {
                detail: 'Attach the parcel to the same network.',
                icon: <Package size={18} />,
                path: '/app/packages',
                title: 'Send a package',
              },
              {
                detail: 'Turn an empty departure into more value.',
                icon: <Car size={18} />,
                path: '/app/offer-ride',
                title: 'Offer your ride',
              },
            ]}
            onNavigate={navigate}
          />
        </SectionWrapper>

        <SectionWrapper
          description="Bus services and Mobility OS stay visible as first-class Wasel surfaces."
          eyebrow={
            <>
              <Sparkles size={14} />
              Network tools
            </>
          }
          title="Bus and corridor tools"
        >
          <ActionCards
            items={[
              {
                detail: 'Book official Jordan corridor routes from one direct surface.',
                icon: <Bus size={18} />,
                path: '/app/bus',
                title: 'Wasel Bus',
              },
              {
                detail: 'Open the corridor map and switch flows without losing context.',
                icon: <MapPin size={18} />,
                path: '/app/mobility-os',
                title: 'Mobility OS',
              },
            ]}
            onNavigate={navigate}
          />
        </SectionWrapper>
      </main>
    </LayoutContainer>
  );
}

export function AuthPage() {
  const [params, setParams] = useSearchParams();
  const initialTab =
    params.get('tab') === 'signup' || params.get('tab') === 'register' ? 'signup' : 'signin';
  const returnTo = normalizeAuthReturnTo(params.get('returnTo'), '/app/find-ride');
  const navigate = useIframeSafeNavigate();
  const { signIn, register, user } = useLocalAuth();
  const { resetPassword, signInWithFacebook, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'none' | 'google' | 'facebook' | 'submit' | 'reset'>('none');
  const authHighlights: BrandPillItem[] = [
    { icon: <Search size={14} />, label: 'Rides' },
    { icon: <Package size={14} />, label: 'Packages' },
    { icon: <Bus size={14} />, label: 'Bus' },
    { icon: <Shield size={14} />, label: 'Wallet and recovery' },
  ];
  const authSignals = ['One account live', 'Return path saved', 'Recovery ready'];

  useEffect(() => {
    if (user) {
      navigate(returnTo);
    }
  }, [navigate, returnTo, user]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    next.set('returnTo', returnTo);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, returnTo, setParams, tab]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setBusy('submit');

    if (tab === 'signin') {
      const result = await signIn(email.trim(), password);
      setBusy('none');
      if (result.error) {
        setError(result.error);
        return;
      }
      navigate(returnTo);
      return;
    }

    const result = await register(name.trim(), email.trim(), password, phone.trim() || undefined);
    setBusy('none');
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresEmailConfirmation) {
      setNotice(`Check ${result.email ?? email.trim()} to finish account setup.`);
      setTab('signin');
      return;
    }
    navigate(returnTo);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }
    setBusy('reset');
    const result = await resetPassword(email.trim());
    setBusy('none');
    if (result.error) {
      setError(result.error instanceof Error ? result.error.message : String(result.error));
      return;
    }
    setNotice(`If ${email.trim()} is registered, a password reset link has been sent.`);
  };

  return (
    <LayoutContainer width="wide">
      <div className="ds-page">
        <header className="ds-shell-header__inner">
          <button className="ds-shell-header__brand" onClick={() => navigate('/')} type="button">
            <BrandLockup showTagline size="lg" surface="dark" tagline="LIVE MOBILITY NETWORK" />
          </button>
          <div className="ds-shell-header__actions">
            <Button onClick={() => navigate('/')} variant="ghost">
              Back to landing
            </Button>
          </div>
        </header>

        <section className="ds-auth-grid">
          <MapHeroPanel mapVariant="ambient" signals={authSignals}>
            <div className="ds-eyebrow">
              <Sparkles size={14} />
              One access layer
            </div>
            <h1 className="ds-title ds-title--auth">One Wasel account across every route.</h1>
            <p className="ds-copy">
              Sign in once, then move between rides, packages, buses, and wallet without switching
              to a different product language.
            </p>
            <BrandPillRow items={authHighlights} />
            <HeroStats
              items={[
                {
                  label: 'Services unlocked',
                  value: '4',
                  detail: 'Rides, packages, bus, and wallet.',
                },
                {
                  label: 'Return path',
                  value: 'Ready',
                  detail: `Back to ${returnTo.replace('/app/', '') || 'find ride'}.`,
                },
                { label: 'Recovery', value: '24/7', detail: 'Secure help stays active.' },
              ]}
            />
          </MapHeroPanel>

          <CardShell className="ds-auth-card">
            <Tabs
              items={
                [
                  { content: <div />, label: 'Sign in', value: 'signin' },
                  { content: <div />, label: 'Create account', value: 'signup' },
                ] satisfies TabItem<'signin' | 'signup'>[]
              }
              label="Authentication tabs"
              onChange={setTab}
              value={tab}
            />
            <div className="ds-stack" data-gap="tight">
              <div className="ds-panel-kicker">Premium access</div>
              <h2 className="ds-section-title">
                {tab === 'signin' ? 'Sign in to Wasel' : 'Create your Wasel account'}
              </h2>
              <p className="ds-copy ds-copy--tight">
                {tab === 'signin'
                  ? 'Sign in to continue. Keep the essentials visible on every screen.'
                  : 'Create one account, then move between every Wasel flow without a design break.'}
              </p>
            </div>

            {notice ? (
              <div className="ds-inline-feedback" data-tone="success">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="ds-inline-feedback" data-tone="error">
                {error}
              </div>
            ) : null}

            <form className="ds-stack" onSubmit={handleSubmit}>
              {tab === 'signup' ? (
                <Input
                  id="auth-name"
                  label="Full name"
                  onChange={event => setName(event.target.value)}
                  placeholder="Ahmad Al-Rashid"
                  value={name}
                />
              ) : null}

              <Input
                id="auth-email"
                label="Email address"
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />

              <Input
                id="auth-password"
                label="Password"
                onChange={event => setPassword(event.target.value)}
                placeholder={tab === 'signin' ? 'Enter your password' : 'Create a secure password'}
                type="password"
                value={password}
              />

              {tab === 'signup' ? (
                <Input
                  id="auth-phone"
                  label="Phone number"
                  onChange={event => setPhone(event.target.value)}
                  placeholder="+962 79 123 4567"
                  value={phone}
                />
              ) : null}

              {tab === 'signin' ? (
                <Button onClick={handleResetPassword} variant="ghost">
                  {busy === 'reset' ? 'Sending reset link...' : 'Forgot password?'}
                </Button>
              ) : null}

              <Button
                aria-label={tab === 'signin' ? 'Submit sign in' : 'Create account'}
                fullWidth
                type="submit"
              >
                {busy === 'submit'
                  ? 'Please wait...'
                  : tab === 'signin'
                    ? 'Submit sign in'
                    : 'Create account'}
              </Button>
            </form>

            <div className="ds-divider">or continue with</div>

            <div className="ds-social-grid">
              <Button
                fullWidth
                onClick={() => {
                  setBusy('google');
                  void signInWithGoogle(returnTo).finally(() => setBusy('none'));
                }}
                variant="secondary"
              >
                {busy === 'google' ? 'Connecting Google...' : 'Continue with Google'}
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  setBusy('facebook');
                  void signInWithFacebook(returnTo).finally(() => setBusy('none'));
                }}
                variant="secondary"
              >
                {busy === 'facebook' ? 'Connecting Facebook...' : 'Continue with Facebook'}
              </Button>
            </div>

            <p className="ds-auth-footnote">
              One identity across rides, packages, bus, wallet, and recovery.
            </p>
          </CardShell>
        </section>
      </div>
    </LayoutContainer>
  );
}

export function FindRidePage() {
  const navigate = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialFrom = searchParams.get('from') ?? 'Amman';
  const initialTo = searchParams.get('to') ?? 'Irbid';
  const initialDate = searchParams.get('date') ?? '';
  const initialSearched = searchParams.get('search') === '1';
  const {
    state,
    visibleResults,
    setFrom,
    setFromQuery,
    setMode,
    setRideType,
    setTo,
    setToQuery,
    setDate,
    submitSearch,
    requestRide,
    loadMoreResults,
    hasMoreResults,
  } = useRideSearch({
    date: initialDate,
    from: initialFrom,
    passengerId: user?.id,
    searched: initialSearched,
    to: initialTo,
  });

  const searchRide = async () => {
    await submitSearch();
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            action={
              <>
                <Button onClick={() => navigate('/app/my-trips')} variant="ghost">
                  Open trips
                </Button>
                <Button onClick={() => navigate('/app/offer-ride')} variant="secondary">
                  Offer your ride
                </Button>
              </>
            }
            description="Search a corridor, choose a time, and open the live ride flow."
            eyebrow="Find ride"
            title="Find your ride instantly"
          />

          <div className="ds-screen-grid">
            <SectionWrapper description="Keep the form step-based and direct." title="Search flow">
              <div className="ds-step-rail">
                {[
                  { label: 'From and to', detail: 'Pick the corridor.' },
                  { label: 'When', detail: 'Choose now or schedule.' },
                  { label: 'Request', detail: 'Open the main action.' },
                ].map((step, index) => (
                  <div className="ds-step-rail__item" data-active={index === 0} key={step.label}>
                    <span className="ds-step-rail__index">{index + 1}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <div className="ds-caption">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionWrapper>

            <SectionWrapper description="One form, one primary action." title="Live ride request">
              <div className="ds-form-grid">
                <Input
                  hint="Use a city or corridor origin."
                  label="From"
                  onBlur={event => setFrom(event.target.value)}
                  onChange={event => {
                    setFromQuery(event.target.value);
                    setFrom(event.target.value);
                  }}
                  placeholder="Amman"
                  value={state.draft.fromQuery || state.draft.from}
                />
                <Input
                  hint="Choose a clear destination."
                  label="To"
                  onBlur={event => setTo(event.target.value)}
                  onChange={event => {
                    setToQuery(event.target.value);
                    setTo(event.target.value);
                  }}
                  placeholder="Irbid"
                  value={state.draft.toQuery || state.draft.to}
                />
                <Select
                  label="Search mode"
                  onChange={event => setMode(event.target.value as 'now' | 'schedule')}
                  options={[
                    { label: 'Now', value: 'now' },
                    { label: 'Schedule', value: 'schedule' },
                  ]}
                  value={state.draft.mode}
                />
                <Select
                  label="Ride type"
                  onChange={event => setRideType(event.target.value as RideType)}
                  options={[...RIDE_TYPE_OPTIONS]}
                  value={state.draft.rideType}
                />
                {state.draft.mode === 'schedule' ? (
                  <Input
                    error={state.validation.date}
                    label="Departure"
                    onChange={event => setDate(event.target.value)}
                    type="date"
                    value={state.draft.date}
                  />
                ) : null}
              </div>

              {state.error ? (
                <div className="ds-inline-feedback" data-tone="error">
                  {state.error}
                </div>
              ) : null}
              {state.successMessage ? (
                <div className="ds-inline-feedback" data-tone="success">
                  {state.successMessage}
                </div>
              ) : null}

              <Button data-testid="find-ride-search" fullWidth onClick={() => void searchRide()}>
                {state.phase === 'searching' ? 'Searching...' : 'Search rides'}
              </Button>
            </SectionWrapper>
          </div>

          <SectionWrapper
            description="Premium ride matches appear here once the corridor is clear."
            title="Premium ride matches"
          >
            <div className="ds-scroll-stack">
              {visibleResults.length === 0 ? (
                <Card>
                  <h2 className="ds-card__title">
                    {state.searched ? 'No direct rides yet' : 'Start with a corridor'}
                  </h2>
                  <p className="ds-copy ds-copy--tight">
                    {state.searched
                      ? 'Try widening the ride type or changing the corridor.'
                      : 'Search a pickup and destination to unlock live ride matches.'}
                  </p>
                </Card>
              ) : null}

              {visibleResults.map(ride => (
                <RideResultCard
                  key={ride.id}
                  onRequestRide={async selectedRide => {
                    if (!user) {
                      navigate(buildAuthPagePath('signin', '/app/find-ride'));
                      return;
                    }
                    await requestRide({
                      passengerEmail: user.email,
                      passengerId: user.id,
                      passengerName: user.name,
                      passengerPhone: user.phone,
                      ride: selectedRide,
                    });
                  }}
                  ride={ride}
                />
              ))}
            </div>
            {hasMoreResults ? (
              <Button onClick={loadMoreResults} variant="secondary">
                Load more rides
              </Button>
            ) : null}
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

function RideResultCard({
  ride,
  onRequestRide,
}: {
  onRequestRide: (ride: RideResult) => Promise<void>;
  ride: RideResult;
}) {
  return (
    <Card className="ds-request-card">
      <div className="ds-route-card__header">
        <div>
          <h2 className="ds-card__title">
            {ride.from} to {ride.to}
          </h2>
          <div className="ds-card__meta">
            <span>{ride.time}</span>
            <span>{ride.estimatedArrivalLabel}</span>
            <span>{ride.vehicleType}</span>
          </div>
        </div>
        <span className="ds-badge" data-tone="accent">
          {ride.pricePerSeat} JOD
        </span>
      </div>
      <div className="ds-feature-grid">
        <div className="ds-stat-item">
          <div className="ds-stat-item__icon">
            <UserRound size={16} />
          </div>
          <div>
            <strong>{ride.driver.name}</strong>
            <span>{ride.driver.rating} rating</span>
          </div>
        </div>
        <div className="ds-stat-item">
          <div className="ds-stat-item__icon">
            <Calendar size={16} />
          </div>
          <div>
            <strong>{ride.date}</strong>
            <span>{ride.seatsAvailable} seats open</span>
          </div>
        </div>
        <div className="ds-stat-item">
          <div className="ds-stat-item__icon">
            <Shield size={16} />
          </div>
          <div>
            <strong>{ride.rideType}</strong>
            <span>{ride.recommendedReason ?? 'Reliable corridor match.'}</span>
          </div>
        </div>
      </div>
      <Button data-testid={`ride-request-${ride.id}`} onClick={() => void onRequestRide(ride)}>
        Request ride
      </Button>
    </Card>
  );
}

export function OfferRidePage() {
  const { user } = useLocalAuth();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    acceptsPackages: true,
    carModel: '',
    date: '',
    from: 'Amman',
    note: '',
    packageCapacity: 'medium' as 'small' | 'medium' | 'large',
    price: 7,
    seats: 3,
    time: '08:00',
    to: 'Irbid',
  });

  const updateForm = <T extends keyof typeof form>(key: T, value: (typeof form)[T]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!user) {
      return;
    }
    setBusy(true);
    setError('');

    try {
      await createConnectedRide({
        acceptsPackages: form.acceptsPackages,
        carModel: form.carModel || 'Toyota Camry 2024',
        date: form.date,
        from: form.from,
        gender: 'any',
        note: form.note,
        ownerEmail: user.email,
        ownerId: user.id,
        ownerPhone: user.phone,
        packageCapacity: form.packageCapacity,
        packageNote: form.acceptsPackages ? 'Shared package lane' : '',
        prayer: false,
        price: form.price,
        seats: form.seats,
        status: 'active',
        time: form.time,
        to: form.to,
      });
      setPosted(true);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'We could not post the route right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Publish seats and package space in one step-based flow."
            eyebrow="Driver flow"
            title="Offer route"
          />

          {posted ? (
            <SectionWrapper
              description="Your route is now visible inside the shared network."
              title="Route is live"
            >
              <MetricGrid
                items={[
                  {
                    label: 'Corridor',
                    value: `${form.from} to ${form.to}`,
                    detail: 'Your route is live.',
                  },
                  { label: 'Seats', value: `${form.seats}`, detail: 'Shared supply is open.' },
                  {
                    label: 'Packages',
                    value: form.acceptsPackages ? 'On' : 'Off',
                    detail: 'Parcel mode follows the same route.',
                  },
                  {
                    label: 'Price',
                    value: `${form.price} JOD`,
                    detail: 'Seat price is visible now.',
                  },
                ]}
              />
            </SectionWrapper>
          ) : (
            <div className="ds-screen-grid">
              <SectionWrapper
                description="Three moves keep this route simple."
                title="Publish steps"
              >
                <div className="ds-step-rail">
                  {[
                    { label: 'Shape route', detail: 'Set cities and timing.' },
                    { label: 'Add vehicle', detail: 'Keep the route specific.' },
                    { label: 'Go live', detail: 'Open one primary action.' },
                  ].map((item, index) => (
                    <div
                      className="ds-step-rail__item"
                      data-active={step === index + 1}
                      key={item.label}
                    >
                      <span className="ds-step-rail__index">{index + 1}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <div className="ds-caption">{item.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionWrapper>

              <SectionWrapper
                description="The route form stays direct on every step."
                title="Publish route"
              >
                {step === 1 ? (
                  <div className="ds-stack">
                    <div className="ds-form-grid">
                      <Select
                        label="From"
                        onChange={event => updateForm('from', event.target.value)}
                        options={CITY_OPTIONS.map(city => ({
                          label: city.label,
                          value: city.value,
                        }))}
                        value={form.from}
                      />
                      <Select
                        label="To"
                        onChange={event => updateForm('to', event.target.value)}
                        options={CITY_OPTIONS.map(city => ({
                          label: city.label,
                          value: city.value,
                        }))}
                        value={form.to}
                      />
                      <Input
                        label="Date"
                        onChange={event => updateForm('date', event.target.value)}
                        type="date"
                        value={form.date}
                      />
                      <Input
                        label="Departure"
                        onChange={event => updateForm('time', event.target.value)}
                        type="time"
                        value={form.time}
                      />
                    </div>
                    <Button data-testid="offer-ride-step-1" onClick={() => setStep(2)}>
                      Continue to vehicle
                    </Button>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="ds-stack">
                    <div className="ds-form-grid">
                      <Input
                        label="Vehicle"
                        onChange={event => updateForm('carModel', event.target.value)}
                        placeholder="Toyota Camry 2023"
                        value={form.carModel}
                      />
                      <Input
                        label="Seats"
                        min="1"
                        onChange={event => updateForm('seats', Number(event.target.value) || 1)}
                        type="number"
                        value={String(form.seats)}
                      />
                      <Input
                        label="Price"
                        min="1"
                        onChange={event => updateForm('price', Number(event.target.value) || 1)}
                        type="number"
                        value={String(form.price)}
                      />
                      <Select
                        label="Package lane"
                        onChange={event =>
                          updateForm(
                            'packageCapacity',
                            event.target.value as 'small' | 'medium' | 'large',
                          )
                        }
                        options={[
                          { label: 'Small', value: 'small' },
                          { label: 'Medium', value: 'medium' },
                          { label: 'Large', value: 'large' },
                        ]}
                        value={form.packageCapacity}
                      />
                    </div>
                    <Button data-testid="offer-ride-step-2" onClick={() => setStep(3)}>
                      Continue to publish
                    </Button>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="ds-stack">
                    <Card>
                      <div className="ds-card__meta">
                        <span>Corridor</span>
                        <span>
                          {form.from} to {form.to}
                        </span>
                      </div>
                      <h2 className="ds-section-title">{form.carModel || 'Toyota Camry 2024'}</h2>
                      <p className="ds-copy ds-copy--tight">
                        Seats, price, and package mode are now ready to publish.
                      </p>
                    </Card>
                    <textarea
                      className="ds-textarea"
                      onChange={event => updateForm('note', event.target.value)}
                      placeholder="Add one short note for riders."
                      value={form.note}
                    />
                    {error ? (
                      <div className="ds-inline-feedback" data-tone="error">
                        {error}
                      </div>
                    ) : null}
                    <Button data-testid="offer-ride-submit" fullWidth onClick={() => void submit()}>
                      {busy ? 'Posting route...' : 'Publish route'}
                    </Button>
                  </div>
                ) : null}
              </SectionWrapper>
            </div>
          )}
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function PackagesPage() {
  const location = useLocation();
  const { user } = useLocalAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [tab, setTab] = useState<'send' | 'track' | 'returns'>('send');
  const [createError, setCreateError] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [createdPackage, setCreatedPackage] = useState<PackageRequest | null>(null);
  const [composer, setComposer] = useState({
    from: searchParams.get('from') ?? 'Amman',
    note: '',
    recipientName: '',
    recipientPhone: '',
    to: searchParams.get('to') ?? 'Irbid',
    weight: '1 kg',
  });
  const stats = getConnectedStats();

  const createRequest = async () => {
    setCreateError('');
    try {
      const result = await createConnectedPackage({
        from: composer.from,
        note: composer.note,
        recipientName: composer.recipientName,
        recipientPhone: composer.recipientPhone,
        senderEmail: user?.email,
        senderName: user?.name,
        to: composer.to,
        weight: composer.weight,
      });
      setCreatedPackage(result);
      setTrackingId(result.trackingId);
      setTab('track');
    } catch (packageError) {
      setCreateError(
        packageError instanceof Error
          ? packageError.message
          : 'We could not create the package request right now.',
      );
    }
  };

  const searchTracking = async () => {
    const result = await getPackageByTrackingId(trackingId);
    if (!result) {
      setTrackingMessage('No package was found for that tracking ID yet.');
      return;
    }
    setCreatedPackage(result);
    setTrackingMessage(`Tracking loaded for ${result.trackingId}.`);
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            action={<Button onClick={() => setTab('send')}>Start package</Button>}
            description="Send, track, and manage returns inside one package system."
            eyebrow="Packages"
            title="Packages"
          />

          <MetricGrid
            items={[
              {
                label: 'Ready routes',
                value: String(stats.packageEnabledRides),
                detail: 'Corridors ready for parcel attach.',
              },
              {
                label: 'Packages',
                value: String(stats.packagesCreated),
                detail: 'Requests already inside the network.',
              },
              {
                label: 'Matches',
                value: String(stats.matchedPackages),
                detail: 'Packages attached to live routes.',
              },
              {
                label: 'Network',
                value: String(stats.ridesPosted),
                detail: 'Shared routes supporting package flow.',
              },
            ]}
          />

          <SectionWrapper
            description="Keep send, track, and returns in one clear rhythm."
            title="Package flow"
          >
            <Tabs
              items={
                [
                  {
                    content: (
                      <div className="ds-stack">
                        <div className="ds-step-rail">
                          {[
                            { label: 'Route', detail: 'Pick the corridor.' },
                            { label: 'Recipient', detail: 'Keep the handoff clear.' },
                            { label: 'Create', detail: 'Open one package request.' },
                          ].map((step, index) => (
                            <div
                              className="ds-step-rail__item"
                              data-active={index === 0}
                              key={step.label}
                            >
                              <span className="ds-step-rail__index">{index + 1}</span>
                              <div>
                                <strong>{step.label}</strong>
                                <div className="ds-caption">{step.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="ds-form-grid">
                          <Select
                            label="From"
                            onChange={event =>
                              setComposer(current => ({ ...current, from: event.target.value }))
                            }
                            options={CITY_OPTIONS.map(city => ({
                              label: city.label,
                              value: city.value,
                            }))}
                            value={composer.from}
                          />
                          <Select
                            label="To"
                            onChange={event =>
                              setComposer(current => ({ ...current, to: event.target.value }))
                            }
                            options={CITY_OPTIONS.map(city => ({
                              label: city.label,
                              value: city.value,
                            }))}
                            value={composer.to}
                          />
                          <Input
                            data-testid="package-recipient-name"
                            label="Recipient"
                            onChange={event =>
                              setComposer(current => ({
                                ...current,
                                recipientName: event.target.value,
                              }))
                            }
                            placeholder="Receiver Test"
                            value={composer.recipientName}
                          />
                          <Input
                            data-testid="package-recipient-phone"
                            label="Recipient phone"
                            onChange={event =>
                              setComposer(current => ({
                                ...current,
                                recipientPhone: event.target.value,
                              }))
                            }
                            placeholder="+962790000888"
                            value={composer.recipientPhone}
                          />
                          <Input
                            label="Weight"
                            onChange={event =>
                              setComposer(current => ({ ...current, weight: event.target.value }))
                            }
                            value={composer.weight}
                          />
                        </div>
                        <textarea
                          className="ds-textarea"
                          onChange={event =>
                            setComposer(current => ({ ...current, note: event.target.value }))
                          }
                          placeholder="Add one short package note."
                          value={composer.note}
                        />
                        {createError ? (
                          <div className="ds-inline-feedback" data-tone="error">
                            {createError}
                          </div>
                        ) : null}
                        <Button
                          data-testid="package-create-request"
                          fullWidth
                          onClick={() => void createRequest()}
                        >
                          Create package request
                        </Button>
                      </div>
                    ),
                    label: 'Send',
                    value: 'send',
                  },
                  {
                    content: (
                      <div className="ds-stack">
                        <Input
                          label="Find tracking"
                          onChange={event => setTrackingId(event.target.value)}
                          placeholder="PKG-12345"
                          value={trackingId}
                        />
                        <Button fullWidth onClick={() => void searchTracking()}>
                          Search tracking
                        </Button>
                        {trackingMessage ? (
                          <div className="ds-inline-feedback" data-tone="success">
                            {trackingMessage}
                          </div>
                        ) : null}
                        {createdPackage ? (
                          <Card>
                            <h2 className="ds-section-title">Package request created</h2>
                            <div className="ds-list">
                              <div className="ds-list-item">
                                <div>
                                  <strong>Tracking ID</strong>
                                  <div className="ds-caption">{createdPackage.trackingId}</div>
                                </div>
                              </div>
                              <div className="ds-list-item">
                                <div>
                                  <strong>Handoff code</strong>
                                  <div className="ds-caption">{createdPackage.handoffCode}</div>
                                </div>
                              </div>
                              <div className="ds-list-item">
                                <div>
                                  <strong>Status</strong>
                                  <div className="ds-caption">{createdPackage.status}</div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ) : null}
                      </div>
                    ),
                    label: 'Track',
                    value: 'track',
                  },
                  {
                    content: (
                      <div className="ds-stack">
                        <Card>
                          <h2 className="ds-card__title">Returns stay simple.</h2>
                          <p className="ds-copy ds-copy--tight">
                            Use the same network. Start from the original corridor and open a return
                            request when you need it.
                          </p>
                        </Card>
                        <Button fullWidth variant="secondary">
                          Start return request
                        </Button>
                      </div>
                    ),
                    label: 'Returns',
                    value: 'returns',
                  },
                ] satisfies TabItem<'send' | 'track' | 'returns'>[]
              }
              label="Package tabs"
              onChange={setTab}
              value={tab}
            />
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function BusPage() {
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [origin, setOrigin] = useState(searchParams.get('from') ?? 'Amman');
  const [destination, setDestination] = useState(searchParams.get('to') ?? 'Aqaba');
  const [tripDate, setTripDate] = useState(today);
  const [passengers, setPassengers] = useState(1);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { state, bookRoute } = useBusSearch({
    date: tripDate,
    from: origin,
    searchKey: searchParams.toString(),
    seats: passengers,
    to: destination,
  });

  const activeRoute =
    state.routes.find(route => route.id === selectedRouteId) ?? state.routes[0] ?? null;

  useEffect(() => {
    if (state.routes[0]) {
      setSelectedRouteId(current => current || state.routes[0].id);
    }
  }, [state.routes]);

  const reserveSeat = async () => {
    if (!activeRoute) {
      return;
    }
    await bookRoute({
      departureTime: activeRoute.dep,
      dropoffStop: activeRoute.dropoffPoint,
      passengerEmail: 'demo@wasel.jo',
      passengerName: 'Wasel User',
      pickupStop: activeRoute.pickupPoint,
      scheduleDate: tripDate,
      scheduleMode: 'schedule-later',
      seatPreference: 'window',
      seatsRequested: passengers,
      totalPrice: activeRoute.price * passengers,
      tripId: activeRoute.id,
    });
    setConfirmed(true);
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Official Jordan schedules and direct booking."
            eyebrow="Bus network"
            title="Wasel Bus"
          />

          <div className="ds-inline-feedback" data-tone="success">
            Showing official Jordan schedule data verified on live routes.
          </div>

          <div className="ds-screen-grid">
            <SectionWrapper description="Keep the bus form direct." title="Bus booking flow">
              <div className="ds-step-rail">
                {[
                  { label: 'Corridor', detail: 'Choose the cities first.' },
                  { label: 'Departure', detail: 'Pick the coach and timing.' },
                  { label: 'Reserve', detail: 'Keep one clear booking action.' },
                ].map((step, index) => (
                  <div className="ds-step-rail__item" data-active={index === 0} key={step.label}>
                    <span className="ds-step-rail__index">{index + 1}</span>
                    <div>
                      <strong>{step.label}</strong>
                      <div className="ds-caption">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionWrapper>

            <SectionWrapper
              description="Choose route, date, and reserve."
              title="Reserve a coach seat"
            >
              <div className="ds-form-grid">
                <Select
                  label="From"
                  onChange={event => setOrigin(event.target.value)}
                  options={CITY_OPTIONS.map(city => ({ label: city.label, value: city.value }))}
                  value={origin}
                />
                <Select
                  label="To"
                  onChange={event => setDestination(event.target.value)}
                  options={CITY_OPTIONS.map(city => ({ label: city.label, value: city.value }))}
                  value={destination}
                />
                <Input
                  label="Date"
                  onChange={event => setTripDate(event.target.value)}
                  type="date"
                  value={tripDate}
                />
                <Input
                  label="Passengers"
                  min="1"
                  onChange={event => setPassengers(Number(event.target.value) || 1)}
                  type="number"
                  value={String(passengers)}
                />
              </div>

              <div className="ds-scroll-stack">
                {state.routes.map(route => (
                  <button
                    className="ds-list-item"
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    type="button"
                  >
                    <div className="ds-list-item__icon">
                      <Bus size={16} />
                    </div>
                    <div className="ds-fill">
                      <strong>
                        {route.from} to {route.to}
                      </strong>
                      <div className="ds-caption">
                        {route.company} - {route.dep} - {route.price} JOD
                      </div>
                    </div>
                    <span className="ds-badge" data-tone="accent">
                      {route.seats} seats
                    </span>
                  </button>
                ))}
              </div>

              {activeRoute ? (
                <Card>
                  <h2 className="ds-card__title">{activeRoute.company}</h2>
                  <p className="ds-copy ds-copy--tight">
                    {activeRoute.from} to {activeRoute.to} - {activeRoute.duration} -{' '}
                    {activeRoute.price} JOD
                  </p>
                </Card>
              ) : null}

              <Button
                data-testid="bus-confirm-booking"
                fullWidth
                onClick={() => void reserveSeat()}
              >
                {state.bookingBusy ? 'Reserving seat...' : 'Reserve seat'}
              </Button>

              {confirmed ? (
                <div className="ds-inline-feedback" data-tone="success">
                  Seat confirmed for this coach.
                </div>
              ) : null}
            </SectionWrapper>
          </div>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function TripsPage() {
  const { user } = useLocalAuth();
  const [tab, setTab] = useState<'rides' | 'packages' | 'buses'>('rides');
  const { state } = useTrips(user?.id);

  const listItems = useMemo(() => {
    if (tab === 'packages') {
      return state.packages.map(item => ({
        detail: `${item.status} - ${item.trackingId}`,
        title: `${item.from} to ${item.to}`,
      }));
    }
    if (tab === 'buses') {
      return state.buses.map(item => ({
        detail: `${item.departureTime} - ${item.ticket_code}`,
        title: `${item.pickupStop} to ${item.dropoffStop}`,
      }));
    }
    return state.rides.map(item => ({
      detail: `${item.status} - ${item.ticketCode ?? 'Ticket pending'}`,
      title: `${item.from} to ${item.to}`,
    }));
  }, [state.buses, state.packages, state.rides, tab]);

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="One place for rides, packages, and bus bookings."
            eyebrow="Trips"
            title="My trips"
          />
          <MetricGrid
            items={[
              {
                label: 'Rides',
                value: String(state.rides.length),
                detail: 'Ride requests and live matches.',
              },
              {
                label: 'Packages',
                value: String(state.packages.length),
                detail: 'Parcel requests and tracking.',
              },
              {
                label: 'Buses',
                value: String(state.buses.length),
                detail: 'Coach reservations and tickets.',
              },
              {
                label: 'Support',
                value: String(state.supportTickets.length),
                detail: 'Open support follow-up.',
              },
            ]}
          />
          <SectionWrapper
            description="Keep one primary view active at a time."
            title="Trip overview"
          >
            <Tabs
              items={
                [
                  {
                    content: (
                      <div className="ds-scroll-stack">
                        {listItems.length === 0 ? (
                          <Card>
                            <h2 className="ds-card__title">No trips in this view</h2>
                            <p className="ds-copy ds-copy--tight">
                              The selected lane is empty right now.
                            </p>
                          </Card>
                        ) : null}
                        {listItems.map(item => (
                          <Card key={`${item.title}-${item.detail}`}>
                            <h2 className="ds-card__title">{item.title}</h2>
                            <p className="ds-copy ds-copy--tight">{item.detail}</p>
                          </Card>
                        ))}
                      </div>
                    ),
                    label: 'Rides',
                    value: 'rides',
                  },
                  {
                    content: (
                      <div className="ds-scroll-stack">
                        {listItems.map(item => (
                          <Card key={`${item.title}-${item.detail}`}>
                            <h2 className="ds-card__title">{item.title}</h2>
                            <p className="ds-copy ds-copy--tight">{item.detail}</p>
                          </Card>
                        ))}
                      </div>
                    ),
                    label: 'Packages',
                    value: 'packages',
                  },
                  {
                    content: (
                      <div className="ds-scroll-stack">
                        {listItems.map(item => (
                          <Card key={`${item.title}-${item.detail}`}>
                            <h2 className="ds-card__title">{item.title}</h2>
                            <p className="ds-copy ds-copy--tight">{item.detail}</p>
                          </Card>
                        ))}
                      </div>
                    ),
                    label: 'Buses',
                    value: 'buses',
                  },
                ] satisfies TabItem<'rides' | 'packages' | 'buses'>[]
              }
              label="Trip tabs"
              onChange={setTab}
              value={tab}
            />
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function WalletPage() {
  const { user } = useLocalAuth();

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Stored value now uses the same direct Wasel language."
            eyebrow="Wallet"
            title="Wallet"
          />
          <MetricGrid
            items={[
              {
                label: 'Balance',
                value: `${user?.balance ?? 0} JOD`,
                detail: 'Available stored value.',
              },
              {
                label: 'Trust score',
                value: `${user?.trustScore ?? 0}`,
                detail: 'Account readiness.',
              },
              {
                label: 'Trips',
                value: String(user?.trips ?? 0),
                detail: 'Journey history on this account.',
              },
              { label: 'Status', value: user?.walletStatus ?? 'active', detail: 'Wallet health.' },
            ]}
          />
          <SectionWrapper
            description="One primary money surface, three quick actions."
            title="Stored-value controls"
          >
            <div className="ds-action-grid">
              <Card>
                <h2 className="ds-card__title">Add money</h2>
                <p className="ds-copy ds-copy--tight">
                  Top up before the next ride or package move.
                </p>
                <Button>Add money</Button>
              </Card>
              <Card>
                <h2 className="ds-card__title">Withdraw</h2>
                <p className="ds-copy ds-copy--tight">Move available value out when you need it.</p>
                <Button variant="secondary">Withdraw</Button>
              </Card>
              <Card>
                <h2 className="ds-card__title">Send</h2>
                <p className="ds-copy ds-copy--tight">
                  Transfer value inside the same account system.
                </p>
                <Button variant="ghost">Send</Button>
              </Card>
            </div>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function PaymentsPage() {
  const [intentCreated, setIntentCreated] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Keep payment intent, confirmation, and settlement explicit."
            eyebrow="Payments"
            title="Move value with explicit payment flows"
          />
          <SectionWrapper
            description="Create an intent first, then confirm the payment."
            title="Payment intent"
          >
            <div className="ds-stack">
              <p className="ds-copy ds-copy--tight">
                Wallet keeps your balance close, but payment actions should still be deliberate.
              </p>
              {!intentCreated ? (
                <Button onClick={() => setIntentCreated(true)}>Create payment intent</Button>
              ) : (
                <>
                  <Card>
                    <h2 className="ds-card__title">Payment lifecycle</h2>
                    <p className="ds-copy ds-copy--tight">
                      Intent created. Review the amount, then confirm the payment.
                    </p>
                  </Card>
                  <Button onClick={() => setConfirmed(true)} variant="secondary">
                    Confirm payment
                  </Button>
                </>
              )}
              {confirmed ? (
                <div className="ds-inline-feedback" data-tone="success">
                  Payment settled successfully.
                </div>
              ) : null}
            </div>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function SettingsPage() {
  const { user, updateUser } = useLocalAuth();
  const { changePassword } = useAuth();
  const { setLanguage, language } = useLanguage();
  const { setTheme, theme } = useTheme();
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [password, setPasswordValue] = useState('');
  const [message, setMessage] = useState('');

  const saveSettings = async () => {
    if (password) {
      try {
        const result = await changePassword(password);
        if (result.error) {
          setMessage(result.error instanceof Error ? result.error.message : String(result.error));
          return;
        }
      } catch (passwordError) {
        setMessage(
          passwordError instanceof Error ? passwordError.message : 'Unable to update password.',
        );
        return;
      }
    }
    updateUser({ phone });
    setMessage('Settings saved.');
  };

  return (
    <ProtectedPage>
      <LayoutContainer>
        <div className="ds-page">
          <PageHeading
            description="Control notifications, privacy, security, and account preferences inside one system."
            eyebrow="Settings"
            title="Settings"
          />

          <div className="ds-feature-grid">
            <Card>
              <h2 className="ds-card__title">Theme</h2>
              <div className="ds-minor-actions">
                <Button
                  onClick={() => setTheme('dark')}
                  variant={theme === 'dark' ? 'primary' : 'secondary'}
                >
                  Dark
                </Button>
                <Button
                  onClick={() => setTheme('light')}
                  variant={theme === 'light' ? 'primary' : 'secondary'}
                >
                  Light
                </Button>
              </div>
            </Card>
            <Card>
              <h2 className="ds-card__title">Language</h2>
              <div className="ds-minor-actions">
                <Button
                  onClick={() => setLanguage('en')}
                  variant={language === 'en' ? 'primary' : 'secondary'}
                >
                  English
                </Button>
                <Button
                  onClick={() => setLanguage('ar')}
                  variant={language === 'ar' ? 'primary' : 'secondary'}
                >
                  العربية
                </Button>
              </div>
            </Card>
            <Card>
              <h2 className="ds-card__title">Support</h2>
              <p className="ds-copy ds-copy--tight">Critical help stays close to the action.</p>
              <Button variant="ghost">Call support</Button>
            </Card>
          </div>

          <SectionWrapper description="Keep the settings form direct." title="Account preferences">
            <div className="ds-form-grid">
              <Input
                label="Phone number"
                onChange={event => setPhone(event.target.value)}
                placeholder="+962791234567"
                value={phone}
              />
              <Input
                label="New password"
                onChange={event => setPasswordValue(event.target.value)}
                placeholder="Set a stronger password"
                type="password"
                value={password}
              />
            </div>
            {message ? (
              <div className="ds-inline-feedback" data-tone="success">
                {message}
              </div>
            ) : null}
            <Button fullWidth onClick={() => void saveSettings()}>
              Save settings
            </Button>
          </SectionWrapper>
        </div>
      </LayoutContainer>
    </ProtectedPage>
  );
}

export function PrivacyPage() {
  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          description="Simple privacy guidance in the same Wasel language."
          eyebrow="Legal"
          title="Privacy policy"
        />
        <SectionWrapper
          description="What Wasel keeps, why it exists, and where it is used."
          title="Privacy policy"
        >
          <div className="ds-list">
            {[
              'Wasel stores account, trip, and support details needed to run the network.',
              'Location and booking context stay tied to the active corridor and support flow.',
              'Security and compliance data stay close to verification and wallet actions.',
            ].map(item => (
              <div className="ds-list-item" key={item}>
                <div className="ds-list-item__icon">
                  <Shield size={16} />
                </div>
                <div>
                  <h2 className="ds-card__title">{item}</h2>
                </div>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </div>
    </LayoutContainer>
  );
}

export function TermsPage() {
  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          description="Direct terms for riders, drivers, packages, and stored value."
          eyebrow="Legal"
          title="Terms of service"
        />
        <SectionWrapper
          description="The network terms stay short and direct."
          title="Terms of service"
        >
          <div className="ds-list">
            {[
              'Use Wasel only with accurate trip, package, and identity details.',
              'Keep support, safety, and payment actions inside the trusted product flows.',
              'Respect route agreements, ticket codes, and delivery handoff steps.',
            ].map(item => (
              <div className="ds-list-item" key={item}>
                <div className="ds-list-item__icon">
                  <Landmark size={16} />
                </div>
                <div>
                  <h2 className="ds-card__title">{item}</h2>
                </div>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </div>
    </LayoutContainer>
  );
}

export function NotFoundPage() {
  return (
    <LayoutContainer>
      <div className="ds-page">
        <SectionWrapper
          description="The link may be outdated or the page no longer exists."
          title="Page not found"
        >
          <div className="ds-minor-actions">
            <a className="ds-button" data-variant="primary" href="/">
              Back to Wasel
            </a>
            <a className="ds-button" data-variant="secondary" href="/app/find-ride">
              Find a ride
            </a>
          </div>
        </SectionWrapper>
      </div>
    </LayoutContainer>
  );
}

export function RouteErrorPage({ message }: { message: string }) {
  return (
    <LayoutContainer>
      <div className="ds-page">
        <SectionWrapper description={message} title="This page could not be loaded">
          <div className="ds-minor-actions">
            <a className="ds-button" data-variant="primary" href="/app/find-ride">
              Find a ride
            </a>
            <a className="ds-button" data-variant="secondary" href="/app/auth">
              Sign in
            </a>
          </div>
        </SectionWrapper>
      </div>
    </LayoutContainer>
  );
}

export function ProfilePage() {
  return <ProfilePageSurface />;
}

export function NotificationsPage() {
  return <SimpleOverviewPage configKey="notifications" />;
}

export function AnalyticsPage() {
  return <SimpleOverviewPage configKey="analytics" />;
}

export function ExecutionPage() {
  return <SimpleOverviewPage configKey="execution" />;
}

export function MobilityPage() {
  return <SimpleOverviewPage configKey="mobility" />;
}

export function IntelligencePage() {
  return <SimpleOverviewPage configKey="intelligence" />;
}

export function TrustPage() {
  return <SimpleOverviewPage configKey="trust" />;
}

export function SafetyPage() {
  return <SimpleOverviewPage configKey="safety" />;
}

export function PlusPage() {
  return <SimpleOverviewPage configKey="plus" />;
}

export function DriverPage() {
  return <SimpleOverviewPage configKey="driver" />;
}

export function InnovationPage() {
  return <SimpleOverviewPage configKey="innovation" />;
}

export function ModerationPage() {
  return <SimpleOverviewPage configKey="moderation" />;
}
