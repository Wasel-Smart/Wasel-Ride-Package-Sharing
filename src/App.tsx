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

import { validateRuntimeConfiguration } from './utils/env';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';

/* ---------------------------
   PROVIDERS WRAPPER
---------------------------*/
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
---------------------------*/
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

        setTimeout(async () => {
          if (cancelled) return;

          try {
            const [
              { initSentry, logger: monitoringLogger, trackDomainEvent },
              { initPerformanceMonitoring },
              { warmUpServer, startAvailabilityPolling },
              { domainEventBus },
            ] = await Promise.all([
              import('./utils/monitoring'),
              import('./utils/performance'),
              import('./services/core'),
              import('./platform/event-bus'),
            ]);

            initSentry();
            initPerformanceMonitoring();

            validation.issues.forEach(issue => {
              if (issue.severity === 'error') {
                monitoringLogger.error(issue.message);
              } else {
                monitoringLogger.warning(issue.message);
              }
            });

            warmUpServer();

            const stopPolling = startAvailabilityPolling();

            const stopEvents = domainEventBus.subscribeAll(event => {
              trackDomainEvent(event);
            });

            cleanup = () => {
              stopPolling?.();
              stopEvents?.();
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
---------------------------*/
const queryClient = new QueryClient({
  defaultOptions: DEFAULT_QUERY_OPTIONS,
});

/* ---------------------------
   ROUTER (isolated from providers)
---------------------------*/
const Router = () => <RouterProvider router={waselRouter} />;

/* ---------------------------
   APP
---------------------------*/
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
