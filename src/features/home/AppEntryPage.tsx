import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowRight,
  Car,
  ChevronRight,
  Clock3,
  LogIn,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import { WaselBusinessFooter, WaselContactActionRow, WaselProofOfLifeBlock } from '../../components/system/WaselPresence';
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

const DEFAULT_RETURN_TO = '/app/find-ride';

function trackLandingNavigation(path: string, language: 'en' | 'ar', userId?: string) {
  const eventMap = [
    { match: '/app/find-ride', eventName: 'landing_find_ride_opened', serviceType: 'ride' as const },
    { match: '/app/offer-ride', eventName: 'landing_offer_ride_opened', serviceType: 'ride' as const },
    { match: '/app/packages', eventName: 'landing_packages_opened', serviceType: 'package' as const },
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

function buildSearchPath(mode: LandingMode, search: Record<'from' | 'to' | 'when' | 'units', string>) {
  const params = new URLSearchParams();
  if (search.from.trim()) params.set('from', search.from.trim());
  if (search.to.trim()) params.set('to', search.to.trim());
  if (search.when.trim()) params.set('when', search.when.trim());
  if (search.units.trim()) params.set(mode === 'ride' ? 'passengers' : 'parcels', search.units.trim());
  const base = mode === 'ride' ? '/app/find-ride' : '/app/packages';
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [mode, setMode] = useState<LandingMode>('ride');
  const [authError, setAuthError] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'google' | 'facebook' | null>(null);
  const [search, setSearch] = useState({ from: '', to: '', when: '', units: '1' });

  const ar = language === 'ar';
  const t = ar
    ? {
        heroBadge: '\u0627\u0644\u062d\u0631\u0643\u0629 \u062a\u0628\u062f\u0623 \u0645\u0646 \u0627\u0644\u062e\u0631\u064a\u0637\u0629',
        heroTitle: '\u0627\u0641\u062a\u062d \u0627\u0644\u0634\u0628\u0643\u0629 \u0623\u0648\u0644\u0627\u064b. \u062a\u062d\u0631\u0643 \u0628\u0637\u0631\u064a\u0642\u062a\u0643 \u0645\u0639 \u0648\u0627\u0635\u0644.',
        heroBody: '\u0646\u0628\u0642\u064a \u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062d\u0631\u0643\u0629 \u0638\u0627\u0647\u0631\u0629 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u062d\u062a\u0649 \u064a\u0641\u0647\u0645 \u0627\u0644\u0632\u0627\u0626\u0631 \u0641\u0643\u0631\u0629 Wasel \u0645\u0646 \u0623\u0648\u0644 \u0646\u0638\u0631\u0629.',
        rides: '\u0627\u0644\u0631\u062d\u0644\u0627\u062a',
        packages: '\u0627\u0644\u0637\u0631\u0648\u062f',
        simulation: '\u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629',
        signIn: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
        createAccount: '\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628',
        leavingFrom: '\u0627\u0644\u0627\u0646\u0637\u0644\u0627\u0642 \u0645\u0646',
        goingTo: '\u0630\u0627\u0647\u0628 \u0625\u0644\u0649',
        when: '\u0645\u062a\u0649',
        who: '\u0645\u0646',
        quantity: '\u0627\u0644\u0643\u0645\u064a\u0629',
        findRide: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
        sendPackage: '\u0623\u0631\u0633\u0644 \u0637\u0631\u062f\u0627\u064b',
        searchRides: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629',
        searchPackages: '\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0633\u0627\u0631 \u0637\u0631\u0648\u062f',
        offerRide: '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643',
        openPackages: '\u0627\u0641\u062a\u062d \u0627\u0644\u0637\u0631\u0648\u062f',
        email: '\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0627\u0644\u0628\u0631\u064a\u062f',
      }
    : {
        heroBadge: 'Travel by map first',
        heroTitle: 'Open the network first. Travel your way with Wasel.',
        heroBody: 'Wasel keeps the live mobility map in the background so people understand the concept first, then move into rides, packages, and driver supply with less friction.',
        rides: 'Rides',
        packages: 'Packages',
        simulation: 'Simulation',
        signIn: 'Sign in',
        createAccount: 'Create account',
        leavingFrom: 'Leaving from',
        goingTo: 'Going to',
        when: 'When',
        who: 'Who',
        quantity: 'How many',
        findRide: 'Find a ride',
        sendPackage: 'Send a package',
        searchRides: 'Search rides',
        searchPackages: 'Search parcel routes',
        offerRide: 'Offer your ride',
        openPackages: 'Open packages',
        email: 'Continue with email',
      };

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
  const onInput = (field: keyof typeof search) => (event: ChangeEvent<HTMLInputElement>) =>
    setSearch(current => ({ ...current, [field]: event.target.value }));

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateLanding(buildSearchPath(mode, search));
  };

  const onOAuth = async (provider: 'google' | 'facebook') => {
    setAuthError('');
    setOauthProvider(provider);
    const result = provider === 'google' ? await signInWithGoogle(DEFAULT_RETURN_TO) : await signInWithFacebook(DEFAULT_RETURN_TO);
    if (result.error) {
      setAuthError(friendlyAuthError(result.error, provider === 'google' ? 'Google sign in failed.' : 'Facebook sign in failed.'));
      setOauthProvider(null);
    }
  };

  const valueProps = [
    ['Travel everywhere with clarity', 'Start from the live corridor map before you choose the service.'],
    ['More value on every corridor', 'Wasel lets rides and parcels move through the same operating network.'],
    ['Trust stays visible from the first screen', 'Support, identity, and confidence stay easy to find.'],
  ];

  const serviceCards = [
    { icon: Search, title: 'By ride', detail: 'Find the right shared route fast.', path: '/app/find-ride' },
    { icon: Package, title: 'By package', detail: 'Move parcels through the same network lanes.', path: '/app/packages' },
    { icon: Car, title: 'As a driver', detail: 'Offer your ride and increase earnings per departure.', path: protectedPath('/app/offer-ride') },
  ];

  const discoveryColumns = [
    { title: 'Compare Wasel routes', items: [['Amman -> Irbid', '/app/find-ride?from=Amman&to=Irbid'], ['Amman -> Aqaba', '/app/find-ride?from=Amman&to=Aqaba'], ['Zarqa -> Jerash', '/app/find-ride?from=Zarqa&to=Jerash']] },
    { title: 'Travel with rides', items: [['Find a ride', '/app/find-ride'], ['Offer your ride', protectedPath('/app/offer-ride')], ['Track my trips', protectedPath('/app/my-trips')]] },
    { title: 'Travel with packages', items: [['Open packages', '/app/packages'], ['Open Mobility OS', '/app/mobility-os'], ['Contact Wasel', signInPath]] },
  ] as const;

  return (
    <div className="app-entry-page" dir={ar ? 'rtl' : 'ltr'} style={{ fontFamily: LANDING_FONT }}>
      <div className="app-entry-page__shell">
        <header className="app-entry-page__header">
          <button type="button" className="app-entry-page__brand" onClick={() => navigateLanding(user ? '/app/find-ride' : '/')}>
            <span className="app-entry-page__brand-mark" aria-hidden="true"><WaselMark size={40} /></span>
            <span className="app-entry-page__brand-copy">
              <span className="app-entry-page__brand-name">Wasel</span>
              <span className="app-entry-page__brand-meta">{ar ? '\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u062d\u064a\u0629' : 'Live mobility network'}</span>
            </span>
          </button>
          <nav className="app-entry-page__nav" aria-label={ar ? '\u0627\u0644\u062a\u0646\u0642\u0644' : 'Landing navigation'}>
            <button type="button" onClick={() => navigateLanding('/app/find-ride')}>Search</button>
            <button type="button" onClick={() => navigateLanding(protectedPath('/app/offer-ride'))}>{t.offerRide}</button>
            <button type="button" onClick={() => navigateLanding('/app/mobility-os')}>{t.simulation}</button>
          </nav>
          <div className="app-entry-page__header-actions">
            <WaselContactActionRow ar={ar} compact />
            {!user ? (
              <div className="app-entry-page__auth-links">
                <button type="button" onClick={() => navigateLanding(signInPath)}><LogIn size={16} />{t.signIn}</button>
                <button type="button" className="app-entry-page__auth-primary" onClick={() => navigateLanding(signUpPath)}>{t.createAccount}</button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="app-entry-page__main">
          <section className="app-entry-page__hero">
            <div className="app-entry-page__hero-map" aria-hidden="true"><div className="app-entry-page__hero-map-scale"><DeferredLandingMap ar={ar} /></div></div>
            <div className="app-entry-page__hero-scrim" aria-hidden="true" />
            <div className="app-entry-page__hero-grid">
              <div className="app-entry-page__hero-copy">
                <div className="app-entry-page__eyebrow"><Sparkles size={16} />{t.heroBadge}</div>
                <div className="app-entry-page__mode-pills" role="tablist" aria-label={ar ? '\u0627\u0644\u062e\u062f\u0645\u0629' : 'Service mode'}>
                  <button type="button" className={mode === 'ride' ? 'is-active' : ''} onClick={() => setMode('ride')}>{t.rides}</button>
                  <button type="button" className={mode === 'package' ? 'is-active' : ''} onClick={() => setMode('package')}>{t.packages}</button>
                  <button type="button" onClick={() => navigateLanding('/app/mobility-os')}>Mobility OS</button>
                </div>
                <h1 className="app-entry-page__hero-title">{t.heroTitle}</h1>
                <p className="app-entry-page__hero-description">{t.heroBody}</p>
                <div className="app-entry-page__hero-notes">
                  <span><MapPinned size={16} />Map stays visible</span>
                  <span><WalletCards size={16} />One route, more yield</span>
                  <span><ShieldCheck size={16} />Support stays visible</span>
                </div>
                <div className="app-entry-page__hero-summary">
                  <div><strong>{supportLine}</strong><span>{businessAddress}</span></div>
                  <div><strong>Pitch-ready story</strong><span>Map, decision, and service in one view.</span></div>
                </div>
              </div>

              <form className="app-entry-page__search-card" onSubmit={onSearch}>
                <div className="app-entry-page__search-head">
                  <span>{mode === 'ride' ? t.findRide : t.sendPackage}</span>
                  <small>{mode === 'ride' ? 'Map-led booking' : 'Map-led dispatch'}</small>
                </div>
                <div className="app-entry-page__search-fields">
                  <label><span>{t.leavingFrom}</span><input type="text" value={search.from} onChange={onInput('from')} placeholder={ar ? '\u0639\u0645\u0627\u0646' : 'Amman'} /></label>
                  <label><span>{t.goingTo}</span><input type="text" value={search.to} onChange={onInput('to')} placeholder={ar ? '\u0625\u0631\u0628\u062f' : 'Irbid'} /></label>
                  <label><span>{t.when}</span><input type="text" value={search.when} onChange={onInput('when')} placeholder={ar ? '\u0627\u0644\u064a\u0648\u0645' : 'Today'} /></label>
                  <label><span>{mode === 'ride' ? t.who : t.quantity}</span><input type="text" value={search.units} onChange={onInput('units')} placeholder={mode === 'ride' ? (ar ? '\u0631\u0627\u0643\u0628 \u0648\u0627\u062d\u062f' : '1 passenger') : (ar ? '\u0637\u0631\u062f \u0648\u0627\u062d\u062f' : '1 parcel')} /></label>
                </div>
                <div className="app-entry-page__search-actions">
                  <button type="submit" className="app-entry-page__search-primary"><Search size={18} />{mode === 'ride' ? t.searchRides : t.searchPackages}</button>
                  <button type="button" className="app-entry-page__search-secondary" onClick={() => navigateLanding(mode === 'ride' ? protectedPath('/app/offer-ride') : '/app/packages')}>{mode === 'ride' ? t.offerRide : t.openPackages}</button>
                </div>
                {!user ? (
                  <div className="app-entry-page__guest-access">
                    <p>{ar ? '\u0627\u062f\u062e\u0644 \u0625\u0644\u0649 \u0648\u0627\u0635\u0644 \u0628\u0623\u0628\u0633\u0637 \u0637\u0631\u064a\u0642\u0629.' : 'Enter Wasel through the shortest path.'}</p>
                    <div className="app-entry-page__guest-buttons">
                      <button type="button" onClick={() => void onOAuth('google')}>{oauthProvider === 'google' ? 'Connecting Google...' : 'Continue with Google'}</button>
                      <button type="button" onClick={() => void onOAuth('facebook')}>{oauthProvider === 'facebook' ? 'Connecting Facebook...' : 'Continue with Facebook'}</button>
                      <button type="button" onClick={() => navigateLanding(signInPath)}>{t.email}</button>
                    </div>
                    <div className="app-entry-page__guest-links">
                      <button type="button" onClick={() => navigateLanding(signInPath)}>{t.signIn}</button>
                      <button type="button" onClick={() => navigateLanding(signUpPath)}>{t.createAccount}</button>
                    </div>
                    {authError ? <p className="app-entry-page__auth-error" role="alert">{authError}</p> : null}
                  </div>
                ) : (
                  <div className="app-entry-page__signed-in"><strong>You are already inside Wasel</strong><button type="button" onClick={() => navigateLanding('/app/find-ride')}>Find a ride</button></div>
                )}
              </form>
            </div>
          </section>

          <section className="app-entry-page__value-grid" aria-label={ar ? '\u0623\u0633\u0628\u0627\u0628 \u0648\u0627\u0635\u0644' : 'Why Wasel'}>
            {valueProps.map(([title, detail]) => <article key={title} className="app-entry-page__panel"><h2>{title}</h2><p>{detail}</p></article>)}
          </section>

          <section className="app-entry-page__section">
            <div className="app-entry-page__section-head"><div><span>{ar ? '\u0643\u064a\u0641 \u062a\u062a\u062d\u0631\u0643 \u0627\u0644\u064a\u0648\u0645\u061f' : 'How are you moving today?'}</span><h2>{ar ? '\u062b\u0644\u0627\u062b \u0645\u062f\u0627\u062e\u0644 \u0648\u0627\u0636\u062d\u0629 \u062a\u0646\u0637\u0644\u0642 \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0634\u0628\u0643\u0629.' : 'Three clear entry points into the same network.'}</h2></div></div>
            <div className="app-entry-page__service-grid">
              {serviceCards.map(card => (
                <button key={card.title} type="button" className="app-entry-page__service-card" onClick={() => navigateLanding(card.path)}>
                  <span className="app-entry-page__service-icon"><card.icon size={22} /></span>
                  <strong>{card.title}</strong>
                  <p>{card.detail}</p>
                  <span className="app-entry-page__service-cta">{ar ? '\u0627\u0641\u062a\u062d \u0627\u0644\u0645\u0633\u0627\u0631' : 'Open flow'}<ChevronRight size={16} /></span>
                </button>
              ))}
            </div>
          </section>

          <section className="app-entry-page__simulation-band">
            <div className="app-entry-page__simulation-copy">
              <span>{ar ? '\u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0628\u0627\u0642\u064a\u0629 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629' : 'Simulation stays in the background'}</span>
              <h2>{ar ? '\u0627\u0644\u0635\u0641\u062d\u0629 \u062a\u0634\u0631\u062d Wasel \u0645\u0646 \u062e\u0644\u0627\u0644 \u0627\u0644\u062e\u0631\u064a\u0637\u0629.' : 'The landing page explains Wasel through the map, not through static decoration.'}</h2>
              <p>{ar ? '\u0647\u0630\u0627 \u064a\u0628\u0642\u064a \u0627\u0644\u0641\u0643\u0631\u0629 \u0648\u0627\u0636\u062d\u0629: \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631 \u064a\u0633\u062a\u0648\u0639\u0628 \u0627\u0644\u0631\u0627\u0643\u0628 \u0648\u0627\u0644\u0637\u0631\u062f \u0648\u0642\u0631\u0627\u0631 \u0627\u0644\u062a\u0634\u063a\u064a\u0644.' : 'That keeps the concept legible: one corridor can carry the rider, the parcel, and the operating decision at the same time.'}</p>
            </div>
            <div className="app-entry-page__simulation-points">
              <article><MapPinned size={18} /><strong>Map-first product story</strong><p>Every entry starts from a live network picture.</p></article>
              <article><Users size={18} /><strong>One operating language</strong><p>Rides and packages share the same surface and logic.</p></article>
              <article><Clock3 size={18} /><strong>Visible support layer</strong><p>Contact and trust signals stay close to the CTA.</p></article>
            </div>
          </section>

          <section className="app-entry-page__quote-band">
            <div>
              <span>{ar ? '\u0641\u0642\u0637 \u0641\u064a Wasel...' : 'Only on Wasel...'}</span>
              <h2>{ar ? '"\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u062a\u0634\u0631\u062d \u0644\u064a \u0644\u0645\u0627\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631 \u064a\u062d\u0645\u0644 \u0631\u0627\u0643\u0628\u0627\u064b \u0648\u0637\u0631\u062f\u0627\u064b \u0645\u0639\u0627\u064b."': '"The map makes it obvious why one route can carry a rider and a parcel at the same time."'}</h2>
              <p>{ar ? '\u0647\u0630\u0647 \u0647\u064a \u0631\u0633\u0627\u0644\u0629 Wasel \u0627\u0644\u0623\u0648\u0644\u0649 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0633\u0627\u0626\u0642\u064a\u0646 \u0648\u0627\u0644\u0645\u0633\u062a\u062b\u0645\u0631\u064a\u0646.' : 'That is the pitch: riders, drivers, and stakeholders all understand Wasel faster.'}</p>
            </div>
            <button type="button" onClick={() => navigateLanding('/app/mobility-os')}>Open Mobility OS<ArrowRight size={16} /></button>
          </section>

          <section className="app-entry-page__discovery-grid">
            {discoveryColumns.map(column => (
              <article key={column.title} className="app-entry-page__panel">
                <h2>{column.title}</h2>
                <div className="app-entry-page__link-list">
                  {column.items.map(([label, path]) => <button key={label} type="button" onClick={() => navigateLanding(path)}><span>{label}</span><ChevronRight size={15} /></button>)}
                </div>
              </article>
            ))}
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
