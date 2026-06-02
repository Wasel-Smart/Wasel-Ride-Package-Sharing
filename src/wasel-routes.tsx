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
import { AlertTriangle, LoaderCircle, SearchX } from 'lucide-react';
import { createBrowserRouter, isRouteErrorResponse, Navigate, useRouteError } from 'react-router';
import { Button } from './components/ui/button';
import { WaselStateCard } from './components/system/WaselStateCard';
import { useLanguage } from './contexts/LanguageContext';
import WaselRoot from './layouts/WaselRoot';
import ProtectedOutlet from './router/ProtectedOutlet';

// ── Page loader fallback ──────────────────────────────────────────────────────
function PageLoader() {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <WaselStateCard
      eyebrow={ar ? 'تحميل' : 'Loading'}
      title={ar ? 'نفتح شاشة واصل التالية' : 'Opening the next Wasel view'}
      description={
        ar
          ? 'نجهز المسار ونحمل بيانات الشاشة ونستعيد آخر سياق لك.'
          : 'We are preparing the route, loading the screen data, and restoring your last context.'
      }
      icon={LoaderCircle}
      loading
      minHeight="60vh"
    />
  );
}

function lazy(
  importFn: () => Promise<
    { default: React.ComponentType<any> } | { [key: string]: React.ComponentType<any> }
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
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <WaselStateCard
      eyebrow="404"
      title={ar ? 'الصفحة غير موجودة' : 'Page not found'}
      description={
        ar
          ? 'الصفحة المطلوبة غير متاحة أو أن الرابط قديم.'
          : 'The page you requested is unavailable or the link is outdated.'
      }
      icon={SearchX}
      minHeight="80vh"
      actions={
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <a href="/">{ar ? 'العودة إلى واصل' : 'Back to Wasel'}</a>
        </Button>
      }
    />
  );
}

// ── Route Error Fallback ──────────────────────────────────────────────────────
function RouteErrorFallback() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : ar
        ? 'تعذر تحميل هذه الصفحة.'
        : 'This page could not be loaded.';

  return (
    <WaselStateCard
      eyebrow={ar ? 'خطأ في التطبيق' : 'App Error'}
      title={ar ? 'تعذر تحميل هذه الصفحة' : 'This page could not be loaded'}
      description={message}
      icon={AlertTriangle}
      tone="danger"
      minHeight="var(--app-min-height)"
      actions={
        <>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <a href="/app/find-ride">{ar ? 'ابحث عن مشوار' : 'Find a ride'}</a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <a href="/">{ar ? 'العودة للرئيسية' : 'Go home'}</a>
          </Button>
        </>
      }
      footer={
        ar
          ? 'إذا تكرر هذا، فأعد تحميل التطبيق أو افتح التدفق مرة أخرى من الشاشة الرئيسية.'
          : 'If this repeats, reload the app shell or reopen the flow from the home screen.'
      }
    />
  );
}

// ── Route children factory ────────────────────────────────────────────────────
const buildMainChildren = () => [
  // ── Landing ──────────────────────────────────────────────────────────────
  {
    index: true,
    lazy: lazy(() => import('./features/home/HomePage'), 'HomePage'),
  },

  // ── Auth ─────────────────────────────────────────────────────────────────
  { path: 'auth', lazy: lazy(() => import('./pages/WaselAuth')) },
  { path: 'auth/callback', lazy: lazy(() => import('./pages/WaselAuthCallback')) },

  // ── Dashboard ────────────────────────────────────────────────────────────
  { path: 'dashboard', Component: () => <RedirectTo to="/app" /> },
  { path: 'home', Component: () => <RedirectTo to="/app" /> },

  {
    Component: ProtectedOutlet,
    children: [
      { path: 'find-ride', lazy: lazy(() => import('./features/rides/FindRidePage')) },
      { path: 'offer-ride', lazy: lazy(() => import('./features/rides/OfferRidePage')) },
      { path: 'post-ride', Component: () => <RedirectTo to="/app/offer-ride" /> },
      { path: 'my-trips', lazy: lazy(() => import('./features/trips/MyTripsPage')) },
      { path: 'booking-requests', Component: () => <RedirectTo to="/app/my-trips?tab=rides" /> },
      {
        path: 'live-trip',
        lazy: lazy(() => import('./components/LiveTripTracking'), 'LiveTripTracking'),
      },
    ],
  },

  // ── Rides — FindRidePage & OfferRidePage still live in WaselServicePage
  //            until they are individually migrated (they share type Ride and
  //            a lot of internal state logic that benefits from a separate pass).

  // ── My Trips ──────────────────────────────────────────────────────────────

  // ── Booking Requests ──────────────────────────────────────────────────────

  // ── Live Trip ─────────────────────────────────────────────────────────────

  // ── Routes / Popular ──────────────────────────────────────────────────────
  { path: 'routes', lazy: lazy(() => import('./components/PopularRoutes'), 'PopularRoutes') },

  {
    Component: ProtectedOutlet,
    children: [
      { path: 'bus', lazy: lazy(() => import('./features/bus/BusPage'), 'BusPage') },
      { path: 'packages', lazy: lazy(() => import('./features/packages/PackagesPage')) },
      { path: 'awasel/send', Component: () => <RedirectTo to="/app/packages" /> },
      { path: 'awasel/track', Component: () => <RedirectTo to="/app/packages" /> },
      { path: 'raje3', lazy: lazy(() => import('./features/raje3/ReturnMatching')) },
      { path: 'services/raje3', Component: () => <RedirectTo to="/app/raje3" /> },
    ],
  },

  // ── Bus — now its own dedicated file ─────────────────────────────────────

  // ── Packages / Awasel — still in WaselServicePage pending migration ───────

  // ── Raje3 Returns ─────────────────────────────────────────────────────────

  // ── B2B / B2S / Ops ──────────────────────────────────────────────────────
  {
    Component: ProtectedOutlet,
    children: [
      {
        path: 'services/corporate',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      {
        path: 'services/school',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      {
        path: 'innovation-hub',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      {
        path: 'analytics',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      { path: 'mobility-os', lazy: lazy(() => import('./features/mobility-os')) },
      {
        path: 'ai-intelligence',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
      {
        path: 'moderation',
        lazy: lazy(() => import('./features/operations/OperationsOverviewPage')),
      },
    ],
  },

  // ── Wallet ────────────────────────────────────────────────────────────────

  // ── Plus ──────────────────────────────────────────────────────────────────

  // ── Profile ───────────────────────────────────────────────────────────────

  // ── Settings ──────────────────────────────────────────────────────────────

  // ── Notifications ─────────────────────────────────────────────────────────

  // ── Trust Center ──────────────────────────────────────────────────────────

  // ── Driver ────────────────────────────────────────────────────────────────

  // ── Safety ────────────────────────────────────────────────────────────────

  {
    Component: ProtectedOutlet,
    children: [
      { path: 'wallet', lazy: lazy(() => import('./features/wallet'), 'WalletDashboard') },
      { path: 'payments', Component: () => <RedirectTo to="/app/wallet" /> },
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
    ],
  },

  // ── Legal ─────────────────────────────────────────────────────────────────
  { path: 'privacy', lazy: lazy(() => import('./features/legal/PrivacyPolicy'), 'PrivacyPolicy') },
  { path: 'terms', lazy: lazy(() => import('./features/legal/TermsOfService'), 'TermsOfService') },
  { path: 'legal/privacy', Component: () => <RedirectTo to="/app/privacy" /> },
  { path: 'legal/terms', Component: () => <RedirectTo to="/app/terms" /> },

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
