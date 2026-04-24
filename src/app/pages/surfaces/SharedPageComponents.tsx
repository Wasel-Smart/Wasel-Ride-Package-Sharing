/**
 * Shared presentational components used across page surfaces.
 *
 * All primitives here are stateless and receive everything via props.
 * No service calls, no route hooks — pure rendering only.
 */
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ChevronRight, Landmark, Mail, Phone, Shield, Sparkles } from 'lucide-react';
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
  return (
    <LayoutContainer>
      <div className="ds-page">
        <div className="ds-page__header">
          <h1 className="ds-title">Page not found</h1>
          <p className="ds-copy">The link may be outdated or the page no longer exists.</p>
          <div className="ds-minor-actions">
            <a className="ds-button" data-variant="primary" href="/">
              Back to Wasel
            </a>
            <a className="ds-button" data-variant="secondary" href="/app/find-ride">
              Find a ride
            </a>
          </div>
        </div>
      </div>
    </LayoutContainer>
  );
}

export function RouteErrorPage({ message }: { message: string }) {
  return (
    <LayoutContainer>
      <div className="ds-page">
        <div className="ds-page__header">
          <h1 className="ds-title">This page could not be loaded</h1>
          <p className="ds-copy">{message}</p>
          <div className="ds-minor-actions">
            <a className="ds-button" data-variant="primary" href="/app/find-ride">
              Find a ride
            </a>
            <a className="ds-button" data-variant="secondary" href="/app/auth">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </LayoutContainer>
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
      </div>
    </LayoutContainer>
  );
}
