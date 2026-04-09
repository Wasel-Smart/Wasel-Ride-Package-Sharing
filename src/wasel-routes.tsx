import { Suspense } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
} from 'react-router';
import { useLocalAuth } from './contexts/LocalAuth';
import WaselRoot from './layouts/WaselRoot';
import { buildAuthPagePath } from './utils/authFlow';

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
          border: '3px solid rgba(22,199,242,0.15)',
          borderTop: '3px solid #16C7F2',
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

function RedirectTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

function AppEntryRedirect() {
  const { user, loading } = useLocalAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? '/app/find-ride' : buildAuthPagePath('signin')} replace />;
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

const APP_LAZY_ROUTES = [
  { path: 'auth', lazy: lazy(() => import('./pages/WaselAuth')) },
  { path: 'auth/callback', lazy: lazy(() => import('./pages/WaselAuthCallback')) },
  { path: 'find-ride', lazy: lazy(() => import('./features/rides/FindRidePage')) },
  { path: 'offer-ride', lazy: lazy(() => import('./features/rides/OfferRidePage')) },
  { path: 'my-trips', lazy: lazy(() => import('./features/trips/MyTripsPage')) },
  { path: 'live-trip', lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking') },
  { path: 'routes', lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes') },
  { path: 'bus', lazy: lazy(() => import('./features/bus/BusPage'), 'BusPage') },
  { path: 'packages', lazy: lazy(() => import('./features/packages/PackagesPage')) },
  { path: 'raje3', lazy: lazy(() => import('./features/raje3/ReturnMatching')) },
  { path: 'services/corporate', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'services/school', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'innovation-hub', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'analytics', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'mobility-os', lazy: lazy(() => import('./features/mobility-os')) },
  { path: 'ai-intelligence', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
  { path: 'wallet', lazy: lazy(() => import('./features/wallet'), 'WalletDashboard') },
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
  { path: 'privacy', lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy') },
  { path: 'terms', lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService') },
  { path: 'moderation', lazy: lazy(() => import('./features/operations/OperationsOverviewPage')) },
] as const;

const APP_REDIRECT_ROUTES = [
  { path: 'dashboard', to: '/app' },
  { path: 'home', to: '/app' },
  { path: 'post-ride', to: '/app/offer-ride' },
  { path: 'booking-requests', to: '/app/my-trips?tab=rides' },
  { path: 'awasel/send', to: '/app/packages' },
  { path: 'awasel/track', to: '/app/packages' },
  { path: 'services/raje3', to: '/app/raje3' },
  { path: 'payments', to: '/app/wallet' },
  { path: 'legal/privacy', to: '/app/privacy' },
  { path: 'legal/terms', to: '/app/terms' },
] as const;

function NotFound() {
  return (
    <div
      role="alert"
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
      <div style={{ fontSize: '0.75rem', marginBottom: 16, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#16C7F2', fontWeight: 800 }}>
        404
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>Page not found</h2>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 24, maxWidth: 420, textAlign: 'center' }}>
        The page you requested is unavailable or the link is outdated.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/" style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#16C7F2,#0F78BF)', color: '#040C18', fontWeight: 700, textDecoration: 'none' }}>
          Back to Wasel
        </a>
        <a href="/app/find-ride" style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(22,199,242,0.22)', color: '#EFF6FF', fontWeight: 700, textDecoration: 'none' }}>
          Open Find ride
        </a>
      </div>
    </div>
  );
}

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
      <div style={{ maxWidth: 560, width: '100%', borderRadius: 20, padding: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(22,199,242,0.14)' }}>
        <div style={{ fontSize: '0.7rem', color: '#16C7F2', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          App Error
        </div>
        <h1 style={{ margin: '0 0 12px', fontSize: '1.5rem', lineHeight: 1.2 }}>This page could not be loaded.</h1>
        <p style={{ color: 'rgba(239,246,255,0.65)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/app/find-ride" style={{ padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#16C7F2,#0F78BF)', color: '#041018', textDecoration: 'none', fontWeight: 800 }}>
            Find a Ride
          </a>
          <a href={buildAuthPagePath('signin')} style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', color: '#EFF6FF', textDecoration: 'none', fontWeight: 700 }}>
            Sign in
          </a>
          <a href="/" style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(22,199,242,0.22)', color: '#EFF6FF', textDecoration: 'none', fontWeight: 700 }}>
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

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
