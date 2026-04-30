import { useEffect, useState, type ChangeEvent } from 'react';
import {
  ArrowRight,
  Calendar,
  CarFront,
  ChevronDown,
  Facebook,
  Globe,
  Headphones,
  Instagram,
  Mail,
  MapPin,
  Package2,
  Phone,
  Search,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import landingMapReference from '../../../assets/landing-map-reference.png';
import {
  ENTRY_CITY_OPTIONS,
  ENTRY_DEFAULT_ROUTE_DRAFT,
  buildPackagePrefillPath,
  buildRideSearchPath,
  getAlternateEntryCity,
  type EntryRouteDraft,
} from '../../../contracts/entry';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { APP_ROUTES } from '../../../router/paths';
import { LANDING_SUPPORT_EMAIL, LANDING_SUPPORT_PHONE } from './pageTypes';
import { scheduleDeferredTask } from '../../../utils/runtimeScheduling';
import '../LandingPage.css';

type LandingMode = 'ride' | 'package';

const SUPPORT_PHONE_DISPLAY = '+962 79 000 0000';

function LandingBrandBadge({ size = 46 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="landing-page__brand-badge"
      viewBox="0 0 56 56"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="4"
        width="48"
        height="48"
        rx="14"
        fill="var(--wasel-brand-gradient-end)"
      />
      <path
        d="M18 36.5L28.7 20.2C30 18.2 32.2 17 34.6 17H38.2L27.4 33.4C26.1 35.4 23.9 36.5 21.5 36.5H18ZM35 20.4C35 21.7 36 22.7 37.3 22.7C38.6 22.7 39.6 21.7 39.6 20.4C39.6 19.1 38.6 18.1 37.3 18.1C36 18.1 35 19.1 35 20.4Z"
        fill="var(--wasel-copy-primary)"
      />
    </svg>
  );
}

function NetworkMapHero() {
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const cancelDeferredLoad = scheduleDeferredTask(() => {
      setShowImage(true);
    }, 1_800);

    return () => {
      cancelDeferredLoad();
    };
  }, []);

  return (
    <div aria-hidden="true" className="landing-page__network-map">
      {showImage ? (
        <img
          alt=""
          className="landing-page__network-map-image"
          decoding="async"
          draggable={false}
          fetchPriority="low"
          loading="lazy"
          src={landingMapReference}
        />
      ) : null}
      <div className="landing-page__network-map-shade" />
    </div>
  );
}

