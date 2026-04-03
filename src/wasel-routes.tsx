/**
 * Wasel Router v7.2 — WaselServicePage monolith split into feature files.
 *
 * Changes from v7.1:
 *  - FindRidePage   → src/features/rides/FindRidePage.tsx   (re-exported from WaselServicePage for compatibility)
 *  - OfferRidePage  → src/features/rides/OfferRidePage.tsx  (re-exported)
 *  - BusPage        → src/features/bus/BusPage.tsx
 *  - PackagesPage   → src/features/packages/PackagesPage.tsx (re-exported)
 *  - Shared primitives extracted to src/features/shared/pageShared.tsx
 *  - WaselServicePage.tsx retained as the source of truth for FindRide, OfferRide, Packages
 *    until those are individually migrated; BusPage is now fully standalone.
 */
import { Suspense } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
} from 'react-router';
import WaselRoot from './layouts/WaselRoot';

// ── Page loader fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040C18',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(0,200,232,0.15)',
          borderTop: '3px solid #00C8E8',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function lazy(
  importFn: () => Promise<
    | { default: React.ComponentType<any> }
    | { [key: string]: React.ComponentType<any> }
  >,
  exportName?: string,
) {
  return async () => {
    const mod = (await importFn()) as any;
    const Component = exportName ? mod[exportName] : mod.default;
    return {
      Component: (props: any) => (
        <Suspense fallback={<PageLoader />}>
          <Component {...props} />
        </Suspense>
      ),
    };
  };
}

// ── Utility redirects ─────────────────────────────────────────────────────────
function RedirectTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

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
  '/services/corporate',
  '/services/school',
  '/innovation-hub',
  '/analytics',
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

// ── 404 ───────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040C18',
        color: '#fff',
            fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          marginBottom: 16,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: '#00C8E8',
          fontWeight: 800,
        }}
      >
        404
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>Page not found</h2>
      <p
        style={{
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 24,
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        The page you requested is unavailable or the link is outdated.
      </p>
      <a
        href="/"
        style={{
          padding: '10px 24px',
          borderRadius: 12,
          background: 'linear-gradient(135deg,#00C8E8,#0095B8)',
          color: '#040C18',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Back to Wasel
      </a>
    </div>
  );
}

// ── Route Error Fallback ──────────────────────────────────────────────────────
function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
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
        background: '#040C18',
        color: '#EFF6FF',
        padding: 24,
          fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          borderRadius: 20,
          padding: 28,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(0,200,232,0.14)',
        }}
      >
        <div
          style={{
            fontSize: '0.7rem',
            color: '#00C8E8',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          App Error
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: '1.5rem', lineHeight: 1.2 }}>
          This page could not be loaded.
        </h1>
        <p style={{ color: 'rgba(239,246,255,0.65)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/app/find-ride"
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#00C8E8,#0095B8)',
              color: '#041018',
              textDecoration: 'none',
              fontWeight: 800,
            }}
          >
            Find a Ride
          </a>
          <a
            href="/"
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid rgba(0,200,232,0.22)',
              color: '#EFF6FF',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Route children factory ────────────────────────────────────────────────────
