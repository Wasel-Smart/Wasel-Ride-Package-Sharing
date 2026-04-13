/* eslint-disable react-refresh/only-export-components */
import { Suspense, type ComponentType } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
} from 'react-router';
import { useLocalAuth } from './contexts/LocalAuth';
import WaselRoot from './layouts/WaselRoot';
import { buildAuthPagePath } from './utils/authFlow';

type RouteComponent = ComponentType<Record<string, unknown>>;
type LazyModule = {
  default?: RouteComponent;
} & Record<string, unknown>;

/* ─────────────────────────────────────────────────────────────────────────
   Shared token — avoids repeating the full font-stack string everywhere
───────────────────────────────────────────────────────────────────────── */
const SHELL_FONT =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

/* ─────────────────────────────────────────────────────────────────────────
   PageLoader
   · CSS-variable backgrounds → works in light + dark themes
   · prefers-reduced-motion safe
   · role="status" + aria-label for screen readers
───────────────────────────────────────────────────────────────────────── */
function PageLoader() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background, #040C18)',
      }}
    >
      <div
        role="status"
        aria-label="Loading page"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid var(--border, rgba(71,183,230,0.15))',
          borderTop: '3px solid var(--primary, #47B7E6)',
          animation: 'wasel-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes wasel-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [role="status"][aria-label="Loading page"] {
            animation: none;
            border-top-color: var(--primary, #47B7E6);
            opacity: 0.55;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   lazy() — wraps a dynamic import and attaches Suspense
───────────────────────────────────────────────────────────────────────── */
function lazy(
  importFn: () => Promise<LazyModule>,
  exportName?: string,
) {
  return async () => {
    const mod = await importFn();
    const candidate = exportName ? mod[exportName] : mod.default;
    const Component =
      typeof candidate === 'function'
        ? (candidate as RouteComponent)
        : PageLoader;

    return {
      Component: (props: Record<string, unknown>) => (
        <Suspense fallback={<PageLoader />}>
          <Component {...props} />
        </Suspense>
      ),
    };
  };
}

function RedirectTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

function AppEntryRedirect() {
  const { user, loading } = useLocalAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? '/app/find-ride' : buildAuthPagePath('signin')} replace />;
}

