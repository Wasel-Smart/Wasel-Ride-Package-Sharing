import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  Car,
  LogIn,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
} from '../../components/system/WaselPresence';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { trackGrowthEvent } from '../../services/growthEngine';
import { friendlyAuthError } from '../../utils/authHelpers';
import { buildAuthPagePath } from '../../utils/authFlow';
import { DeferredLandingMap } from './DeferredLandingMap';
import { LANDING_FONT } from './landingConstants';
import './AppEntryPage.css';

type LandingMode = 'ride' | 'package';
type RouteDraft = { from: string; to: string; date: string };
type FlowCard = { icon: LucideIcon; title: string; detail: string; path: string; cta: string };

const DEFAULT_RETURN_TO = '/app/find-ride';

const CITY_OPTIONS = [
  { value: 'Amman', en: 'Amman', ar: '\u0639\u0645\u0627\u0646' },
  { value: 'Irbid', en: 'Irbid', ar: '\u0625\u0631\u0628\u062f' },
  { value: 'Aqaba', en: 'Aqaba', ar: '\u0627\u0644\u0639\u0642\u0628\u0629' },
  { value: 'Zarqa', en: 'Zarqa', ar: '\u0627\u0644\u0632\u0631\u0642\u0627\u0621' },
  { value: 'Jerash', en: 'Jerash', ar: '\u062c\u0631\u0634' },
  { value: 'Salt', en: 'Salt', ar: '\u0627\u0644\u0633\u0644\u0637' },
] as const;

function getAlternateCity(excluded: string) {
  return CITY_OPTIONS.find(option => option.value !== excluded)?.value ?? excluded;
}

