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
import { useAuthProviderAvailability } from '../../hooks/useAuthProviderAvailability';
import { APP_ROUTES } from '../../router/paths';
import { trackGrowthEvent } from '../../services/growthEngine';
import { friendlyAuthError } from '../../utils/authHelpers';
import { buildAuthPagePath } from '../../utils/authFlow';
import {
  APP_ENTRY_CITY_OPTIONS,
  APP_ENTRY_DEFAULT_RETURN_TO,
  APP_ENTRY_DEFAULT_ROUTE,
  APP_ENTRY_SERVICE_MODE_META,
  APP_ENTRY_SERVICE_MODES,
  buildAppEntryPrimaryPath,
  buildPackagePrefillPath,
  buildRideSearchPath,
  getAlternateEntryCity,
  type AppEntryRouteDraft,
  type AppEntryServiceMode,
} from './appEntryContracts';
import { DeferredLandingMap } from '../../components/layout/DeferredLandingMap';
import { LANDING_FONT } from './landingConstants';
import './AppEntryPage.css';

type FlowCard = { icon: LucideIcon; title: string; detail: string; path: string; cta: string };

const COPY = {
  en: {
    navRide: 'Find a ride',
    navPackage: 'Send a package',
    navOffer: 'Offer a ride',
    signIn: 'Sign in',
    createAccount: 'Create account',
    heroBadge: 'Ride and package marketplace',
    heroTitle: 'Book a ride, offer a ride, or send a package.',
    heroBody:
      'Choose the corridor first, then complete one real action: book a ride, offer a ride, or send a package.',
    heroSignal: 'Rides and packages move through the same corridor.',
    points: [
      'Start from the corridor you want.',
      'Book a ride or send a package from the same route.',
      'Payment and support stay clear and close.',
    ],
    modes: { ride: 'Rides', package: 'Packages' },
    cardTitle: { ride: 'Find a ride', package: 'Send a package' },
    cardBody: {
      ride: 'Choose a corridor, then book a ride.',
      package: 'Choose a corridor, then send a package.',
    },
    from: 'Leaving from',
    to: 'Going to',
    date: 'When',
    primary: { ride: 'Book a ride', package: 'Send a package' },
    secondary: 'Offer a ride',
    packageHint: 'Packages use the same corridors. Pick the route first, then continue.',
    guestLead: 'Choose your action and continue.',
    email: 'Continue with email',
    google: 'Continue with Google',
    googleBusy: 'Connecting Google...',
    facebook: 'Continue with Facebook',
    facebookBusy: 'Connecting Facebook...',
    authErrors: {
      google: 'Google sign in failed.',
      facebook: 'Facebook sign in failed.',
    },
    flowHeading: 'Choose what to do',
    flowSub: 'Three direct actions. Nothing else.',
    flowCards: {
      ride: {
        title: 'Book a ride',
        detail: 'See the route, time, and seat before you continue.',
        cta: 'Book a ride',
      },
      package: {
        title: 'Send a package',
        detail: 'Use the same corridor to move a package.',
        cta: 'Send a package',
      },
      offer: {
        title: 'Offer a ride',
        detail: 'Post your trip and open seats on a real route.',
        cta: 'Offer a ride',
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
      match: APP_ROUTES.findRide.full,
      eventName: 'landing_find_ride_opened',
      serviceType: 'ride' as const,
    },
    {
      match: APP_ROUTES.offerRide.full,
      eventName: 'landing_offer_ride_opened',
      serviceType: 'ride' as const,
    },
    {
      match: APP_ROUTES.packages.full,
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

export default function AppEntryPage() {
  const { user, loading: authLoading } = useLocalAuth();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const authProviders = useAuthProviderAvailability();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [mode, setMode] = useState<AppEntryServiceMode>('ride');
  const [authError, setAuthError] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'google' | 'facebook' | null>(null);
  const [route, setRoute] = useState<AppEntryRouteDraft>({ ...APP_ENTRY_DEFAULT_ROUTE });

  const ar = language === 'ar';
  const copy = COPY[language];
  const profile = getWaselPresenceProfile();
  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;
  const signInPath = buildAuthPagePath('signin', APP_ENTRY_DEFAULT_RETURN_TO);
  const signUpPath = buildAuthPagePath('signup', APP_ENTRY_DEFAULT_RETURN_TO);
  const showGuestEntryPoints = !authLoading && !user;

  const navigateLanding = (path: string) => {
    trackLandingNavigation(path, language, user?.id);
    navigate(path);
  };

  const protectedPath = (path: string) =>
    authLoading || user ? path : buildAuthPagePath('signin', path);
  const primaryPath = buildAppEntryPrimaryPath(mode, route);
  const contextualSignInPath = buildAuthPagePath('signin', primaryPath);
  const selectedFromLabel =
    APP_ENTRY_CITY_OPTIONS.find(option => option.value === route.from)?.[ar ? 'ar' : 'en'] ??
    route.from;
  const selectedToLabel =
    APP_ENTRY_CITY_OPTIONS.find(option => option.value === route.to)?.[ar ? 'ar' : 'en'] ??
    route.to;
  const routePreview = ar
    ? `${selectedFromLabel} ← ${selectedToLabel}`
    : `${selectedFromLabel} → ${selectedToLabel}`;
  const serviceLabel = mode === 'ride' ? copy.cardTitle.ride : copy.cardTitle.package;
  const guidanceBand = ar
    ? [
        {
          label: 'الممر',
          value: routePreview,
          detail:
            mode === 'ride'
              ? 'نفس المسار يفتح الرحلات بسرعة.'
              : 'هذا المسار يفتح تسليم الطرد مباشرة.',
        },
        {
          label: 'الوضوح',
          value: mode === 'ride' ? 'السعر والمقعد' : 'الالتقاط والتسليم',
          detail:
            mode === 'ride'
              ? 'التوقيت والسعر يبقيان ظاهرين.'
              : 'يبقى مسار الطرد واضحاً من البداية.',
        },
        {
          label: 'الدعم',
          value: supportLine,
          detail: 'الثقة والمساندة تبقيان قريبتين من القرار.',
        },
      ]
    : [
        {
          label: 'Corridor',
          value: routePreview,
          detail:
            mode === 'ride'
              ? 'This lane opens the ride flow fast.'
              : 'This lane opens parcel routing directly.',
        },
        {
          label: 'Clarity',
          value: mode === 'ride' ? 'Price and seat' : 'Pickup and dropoff',
          detail:
            mode === 'ride'
              ? 'Timing and price stay visible together.'
              : 'Parcel movement stays clear from the start.',
        },
        {
          label: 'Support',
          value: supportLine,
          detail: 'Trust and help stay close to the decision.',
        },
      ];
  const heroStats = ar
    ? [
        { value: '3', label: 'تدفقات أساسية', detail: 'رحلات، طرود، ومسارات عرض' },
        { value: '1', label: 'شبكة واحدة', detail: 'نفس الممر يحمل القرار والتنفيذ' },
        { value: '24/7', label: 'دعم قريب', detail: 'الثقة والدعم بجوار الحركة' },
      ]
    : [
        { value: '3', label: 'Core actions', detail: 'Book, offer, or send' },
        { value: '1', label: 'Shared corridor', detail: 'The same route powers rides and packages' },
        { value: '24/7', label: 'Clear support', detail: 'Payment and help stay near the action' },
      ];
  const heroJourney = ar
    ? [
        { label: 'اختر', detail: 'حدد الممر أولاً.' },
        { label: 'افتح', detail: 'ادخل التدفق الصحيح بسرعة.' },
        { label: 'تابع', detail: 'ابقَ قريباً من التتبع والدعم.' },
      ]
    : [
        { label: 'Choose', detail: 'Start with the corridor.' },
        { label: 'Open', detail: 'Enter the right flow quickly.' },
        { label: 'Track', detail: 'Stay close to support and live status.' },
      ];

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
      path: protectedPath(APP_ROUTES.offerRide.full),
      cta: copy.flowCards.offer.cta,
    },
  ];
  const headerMenuItems = [
    { label: 'Ride', path: APP_ROUTES.findRide.full },
    { label: 'Packages', path: APP_ROUTES.packages.full },
    { label: 'Bus service', path: APP_ROUTES.bus.full },
    { label: 'Mobility OS', path: APP_ROUTES.mobilityOs.full },
  ] as const;

  const updateRoute =
    (field: keyof AppEntryRouteDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setRoute(current => {
        if (field === 'from') {
          return {
            ...current,
            from: value,
            to: value === current.to ? getAlternateEntryCity(value) : current.to,
          };
        }

        if (field === 'to') {
          return {
            ...current,
            from: value === current.from ? getAlternateEntryCity(value) : current.from,
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
    if (!authProviders[provider].enabled) {
      return;
    }

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
            onClick={() => navigateLanding(user ? APP_ROUTES.findRide.full : '/')}
          >
            <span className="app-entry-page__brand-mark" aria-hidden="true">
              <WaselMark size={48} />
            </span>
            <span className="app-entry-page__brand-copy">
              <span className="app-entry-page__brand-name">Wasel</span>
              <span className="app-entry-page__brand-meta">
                {ar
                  ? '\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u062d\u064a\u0629'
                  : 'Ride and package marketplace'}
              </span>
            </span>
          </button>

          <nav aria-label="Main menu" className="app-entry-page__menu">
            {headerMenuItems.map(item => (
              <button
                key={item.path}
                type="button"
                className="app-entry-page__menu-link"
                onClick={() => navigateLanding(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="app-entry-page__header-actions">
            <WaselContactActionRow ar={ar} compact />
            {showGuestEntryPoints ? (
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
                <div
                  className="app-entry-page__hero-stats"
                  aria-label={ar ? 'إشارات المنصة' : 'Platform signals'}
                >
                  {heroStats.map(item => (
                    <div key={item.label} className="app-entry-page__hero-stat">
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>
                <div className="app-entry-page__hero-journey">
                  <div className="app-entry-page__hero-journey-label">
                    {ar ? 'كيف تبدأ' : 'How to start'}
                  </div>
                  <div className="app-entry-page__hero-journey-steps">
                    {heroJourney.map((step, index) => (
                      <div key={step.label} className="app-entry-page__hero-journey-step">
                        <span className="app-entry-page__hero-journey-index">{index + 1}</span>
                        <div>
                          <strong>{step.label}</strong>
                          <p>{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  {APP_ENTRY_SERVICE_MODES.map(serviceMode => (
                    <button
                      key={serviceMode}
                      id={APP_ENTRY_SERVICE_MODE_META[serviceMode].tabId}
                      type="button"
                      role="tab"
                      aria-controls={APP_ENTRY_SERVICE_MODE_META[serviceMode].panelId}
                      aria-selected={mode === serviceMode}
                      className={mode === serviceMode ? 'is-active' : undefined}
                      onClick={() => setMode(serviceMode)}
                    >
                      {copy.modes[serviceMode]}
                    </button>
                  ))}
                </div>

                <div
                  id={APP_ENTRY_SERVICE_MODE_META[mode].panelId}
                  className="app-entry-page__action-copy"
                  role="tabpanel"
                  aria-labelledby={APP_ENTRY_SERVICE_MODE_META[mode].tabId}
                >
                  <h2>{mode === 'ride' ? copy.cardTitle.ride : copy.cardTitle.package}</h2>
                  <p>{mode === 'ride' ? copy.cardBody.ride : copy.cardBody.package}</p>
                </div>

                <div className="app-entry-page__selection-overview">
                  <div className="app-entry-page__selection-pill">
                    <span>{ar ? 'الممر المختار' : 'Selected corridor'}</span>
                    <strong>{routePreview}</strong>
                  </div>
                  <div className="app-entry-page__selection-pill">
                    <span>{ar ? 'التدفق' : 'Flow'}</span>
                    <strong>{serviceLabel}</strong>
                  </div>
                </div>

                <div
                  className="app-entry-page__guidance-band"
                  aria-label={ar ? 'إشارات البداية' : 'Entry guidance'}
                >
                  {guidanceBand.map(item => (
                    <div key={item.label} className="app-entry-page__guidance-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>

                <div className="app-entry-page__field-grid">
                  <label>
                    <span>{copy.from}</span>
                    <select value={route.from} onChange={updateRoute('from')}>
                      {APP_ENTRY_CITY_OPTIONS.map(option => (
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
                      {APP_ENTRY_CITY_OPTIONS.map(option => (
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
                    onClick={() => navigateLanding(protectedPath(APP_ROUTES.offerRide.full))}
                  >
                    {copy.secondary}
                  </button>
                </div>

                {showGuestEntryPoints ? (
                  <div className="app-entry-page__guest-auth">
                    <p>{copy.guestLead}</p>
                    <div className="app-entry-page__guest-auth-buttons">
                      {authProviders.google.enabled ? (
                        <button type="button" onClick={() => void handleOAuth('google')}>
                          {oauthProvider === 'google' ? copy.googleBusy : copy.google}
                        </button>
                      ) : null}
                      {authProviders.facebook.enabled ? (
                        <button type="button" onClick={() => void handleOAuth('facebook')}>
                          {oauthProvider === 'facebook' ? copy.facebookBusy : copy.facebook}
                        </button>
                      ) : null}
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
