/**
 * WASEL ROUTER - 10/10 UX VERSION
 *
 * Complete reorganization with:
 * - 4 main tabs (Home, Rides, Activity, Account)
 * - Progressive feature disclosure
 * - Smart routing based on user level
 * - Context-aware navigation
 *
 * Based on best practices from Uber, Airbnb, WhatsApp
 */

import { createBrowserRouter, Navigate } from 'react-router';
import { Suspense, lazy } from 'react';
import { LoaderCircle } from 'lucide-react';

// Lazy load components
const WorldClassHomePage = lazy(() => import('./features/home/WorldClassHomePage'));
const WorldClassAuthPage = lazy(() => import('./pages/WorldClassAuthPage'));
const SimpleFindRidePage = lazy(() => import('./features/rides/SimpleFindRidePage'));
const SimpleOfferRidePage = lazy(() => import('./features/rides/SimpleOfferRidePage'));

// Existing pages (to be gradually migrated)
const WaselRoot = lazy(() => import('./layouts/WaselRoot'));
const WaselAuthCallback = lazy(() => import('./pages/WaselAuthCallback'));
const MyTripsPage = lazy(() => import('./features/trips/MyTripsPage'));
const WalletDashboard = lazy(() => import('./features/wallet'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('./features/preferences/SettingsPage'));
const PackagesPage = lazy(() => import('./features/packages/PackagesPage'));
const BusPage = lazy(() => import('./features/bus/BusPage'));

// Loading fallback
function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0B1D2D 0%, #051218 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <LoaderCircle
          size={48}
          color="#00C8E8"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '16px', color: '#94A3B8' }}>Loading...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Wrapper for lazy loaded components
function lazyLoad(Component: React.LazyExoticComponent<any>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

/**
 * MAIN ROUTER CONFIGURATION
 *
 * Structure:
 * / - Landing/Home
 * /app - Main app shell
 *   /app - Home (dashboard)
 *   /app/rides - Rides hub
 *     /app/rides/find - Find rides
 *     /app/rides/offer - Offer rides
 *     /app/rides/my-rides - My rides
 *   /app/activity - Activity hub
 *     /app/activity/trips - All trips
 *     /app/activity/packages - Packages
 *     /app/activity/wallet - Wallet
 *   /app/account - Account hub
 *     /app/account/profile - Profile
 *     /app/account/settings - Settings
 *     /app/account/help - Help
 *   /app/auth - Authentication
 *   /app/auth/callback - OAuth callback
 */

export const worldClassRouter = createBrowserRouter([
  // Landing page
  {
    path: '/',
    element: lazyLoad(WorldClassHomePage),
  },

  // Main app
  {
    path: '/app',
    element: lazyLoad(WaselRoot),
    children: [
      // Home/Dashboard
      {
        index: true,
        element: lazyLoad(WorldClassHomePage),
      },

      // RIDES HUB
      {
        path: 'rides',
        children: [
          {
            index: true,
            element: <Navigate to="/app/rides/find" replace />,
          },
          {
            path: 'find',
            element: lazyLoad(SimpleFindRidePage),
          },
          {
            path: 'offer',
            element: lazyLoad(SimpleOfferRidePage),
          },
          {
            path: 'my-rides',
            element: <Navigate to="/app/activity/trips?filter=rides" replace />,
          },
        ],
      },

      // ACTIVITY HUB
      {
        path: 'activity',
        children: [
          {
            index: true,
            element: <Navigate to="/app/activity/trips" replace />,
          },
          {
            path: 'trips',
            element: lazyLoad(MyTripsPage),
          },
          {
            path: 'packages',
            element: lazyLoad(PackagesPage),
          },
          {
            path: 'wallet',
            element: lazyLoad(WalletDashboard),
          },
        ],
      },

      // ACCOUNT HUB
      {
        path: 'account',
        children: [
          {
            index: true,
            element: <Navigate to="/app/account/profile" replace />,
          },
          {
            path: 'profile',
            element: lazyLoad(ProfilePage),
          },
          {
            path: 'settings',
            element: lazyLoad(SettingsPage),
          },
          {
            path: 'help',
            element: <Navigate to="/app/account/settings" replace />, // Temp redirect
          },
        ],
      },

      // TRANSPORT (Progressive - unlocked after first ride)
      {
        path: 'transport',
        children: [
          {
            index: true,
            element: <Navigate to="/app/transport/bus" replace />,
          },
          {
            path: 'bus',
            element: lazyLoad(BusPage),
          },
        ],
      },

      // Legacy redirects for backward compatibility
      {
        path: 'find-ride',
        element: <Navigate to="/app/rides/find" replace />,
      },
      {
        path: 'offer-ride',
        element: <Navigate to="/app/rides/offer" replace />,
      },
      {
        path: 'my-trips',
        element: <Navigate to="/app/activity/trips" replace />,
      },
      {
        path: 'packages',
        element: <Navigate to="/app/activity/packages" replace />,
      },
      {
        path: 'wallet',
        element: <Navigate to="/app/activity/wallet" replace />,
      },
      {
        path: 'profile',
        element: <Navigate to="/app/account/profile" replace />,
      },
      {
        path: 'settings',
        element: <Navigate to="/app/account/settings" replace />,
      },
      {
        path: 'bus',
        element: <Navigate to="/app/transport/bus" replace />,
      },
    ],
  },

  // Authentication
  {
    path: '/app/auth',
    element: lazyLoad(WorldClassAuthPage),
  },
  {
    path: '/app/auth/callback',
    element: lazyLoad(WaselAuthCallback),
  },

  // Legacy auth redirects
  {
    path: '/auth',
    element: <Navigate to="/app/auth" replace />,
  },
  {
    path: '/auth/callback',
    element: <Navigate to="/app/auth/callback" replace />,
  },

  // 404 - Redirect to home
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
]);

/**
 * NAVIGATION HELPER FUNCTIONS
 */

// Get appropriate home route based on user state
export function getHomeRoute(user: any): string {
  if (!user) return '/app';

  // If user has active trip, go to trips
  if (user.hasActiveTrip) return '/app/activity/trips';

  // Default to home
  return '/app';
}

// Get appropriate rides route based on user level
export function getRidesRoute(userLevel: string): string {
  if (userLevel === 'new') return '/app/rides/find';
  return '/app/rides';
}

// Check if feature is unlocked for user
export function isFeatureUnlocked(featureId: string, userLevel: string): boolean {
  const featureGates: Record<string, string[]> = {
    'rides-find': ['new', 'beginner', 'intermediate', 'expert'],
    'rides-offer': ['beginner', 'intermediate', 'expert'],
    packages: ['beginner', 'intermediate', 'expert'],
    transport: ['intermediate', 'expert'],
    analytics: ['expert'],
  };

  return featureGates[featureId]?.includes(userLevel) ?? false;
}

export default worldClassRouter;