const COPY = {
  en: {
    navRide: 'Find a ride',
    navPackage: 'Open packages',
    navOffer: 'Offer your ride',
    signIn: 'Sign in',
    createAccount: 'Create account',
    heroBadge: 'One live network',
    heroTitle: 'Open the network first. Travel your way with Wasel.',
    heroBody:
      'Wasel makes the idea clear in seconds: the same corridor can carry riders, packages, and sharper decisions.',
    heroSignal: 'One route can move people and parcels.',
    points: [
      'The mobility map stays visible in the background.',
      'Rides and packages share the same operating surface.',
      'Support and trust stay close to the action.',
    ],
    modes: { ride: 'Rides', package: 'Packages' },
    cardTitle: { ride: 'Find a ride', package: 'Send a package' },
    cardBody: {
      ride: 'Choose a corridor, then open the live ride flow.',
      package: 'Start from the same corridor, then open the package flow.',
    },
    from: 'Leaving from',
    to: 'Going to',
    date: 'When',
    primary: { ride: 'Find a ride', package: 'Open packages' },
    secondary: 'Offer your ride',
    packageHint: 'Packages move through the same corridors. Pick the route first, then continue.',
    guestLead: 'Enter Wasel through the shortest path.',
    email: 'Continue with email',
    google: 'Continue with Google',
    googleBusy: 'Connecting Google...',
    facebook: 'Continue with Facebook',
    facebookBusy: 'Connecting Facebook...',
    authErrors: {
      google: 'Google sign in failed.',
      facebook: 'Facebook sign in failed.',
    },
    flowHeading: 'Choose your flow',
    flowSub: 'Three simple ways to understand Wasel in a few seconds.',
    flowCards: {
      ride: {
        title: 'Find a ride',
        detail: 'Compare the corridor, timing, and seat.',
        cta: 'Open rides',
      },
      package: {
        title: 'Send a package',
        detail: 'Attach the parcel to the same network.',
        cta: 'Open packages',
      },
      offer: {
        title: 'Offer your ride',
        detail: 'Turn an empty departure into more value.',
        cta: 'Open driver flow',
      },
    },
  },
  ar: {
    navRide: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
    navPackage: '\u0627\u0641\u062a\u062d \u0627\u0644\u0637\u0631\u0648\u062f',
    navOffer: '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643',
    signIn: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
    createAccount: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
    heroBadge: '\u0634\u0628\u0643\u0629 \u062d\u064a\u0629 \u0648\u0627\u062d\u062f\u0629',
    heroTitle:
      '\u0627\u0641\u062a\u062d \u0627\u0644\u0634\u0628\u0643\u0629 \u0623\u0648\u0644\u0627\u064b. \u062a\u062d\u0631\u0643 \u0628\u0637\u0631\u064a\u0642\u062a\u0643 \u0645\u0639 \u0648\u0627\u0635\u0644.',
    heroBody:
      '\u0648\u0627\u0635\u0644 \u062a\u062c\u0639\u0644 \u0627\u0644\u0641\u0643\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0645\u0646 \u062b\u0648\u0627\u0646\u064d: \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631 \u064a\u062d\u0645\u0644 \u0627\u0644\u0631\u0627\u0643\u0628 \u0648\u0627\u0644\u0637\u0631\u062f \u0648\u064a\u0648\u0636\u062d \u0627\u0644\u0642\u0631\u0627\u0631.',
    heroSignal:
      '\u0645\u0633\u0627\u0631 \u0648\u0627\u062d\u062f \u064a\u062d\u0645\u0644 \u0623\u0634\u062e\u0627\u0635\u0627\u064b \u0648\u0637\u0631\u0648\u062f\u0627\u064b.',
    points: [
      '\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u062a\u0628\u0642\u0649 \u0638\u0627\u0647\u0631\u0629 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629.',
      '\u0627\u0644\u0631\u062d\u0644\u0627\u062a \u0648\u0627\u0644\u0637\u0631\u0648\u062f \u064a\u0634\u062a\u0631\u0643\u0627\u0646 \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0645\u0634\u0647\u062f.',
      '\u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u062b\u0642\u0629 \u064a\u0628\u0642\u064a\u0627\u0646 \u0642\u0631\u064a\u0628\u064a\u0646 \u0645\u0646 \u0627\u0644\u0642\u0631\u0627\u0631.',
    ],
    modes: {
      ride: '\u0627\u0644\u0631\u062d\u0644\u0627\u062a',
      package: '\u0627\u0644\u0637\u0631\u0648\u062f',
    },
    cardTitle: {
      ride: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
      package: '\u0623\u0631\u0633\u0644 \u0637\u0631\u062f\u0627\u064b',
    },
    cardBody: {
      ride: '\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u062b\u0645 \u0627\u0641\u062a\u062d \u062a\u062f\u0641\u0642 \u0627\u0644\u0631\u062d\u0644\u0627\u062a.',
      package:
        '\u0627\u0628\u062f\u0623 \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631 \u062b\u0645 \u0627\u0641\u062a\u062d \u062a\u062f\u0641\u0642 \u0627\u0644\u0637\u0631\u0648\u062f.',
    },
    from: '\u0627\u0644\u0627\u0646\u0637\u0644\u0627\u0642 \u0645\u0646',
    to: '\u0630\u0627\u0647\u0628 \u0625\u0644\u0649',
    date: '\u0645\u062a\u0649',
    primary: {
      ride: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
      package: '\u0627\u0641\u062a\u062d \u0627\u0644\u0637\u0631\u0648\u062f',
    },
    secondary: '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643',
    packageHint:
      '\u0627\u0644\u0637\u0631\u0648\u062f \u062a\u062a\u062d\u0631\u0643 \u0639\u0628\u0631 \u0646\u0641\u0633 \u0627\u0644\u0645\u0645\u0631\u0627\u062a. \u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u0627\u0631 \u0623\u0648\u0644\u0627\u064b \u062b\u0645 \u062a\u0627\u0628\u0639.',
    guestLead:
      '\u0627\u062f\u062e\u0644 \u0625\u0644\u0649 \u0648\u0627\u0635\u0644 \u0628\u0623\u0628\u0633\u0637 \u0637\u0631\u064a\u0642\u0629.',
    email:
      '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0627\u0644\u0628\u0631\u064a\u062f',
    google: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0639\u0628\u0631 Google',
    googleBusy:
      '\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0640 Google...',
    facebook: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0639\u0628\u0631 Facebook',
    facebookBusy:
      '\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0640 Facebook...',
    authErrors: {
      google:
        '\u062a\u0639\u0630\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0640 Google.',
      facebook:
        '\u062a\u0639\u0630\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0640 Facebook.',
    },
    flowHeading: '\u0627\u062e\u062a\u0631 \u0627\u0644\u062a\u062f\u0641\u0642',
    flowSub:
      '\u062b\u0644\u0627\u062b \u0637\u0631\u0642 \u0628\u0633\u064a\u0637\u0629 \u062a\u0634\u0631\u062d Wasel \u0641\u064a \u062b\u0648\u0627\u0646\u064d.',
    flowCards: {
      ride: {
        title: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
        detail:
          '\u0642\u0627\u0631\u0646 \u0627\u0644\u0645\u0633\u0627\u0631 \u0648\u0627\u0644\u0648\u0642\u062a \u0648\u0627\u0644\u0645\u0642\u0639\u062f.',
        cta: '\u0627\u0641\u062a\u062d \u0627\u0644\u0631\u062d\u0644\u0627\u062a',
      },
      package: {
        title: '\u0623\u0631\u0633\u0644 \u0637\u0631\u062f\u0627\u064b',
        detail:
          '\u0627\u0631\u0628\u0637 \u0627\u0644\u0637\u0631\u062f \u0628\u0646\u0641\u0633 \u0627\u0644\u0634\u0628\u0643\u0629.',
        cta: '\u0627\u0641\u062a\u062d \u0627\u0644\u0637\u0631\u0648\u062f',
      },
      offer: {
        title: '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643',
        detail:
          '\u062d\u0648\u0651\u0644 \u0627\u0644\u0627\u0646\u0637\u0644\u0627\u0642\u0629 \u0627\u0644\u0641\u0627\u0631\u063a\u0629 \u0625\u0644\u0649 \u0642\u064a\u0645\u0629 \u0623\u0643\u0628\u0631.',
        cta: '\u0627\u0641\u062a\u062d \u062a\u062f\u0641\u0642 \u0627\u0644\u0633\u0627\u0626\u0642',
      },
    },
  },
} as const;

