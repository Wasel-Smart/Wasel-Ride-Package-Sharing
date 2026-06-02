import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider } from './contexts/LocalAuth';

import { domainEventBus } from './platform/event-bus';
import { queryClient } from './lib/queryClient';
import { validateRuntimeConfiguration } from './utils/env';
import { waselRouter } from './router';
import { initSentry, logger, trackDomainEvent } from './utils/monitoring';
import { startAvailabilityPolling, warmUpServer } from './services/core';

/* ---------------------------
   PROVIDERS WRAPPER
----------------------------*/
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <LocalAuthProvider>{children}</LocalAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

/* ---------------------------
   BACKGROUND BOOTSTRAP (NON-BLOCKING)
----------------------------*/
function AppRuntimeCoordinator() {
  useEffect(() => {
    let cancelled = false;
    let stopPolling: (() => void) | undefined;
    let stopEvents: (() => void) | undefined;

    const run = async () => {
      try {
        const validation = validateRuntimeConfiguration();

        // VERY LIGHT FIRST STEP ONLY
        if (typeof navigator !== 'undefined') {
          console.log('[Wasel] Online:', navigator.onLine);
        }

        // DEFER EVERYTHING HEAVY
        const timeoutId = setTimeout(async () => {
          if (cancelled) return;

          const performance = await import('./utils/performance');

          initSentry();
          performance.initPerformanceMonitoring();

          validation.issues.forEach((issue) => {
            if (issue.severity === 'error') {
              logger.error(issue.message);
            } else {
              logger.warning(issue.message);
            }
          });

          warmUpServer();

          stopPolling = startAvailabilityPolling();

          stopEvents = domainEventBus.subscribeAll((event) => {
            trackDomainEvent(event);
          });
        }, 1500);

        return () => clearTimeout(timeoutId);
      } catch (e) {
        logger.warning('[Runtime bootstrap failed]', {
          message: e instanceof Error ? e.message : String(e),
        });
      }
    };

    let cleanupTimer: (() => void) | undefined;
    run().then(cleanup => {
      cleanupTimer = cleanup;
    });

    return () => {
      cancelled = true;
      cleanupTimer?.();
      stopPolling?.();
      stopEvents?.();
    };
  }, []);

  return null;
}

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
              background: 'var(--wasel-surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontFamily: 'var(--wasel-font-sans, Inter, system-ui, sans-serif)',
            },
          }}
        />
      
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
