/**
 * Legacy route map kept for reference only.
 *
 * Active production routing now lives in `src/wasel-routes.tsx`
 * and is mounted from `src/App.tsx`.
 *
 * Keep this file out of new routing work unless the app is intentionally
 * migrated back to this route tree.
 */

import { createBrowserRouter } from 'react-router';
import { lazy, Suspense } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// EAGER IMPORTS (Critical Path)
// ══════════════════════════════════════════════════════════════════════════════

import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { LandingLayout } from '../layouts/LandingLayout';
import { LandingPageWrapper } from '../components/LandingPageWrapper';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { HomePage } from '../features/home/HomePage';
import { EnhancedAuthPage } from '../features/auth/EnhancedAuthPage';
import { OAuthCallback } from '../components/OAuthCallback';
import { AuthFix } from '../components/AuthFix';
import { ProductionLoader } from '../components/ProductionLoader';
import { MainLogoShowcase } from '../features/branding/MainLogoShowcase';

// ═════════════════════════════════════════════════════════════════════════════
// LAZY IMPORTS (Code Splitting)
// ══════════════════════════════════════════════════════════════════════════════

// Carpooling
const SearchRides = lazy(() => import('../features/carpooling/SearchRidesV2').then(m => ({ default: m.SearchRides })));
const PostRide = lazy(() => import('../features/carpooling/PostRideV2').then(m => ({ default: m.PostRide })));
const MyTrips = lazy(() => import('../components/MyTrips').then(m => ({ default: m.MyTrips })));
const RideDetails = lazy(() => import('../features/carpooling/RideDetails').then(m => ({ default: m.RideDetails })));

// Awasel
const SendPackage = lazy(() => import('../features/awasel/SendPackage').then(m => ({ default: m.SendPackage })));
const AvailablePackages = lazy(() => import('../features/awasel/AvailablePackages').then(m => ({ default: m.AvailablePackages })));

// Notifications
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

// Services
const MobilityServices = lazy(() => import('../features/services/MobilityServices').then(m => ({ default: m.MobilityServices })));

// Intelligence
const PlatformIntelligence = lazy(() => import('../features/intelligence/PlatformIntelligence').then(m => ({ default: m.PlatformIntelligence })));
const MobilityOSSimulation = lazy(() => import('../features/common/ComingSoonEnhanced').then(m => ({ default: m.ComingSoonEnhanced })));
const MobilityOSLive = lazy(() => import('../features/common/ComingSoonEnhanced').then(m => ({ default: m.ComingSoonEnhanced })));
const MobilityOSEnhanced = lazy(() => import('../features/common/ComingSoonEnhanced').then(m => ({ default: m.ComingSoonEnhanced })));

// Messages
const MessagesPage = lazy(() => import('../features/messages/MessagesPage').then(m => ({ default: m.MessagesPage })));

// Wallet
const WalletPage = lazy(() => import('../features/wallet/WalletDashboard').then(m => ({ default: m.WalletDashboard })));

// Services - NEW
const WaselBus = lazy(() => import('../features/services/WaselBus').then(m => ({ default: m.WaselBus })));
// On-demand mode removed permanently

// Profile
const UserProfile = lazy(() => import('../features/profile/UserProfile').then(m => ({ default: m.UserProfile })));

// Settings & Favorites
const Settings = lazy(() => import('../components/Settings').then(m => ({ default: m.Settings })));
const Favorites = lazy(() => import('../components/Favorites').then(m => ({ default: m.Favorites })));

// Legal
const PrivacyPolicy = lazy(() => import('../features/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('../features/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));

// Common
const NotFound = lazy(() => import('../features/common/NotFound').then(m => ({ default: m.NotFound })));
const ComingSoon = lazy(() => import('../features/common/ComingSoonEnhanced').then(m => ({ default: m.ComingSoonEnhanced })));

// NEW - Simplified Interface
const SimplifiedHomePage = lazy(async () => ({ default: HomePage }));
const ServiceEngineDemo = lazy(() => import('../features/admin/ServiceEngineDemo').then(m => ({ default: m.ServiceEngineDemo })));
const LogoShowcase = lazy(() => import('../features/branding/LogoShowcase').then(m => ({ default: m.LogoShowcase })));

// ══════════════════════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ══════════════════════════════════════════════════════════════════════════════

const PageLoader = () => <ProductionLoader />;