function trackLandingNavigation(path: string, language: 'en' | 'ar', userId?: string) {
  const eventMap = [
    {
      match: '/app/find-ride',
      eventName: 'landing_find_ride_opened',
      serviceType: 'ride' as const,
    },
    {
      match: '/app/offer-ride',
      eventName: 'landing_offer_ride_opened',
      serviceType: 'ride' as const,
    },
    {
      match: '/app/packages',
      eventName: 'landing_packages_opened',
      serviceType: 'package' as const,
    },
    { match: 'tab=signup', eventName: 'landing_signup_opened', serviceType: 'referral' as const },
    { match: 'tab=signin', eventName: 'landing_signin_opened', serviceType: 'referral' as const },
  ].find(item => path.includes(item.match));

  const payload = {
    eventName: eventMap?.eventName ?? 'landing_navigation',
    funnelStage: 'selected',
    serviceType: eventMap?.serviceType ?? 'ride',
    metadata: { path, authState: userId ? 'authenticated' : 'guest', locale: language },
  } as const;

  void trackGrowthEvent(userId ? { userId, ...payload } : payload);
}

function buildRideSearchPath(route: RouteDraft) {
  const params = new URLSearchParams({ from: route.from, to: route.to, search: '1' });
  if (route.date) params.set('date', route.date);
  return `/app/find-ride?${params.toString()}`;
}

