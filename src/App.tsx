import { Component, useEffect, useRef, type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { WaselStateCard } from './components/system/WaselStateCard';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider, useLocalAuth } from './contexts/LocalAuth';

import { waselRouter } from './router';

import { domainEventBus } from './platform/event-bus';

import { clearBusBookingCache } from './services/bus';
import { startAvailabilityPolling, warmUpServer } from './services/core';

import { clearDemandAlertsCache, hydrateDemandAlerts } from './services/demandCapture';
import { clearGrowthEngineCache } from './services/growthEngine';

import { hydrateConnectedRides } from './services/journeyLogistics';

import {
  clearMembershipCache,
  loadMembershipSnapshot,
} from './services/movementMembership';

import {
  clearRouteRemindersCache,
  hydrateRouteReminders,
} from './services/movementRetention';

import { clearNotificationCache } from './services/notifications';

import { clearRideBookingsCache, hydrateRideBookings } from './services/rideLifecycle';

import { clearSupportTicketCache } from './services/supportInbox';

import {
  hasBackendRuntimeConfig,
  validateRuntimeConfiguration,
} from './utils/env';

import {
  initSentry,
  logger,
  trackDomainEvent,
} from './utils/monitoring';

import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';

import { initPerformanceMonitoring } from './utils/performance';

import { clearAllRuntimeState } from './utils/runtimeStore';

/* -------------------------------------------------------------------------- */
/*                              QUERY CLIENT                                  */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient({
  defaultOptions: DEFAULT_QUERY_OPTIONS,
});

/* -------------------------------------------------------------------------- */
/*                            ERROR BOUNDARY                                 */
/* -------------------------------------------------------------------------- */

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    return {
      hasError: true,
      error: message,
    };
  }

  override componentDidCatch(error: Error, errorInfo: unknown) {
    logger.error('[App Crash]', error, errorInfo);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <WaselStateCard
        eyebrow="App Error"
        title="This page could not be loaded"
        description="An unexpected error occurred while rendering the application."
        tone="danger"
        minHeight="100vh"
        actions={
          <button onClick={() => window.location.reload()}>
            Reload App
          </button>
        }
        footer={
          import.meta.env.DEV ? (
            <code style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error}
            </code>
          ) : (
            'Please reload the app or try again later.'
          )
        }
      />
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                         SESSION CLEANUP                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                      SESSION COORDINATOR                                  */
/* -------------------------------------------------------------------------- */

function AppSessionCoordinator() {
  const { user } = useLocalAuth();

  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = previousUserIdRef.current;

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

    (async () => {
      try {
        await loadMembershipSnapshot(currentUserId);

        const rides = await hydrateConnectedRides(currentUserId);

        await hydrateRideBookings(currentUserId, rides);

        await Promise.all([
          hydrateDemandAlerts(currentUserId),
          hydrateRouteReminders(currentUserId),
        ]);

        if (cancelled) return;
      } catch (error) {
        logger.error('[Session Hydration Failed]', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*                       RUNTIME COORDINATOR                                 */
/* -------------------------------------------------------------------------- */

function AppRuntimeCoordinator() {
  useEffect(() => {
    let stopPolling: (() => void) | undefined;
    let stopEvents: (() => void) | undefined;
    let timeoutId: number | null = null;

    const validation = validateRuntimeConfiguration();
    const hasBackendConfig = hasBackendRuntimeConfig();

    timeoutId = window.setTimeout(() => {
      try {
        initSentry();
        initPerformanceMonitoring();

        validation.issues.forEach(issue => {
          if (issue.severity === 'error') {
            logger.error(issue.message);
          } else {
            logger.warning(issue.message);
          }
        });

        if (hasBackendConfig) {
          void warmUpServer();
          stopPolling = startAvailabilityPolling();
        }

        stopEvents = domainEventBus.subscribeAll(trackDomainEvent);
      } catch (error) {
        logger.error('[Runtime Bootstrap Failed]', error);
      }
    }, 350);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      stopPolling?.();
      stopEvents?.();
    };
  }, []);

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                 APP                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <LocalAuthProvider>
              <AppSessionCoordinator />
              <RouterProvider router={waselRouter} />
              <AppRuntimeCoordinator />
            </LocalAuthProvider>
          </AuthProvider>
        </LanguageProvider>

        <Toaster
          position="bottom-center"
          richColors
          closeButton
        />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}