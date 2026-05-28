import { Component, useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import { WaselStateCard } from './components/system/WaselStateCard';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider, useLocalAuth } from './contexts/LocalAuth';

import { domainEventBus } from './platform/event-bus';
import { clearBusBookingCache } from './services/bus';
import { startAvailabilityPolling, warmUpServer } from './services/core';
import { clearDemandAlertsCache, hydrateDemandAlerts } from './services/demandCapture';
import { clearGrowthEngineCache } from './services/growthEngine';
import { hydrateConnectedRides } from './services/journeyLogistics';
import { clearMembershipCache, loadMembershipSnapshot } from './services/movementMembership';
import {
  clearRouteRemindersCache,
  hydrateRouteReminders,
} from './services/movementRetention';
import { clearNotificationCache } from './services/notifications';
import { clearRideBookingsCache, hydrateRideBookings } from './services/rideLifecycle';
import { clearSupportTicketCache } from './services/supportInbox';
import { hasBackendRuntimeConfig, validateRuntimeConfiguration } from './utils/env';
import { initSentry, logger, trackDomainEvent } from './utils/monitoring';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { initPerformanceMonitoring } from './utils/performance';
import { clearAllRuntimeState } from './utils/runtimeStore';
import { waselRouter } from './router';

const CRASH_ACTION_STYLE = {
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 999,
  border: '1px solid rgba(88,221,255,0.24)',
  background: 'linear-gradient(135deg, rgba(88,221,255,0.18), rgba(71,214,158,0.12))',
  color: '#EEF8FF',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const CRASH_SECONDARY_ACTION_STYLE = {
  ...CRASH_ACTION_STYLE,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/* ---------------------------
   ERROR BOUNDARY
----------------------------*/
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    const ignored = [
      'IframeMessageAbortError',
      'message port was destroyed',
      'Message aborted',
      'setupMessageChannel',
    ];

    if (ignored.some(p => message.includes(p))) {
      return { hasError: false, error: '' };
    }

    return { hasError: true, error: message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <WaselStateCard
        eyebrow="App error"
        title="Wasel hit an unexpected state"
        description="We preserved the shell, but this view failed to render cleanly. Reload the app or jump back to the main route graph."
        tone="danger"
        minHeight="100vh"
        actions={
          <>
            <button onClick={() => window.location.reload()} style={CRASH_ACTION_STYLE}>
              Reload app
            </button>
            <a href="/app" style={CRASH_SECONDARY_ACTION_STYLE}>
              Return home
            </a>
          </>
        }
        footer={
          import.meta.env.DEV ? (
            <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error}
            </code>
          ) : (
            'If this repeats, reopen the flow from the home screen so background services can resync.'
          )
        }
      />
    );
  }
}

/* ---------------------------
   PROVIDERS WRAPPER
----------------------------*/
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <LocalAuthProvider>
          <AppSessionCoordinator />
          {children}
        </LocalAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

function clearOperationalSessionState() {
  clearRideBookingsCache();
  clearMembershipCache();
  clearDemandAlertsCache();
  clearRouteRemindersCache();
  clearGrowthEngineCache();
  clearNotificationCache();
  clearSupportTicketCache();
  clearBusBookingCache();
  clearAllRuntimeState();
}

function AppSessionCoordinator() {
  const { user } = useLocalAuth();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const currentUserId = user?.id ?? null;

    if (!currentUserId) {
      clearOperationalSessionState();
      previousUserIdRef.current = null;
      return;
    }

    if (previousUserId && previousUserId !== currentUserId) {
      clearOperationalSessionState();
    }

    previousUserIdRef.current = currentUserId;

    let cancelled = false;

    const hydrateSessionState = async () => {
      await loadMembershipSnapshot(currentUserId);

      const rides = await hydrateConnectedRides(currentUserId);
      await hydrateRideBookings(currentUserId, rides);

      await Promise.all([
        hydrateDemandAlerts(currentUserId),
        hydrateRouteReminders(currentUserId),
      ]);

      if (cancelled) {
        return;
      }
    };

    void hydrateSessionState();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}

/* ---------------------------
   BACKGROUND BOOTSTRAP (NON-BLOCKING)
   Delay reduced from 1500 ms → 400 ms:
   - Enough to avoid blocking the first meaningful paint
   - Short enough not to miss crash data in the first second
----------------------------*/
function AppRuntimeCoordinator() {
  useEffect(() => {
    let timeoutId: number | null = null;
    let stopPolling: (() => void) | undefined;
    let stopEvents: (() => void) | undefined;
    const validation = validateRuntimeConfiguration();
    const hasBackendConfig = hasBackendRuntimeConfig();
    const suppressedLocalRuntimeKeys = hasBackendConfig
      ? new Set<string>()
      : new Set([
          'VITE_SUPABASE_URL',
          'VITE_SUPABASE_PUBLISHABLE_KEY',
          'VITE_API_URL',
        ]);

    timeoutId = window.setTimeout(() => {
      try {
        initSentry();
        initPerformanceMonitoring();

        validation.issues.forEach(issue => {
          if (suppressedLocalRuntimeKeys.has(issue.key)) {
            return;
          }

          if (issue.severity === 'error') {
            logger.error(issue.message);
          } else {
            logger.warning(issue.message);
          }
        });

        if (hasBackendConfig) {
          // warmUpServer guard in core.ts prevents a true double-call;
          // calling here ensures the coordinator owns the retry lifecycle.
          void warmUpServer();
          stopPolling = startAvailabilityPolling();
        }

        stopEvents = domainEventBus.subscribeAll(trackDomainEvent);
      } catch (error) {
        console.warn('[Runtime bootstrap failed]', error);
      }
    }, 400);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      stopPolling?.();
      stopEvents?.();
    };
  }, []);

  return null;
}

/* ---------------------------
   QUERY CLIENT (stable instance)
----------------------------*/
const queryClient = new QueryClient({
  defaultOptions: DEFAULT_QUERY_OPTIONS,
});

/* ---------------------------
   ROUTER (isolated from providers)
----------------------------*/
const Router = () => <RouterProvider router={waselRouter} />;

/* ---------------------------
   APP
----------------------------*/
export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Providers */}
        <AppProviders>
          {/* Router stays stable → fixes navigation lag */}
          <Router />
          <AppRuntimeCoordinator />
        </AppProviders>

        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'rgba(7,21,33,0.96)',
              border: '1px solid rgba(88,221,255,0.22)',
              borderRadius: '18px',
              color: '#EFF6FF',
              boxShadow: '0 18px 40px rgba(0,0,0,0.34)',
              fontFamily: "'Plus Jakarta Sans', 'Cairo', 'Tajawal', 'Inter', sans-serif",
            },
          }}
        />
        <Analytics />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
