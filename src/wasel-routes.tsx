/**
 * Wasel Router v7.3 — WaselServicePage monolith fully split into feature files.
 *
 * Changes from v7.2:
 *  - FindRidePage   → src/features/rides/FindRidePage.tsx   (fully migrated)
 *  - OfferRidePage  → src/features/rides/OfferRidePage.tsx  (fully migrated)
 *  - BusPage        → src/features/bus/BusPage.tsx
 *  - PackagesPage   → src/features/packages/PackagesPage.tsx (fully migrated)
 *  - Shared primitives extracted to src/features/shared/pageShared.tsx
 *  - WaselServicePage.tsx now a compatibility barrel only (re-exports from feature files)
 */
import React, { memo, Suspense, useEffect } from 'react';
import { AlertTriangle, LoaderCircle, SearchX } from 'lucide-react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useLocation,
  useRouteError,
  type RouteObject,
} from 'react-router';
import { Button } from './components/ui/button';
import { WaselStateCard } from './components/system/WaselStateCard';
import { useLanguage } from './contexts/LanguageContext';
import { normalizePathname } from './hooks/useIframeSafeNavigate';
import { routeFallback } from './locales/chunks/routeFallback';
import WaselRoot from './layouts/WaselRoot';
import ProtectedOutlet from './router/ProtectedOutlet';

const PageLoader = memo(() => {
  const { language } = useLanguage();
  const copy = routeFallback[language];

  return (
    <WaselStateCard
      eyebrow={copy.routeFallback_loading_eyebrow}
      title={copy.routeFallback_loading_title}
      description={copy.routeFallback_loading_description}
      icon={LoaderCircle}
      loading
      minHeight="60vh"
    />
  );
});

function lazy(
  importFn: () => Promise<Record<string, React.ComponentType<Record<string, unknown>>>>,
  exportName?: string,
) {
  return async () => {
    const mod = await importFn();
    const Component = (exportName ? mod[exportName] : mod.default) as React.ComponentType<
      Record<string, unknown>
    >;
    return {
      Component: memo((props: Record<string, unknown>) => (
        <Suspense fallback={<PageLoader />}>
          <Component {...props} />
        </Suspense>
      )),
    };
  };
}

// ── Utility redirects ─────────────────────────────────────────────────────────
const RedirectTo = memo(({ to }: { to: string }) => <Navigate to={to} replace />);

const NotFound = memo(() => {
  const { language } = useLanguage();
  const copy = routeFallback[language];

  return (
    <WaselStateCard
      eyebrow="404"
      title={copy.routeFallback_404_title}
      description={copy.routeFallback_404_description}
      icon={SearchX}
      minHeight="80vh"
      actions={
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <a href="/">{copy.routeFallback_back_to_wasel}</a>
        </Button>
      }
    />
  );
});

/**
 * Last-resort guard for legacy bare paths (`/bus`, `/find-ride`, …).
 *
 * The whole app is mounted under `/app/...`, but nav config, marketing CTAs and
 * external deep links still carry the old bare form. Any of those that reach the
 * router without passing through `useIframeSafeNavigate` used to fall through to
 * a 404 "App Error" screen, which reads to the user as "the app is not
 * responding". This maps them back into the mounted namespace instead.
 */
const LegacyPathRedirect = memo(() => {
  const location = useLocation();
  const target = normalizePathname(location.pathname);

  if (target !== location.pathname) {
    return <Navigate to={`${target}${location.search}`} replace />;
  }

  return <NotFound />;
});

const isInvalidHookCallError = (message: string): boolean =>
  /invalid hook call/i.test(message);

