import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router';
import { useLocalAuth } from './contexts/LocalAuth';
import WaselRoot from './layouts/WaselRoot';
import { buildAuthPagePath } from './utils/authFlow';
import { APP_ROUTES } from './router/paths';
import {
  NotFoundPage,
  RouteErrorPage,
} from './app/pages/AppSurfaces';

const loadLandingPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).LandingPage });
const loadAuthPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).AuthPage });
const loadFindRidePage = async () => ({ Component: (await import('./features/rides/FindRidePage')).FindRidePage });
const loadRideDetailsPage = async () => ({ Component: (await import('./features/rides/RideDetailsPage')).RideDetailsPage });
const loadOfferRidePage = async () => ({ Component: (await import('./features/rides/OfferRidePage')).OfferRidePage });
const loadTripsPage = async () => ({ Component: (await import('./features/trips/MyTripsPage')).default });
const loadPackagesPage = async () => ({ Component: (await import('./features/packages/PackagesPage')).PackagesPage });
const loadBusPage = async () => ({ Component: (await import('./features/bus/BusPage')).BusPage });
const loadWalletPage = async () => ({ Component: (await import('./features/wallet')).WalletDashboard });
const loadPaymentsPage = async () => ({ Component: (await import('./features/payments/PaymentsPage')).default });
const loadSettingsPage = async () => ({ Component: (await import('./features/preferences/SettingsPage')).default });
const loadProfilePage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).ProfilePage });
const loadNotificationsPage = async () => ({ Component: (await import('./features/notifications/NotificationsPage')).NotificationsPage });
const loadTrustPage = async () => ({ Component: (await import('./features/trust/TrustCenterPage')).default });
const loadSafetyPage = async () => ({ Component: (await import('./features/safety/SafetyPage')).default });
const loadPlusPage = async () => ({ Component: (await import('./features/plus/WaselPlusPage')).default });
const loadDriverPage = async () => ({ Component: (await import('./features/driver/DriverPage')).default });
const loadAnalyticsPage = async () => ({ Component: (await import('./features/operations/AnalyticsPage')).default });
const loadExecutionPage = async () => ({ Component: (await import('./features/operations/ExecutionOSPage')).default });
const loadMobilityPage = async () => ({ Component: (await import('./features/mobility-os')).default });
const loadIntelligencePage = async () => ({ Component: (await import('./features/operations/AIIntelligencePage')).default });
const loadInnovationPage = async () => ({ Component: (await import('./features/innovation/InnovationHubPage')).default });
const loadModerationPage = async () => ({ Component: (await import('./features/operations/ModerationPage')).default });
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
      to={
        user
          ? APP_ROUTES.findRide.full
          : buildAuthPagePath('signin', APP_ROUTES.findRide.full)
      }
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
    path: APP_ROUTES.root.full,
    children: [
      { Component: AppEntryRedirect, index: true },
      { lazy: loadAuthPage, path: APP_ROUTES.auth.child },
      { lazy: loadAuthCallbackPage, path: APP_ROUTES.authCallback.child },
      { lazy: loadFindRidePage, path: APP_ROUTES.findRide.child },
      { lazy: loadRideDetailsPage, path: APP_ROUTES.rideDetails.child },
      { lazy: loadOfferRidePage, path: APP_ROUTES.offerRide.child },
      { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.createRide.child },
      { lazy: loadTripsPage, path: APP_ROUTES.myTrips.child },
      { Component: () => <Navigate replace to={APP_ROUTES.myTrips.full} />, path: APP_ROUTES.tripsLegacy.child },
      { lazy: loadPackagesPage, path: APP_ROUTES.packages.child },
      { lazy: loadBusPage, path: APP_ROUTES.bus.child },
      { lazy: loadWalletPage, path: APP_ROUTES.wallet.child },
      { lazy: loadPaymentsPage, path: APP_ROUTES.payments.child },
      { lazy: loadSettingsPage, path: APP_ROUTES.settings.child },
      { lazy: loadProfilePage, path: APP_ROUTES.profile.child },
      { lazy: loadNotificationsPage, path: APP_ROUTES.notifications.child },
      { lazy: loadTrustPage, path: APP_ROUTES.trust.child },
      { lazy: loadSafetyPage, path: APP_ROUTES.safety.child },
      { lazy: loadPlusPage, path: APP_ROUTES.plus.child },
      { lazy: loadDriverPage, path: APP_ROUTES.driver.child },
      { lazy: loadAnalyticsPage, path: APP_ROUTES.analytics.child },
      { lazy: loadExecutionPage, path: APP_ROUTES.executionOs.child },
      { lazy: loadMobilityPage, path: APP_ROUTES.mobilityOs.child },
      { lazy: loadIntelligencePage, path: APP_ROUTES.aiIntelligence.child },
      { lazy: loadInnovationPage, path: APP_ROUTES.innovationHub.child },
      { lazy: loadModerationPage, path: APP_ROUTES.moderation.child },
      { lazy: loadPrivacyPage, path: APP_ROUTES.privacy.child },
      { lazy: loadTermsPage, path: APP_ROUTES.terms.child },
      { Component: () => <Navigate replace to={APP_ROUTES.root.full} />, path: APP_ROUTES.dashboard.child },
      { Component: () => <Navigate replace to={APP_ROUTES.findRide.full} />, path: APP_ROUTES.home.child },
      { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.postRide.child },
      { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.newRide.child },
      { Component: () => <Navigate replace to={APP_ROUTES.findRide.full} />, path: APP_ROUTES.routes.child },
      { Component: () => <Navigate replace to={APP_ROUTES.packages.full} />, path: APP_ROUTES.packageDelivery.child },
      { Component: NotFoundPage, path: '*' },
    ],
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.auth.full} />,
    path: '/auth',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.analytics.full} />,
    path: '/analytics',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />,
    path: '/create-ride',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />,
    path: '/new-ride',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.executionOs.full} />,
    path: '/execution-os',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.mobilityOs.full} />,
    path: '/mobility-os',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.aiIntelligence.full} />,
    path: '/ai-intelligence',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.wallet.full} />,
    path: '/wallet',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.payments.full} />,
    path: '/payments',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.profile.full} />,
    path: '/profile',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.settings.full} />,
    path: '/settings',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.notifications.full} />,
    path: '/notifications',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.trust.full} />,
    path: '/trust',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.driver.full} />,
    path: '/driver',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.privacy.full} />,
    path: '/privacy',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.terms.full} />,
    path: '/terms',
  },
  {
    Component: NotFoundPage,
    errorElement: <RouteErrorBoundary />,
    path: '*',
  },
]);