function buildPackagePrefillPath(route: RouteDraft) {
  const params = new URLSearchParams({ from: route.from, to: route.to });
  return `/app/packages?${params.toString()}`;
}

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [mode, setMode] = useState<LandingMode>('ride');
  const [authError, setAuthError] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'google' | 'facebook' | null>(null);
  const [route, setRoute] = useState<RouteDraft>({ from: 'Amman', to: 'Irbid', date: '' });

  const ar = language === 'ar';
  const copy = COPY[language];
  const profile = getWaselPresenceProfile();
  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;
  const signInPath = buildAuthPagePath('signin', DEFAULT_RETURN_TO);
  const signUpPath = buildAuthPagePath('signup', DEFAULT_RETURN_TO);

  const navigateLanding = (path: string) => {
    trackLandingNavigation(path, language, user?.id);
    navigate(path);
  };

  const protectedPath = (path: string) => (user ? path : buildAuthPagePath('signin', path));
  const primaryPath = mode === 'ride' ? buildRideSearchPath(route) : buildPackagePrefillPath(route);
  const contextualSignInPath = buildAuthPagePath('signin', primaryPath);

  const flowCards: FlowCard[] = [
    {
      icon: Search,
      title: copy.flowCards.ride.title,
      detail: copy.flowCards.ride.detail,
      path: buildRideSearchPath(route),
      cta: copy.flowCards.ride.cta,
    },
    {
      icon: Package,
      title: copy.flowCards.package.title,
      detail: copy.flowCards.package.detail,
      path: buildPackagePrefillPath(route),
      cta: copy.flowCards.package.cta,
    },
    {
      icon: Car,
      title: copy.flowCards.offer.title,
      detail: copy.flowCards.offer.detail,
      path: protectedPath('/app/offer-ride'),
      cta: copy.flowCards.offer.cta,
    },
  ];

  const updateRoute =
    (field: keyof RouteDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setRoute(current => {
        if (field === 'from') {
          return {
            ...current,
            from: value,
            to: value === current.to ? getAlternateCity(value) : current.to,
          };
        }

        if (field === 'to') {
          return {
            ...current,
            from: value === current.from ? getAlternateCity(value) : current.from,
            to: value,
          };
        }

        return { ...current, [field]: value };
      });
    };

  const handlePrimarySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateLanding(primaryPath);
  };

  const handleOAuth = async (provider: 'google' | 'facebook', returnTo = primaryPath) => {
    setAuthError('');
    setOauthProvider(provider);

    const result =
      provider === 'google' ? await signInWithGoogle(returnTo) : await signInWithFacebook(returnTo);

    if (result.error) {
      setAuthError(friendlyAuthError(result.error, copy.authErrors[provider]));
      setOauthProvider(null);
    }
  };

  return (
    <div className="app-entry-page" dir={ar ? 'rtl' : 'ltr'} style={{ fontFamily: LANDING_FONT }}>
      <div className="app-entry-page__shell">
        <header className="app-entry-page__header">
          <button
            type="button"
            className="app-entry-page__brand"
            onClick={() => navigateLanding(user ? '/app/find-ride' : '/')}
          >
            <span className="app-entry-page__brand-mark" aria-hidden="true">
              <WaselMark size={48} />
            </span>
            <span className="app-entry-page__brand-copy">
              <span className="app-entry-page__brand-name">Wasel</span>
              <span className="app-entry-page__brand-meta">
                {ar
                  ? '\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u062d\u064a\u0629'
                  : 'Live mobility network'}
              </span>
            </span>
          </button>

          <div className="app-entry-page__header-actions">
            <WaselContactActionRow ar={ar} compact />
            {!user ? (
              <div className="app-entry-page__auth-links">
                <button type="button" onClick={() => navigateLanding(signInPath)}>
                  <LogIn size={16} />
                  {copy.signIn}
                </button>
                <button
                  type="button"
                  className="app-entry-page__auth-primary"
                  onClick={() => navigateLanding(signUpPath)}
                >
                  {copy.createAccount}
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="app-entry-page__main">
          <section className="app-entry-page__hero">
            <div className="app-entry-page__hero-map" aria-hidden="true">
              <div className="app-entry-page__hero-map-scale">
                <DeferredLandingMap ar={ar} />
              </div>
            </div>
            <div className="app-entry-page__hero-scrim" aria-hidden="true" />

            <div className="app-entry-page__hero-grid">
              <div className="app-entry-page__hero-copy">
                <div className="app-entry-page__eyebrow">
                  <Sparkles size={16} />
                  {copy.heroBadge}
                </div>
                <h1 className="app-entry-page__hero-title">{copy.heroTitle}</h1>
                <p className="app-entry-page__hero-body">{copy.heroBody}</p>
                <div className="app-entry-page__hero-signal">{copy.heroSignal}</div>
                <div className="app-entry-page__hero-points">
                  <span>
                    <MapPinned size={16} />
                    {copy.points[0]}
                  </span>
                  <span>
                    <WalletCards size={16} />
                    {copy.points[1]}
                  </span>
                  <span>
                    <ShieldCheck size={16} />
                    {copy.points[2]}
                  </span>
                </div>
                <div className="app-entry-page__hero-meta">
                  <strong>{supportLine}</strong>
                  <span>{businessAddress}</span>
                </div>
              </div>

              <form className="app-entry-page__action-card" onSubmit={handlePrimarySubmit}>
                <div
                  className="app-entry-page__mode-switch"
                  role="tablist"
                  aria-label={ar ? '\u0627\u0644\u062e\u062f\u0645\u0627\u062a' : 'Services'}
                >
                  <button
                    type="button"
                    className={mode === 'ride' ? 'is-active' : undefined}
                    onClick={() => setMode('ride')}
                  >
                    {copy.modes.ride}
                  </button>
                  <button
                    type="button"
                    className={mode === 'package' ? 'is-active' : undefined}
                    onClick={() => setMode('package')}
                  >
                    {copy.modes.package}
                  </button>
                </div>

                <div className="app-entry-page__action-copy">
                  <h2>{mode === 'ride' ? copy.cardTitle.ride : copy.cardTitle.package}</h2>
                  <p>{mode === 'ride' ? copy.cardBody.ride : copy.cardBody.package}</p>
                </div>

                <div className="app-entry-page__field-grid">
                  <label>
                    <span>{copy.from}</span>
                    <select value={route.from} onChange={updateRoute('from')}>
                      {CITY_OPTIONS.map(option => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={option.value === route.to}
                        >
                          {ar ? option.ar : option.en}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>{copy.to}</span>
                    <select value={route.to} onChange={updateRoute('to')}>
                      {CITY_OPTIONS.map(option => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={option.value === route.from}
                        >
                          {ar ? option.ar : option.en}
                        </option>
                      ))}
                    </select>
                  </label>

                  {mode === 'ride' ? (
                    <label className="app-entry-page__field-grid-full">
                      <span>{copy.date}</span>
                      <input type="date" value={route.date} onChange={updateRoute('date')} />
                    </label>
                  ) : (
                    <div className="app-entry-page__field-grid-full app-entry-page__field-note">
                      {copy.packageHint}
                    </div>
                  )}
                </div>

                <div className="app-entry-page__action-buttons">
                  <button type="submit" className="app-entry-page__primary-button">
                    {mode === 'ride' ? copy.primary.ride : copy.primary.package}
                  </button>
                  <button
                    type="button"
                    className="app-entry-page__secondary-button"
                    onClick={() => navigateLanding(protectedPath('/app/offer-ride'))}
                  >
                    {copy.secondary}
                  </button>
                </div>

                {!user ? (
                  <div className="app-entry-page__guest-auth">
                    <p>{copy.guestLead}</p>
                    <div className="app-entry-page__guest-auth-buttons">
                      <button type="button" onClick={() => void handleOAuth('google')}>
                        {oauthProvider === 'google' ? copy.googleBusy : copy.google}
                      </button>
                      <button type="button" onClick={() => void handleOAuth('facebook')}>
                        {oauthProvider === 'facebook' ? copy.facebookBusy : copy.facebook}
                      </button>
                      <button type="button" onClick={() => navigateLanding(contextualSignInPath)}>
                        {copy.email}
                      </button>
                    </div>
                    {authError ? (
                      <p className="app-entry-page__auth-error" role="alert">
                        {authError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </form>
            </div>
          </section>

          <section className="app-entry-page__flow-section">
            <div className="app-entry-page__section-copy">
              <span>{copy.flowHeading}</span>
              <h2>{copy.flowSub}</h2>
            </div>

            <div className="app-entry-page__flow-grid">
              {flowCards.map(card => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    type="button"
                    className="app-entry-page__flow-card"
                    onClick={() => navigateLanding(card.path)}
                  >
                    <span className="app-entry-page__flow-icon">
                      <Icon size={20} />
                    </span>
                    <strong>{card.title}</strong>
                    <p>{card.detail}</p>
                    <span className="app-entry-page__flow-cta">
                      {card.cta}
                      <ArrowRight size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="app-entry-page__footer-stack">
            <WaselProofOfLifeBlock ar={ar} compact />
            <WaselBusinessFooter ar={ar} />
          </section>
        </main>
      </div>
    </div>
  );
}