// ═════════════════════════════════════════════════════════════════════════════
// ROUTER CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const router = createBrowserRouter([
  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES (No Sidebar)
  // ────────────────────────────────────────────────────────────────────────────
  
  // Landing Page
  {
    path: '/',
    element: <LandingLayout />,
    children: [
      { index: true, element: <LandingPageWrapper /> },
    ],
  },

  // Auth Pages
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { index: true, element: <EnhancedAuthPage /> },
      { path: 'login', element: <EnhancedAuthPage /> },
      { path: 'signup', element: <EnhancedAuthPage /> },
      { path: 'callback', element: <OAuthCallback /> },
      { path: 'fix', element: <AuthFix /> },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // SIMPLIFIED INTERFACE ROUTES (NEW)
  // ────────────────────────────────────────────────────────────────────────────
  {
    path: '/simple',
    element: <LandingLayout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<PageLoader />}>
            <SimplifiedHomePage />
          </Suspense>
        ) 
      },
    ],
  },
  {
    path: '/demo',
    element: <RootLayout />,
    children: [
      { 
        index: true, 
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ServiceEngineDemo />
            </Suspense>
          </ProtectedRoute>
        ) 
      },
    ],
  },
  {
    path: '/logo',
    element: <LandingLayout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<PageLoader />}>
            <MainLogoShowcase />
          </Suspense>
        ) 
      },
    ],
  },
  {
    path: '/logo-old',
    element: <LandingLayout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<PageLoader />}>
            <LogoShowcase />
          </Suspense>
        ) 
      },
    ],
  },
  {
    path: '/logo-demo',
    element: <MainLogoShowcase />,
  },

  // ────────────────────────────────────────────────────────────────────────────
  // MOBILITY OS — FULLSCREEN (No sidebar, no header shell)
  // ────────────────────────────────────────────────────────────────────────────
  {
    path: '/mobility-os',
    element: (
      <Suspense fallback={<PageLoader />}>
        <MobilityOSEnhanced />
      </Suspense>
    ),
  },
  {
    path: '/mobility-os-classic',
    element: (
      <Suspense fallback={<PageLoader />}>
        <MobilityOSLive />
      </Suspense>
    ),
  },
  
  // ────────────────────────────────────────────────────────────────────────────
  // APP ROUTES (With Sidebar) - ALL /app/* PATHS
  // ───────────────────────────────────────────────────────────────────────────
  {
    path: '/app',
    element: <RootLayout />,
    children: [
      // ── Home ──
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      
      // ── Carpooling ──
      {
        path: 'find-ride',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SearchRides />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'search',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SearchRides />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      // ── Ride Details ──
      {
        path: 'rides/:id',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <RideDetails />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'offer-ride',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <PostRide />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'post',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <PostRide />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'my-trips',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MyTrips />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Messages (Coming Soon) ──
      {
        path: 'messages',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MessagesPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'badges',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Awasel (Package Delivery) ──
      {
        path: 'awasel/send',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <SendPackage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'awasel/browse',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AvailablePackages />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'awasel/my-packages',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <AvailablePackages />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'awasel/track',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Account & Settings ──
      {
        path: 'referrals',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'wallet',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <WalletPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <NotificationsPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'favorites',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Favorites />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <Settings />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Cultural Features ──
      {
        path: 'cultural/prayer-stops',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'cultural/gender-preferences',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'cultural/ramadan-mode',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Help & Support ──
      {
        path: 'safety',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'routes',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'cost-calculator',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'how-it-works',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'help',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── AI & Intelligence ──
      {
        path: 'ask-wasel',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'corridor-ai',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ComingSoon />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'core',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <PlatformIntelligence />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'simulation',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MobilityOSSimulation />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'live',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MobilityOSLive />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'enhanced',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MobilityOSEnhanced />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Services ──
      {
        path: 'wasel-bus',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <WaselBus />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'services/mobility-os',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <MobilityServices />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'services/on-demand-rides',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <WaselBus />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Profile ──
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <UserProfile />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      
      // ── Legal ──
      {
        path: 'legal/privacy',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PrivacyPolicy />
          </Suspense>
        ),
      },
      {
        path: 'legal/terms',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TermsOfService />
          </Suspense>
        ),
      },
      
      // ── 404 ──
      {
        path: '*',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ROOT /home REDIRECT (For Authenticated Users)
  // ──────────────────────────────────────────────────────────────────────────
  {
    path: '/home',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // FALLBACK 404
  // ────────────────────────────────────────────────────────────────────────────
  {
    path: '*',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },
]);

console.log('[Routes] ✅ All routes configured successfully');