const buildMainChildren = () => [

  // ── Landing ──────────────────────────────────────────────────────────────
  {
    index: true,
    Component: () => <RedirectTo to="/app/find-ride" />,
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  { path: 'auth',          lazy: lazy(() => import('./pages/WaselAuth')) },
  { path: 'auth/callback', lazy: lazy(() => import('./pages/WaselAuthCallback')) },

  // ── Dashboard ────────────────────────────────────────────────────────────
  { path: 'dashboard', Component: () => <RedirectTo to="/app" /> },
  { path: 'home',      Component: () => <RedirectTo to="/app" /> },

  // ── Rides — FindRidePage & OfferRidePage still live in WaselServicePage
  //            until they are individually migrated (they share type Ride and
  //            a lot of internal state logic that benefits from a separate pass).
  { path: 'find-ride',  lazy: lazy(() => import('./features/rides/FindRidePage')) },
  { path: 'offer-ride', lazy: lazy(() => import('./features/rides/OfferRidePage')) },
  { path: 'post-ride',  Component: () => <RedirectTo to="/app/offer-ride" /> },

  // ── My Trips ──────────────────────────────────────────────────────────────
  { path: 'my-trips', lazy: lazy(() => import('./features/trips/MyTripsPage')) },

  // ── Booking Requests ──────────────────────────────────────────────────────
  { path: 'booking-requests', Component: () => <RedirectTo to="/app/my-trips?tab=rides" /> },

  // ── Live Trip ─────────────────────────────────────────────────────────────
  { path: 'live-trip', lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking') },

  // ── Routes / Popular ──────────────────────────────────────────────────────
  { path: 'routes', lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes') },

  // ── Bus — now its own dedicated file ─────────────────────────────────────
  { path: 'bus', lazy: lazy(() => import('./features/bus/BusPage'), 'BusPage') },

  // ── Packages / Awasel — still in WaselServicePage pending migration ───────
  { path: 'packages',     lazy: lazy(() => import('./features/packages/PackagesPage')) },
  { path: 'awasel/send',  Component: () => <RedirectTo to="/app/packages" /> },
  { path: 'awasel/track', Component: () => <RedirectTo to="/app/packages" /> },

  // ── Raje3 Returns ─────────────────────────────────────────────────────────
  { path: 'raje3',          lazy: lazy(() => import('./features/raje3/ReturnMatching')) },
  { path: 'services/raje3', Component: () => <RedirectTo to="/app/raje3" /> },

  // ── B2B / B2S ─────────────────────────────────────────────────────────────
  { path: 'services/corporate', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'services/school',    lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'innovation-hub',     lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'analytics',          lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'mobility-os',        lazy: lazy(() => import('./features/mobility-os')) },
  { path: 'ai-intelligence',    lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },

  // ── Wallet ────────────────────────────────────────────────────────────────
  { path: 'wallet',   lazy: lazy(() => import('./features/wallet'), 'WalletDashboard') },
  { path: 'payments', Component: () => <RedirectTo to="/app/wallet" /> },

  // ── Plus ──────────────────────────────────────────────────────────────────
  { path: 'plus', lazy: lazy(() => import('./features/plus/WaselPlusPage')) },

  // ── Profile ───────────────────────────────────────────────────────────────
  { path: 'profile', lazy: lazy(() => import('./features/profile/ProfilePage')) },

  // ── Settings ──────────────────────────────────────────────────────────────
  { path: 'settings', lazy: lazy(() => import('./features/preferences/SettingsPage')) },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    path: 'notifications',
    lazy: lazy(() => import('./features/notifications/NotificationsPage'), 'NotificationsPage'),
  },

  // ── Trust Center ──────────────────────────────────────────────────────────
  { path: 'trust', lazy: lazy(() => import('./features/trust/TrustCenterPage')) },

  // ── Driver ────────────────────────────────────────────────────────────────
  { path: 'driver', lazy: lazy(() => import('./features/driver/DriverPage')) },

  // ── Safety ────────────────────────────────────────────────────────────────
  { path: 'safety', lazy: lazy(() => import('./features/safety/SafetyPage')) },

  // ── Legal ─────────────────────────────────────────────────────────────────
  { path: 'privacy',        lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy') },
  { path: 'terms',          lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService') },
  { path: 'legal/privacy',  Component: () => <RedirectTo to="/app/privacy" /> },
  { path: 'legal/terms',    Component: () => <RedirectTo to="/app/terms" /> },

  // ── Moderation ────────────────────────────────────────────────────────────
  { path: 'moderation', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  { path: '*', Component: NotFound },
];

const buildLegacyAliases = () =>
  LEGACY_APP_ALIASES.map(path => ({
    path,
    Component: () => <RedirectTo to={`/app${path}`} />,
  }));

// ── Router ────────────────────────────────────────────────────────────────────
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