const RouteErrorFallback = memo(() => {
  const { language } = useLanguage();
  const copy = routeFallback[language];
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : copy.routeFallback_error_default_message;

  const isHookError = isInvalidHookCallError(message);

  useEffect(() => {
    if (!isHookError) {
      return;
    }

    const timer = setTimeout(() => {
      const hardRecover = (window as unknown as { waselHardRecover?: () => void }).waselHardRecover;
      if (typeof hardRecover === 'function') {
        hardRecover();
      } else {
        window.location.reload();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isHookError]);

  return (
    <WaselStateCard
      eyebrow={copy.routeFallback_error_eyebrow}
      title={copy.routeFallback_error_title}
      description={message}
      icon={AlertTriangle}
      tone="danger"
      minHeight="100vh"
      actions={
        <>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <a href="/app/find-ride">{copy.routeFallback_find_ride}</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <a href="/">{copy.routeFallback_go_home}</a>
          </Button>
        </>
      }
      footer={isHookError ? copy.routeFallback_hook_footer : copy.routeFallback_reload_footer}
    />
  );
});

// ── Route children factory ────────────────────────────────────────────────────
const buildMainChildren = (): RouteObject[] => [
  // ── Landing ──────────────────────────────────────────────────────────────
  {
    index: true,
    lazy: lazy(() => import('./features/home/HomePage'), 'HomePage'),
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  { path: 'auth', lazy: lazy(() => import('./pages/WaselAuth')) },
  { path: 'auth/callback', lazy: lazy(() => import('./pages/WaselAuthCallback')) },

  // ── Dashboard ────────────────────────────────────────────────────────────
  { path: 'dashboard', Component: () => <RedirectTo to="/app" /> },
  { path: 'home', Component: () => <RedirectTo to="/app" /> },

  {
    Component: ProtectedOutlet,
    children: [
      { path: 'find-ride', lazy: lazy(() => import('./features/rides/FindRidePage')) },
      { path: 'offer-ride', lazy: lazy(() => import('./features/rides/OfferRidePage')) },
      { path: 'post-ride', Component: () => <RedirectTo to="/app/offer-ride" /> },
      { path: 'my-trips', lazy: lazy(() => import('./features/trips/MyTripsPage')) },
      { path: 'booking-requests', Component: () => <RedirectTo to="/app/my-trips?tab=rides" /> },
      {
        path: 'live-trip',
        lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking'),
      },
    ],
  },

// ── Rides — FindRidePage & OfferRidePage fully migrated to feature files

  // ── My Trips ──────────────────────────────────────────────────────────────

  // ── Booking Requests ──────────────────────────────────────────────────────

  // ── Live Trip ─────────────────────────────────────────────────────────────

  // ── Routes / Popular ──────────────────────────────────────────────────────
  { path: 'routes', lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes') },

  {
    Component: ProtectedOutlet,
    children: [
      { path: 'bus', lazy: lazy(() => import('./features/bus/BusPage'), 'BusPage') },
      // Cross-service timeline (rides, packages, buses, scheduled pickups).
      // The /app/activity/* subpaths below are the paths src/config/
      // navigation-structure.ts advertises; they resolve to the pages that
      // actually own each surface.
      { path: 'activity', lazy: lazy(() => import('./features/activity/ActivityPage'), 'ActivityPage') },
      { path: 'activity/trips', Component: () => <RedirectTo to="/app/my-trips" /> },
      { path: 'activity/packages', Component: () => <RedirectTo to="/app/packages" /> },
      { path: 'activity/wallet', Component: () => <RedirectTo to="/app/wallet" /> },
      // Primary bottom-nav tab for every signed-in user (see CORE_NAV_ITEMS) —
      // must NOT sit behind `operations:read`.
      { path: 'mobility-os', lazy: lazy(() => import('./features/mobility-os')) },
      { path: 'packages', lazy: lazy(() => import('./features/packages/PackagesPage')) },
      { path: 'awasel/send', Component: () => <RedirectTo to="/app/packages" /> },
      { path: 'awasel/track', Component: () => <RedirectTo to="/app/packages" /> },
      { path: 'raje3', lazy: lazy(() => import('./features/raje3/ReturnMatching')) },
      { path: 'services/raje3', Component: () => <RedirectTo to="/app/raje3" /> },
    ],
  },

  // ── Bus — now its own dedicated file ─────────────────────────────────────

  // ── Packages / Awasel — fully migrated to feature files

  // ── Raje3 Returns ─────────────────────────────────────────────────────────

  // ── B2B / B2S / Ops ──────────────────────────────────────────────────────
  // Each surface below is gated by its own permission — do not collapse
  // these back into one shared ProtectedOutlet, since roles differ per path
  // (e.g. a 'corporate' user must not reach 'moderation').
   {
    element: <ProtectedOutlet require="corporate:read" />,
    children: [
      {
        path: 'services/corporate',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="school:read" />,
    children: [
      {
        path: 'services/school',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="operations:read" />,
    children: [
      {
        path: 'innovation-hub',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      {
        path: 'ai-intelligence',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="analytics:read" />,
    children: [
      {
        path: 'analytics',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="trust:moderate" />,
    children: [
      {
        path: 'moderation',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  } as unknown as RouteObject,
  // ── Admin ────────────────────────────────────────────────────────
  // Gated per-surface by the canonical RBAC permissions, not by a single
  // blanket admin check: `finance`/`support` hold users:read but not
  // users:write, and `trust` holds disputes:write. Collapsing these into
  // one `config:write` guard would hide surfaces those roles legitimately
  // own — and expose write actions they must not reach.
  {
    element: <ProtectedOutlet require="users:read" />,
    children: [
      {
        path: 'admin/users',
        lazy: lazy(() => import('./features/admin/AdminUsersPage'), 'AdminUsersPage'),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="disputes:read" />,
    children: [
      {
        path: 'admin/disputes',
        lazy: lazy(() => import('./features/admin/AdminDisputesPage'), 'AdminDisputesPage'),
      },
    ],
  } as unknown as RouteObject,
  {
    element: <ProtectedOutlet require="config:write" />,
    children: [
      {
        path: 'admin',
        lazy: lazy(() => import('./features/admin/AdminDashboardPage'), 'AdminDashboardPage'),
      },
    ],
  } as unknown as RouteObject,

  // ── Wallet ────────────────────────────────────────────────────────────────
  {
    Component: ProtectedOutlet,
    children: [
      { path: 'wallet', lazy: lazy(() => import('./features/wallet'), 'WalletDashboard') },
      { path: 'payments', Component: () => <RedirectTo to="/app/wallet" /> },
      { path: 'plus', lazy: lazy(() => import('./features/plus/WaselPlusPage')) },
      { path: 'profile', lazy: lazy(() => import('./features/profile/ProfilePage')) },
      { path: 'settings', lazy: lazy(() => import('./features/preferences/SettingsPage')) },
      {
        path: 'notifications',
        lazy: lazy(() => import('./features/notifications/NotificationsPage'), 'NotificationsPage'),
      },
      { path: 'trust', lazy: lazy(() => import('./features/trust/TrustCenterPage')) },
      { path: 'driver', lazy: lazy(() => import('./features/driver/DriverPage')) },
      { path: 'safety', lazy: lazy(() => import('./features/safety/SafetyPage')) },
      { path: 'schedule', lazy: lazy(() => import('./features/schedule/SchedulePage'), 'SchedulePage') },
    ],
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  { path: 'privacy', lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy') },
  { path: 'terms', lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService') },
  { path: 'security', lazy: lazy(() => import('./features/legal/SecurityPage'), 'SecurityPage') },
  { path: 'support', lazy: lazy(() => import('./features/support/SupportPage')) },
  { path: 'legal/privacy', Component: () => <RedirectTo to="/app/privacy" /> },
  { path: 'legal/terms', Component: () => <RedirectTo to="/app/terms" /> },

  // ── Error pages ────────────────────────────────────────────────────────────
  { path: '403', lazy: lazy(() => import('./pages/ForbiddenPage').then(m => ({ Component: m.ForbiddenPage }))) },
  { path: '500', lazy: lazy(() => import('./pages/ServerErrorPage').then(m => ({ Component: m.ServerErrorPage }))) },
  { path: 'auth404', Component: () => <RedirectTo to="/app/auth" /> },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  { path: '*', Component: NotFound },
];

// ── Router ────────────────────────────────────────────────────────────────────
export const waselRouter = createBrowserRouter([
  {
    path: '/',
    Component: () => <RedirectTo to="/app" />,
    hydrateFallbackElement: <PageLoader />,
    errorElement: <RouteErrorFallback />,
  },
  {
    path: '/trust',
    Component: WaselRoot,
    hydrateFallbackElement: <PageLoader />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, lazy: lazy(() => import('./features/legal/TrustLandingPage'), 'TrustCenterPage') },
    ],
  },
  { path: '/security', Component: () => <RedirectTo to="/app/security" /> },
  {
    path: '/app',
    Component: WaselRoot,
    hydrateFallbackElement: <PageLoader />,
    errorElement: <RouteErrorFallback />,
    children: buildMainChildren() as unknown as RouteObject[],
  },
  // Declared last for readability only. React Router ranks matches by route
  // specificity, not array position, so this catch-all can never shadow /app
  // or /trust regardless of where it sits.
  {
    path: '*',
    Component: LegacyPathRedirect,
  },
] as unknown as RouteObject[]);
