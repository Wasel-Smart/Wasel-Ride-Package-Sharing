import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router';
import { useLocalAuth } from './contexts/LocalAuth';
import WaselRoot from './layouts/WaselRoot';
import { buildAuthPagePath } from './utils/authFlow';
import {
  NotFoundPage,
  RouteErrorPage,
} from './app/pages/AppSurfaces';

const loadLandingPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).LandingPage });
const loadAuthPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).AuthPage });
const loadFindRidePage = async () => ({ Component: (await import('./features/rides/FindRidePage')).FindRidePage });
const loadOfferRidePage = async () => ({ Component: (await import('./features/rides/OfferRidePage')).OfferRidePage });
const loadTripsPage = async () => ({ Component: (await import('./features/trips/MyTripsPage')).default });
const loadPackagesPage = async () => ({ Component: (await import('./features/packages/PackagesPage')).PackagesPage });
const loadBusPage = async () => ({ Component: (await import('./features/bus/BusPage')).BusPage });
const loadWalletPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).WalletPage });
const loadPaymentsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).PaymentsPage });
const loadSettingsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).SettingsPage });
const loadProfilePage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).ProfilePage });
const loadNotificationsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).NotificationsPage });
const loadTrustPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).TrustPage });
const loadSafetyPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).SafetyPage });
const loadPlusPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).PlusPage });
const loadDriverPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).DriverPage });
const loadAnalyticsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).AnalyticsPage });
const loadExecutionPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).ExecutionPage });
const loadMobilityPage = async () => ({ Component: (await import('./features/mobility-os')).default });
const loadIntelligencePage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).IntelligencePage });
const loadInnovationPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).InnovationPage });
const loadModerationPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).ModerationPage });
const loadPrivacyPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).PrivacyPage });
const loadTermsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).TermsPage });
const loadAuthCallbackPage = async () => ({ Component: (await import('./pages/WaselAuthCallback')).default });

function AppEntryRedirect() {
  const { loading, user } = useLocalAuth();

  if (loading) {
    return (
      <div className="ds-page">
        <div className="ds-container">
          <div className="ds-card">
            <h1 className="ds-section-title">Loading Wasel</h1>
            <p className="ds-copy ds-copy--tight">Preparing the next route.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Navigate
      replace
      to={user ? '/app/find-ride' : buildAuthPagePath('signin', '/app/find-ride')}
    />
  );
}

function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'This page could not be loaded.';

  return <RouteErrorPage message={message} />;
}

export const waselRouter = createBrowserRouter([
  {
    errorElement: <RouteErrorBoundary />,
    lazy: loadLandingPage,
    path: '/',
  },
  {
    Component: WaselRoot,
    errorElement: <RouteErrorBoundary />,
    path: '/app',
    children: [
      { Component: AppEntryRedirect, index: true },
      { lazy: loadAuthPage, path: 'auth' },
      { lazy: loadAuthCallbackPage, path: 'auth/callback' },
      { lazy: loadFindRidePage, path: 'find-ride' },
      { lazy: loadOfferRidePage, path: 'offer-ride' },
      { Component: () => <Navigate replace to="/app/offer-ride" />, path: 'create-ride' },
      { lazy: loadTripsPage, path: 'my-trips' },
      { lazy: loadPackagesPage, path: 'packages' },
      { lazy: loadBusPage, path: 'bus' },
      { lazy: loadWalletPage, path: 'wallet' },
      { lazy: loadPaymentsPage, path: 'payments' },
      { lazy: loadSettingsPage, path: 'settings' },
      { lazy: loadProfilePage, path: 'profile' },
      { lazy: loadNotificationsPage, path: 'notifications' },
      { lazy: loadTrustPage, path: 'trust' },
      { lazy: loadSafetyPage, path: 'safety' },
      { lazy: loadPlusPage, path: 'plus' },
      { lazy: loadDriverPage, path: 'driver' },
      { lazy: loadAnalyticsPage, path: 'analytics' },
      { lazy: loadExecutionPage, path: 'execution-os' },
      { lazy: loadMobilityPage, path: 'mobility-os' },
      { lazy: loadIntelligencePage, path: 'ai-intelligence' },
      { lazy: loadInnovationPage, path: 'innovation-hub' },
      { lazy: loadModerationPage, path: 'moderation' },
      { lazy: loadPrivacyPage, path: 'privacy' },
      { lazy: loadTermsPage, path: 'terms' },
      { Component: () => <Navigate replace to="/app" />, path: 'dashboard' },
      { Component: () => <Navigate replace to="/app/find-ride" />, path: 'home' },
      { Component: () => <Navigate replace to="/app/offer-ride" />, path: 'post-ride' },
      { Component: () => <Navigate replace to="/app/offer-ride" />, path: 'new-ride' },
      { Component: () => <Navigate replace to="/app/find-ride" />, path: 'routes' },
      { Component: () => <Navigate replace to="/app/packages" />, path: 'package-delivery' },
      { Component: NotFoundPage, path: '*' },
    ],
  },
  {
    Component: () => <Navigate replace to="/app/auth" />,
    path: '/auth',
  },
  {
    Component: () => <Navigate replace to="/app/analytics" />,
    path: '/analytics',
  },
  {
    Component: () => <Navigate replace to="/app/offer-ride" />,
    path: '/create-ride',
  },
  {
    Component: () => <Navigate replace to="/app/offer-ride" />,
    path: '/new-ride',
  },
  {
    Component: () => <Navigate replace to="/app/execution-os" />,
    path: '/execution-os',
  },
  {
    Component: () => <Navigate replace to="/app/mobility-os" />,
    path: '/mobility-os',
  },
  {
    Component: () => <Navigate replace to="/app/ai-intelligence" />,
    path: '/ai-intelligence',
  },
  {
    Component: () => <Navigate replace to="/app/wallet" />,
    path: '/wallet',
  },
  {
    Component: () => <Navigate replace to="/app/payments" />,
    path: '/payments',
  },
  {
    Component: () => <Navigate replace to="/app/profile" />,
    path: '/profile',
  },
  {
    Component: () => <Navigate replace to="/app/settings" />,
    path: '/settings',
  },
  {
    Component: () => <Navigate replace to="/app/notifications" />,
    path: '/notifications',
  },
  {
    Component: () => <Navigate replace to="/app/trust" />,
    path: '/trust',
  },
  {
    Component: () => <Navigate replace to="/app/driver" />,
    path: '/driver',
  },
  {
    Component: () => <Navigate replace to="/app/privacy" />,
    path: '/privacy',
  },
  {
    Component: () => <Navigate replace to="/app/terms" />,
    path: '/terms',
  },
  {
    Component: NotFoundPage,
    errorElement: <RouteErrorBoundary />,
    path: '*',
  },
]);
