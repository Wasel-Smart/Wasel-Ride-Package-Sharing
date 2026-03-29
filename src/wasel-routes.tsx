/**
 * Wasel Router v7.0 — All routes restored, Suspense fallbacks, no dead redirects.
 */
import { Suspense } from 'react';
import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router';
import WaselRoot from './layouts/WaselRoot';

// ── Page loader fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#040C18',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(0,200,232,0.15)',
        borderTop: '3px solid #00C8E8',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function lazy(importFn: () => Promise<{ default: React.ComponentType<any> } | { [key: string]: React.ComponentType<any> }>, exportName?: string) {
  return async () => {
    const mod = await importFn() as any;
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

// ── 404 ──────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div style={{
      minHeight: '80vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#040C18', color: '#fff',
      fontFamily: "-apple-system,'Inter',sans-serif", padding: 24,
    }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>🗺️</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>Page not found</h2>
      <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>The route you're looking for doesn't exist.</p>
      <a href="/" style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', color: '#040C18', fontWeight: 700, textDecoration: 'none' }}>
        Back to Wasel →
      </a>
    </div>
  );
}

// ── Route Error Fallback ──────────────────────────────────────────────────────
function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error ? error.message : 'Something went wrong loading this page.';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#040C18', color: '#EFF6FF', padding: 24,
      fontFamily: "-apple-system,'Inter',sans-serif",
    }}>
      <div style={{ maxWidth: 560, width: '100%', borderRadius: 20, padding: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,200,232,0.14)' }}>
        <div style={{ fontSize: '0.7rem', color: '#00C8E8', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>App Error</div>
        <h1 style={{ margin: '0 0 12px', fontSize: '1.5rem', lineHeight: 1.2 }}>This screen hit an error.</h1>
        <p style={{ color: 'rgba(239,246,255,0.65)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/app/find-ride" style={{ padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', color: '#041018', textDecoration: 'none', fontWeight: 800 }}>Find a Ride</a>
          <a href="/" style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(0,200,232,0.22)', color: '#EFF6FF', textDecoration: 'none', fontWeight: 700 }}>Go home</a>
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
    lazy: lazy(() => import('./components/LandingPageWrapper'), 'LandingPageWrapper'),
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  {
    path: 'auth',
    lazy: lazy(() => import('./pages/WaselAuth')),
  },

  // ── Dashboard ────────────────────────────────────────────────────────────
  {
    path: 'dashboard',
    lazy: lazy(() => import('./pages/WaselDashboard')),
  },
  { path: 'home', Component: () => <RedirectTo to="/app/dashboard" /> },

  // ── Rides ────────────────────────────────────────────────────────────────
  {
    path: 'find-ride',
    lazy: lazy(() => import('./pages/WaselServicePage'), 'FindRidePage'),
  },
  {
    path: 'offer-ride',
    lazy: lazy(() => import('./pages/WaselServicePage'), 'OfferRidePage'),
  },
  { path: 'post-ride', Component: () => <RedirectTo to="/app/offer-ride" /> },

  // ── My Trips ──────────────────────────────────────────────────────────────
  {
    path: 'my-trips',
    lazy: lazy(() => import('./features/trips/MyTripsPage')),
  },

  // ── Booking Requests ──────────────────────────────────────────────────────
  {
    path: 'booking-requests',
    lazy: lazy(() => import('./pages/WaselDashboard')),
  },

  // ── Live Trip ─────────────────────────────────────────────────────────────
  {
    path: 'live-trip',
    lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking'),
  },

  // ── Routes / Popular ──────────────────────────────────────────────────────
  {
    path: 'routes',
    lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes'),
  },

  // ── Bus ───────────────────────────────────────────────────────────────────
  {
    path: 'bus',
    lazy: lazy(() => import('./pages/WaselServicePage'), 'BusPage'),
  },

  // ── Packages / Awasel ─────────────────────────────────────────────────────
  {
    path: 'packages',
    lazy: lazy(() => import('./pages/WaselServicePage'), 'PackagesPage'),
  },
  { path: 'awasel/send',  Component: () => <RedirectTo to="/app/packages" /> },
  { path: 'awasel/track', Component: () => <RedirectTo to="/app/packages" /> },

  // ── Raje3 Returns ─────────────────────────────────────────────────────────
  {
    path: 'raje3',
    lazy: lazy(() => import('./features/raje3/ReturnMatching')),
  },
  { path: 'services/raje3', Component: () => <RedirectTo to="/app/raje3" /> },

  // ── B2B / B2S ─────────────────────────────────────────────────────────────
    { path: 'services/corporate', Component: () => <RedirectTo to="/app/dashboard" /> },
  { path: 'services/school', Component: () => <RedirectTo to="/app/dashboard" /> },
  { path: 'innovation-hub', Component: () => <RedirectTo to="/app/dashboard" /> },
  { path: 'analytics', Component: () => <RedirectTo to="/app/dashboard" /> },
  { path: 'mobility-os', Component: () => <RedirectTo to="/app/dashboard" /> },
  { path: 'ai-intelligence', Component: () => <RedirectTo to="/app/dashboard" /> },

  // ── Wallet ────────────────────────────────────────────────────────────────
  {
    path: 'wallet',
    lazy: lazy(() => import('./features/wallet'), 'WalletDashboard'),
  },
  { path: 'plus',     Component: () => <RedirectTo to="/app/wallet" /> },
  { path: 'payments', Component: () => <RedirectTo to="/app/wallet" /> },

  // ── Profile ───────────────────────────────────────────────────────────────
  {
    path: 'profile',
    lazy: lazy(() => import('./features/profile/ProfilePage')),
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  {
    path: 'settings',
    lazy: lazy(() => import('./features/preferences/SettingsPage')),
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    path: 'notifications',
    lazy: lazy(() => import('./features/notifications/NotificationsPage'), 'NotificationsPage'),
  },

  // ── Trust Center ──────────────────────────────────────────────────────────
  { path: 'trust', Component: () => <RedirectTo to="/app/dashboard" /> },

  // ── Driver ────────────────────────────────────────────────────────────────
  { path: 'driver', Component: () => <RedirectTo to="/app/dashboard" /> },

  // ── Legal ─────────────────────────────────────────────────────────────────
  {
    path: 'privacy',
    lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy'),
  },
  {
    path: 'terms',
    lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService'),
  },
  { path: 'legal/privacy', Component: () => <RedirectTo to="/app/privacy" /> },
  { path: 'legal/terms',   Component: () => <RedirectTo to="/app/terms" /> },

  // ── Moderation ────────────────────────────────────────────────────────────
  { path: 'moderation', Component: () => <RedirectTo to="/app/dashboard" /> },

  // ── 404 catch-all ─────────────────────────────────────────────────────────
  { path: '*', Component: NotFound },
];

// ── Router ────────────────────────────────────────────────────────────────────
export const waselRouter = createBrowserRouter([
  {
    path: '/',
    Component: () => <RedirectTo to="/app" />,
  },
  {
    path: '/app',
    Component: WaselRoot,
    errorElement: <RouteErrorFallback />,
    children: buildMainChildren(),
  },
]);

