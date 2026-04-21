import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router';
import { useLocalAuth } from './contexts/LocalAuth';
import WaselRoot from './layouts/WaselRoot';
import { buildAuthPagePath } from './utils/authFlow';
import {
  AnalyticsPage,
  AuthPage,
  DriverPage,
  ExecutionPage,
  InnovationPage,
  IntelligencePage,
  LandingPage,
  ModerationPage,
  NotFoundPage,
  NotificationsPage,
  PaymentsPage,
  PlusPage,
  PrivacyPage,
  ProfilePage,
  RouteErrorPage,
  SafetyPage,
  SettingsPage,
  TermsPage,
  TrustPage,
  WalletPage,
} from './app/pages/AppSurfaces';
import { BusPage } from './features/bus/BusPage';
import MobilityPage from './features/mobility-os';
import { PackagesPage } from './features/packages/PackagesPage';
import { FindRidePage } from './features/rides/FindRidePage';
import { OfferRidePage } from './features/rides/OfferRidePage';
import TripsPage from './features/trips/MyTripsPage';
import WaselAuthCallback from './pages/WaselAuthCallback';

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

  return <Navigate replace to={user ? '/app/find-ride' : buildAuthPagePath('signin', '/app/find-ride')} />;
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
    Component: LandingPage,
    errorElement: <RouteErrorBoundary />,
    path: '/',
  },
  {
    Component: WaselRoot,
    errorElement: <RouteErrorBoundary />,
    path: '/app',
    children: [
      { Component: AppEntryRedirect, index: true },
      { Component: AuthPage, path: 'auth' },
      { Component: WaselAuthCallback, path: 'auth/callback' },
      { Component: FindRidePage, path: 'find-ride' },
      { Component: OfferRidePage, path: 'offer-ride' },
      { Component: TripsPage, path: 'my-trips' },
      { Component: PackagesPage, path: 'packages' },
      { Component: BusPage, path: 'bus' },
      { Component: WalletPage, path: 'wallet' },
      { Component: PaymentsPage, path: 'payments' },
      { Component: SettingsPage, path: 'settings' },
      { Component: ProfilePage, path: 'profile' },
      { Component: NotificationsPage, path: 'notifications' },
      { Component: TrustPage, path: 'trust' },
      { Component: SafetyPage, path: 'safety' },
      { Component: PlusPage, path: 'plus' },
      { Component: DriverPage, path: 'driver' },
      { Component: AnalyticsPage, path: 'analytics' },
      { Component: ExecutionPage, path: 'execution-os' },
      { Component: MobilityPage, path: 'mobility-os' },
      { Component: IntelligencePage, path: 'ai-intelligence' },
      { Component: InnovationPage, path: 'innovation-hub' },
      { Component: ModerationPage, path: 'moderation' },
      { Component: PrivacyPage, path: 'privacy' },
      { Component: TermsPage, path: 'terms' },
      { Component: () => <Navigate replace to="/app" />, path: 'dashboard' },
      { Component: () => <Navigate replace to="/app/find-ride" />, path: 'home' },
      { Component: () => <Navigate replace to="/app/offer-ride" />, path: 'post-ride' },
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
