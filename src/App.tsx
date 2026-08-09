import { sanitizeLogMessage } from '@/utils/sanitization';
import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { PWAInstallPrompt } from './components/mobile/PWAInstallPrompt';
import { AppErrorBoundary } from './components/system/ErrorBoundary';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider } from './contexts/LocalAuth';

import { domainEventBus } from './platform/event-bus';
import { eventBroker } from './platform/event-broker';
import { startAsyncRuntime, stopAsyncRuntime } from './platform/async-runtime';
import { productionWorkerRegistry } from './platform/production-workers';
import { validateRuntimeConfiguration } from './utils/env';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';

// Quick-fix: use static imports for modules that are also imported elsewhere
// to avoid mixed dynamic/static import warnings from Vite during production builds.
import * as monitoring from './utils/monitoring';
import * as performance from './utils/performance';
import * as core from './services/core';

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
    let cleanup: (() => void) | undefined;

    const run = async () => {
      try {
        const validation = validateRuntimeConfiguration();

        if (typeof navigator !== 'undefined') {
          if (import.meta.env.DEV) {
            console.log('[Wasel] Online:', navigator.onLine);
          }
        }

        setTimeout(() => {
          if (cancelled) return;

          try {
            monitoring.initSentry();
            performance.initPerformanceMonitoring();

            validation.issues.forEach(issue => {
              if (issue.severity === 'error') {
                monitoring.logger.error(issue.message);
              } else {
                monitoring.logger.warning(issue.message);
              }
            });

            core.warmUpServer();

            const stopPolling = core.startAvailabilityPolling();

            const stopEvents = domainEventBus.subscribeAll(event => {
              monitoring.trackDomainEvent(event);
            });

            void startAsyncRuntime()
              .then(() => {
                if (cancelled) return;
                console.info('[Wasel] async runtime started', {
                  broker: eventBroker.kind,
                  workers: productionWorkerRegistry.list(),
                });
              })
              .catch(err => {
                console.warn('[Wasel] async runtime failed to start', sanitizeLogMessage(err));
              });

            cleanup = () => {
              stopPolling?.();
              stopEvents?.();
              void stopAsyncRuntime();
            };
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn('[Runtime deferred tasks failed]', e);
            }
          }
        }, 1500);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[Runtime bootstrap failed]', e);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      cleanup?.();
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
              background: '#0A1628',
              border: '1px solid rgba(0,200,232,0.25)',
              color: '#EFF6FF',
              fontFamily: "-apple-system, 'Inter', sans-serif",
            },
          }}
        />
        <PWAInstallPrompt />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