export function LandingPage() {
  const navigate = useIframeSafeNavigate();
  const [mode, setMode] = useState<LandingMode>('ride');
  const [route, setRoute] = useState<EntryRouteDraft>({ ...ENTRY_DEFAULT_ROUTE_DRAFT });

  const routePreview = `${route.from} \u2192 ${route.to}`;
  const primaryPath =
    mode === 'ride' ? buildRideSearchPath(route) : buildPackagePrefillPath(route);
  const primaryLabel = mode === 'ride' ? 'Find a ride' : 'Send a package';
  const plannerTitle = mode === 'ride' ? 'Find a ride' : 'Send a package';
  const plannerCopy =
    mode === 'ride'
      ? 'Choose a corridor, then open the live ride flow.'
      : 'Choose a corridor, then open the live package flow.';
  const clarityTitle = mode === 'ride' ? 'Price and seat' : 'Pickup and dropoff';
  const clarityCopy =
    mode === 'ride'
      ? 'Timing and price stay visible together.'
      : 'Pickup and handoff stay visible together.';

  const flowCards = [
    {
      cta: 'Open rides',
      detail: 'Compare the corridor, timing, and seat.',
      icon: Search,
      path: buildRideSearchPath(route),
      title: 'Find a ride',
    },
    {
      cta: 'Open packages',
      detail: 'Attach the parcel to the same network.',
      icon: Package2,
      path: buildPackagePrefillPath(route),
      title: 'Send a package',
    },
    {
      cta: 'Open driver flow',
      detail: 'Turn an empty departure into more value.',
      icon: CarFront,
      path: APP_ROUTES.offerRide.full,
      title: 'Offer your ride',
    },
  ] as const;
  const updateRoute =
    (field: keyof EntryRouteDraft) =>
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

  const openSupport = () => {
    window.location.href = `tel:${LANDING_SUPPORT_PHONE}`;
  };

  const openEmail = () => {
    window.location.href = `mailto:${LANDING_SUPPORT_EMAIL}`;
  };

  return (
    <div className="landing-page-frame" dir="ltr">
      <main className="landing-page" role="main">
        <section className="landing-page__hero">
          <header className="landing-page__header">
            <button className="landing-page__brand" onClick={() => navigate('/')} type="button">
              <span className="landing-page__brand-mark">
                <LandingBrandBadge size={46} />
              </span>
              <span className="landing-page__brand-copy">
                <span className="landing-page__brand-title">Wasel</span>
                <span className="landing-page__brand-subtitle">Live mobility network</span>
              </span>
            </button>

            <div className="landing-page__header-actions">
              <button className="landing-page__contact-button" onClick={openSupport} type="button">
                <Phone size={16} />
                Call support
              </button>
              <button className="landing-page__contact-button" onClick={openEmail} type="button">
                <Mail size={16} />
                Email us
              </button>
            </div>
          </header>

          <div className="landing-page__map-wrap">
            <NetworkMapHero />
          </div>

          <div className="landing-page__hero-grid">
            <div className="landing-page__hero-copy">
              <div className="landing-page__eyebrow">
                <span className="landing-page__eyebrow-dot" />
                One live network
              </div>

              <h1 className="landing-page__hero-title">
                <span>Open the</span>
                <span>network first.</span>
                <span className="landing-page__hero-title-accent">Travel your way</span>
                <span>
                  <em>with</em> Wasel.
                </span>
              </h1>

              <p className="landing-page__hero-description">
                Wasel makes the idea clear in seconds: the same corridor can carry riders,
                packages, and sharper decisions.
              </p>

              <div className="landing-page__signal-list" aria-label="Landing signals">
                <div className="landing-page__signal-pill">
                  <UsersRound size={15} />
                  One route can move people and parcels.
                </div>
                <div className="landing-page__signal-pill">
                  <MapPin size={15} />
                  The mobility map stays visible in the background.
                </div>
                <div className="landing-page__signal-pill">
                  <Package2 size={15} />
                  Rides and packages share the same operating surface.
                </div>
                <div className="landing-page__signal-pill">
                  <ShieldCheck size={15} />
                  Support and trust stay close to the action.
                </div>
              </div>

              <div className="landing-page__stat-grid" aria-label="Wasel summary">
                <article className="landing-page__stat-card">
                  <strong>3</strong>
                  <span>Core flows</span>
                  <p>Rides, packages, and supply.</p>
                </article>
                <article className="landing-page__stat-card">
                  <strong>1</strong>
                  <span>Shared network</span>
                  <p>The same corridor powers the decision.</p>
                </article>
                <article className="landing-page__stat-card">
                  <strong>24/7</strong>
                  <span>Close support</span>
                  <p>Trust and help near the action.</p>
                </article>
              </div>
            </div>

            <aside className="landing-page__planner">
              <div
                aria-label="Service mode"
                className="landing-page__tablist"
                role="tablist"
              >
                <button
                  aria-selected={mode === 'ride'}
                  className={mode === 'ride' ? 'is-active' : undefined}
                  onClick={() => setMode('ride')}
                  role="tab"
                  type="button"
                >
                  Rides
                </button>
                <button
                  aria-selected={mode === 'package'}
                  className={mode === 'package' ? 'is-active' : undefined}
                  onClick={() => setMode('package')}
                  role="tab"
                  type="button"
                >
                  Packages
                </button>
              </div>

              <div className="landing-page__planner-copy">
                <h2>{plannerTitle}</h2>
                <p>{plannerCopy}</p>
              </div>

              <div className="landing-page__planner-summary">
                <div className="landing-page__summary-box">
                  <span>Selected corridor</span>
                  <strong>{routePreview}</strong>
                  <ChevronDown aria-hidden="true" size={16} />
                </div>
                <div className="landing-page__summary-box">
                  <span>Flow</span>
                  <strong>{primaryLabel}</strong>
                  <ChevronDown aria-hidden="true" size={16} />
                </div>
              </div>

              <div className="landing-page__fact-grid">
                <article className="landing-page__fact-card">
                  <span>Corridor</span>
                  <strong>{routePreview}</strong>
                  <p>The same corridor opens the flow fast.</p>
                  <MapPin aria-hidden="true" size={18} />
                </article>
                <article className="landing-page__fact-card">
                  <span>Clarity</span>
                  <strong>{clarityTitle}</strong>
                  <p>{clarityCopy}</p>
                  <ShieldCheck aria-hidden="true" size={18} />
                </article>
                <article className="landing-page__fact-card">
                  <span>Support</span>
                  <strong>{SUPPORT_PHONE_DISPLAY}</strong>
                  <p>Real people, real support, real solutions.</p>
                  <Headphones aria-hidden="true" size={18} />
                </article>
              </div>

              <div className="landing-page__field-grid">
                <label className="landing-page__field">
                  <span>Leaving from</span>
                  <div className="landing-page__control">
                    <select onChange={updateRoute('from')} value={route.from}>
                      {ENTRY_CITY_OPTIONS.map(option => (
                        <option
                          disabled={option.value === route.to}
                          key={option.value}
                          value={option.value}
                        >
                          {option.en}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="landing-page__control-icon"
                      size={16}
                    />
                  </div>
                </label>

                <label className="landing-page__field">
                  <span>Going to</span>
                  <div className="landing-page__control">
                    <select onChange={updateRoute('to')} value={route.to}>
                      {ENTRY_CITY_OPTIONS.map(option => (
                        <option
                          disabled={option.value === route.from}
                          key={option.value}
                          value={option.value}
                        >
                          {option.en}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="landing-page__control-icon"
                      size={16}
                    />
                  </div>
                </label>

                <label className="landing-page__field landing-page__field--full">
                  <span>When</span>
                  <div className="landing-page__control">
                    <Calendar
                      aria-hidden="true"
                      className="landing-page__control-icon landing-page__control-icon--leading"
                      size={16}
                    />
                    <input
                      onChange={updateRoute('date')}
                      placeholder="mm/dd/yyyy"
                      type="text"
                      value={route.date}
                    />
                  </div>
                </label>
              </div>

              <div className="landing-page__planner-actions">
                <button
                  className="landing-page__primary-button"
                  onClick={() => navigate(primaryPath)}
                  type="button"
                >
                  {primaryLabel}
                  <ArrowRight size={18} />
                </button>
                <button
                  className="landing-page__secondary-button"
                  onClick={() => navigate(APP_ROUTES.offerRide.full)}
                  type="button"
                >
                  Offer your ride
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section className="landing-page__section">
          <div className="landing-page__section-copy">
            <span>Choose your flow</span>
            <h2>Three simple ways to understand Wasel in a few seconds.</h2>
          </div>

          <div className="landing-page__flow-grid">
            {flowCards.map(card => {
              const Icon = card.icon;
              return (
                <button
                  className="landing-page__flow-card"
                  key={card.title}
                  onClick={() => navigate(card.path)}
                  type="button"
                >
                  <span className="landing-page__flow-icon">
                    <Icon size={22} />
                  </span>
                  <strong>{card.title}</strong>
                  <p>{card.detail}</p>
                  <span className="landing-page__flow-cta">
                    {card.cta}
                    <ArrowRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="landing-page__proof" aria-label="Proof of life">
          <div className="landing-page__proof-head">
            <div className="landing-page__proof-copy">
              <span>Proof of life</span>
              <p>Book, track, offer rides, and move packages from one dashboard.</p>
            </div>
            <button className="landing-page__proof-support" onClick={openSupport} type="button">
              <Headphones size={16} />
              {SUPPORT_PHONE_DISPLAY}
            </button>
          </div>

          <div className="landing-page__proof-grid">
            <article className="landing-page__proof-card landing-page__proof-card--green">
              <span>Live network</span>
              <strong>Routes, trust, and tracking are active.</strong>
              <MapPin aria-hidden="true" size={18} />
            </article>
            <article className="landing-page__proof-card landing-page__proof-card--blue">
              <span>Real actions</span>
              <strong>Book, track, offer rides, send package.</strong>
              <Package2 aria-hidden="true" size={18} />
            </article>
            <article className="landing-page__proof-card landing-page__proof-card--amber">
              <span>Human support</span>
              <strong>Call or email available 24/7.</strong>
              <Headphones aria-hidden="true" size={18} />
            </article>
          </div>
        </section>

        <footer className="landing-page__footer">
          <div className="landing-page__footer-brand">
            <LandingBrandBadge size={28} />
            <span>Wasel stays visible inside the corridor.</span>
          </div>

          <div className="landing-page__footer-actions">
            <button aria-label="Facebook" className="landing-page__social-button" type="button">
              <Facebook size={16} />
            </button>
            <button aria-label="Instagram" className="landing-page__social-button" type="button">
              <Instagram size={16} />
            </button>
            <button aria-label="X" className="landing-page__social-button" type="button">
              <span className="landing-page__social-x">X</span>
            </button>

            <div className="landing-page__footer-divider" />

            <button className="landing-page__language-button" type="button">
              <Globe size={16} />
              EN
              <ChevronDown size={16} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
