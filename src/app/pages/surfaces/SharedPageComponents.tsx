/**
 * Shared presentational components used across page surfaces.
 *
 * All primitives here are stateless and receive everything via props.
 * No service calls, no route hooks — pure rendering only.
 */
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import {
  ChevronRight,
  Compass,
  FileText,
  Landmark,
  LifeBuoy,
  Mail,
  MapPinned,
  Phone,
  Route,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button, Card, LayoutContainer } from '../../../design-system/components';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { DeferredLandingMap } from '../../../components/layout/DeferredLandingMap';
import { buildAuthPagePath, normalizeAuthReturnTo } from '../../../utils/authFlow';
import type { BrandPillItem, HeroFeatureItem } from './pageTypes';
import { LANDING_SUPPORT_EMAIL, LANDING_SUPPORT_PHONE } from './pageTypes';
import { overviewConfigs, type OverviewConfigKey } from './overviewConfigs';

// ─── Atom: Page heading ───────────────────────────────────────────────────────

export function PageHeading({
  action,
  description,
  eyebrow,
  title,
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

// ─── Atom: KPI metric grid ────────────────────────────────────────────────────

export function MetricGrid({
  items,
}: {
  items: Array<{ detail: string; label: string; value: string }>;
}) {
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

// ─── Guard: Auth-protected page wrapper ──────────────────────────────────────

export function ProtectedPage({ children }: { children: ReactNode }) {
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

// ─── Molecule: Support CTA buttons ───────────────────────────────────────────

export function SupportActions() {
  return (
    <div className="ds-support-actions landing-page__support-actions">
      <Button
        onClick={() => {
          window.location.href = `tel:${LANDING_SUPPORT_PHONE}`;
        }}
        variant="secondary"
      >
        <Phone size={16} />
        Call support
      </Button>
      <Button
        onClick={() => {
          window.location.href = `mailto:${LANDING_SUPPORT_EMAIL}`;
        }}
        variant="ghost"
      >
        <Mail size={16} />
        Email us
      </Button>
    </div>
  );
}

// ─── Molecule: Hero stat cards ────────────────────────────────────────────────

export function HeroStats({
  items,
}: {
  items: Array<{ detail: string; label: string; value: string }>;
}) {
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

// ─── Molecule: Brand pill row ─────────────────────────────────────────────────

export function BrandPillRow({ items }: { items: BrandPillItem[] }) {
  return (
    <div aria-label="Brand highlights" className="ds-brand-pill-row">
      {items.map(item => (
        <span className="ds-brand-pill" key={item.label}>
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ─── Molecule: Hero feature cards ─────────────────────────────────────────────

export function HeroFeatureGrid({ items }: { items: HeroFeatureItem[] }) {
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

// ─── Molecule: Tappable action card grid ──────────────────────────────────────

export function ActionCards({
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

// ─── Molecule: Map hero panel with live signals ───────────────────────────────

export function MapHeroPanel({
  children,
  className,
  mapVariant = 'ambient',
  signals = ['Ride flow live', 'Package lanes active', 'Mobility OS synced'],
}: {
  children: ReactNode;
  className?: string;
  mapVariant?: 'ambient' | 'full';
  signals?: string[];
}) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <Card className={['ds-hero-panel', className].filter(Boolean).join(' ')}>
      <div aria-hidden="true" className="ds-hero-panel__media">
        <div className="ds-map-stage">
          <DeferredLandingMap ar={ar} eager variant={mapVariant} />
        </div>
      </div>
      <div className="ds-hero-panel__content">
        {children}
        <div aria-label="Live network status" className="ds-hero-panel__signals">
          {signals.map(label => (
            <span className="ds-hero-panel__signal-chip" key={label}>
              <span aria-hidden="true" className="ds-hero-panel__signal-bar" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Template: Simple overview page ──────────────────────────────────────────
//
// Used by 12 secondary pages (analytics, driver, innovation, etc.) that share
// the same three-card + heading layout. Adding a new overview page = adding a
// key to overviewConfigs — no new component needed.

export function SimpleOverviewPage({ configKey }: { configKey: OverviewConfigKey }) {
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

// ─── Utility pages ────────────────────────────────────────────────────────────

export function NotFoundPage() {
  const navigate = useIframeSafeNavigate();

  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          action={
            <>
              <Button onClick={() => navigate('/')} variant="primary">
                Back to Wasel
              </Button>
              <Button onClick={() => navigate('/app/find-ride')} variant="secondary">
                Find a ride
              </Button>
            </>
          }
          description="The link may be outdated, the route may have moved, or the app may have redirected you out of the active corridor."
          eyebrow="Route recovery"
          title="This page is off the live network."
        />

        <BrandPillRow
          items={[
            { icon: <Compass size={14} />, label: 'Landing route available' },
            { icon: <Route size={14} />, label: 'Ride flow still live' },
            { icon: <LifeBuoy size={14} />, label: 'Support stays reachable' },
          ]}
        />

        <MetricGrid
          items={[
            {
              label: 'Fallback path',
              value: 'Landing',
              detail: 'Return to the public Wasel surface first.',
            },
            {
              label: 'Fastest recovery',
              value: 'Find ride',
              detail: 'Jump straight into the live ride flow.',
            },
            {
              label: 'Navigation status',
              value: 'Safe',
              detail: 'No bookings or payments were changed.',
            },
          ]}
        />

        <div className="ds-split-grid">
          <Card className="ds-section-wrapper">
            <div className="ds-section-wrapper__header">
              <div className="ds-panel-kicker">What happened</div>
              <h2 className="ds-section-title">The route is no longer valid.</h2>
              <p className="ds-copy ds-copy--tight">
                Wasel keeps live links short and direct. If the path changed, the safest next step
                is to return to a known page and reopen the flow from there.
              </p>
            </div>
            <div className="ds-list">
              {[
                'The page may have been renamed or replaced by a newer route.',
                'The link may point to a route that only exists during an active session.',
                'A ride, package, or wallet step may require returning through the main app shell.',
              ].map(item => (
                <div className="ds-list-item" key={item}>
                  <div className="ds-list-item__icon">
                    <Route size={16} />
                  </div>
                  <div>
                    <h2 className="ds-card__title">{item}</h2>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <MapHeroPanel
            mapVariant="ambient"
            signals={['Landing available', 'Ride search live', 'Support line active']}
          >
            <div className="ds-hero-panel__content-inner">
              <div className="ds-panel-kicker">Recovery lane</div>
              <h2 className="ds-section-title">Return to the active Wasel path.</h2>
              <p className="ds-copy">
                Start from landing if you need the full network view, or jump straight into
                `Find a ride` if you want the fastest recovery back into a live service flow.
              </p>
            </div>
          </MapHeroPanel>
        </div>

        <ActionCards
          items={[
            {
              detail: 'Open the public network view and re-enter from the top.',
              icon: <Compass size={18} />,
              path: '/',
              title: 'Back to landing',
            },
            {
              detail: 'Jump into the main rider flow immediately.',
              icon: <Route size={18} />,
              path: '/app/find-ride',
              title: 'Find a ride',
            },
            {
              detail: 'Open account access if this route required authentication.',
              icon: <Shield size={18} />,
              path: '/app/auth',
              title: 'Sign in',
            },
          ]}
          onNavigate={navigate}
        />
      </div>
    </LayoutContainer>
  );
}

export function RouteErrorPage({ message }: { message: string }) {
  const navigate = useIframeSafeNavigate();

  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          action={
            <>
              <Button onClick={() => navigate('/app/find-ride')} variant="primary">
                Find a ride
              </Button>
              <Button onClick={() => navigate('/app/auth')} variant="secondary">
                Sign in
              </Button>
            </>
          }
          description="The app could not restore this view cleanly, but the main Wasel flows are still available."
          eyebrow="System recovery"
          title="This screen could not finish loading."
        />

        <MetricGrid
          items={[
            {
              label: 'Route status',
              value: 'Interrupted',
              detail: 'This page stopped before it could finish rendering.',
            },
            {
              label: 'Booking state',
              value: 'Safe',
              detail: 'No payment or trip change is implied by this error alone.',
            },
            {
              label: 'Next step',
              value: 'Recover',
              detail: 'Re-enter through a stable ride, auth, or landing route.',
            },
          ]}
        />

        <div className="ds-split-grid">
          <Card className="ds-section-wrapper">
            <div className="ds-section-wrapper__header">
              <div className="ds-panel-kicker">Error details</div>
              <h2 className="ds-section-title">The app returned this message.</h2>
              <p className="ds-copy ds-copy--tight">
                If this keeps happening on the same route, the quickest recovery is to reopen the
                flow from landing, auth, or the service page directly.
              </p>
            </div>
            <div className="ds-inline-feedback" data-tone="error">
              {message}
            </div>
            <div className="ds-list">
              {[
                'Retry from the main route instead of reusing the broken URL.',
                'Use sign in again if the page depends on an active session.',
                'Return to landing if you want the broadest recovery path.',
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
          </Card>

          <MapHeroPanel
            mapVariant="ambient"
            signals={['Error isolated', 'Ride flow live', 'Auth flow ready']}
          >
            <div className="ds-hero-panel__content-inner">
              <div className="ds-panel-kicker">Fallback route</div>
              <h2 className="ds-section-title">Recover through the stable entry points.</h2>
              <p className="ds-copy">
                Wasel keeps the primary ride, auth, and landing routes available even when a
                secondary surface fails to load.
              </p>
            </div>
          </MapHeroPanel>
        </div>
      </div>
    </LayoutContainer>
  );
}

export function PrivacyPage() {
  const navigate = useIframeSafeNavigate();

  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          action={
            <>
              <Button onClick={() => navigate('/app/terms')} variant="secondary">
                Terms
              </Button>
              <Button onClick={() => navigate('/app/auth')} variant="ghost">
                Account access
              </Button>
            </>
          }
          description="How Wasel handles account, trip, wallet, and support data inside one live mobility network."
          eyebrow="Legal clarity"
          title="Privacy stays inside the corridor."
        />

        <BrandPillRow
          items={[
            { icon: <ShieldCheck size={14} />, label: 'Account protection' },
            { icon: <MapPinned size={14} />, label: 'Trip context only' },
            { icon: <Wallet size={14} />, label: 'Wallet-safe actions' },
          ]}
        />

        <MetricGrid
          items={[
            {
              label: 'Core data groups',
              value: '4',
              detail: 'Account, trip, wallet, and support context.',
            },
            {
              label: 'Location use',
              value: 'Trip-bound',
              detail: 'Used around active routes and handoff decisions.',
            },
            {
              label: 'Security posture',
              value: 'Protected',
              detail: 'Verification and payment actions stay inside trusted flows.',
            },
          ]}
        />

        <div className="ds-split-grid">
          <MapHeroPanel
            mapVariant="ambient"
            signals={['Trip context only', 'Wallet-safe actions', 'Support trail retained']}
          >
            <div className="ds-hero-panel__content-inner">
              <div className="ds-panel-kicker">Privacy posture</div>
              <h2 className="ds-section-title">Data follows the live service path.</h2>
              <p className="ds-copy">
                Wasel keeps trip context close to the route, wallet context close to payment
                actions, and support context close to the issue being resolved.
              </p>
            </div>
          </MapHeroPanel>

          <Card className="ds-section-wrapper">
            <div className="ds-section-wrapper__header">
              <div className="ds-panel-kicker">What we keep</div>
              <h2 className="ds-section-title">Only the data needed to operate the network.</h2>
            </div>
            <div className="ds-list">
              {[
                'Account identity, verification, and support history needed to operate Wasel safely.',
                'Route, timing, and handoff context tied to the current ride or package flow.',
                'Wallet, payment, and compliance details tied to the movement they support.',
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
          </Card>
        </div>

        <ActionCards
          items={[
            {
              detail: 'See the service rules that govern riders, packages, and stored value.',
              icon: <Scale size={18} />,
              path: '/app/terms',
              title: 'Open terms',
            },
            {
              detail: 'Review the main rider flow where trip context is created and used.',
              icon: <Route size={18} />,
              path: '/app/find-ride',
              title: 'Ride flow',
            },
            {
              detail: 'Open sign in and account access for profile-linked controls.',
              icon: <ShieldCheck size={18} />,
              path: '/app/auth',
              title: 'Account access',
            },
          ]}
          onNavigate={navigate}
        />
      </div>
    </LayoutContainer>
  );
}

export function TermsPage() {
  const navigate = useIframeSafeNavigate();

  return (
    <LayoutContainer>
      <div className="ds-page">
        <PageHeading
          action={
            <>
              <Button onClick={() => navigate('/app/privacy')} variant="secondary">
                Privacy
              </Button>
              <Button onClick={() => navigate('/app/find-ride')} variant="ghost">
                Ride flow
              </Button>
            </>
          }
          description="The operating rules for riders, drivers, packages, support, and stored value inside Wasel."
          eyebrow="Service rules"
          title="One network. Clear operating terms."
        />

        <BrandPillRow
          items={[
            { icon: <Landmark size={14} />, label: 'Rider and driver rules' },
            { icon: <FileText size={14} />, label: 'Package handoff discipline' },
            { icon: <Wallet size={14} />, label: 'Stored value controls' },
          ]}
        />

        <MetricGrid
          items={[
            {
              label: 'Core rule areas',
              value: '4',
              detail: 'Trips, packages, payments, and support behavior.',
            },
            {
              label: 'Identity standard',
              value: 'Accurate',
              detail: 'Use real and current account or booking details.',
            },
            {
              label: 'Trusted path',
              value: 'In-app',
              detail: 'Safety, payment, and support actions belong in trusted flows.',
            },
          ]}
        />

        <div className="ds-split-grid">
          <Card className="ds-section-wrapper">
            <div className="ds-section-wrapper__header">
              <div className="ds-panel-kicker">Core terms</div>
              <h2 className="ds-section-title">What keeps the network usable.</h2>
            </div>
            <div className="ds-list">
              {[
                'Use Wasel with accurate rider, route, package, and identity details.',
                'Keep payments, support, and trust actions inside the official product surfaces.',
                'Respect route timing, ticket codes, pickup windows, and package handoff steps.',
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
          </Card>

          <MapHeroPanel
            mapVariant="ambient"
            signals={['Trip terms active', 'Package rules aligned', 'Support lane retained']}
          >
            <div className="ds-hero-panel__content-inner">
              <div className="ds-panel-kicker">Operating posture</div>
              <h2 className="ds-section-title">Trips, packages, and value use the same rules.</h2>
              <p className="ds-copy">
                The network works best when route agreements, payment actions, and support
                escalations all stay inside the same trusted Wasel flow.
              </p>
            </div>
          </MapHeroPanel>
        </div>

        <ActionCards
          items={[
            {
              detail: 'Review how data and route context are handled across the product.',
              icon: <ShieldCheck size={18} />,
              path: '/app/privacy',
              title: 'Open privacy',
            },
            {
              detail: 'Open the live ride flow where route and booking rules apply.',
              icon: <Route size={18} />,
              path: '/app/find-ride',
              title: 'Ride flow',
            },
            {
              detail: 'Open packages and review handoff steps in the live logistics flow.',
              icon: <FileText size={18} />,
              path: '/app/packages',
              title: 'Package flow',
            },
          ]}
          onNavigate={navigate}
        />
      </div>
    </LayoutContainer>
  );
}
