import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
  type RouteObject,
} from 'react-router';
import WaselRoot from './layouts/WaselRoot';
import { featureFlags } from './features/core/featureFlags';
import { APP_ROUTES } from './router/paths';
import { NotFoundPage, RouteErrorPage } from './app/pages/AppSurfaces';

const loadLandingPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).LandingPage });
const loadAppEntryPage = async () => ({ Component: (await import('./features/home/AppEntryPage')).default });
const loadAuthPage = async () => ({ Component: (await import('./pages/WaselAuth')).default });
const loadAuthCallbackPage = async () => ({ Component: (await import('./pages/WaselAuthCallback')).default });
const loadFindRidePage = async () => ({ Component: (await import('./features/rides/FindRidePage')).FindRidePage });
const loadRideDetailsPage = async () => ({ Component: (await import('./features/rides/RideDetailsPage')).RideDetailsPage });
const loadOfferRidePage = async () => ({ Component: (await import('./features/rides/OfferRidePage')).OfferRidePage });
const loadTripsPage = async () => ({ Component: (await import('./features/trips/MyTripsPage')).default });
const loadPackagesPage = async () => ({ Component: (await import('./features/packages/PackagesPage')).PackagesPage });
const loadBusPage = async () => ({ Component: (await import('./features/bus/BusPage')).BusPage });
const loadWalletPage = async () => ({ Component: (await import('./features/wallet')).WalletDashboard });
const loadPaymentsPage = async () => ({ Component: (await import('./features/payments/PaymentsPage')).default });
const loadSettingsPage = async () => ({ Component: (await import('./features/preferences/SettingsPage')).default });
const loadPrivacyPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).PrivacyPage });
const loadTermsPage = async () => ({ Component: (await import('./app/pages/AppSurfaces')).TermsPage });

function RouteErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'This page could not be loaded.';

  return <RouteErrorPage message={message} />;
}

const appChildren: RouteObject[] = [
  { lazy: loadAppEntryPage, index: true },
  { lazy: loadAuthPage, path: APP_ROUTES.auth.child },
  { lazy: loadAuthCallbackPage, path: APP_ROUTES.authCallback.child },
  { lazy: loadFindRidePage, path: APP_ROUTES.findRide.child },
  { lazy: loadRideDetailsPage, path: APP_ROUTES.rideDetails.child },
  { lazy: loadOfferRidePage, path: APP_ROUTES.offerRide.child },
  { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.createRide.child },
  { lazy: loadTripsPage, path: APP_ROUTES.myTrips.child },
  { Component: () => <Navigate replace to={APP_ROUTES.myTrips.full} />, path: APP_ROUTES.tripsLegacy.child },
  { lazy: loadPackagesPage, path: APP_ROUTES.packages.child },
  { lazy: loadWalletPage, path: APP_ROUTES.wallet.child },
  { lazy: loadPaymentsPage, path: APP_ROUTES.payments.child },
  { lazy: loadSettingsPage, path: APP_ROUTES.settings.child },
  { lazy: loadPrivacyPage, path: APP_ROUTES.privacy.child },
  { lazy: loadTermsPage, path: APP_ROUTES.terms.child },
  { Component: () => <Navigate replace to={APP_ROUTES.root.full} />, path: APP_ROUTES.dashboard.child },
  { Component: () => <Navigate replace to={APP_ROUTES.root.full} />, path: APP_ROUTES.home.child },
  { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.postRide.child },
  { Component: () => <Navigate replace to={APP_ROUTES.offerRide.full} />, path: APP_ROUTES.newRide.child },
  { Component: () => <Navigate replace to={APP_ROUTES.findRide.full} />, path: APP_ROUTES.routes.child },
  { Component: () => <Navigate replace to={APP_ROUTES.packages.full} />, path: APP_ROUTES.packageDelivery.child },
  { Component: NotFoundPage, path: '*' },
];

if (featureFlags.core.bus === true) {
  appChildren.splice(9, 0, { lazy: loadBusPage, path: APP_ROUTES.bus.child });
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
    children: appChildren,
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.auth.full} />,
    path: '/auth',
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
    Component: () => <Navigate replace to={APP_ROUTES.wallet.full} />,
    path: '/wallet',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.payments.full} />,
    path: '/payments',
  },
  {
    Component: () => <Navigate replace to={APP_ROUTES.settings.full} />,
    path: '/settings',
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