/* ─────────────────────────────────────────────────────────────────────────
   Legacy alias redirects — keeps old bookmarked URLs alive
───────────────────────────────────────────────────────────────────────── */
const LEGACY_APP_ALIASES = [
  '/auth',
  '/dashboard',
  '/home',
  '/find-ride',
  '/offer-ride',
  '/post-ride',
  '/my-trips',
  '/booking-requests',
  '/live-trip',
  '/routes',
  '/bus',
  '/packages',
  '/awasel/send',
  '/awasel/track',
  '/raje3',
  '/services/raje3',
  '/innovation-hub',
  '/analytics',
  '/execution-os',
  '/mobility-os',
  '/ai-intelligence',
  '/wallet',
  '/plus',
  '/payments',
  '/profile',
  '/settings',
  '/notifications',
  '/trust',
  '/driver',
  '/privacy',
  '/terms',
  '/legal/privacy',
  '/legal/terms',
  '/moderation',
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   App lazy routes
   Each route now has its own purpose-built page component.
   The three previously shared OperationsOverviewPage stubs (analytics,
   ai-intelligence, moderation) are now dedicated production pages.
───────────────────────────────────────────────────────────────────────── */
const APP_LAZY_ROUTES = [
  { path: 'auth',               lazy: lazy(() => import('./pages/WaselAuth')) },
  { path: 'auth/callback',      lazy: lazy(() => import('./pages/WaselAuthCallback')) },
  { path: 'find-ride',          lazy: lazy(() => import('./features/rides/FindRidePage')) },
  { path: 'offer-ride',         lazy: lazy(() => import('./features/rides/OfferRidePage')) },
  { path: 'my-trips',           lazy: lazy(() => import('./features/trips/MyTripsPage')) },
  { path: 'live-trip',          lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking') },
  { path: 'routes',             lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes') },
  { path: 'bus',                lazy: lazy(() => import('./features/bus/BusPage'), 'BusPage') },
  { path: 'packages',           lazy: lazy(() => import('./features/packages/PackagesPage')) },
  { path: 'raje3',              lazy: lazy(() => import('./features/raje3/ReturnMatching')) },
  { path: 'innovation-hub',     lazy: lazy(() => import('./features/innovation/InnovationHubPage')) },
  // ── Dedicated analytics dashboard (was: OperationsOverviewPage stub) ──
  { path: 'analytics',          lazy: lazy(() => import('./features/operations/AnalyticsPage')) },
  { path: 'execution-os',       lazy: lazy(() => import('./features/operations/ExecutionOSPage')) },
  { path: 'mobility-os',        lazy: lazy(() => import('./features/mobility-os')) },
  // ── Dedicated AI intelligence page (was: OperationsOverviewPage stub) ─
  { path: 'ai-intelligence',    lazy: lazy(() => import('./features/operations/AIIntelligencePage')) },
  { path: 'wallet',             lazy: lazy(() => import('./features/wallet'), 'WalletDashboard') },
  { path: 'payments',           lazy: lazy(() => import('./features/payments/PaymentsPage')) },
  { path: 'plus',               lazy: lazy(() => import('./features/plus/WaselPlusPage')) },
  { path: 'profile',            lazy: lazy(() => import('./features/profile/ProfilePage')) },
  { path: 'settings',           lazy: lazy(() => import('./features/preferences/SettingsPage')) },
  { path: 'notifications',      lazy: lazy(() => import('./features/notifications/NotificationsPage'), 'NotificationsPage') },
  { path: 'trust',              lazy: lazy(() => import('./features/trust/TrustCenterPage')) },
  { path: 'driver',             lazy: lazy(() => import('./features/driver/DriverPage')) },
  { path: 'safety',             lazy: lazy(() => import('./features/safety/SafetyPage')) },
  { path: 'privacy',            lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy') },
  { path: 'terms',              lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService') },
  // ── Dedicated moderation page (was: OperationsOverviewPage stub) ──────
  { path: 'moderation',         lazy: lazy(() => import('./features/operations/ModerationPage')) },
] as const;

const APP_REDIRECT_ROUTES = [
  { path: 'dashboard',        to: '/app' },
  { path: 'home',             to: '/app' },
  { path: 'post-ride',        to: '/app/offer-ride' },
  { path: 'booking-requests', to: '/app/my-trips?tab=rides' },
  { path: 'awasel/send',      to: '/app/packages' },
  { path: 'awasel/track',     to: '/app/packages' },
  { path: 'services/raje3',   to: '/app/raje3' },
  { path: 'services/corporate', to: '/app/find-ride' },
  { path: 'services/school',    to: '/app/find-ride' },
  { path: 'legal/privacy',    to: '/app/privacy' },
  { path: 'legal/terms',      to: '/app/terms' },
] as const;

/* ─────────────────────────────────────────────────────────────────────────
   NotFound (404)
   · CSS-variable-driven so both themes are correct
   · role="alert" + aria-labelledby for screen readers
   · All touch targets are min 44px (WCAG 2.1 AA)
   · Proper <h1> heading hierarchy
───────────────────────────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background, #040C18)',
        color: 'var(--foreground, #EFF6FF)',
        fontFamily: SHELL_FONT,
        padding: '24px 16px',
        textAlign: 'center',
      }}
    >
      <div
        role="alert"
        aria-labelledby="nf-title"
        style={{ maxWidth: 480, width: '100%' }}
      >
        <p
          aria-hidden="true"
          style={{
            fontSize: '0.72rem',
            marginBottom: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--primary, #47B7E6)',
            fontWeight: 800,
          }}
        >
          404
        </p>
        <h1
          id="nf-title"
          style={{
            fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
            fontWeight: 900,
            margin: '0 0 10px',
            color: 'var(--foreground, #EFF6FF)',
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            color: 'var(--muted-foreground, rgba(239,246,255,0.55))',
            marginBottom: 24,
            lineHeight: 1.65,
            fontSize: '0.92rem',
            maxWidth: 380,
            marginInline: 'auto',
          }}
        >
          The page you requested is unavailable or the link may be outdated.
        </p>
        <nav
          aria-label="Recovery options"
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <a
            href="/"
            style={{
              padding: '0 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary, #47B7E6), #1E5FAE)',
              color: 'var(--primary-foreground, #040C18)',
              fontWeight: 700,
              textDecoration: 'none',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: SHELL_FONT,
            }}
          >
            Back to Wasel
          </a>
          <a
            href="/app/find-ride"
            style={{
              padding: '0 24px',
              borderRadius: 12,
              border: '1px solid var(--border, rgba(71,183,230,0.22))',
              color: 'var(--foreground, #EFF6FF)',
              fontWeight: 700,
              textDecoration: 'none',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: SHELL_FONT,
            }}
          >
            Find a ride
          </a>
        </nav>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   RouteErrorFallback
   · Shown by React Router when a route loader/action throws
   · Same theme-aware treatment as NotFound
   · Surfaces the error message to help debugging
───────────────────────────────────────────────────────────────────────── */
function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'This page could not be loaded.';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--background, #040C18)',
        color: 'var(--foreground, #EFF6FF)',
        padding: '24px 16px',
        fontFamily: SHELL_FONT,
      }}
    >
      <div
        role="alert"
        aria-labelledby="err-title"
        style={{
          maxWidth: 560,
          width: '100%',
          borderRadius: 20,
          padding: 28,
          background: 'var(--card, rgba(11,33,53,0.88))',
          border: '1px solid var(--border, rgba(71,183,230,0.14))',
        }}
      >
        <p
          aria-hidden="true"
          style={{
            fontSize: '0.7rem',
            color: 'var(--primary, #47B7E6)',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          App error
        </p>
        <h1
          id="err-title"
          style={{ margin: '0 0 12px', fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', lineHeight: 1.2 }}
        >
          This page could not be loaded
        </h1>
        <p
          style={{
            color: 'var(--muted-foreground, rgba(239,246,255,0.65))',
            marginBottom: 20,
            lineHeight: 1.65,
            fontSize: '0.92rem',
          }}
        >
          {message}
        </p>
        <nav
          aria-label="Recovery options"
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
        >
          <a
            href="/app/find-ride"
            style={{
              padding: '0 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--primary, #47B7E6), #1E5FAE)',
              color: 'var(--primary-foreground, #041018)',
              textDecoration: 'none',
              fontWeight: 800,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: SHELL_FONT,
            }}
          >
            Find a ride
          </a>
          <a
            href={buildAuthPagePath('signin')}
            style={{
              padding: '0 18px',
              borderRadius: 12,
              border: '1px solid var(--border, rgba(255,255,255,0.12))',
              color: 'var(--foreground, #EFF6FF)',
              textDecoration: 'none',
              fontWeight: 700,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: SHELL_FONT,
            }}
          >
            Sign in
          </a>
          <a
            href="/"
            style={{
              padding: '0 18px',
              borderRadius: 12,
              border: '1px solid rgba(71,183,230,0.22)',
              color: 'var(--foreground, #EFF6FF)',
              textDecoration: 'none',
              fontWeight: 700,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontFamily: SHELL_FONT,
            }}
          >
            Go home
          </a>
        </nav>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Route tree helpers
───────────────────────────────────────────────────────────────────────── */
const buildMainChildren = () => [
  { index: true, Component: AppEntryRedirect },
  ...APP_LAZY_ROUTES,
  ...APP_REDIRECT_ROUTES.map((route) => ({
    path: route.path,
    Component: () => <RedirectTo to={route.to} />,
  })),
  { path: '*', Component: NotFound },
];

const buildLegacyAliases = () =>
  LEGACY_APP_ALIASES.map((path) => ({
    path,
    Component: () => <RedirectTo to={`/app${path}`} />,
  }));

/* ─────────────────────────────────────────────────────────────────────────
   Router
───────────────────────────────────────────────────────────────────────── */
export const waselRouter = createBrowserRouter([
  { path: '/', lazy: lazy(() => import('./features/home/AppEntryPage')) },
  ...buildLegacyAliases(),
  {
    path: '/app',
    Component: WaselRoot,
    errorElement: <RouteErrorFallback />,
    children: buildMainChildren(),
  },
  {
    path: '*',
    Component: NotFound,
    errorElement: <RouteErrorFallback />,
  },
]);
