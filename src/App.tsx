import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { PWAInstallPrompt } from './components/mobile/PWAInstallPrompt';
import { AppErrorBoundary } from './components/system/ErrorBoundary';
import { PrivilegedMfaGate } from './components/PrivilegedMfaGate';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { F } from './utils/wasel-ds';

import { validateRuntimeConfiguration } from './utils/env';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import * as monitoring from './utils/monitoring';
import { waselRouter } from './router';

function scheduleWhenIdle(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const idleCallback = idleWindow.requestIdleCallback(callback, { timeout: 4_000 });
    return () => idleWindow.cancelIdleCallback?.(idleCallback);
  }

  const timeout = window.setTimeout(callback, 2_500);
  return () => window.clearTimeout(timeout);
}

/* ---------------------------
   BRAND TOASTER
   Uses design-system tokens + brand font stack (Plus Jakarta Sans / Cairo)
   and follows the active language direction so Arabic toasts render RTL.
---------------------------*/
function BrandToaster() {
  const { dir } = useLanguage();
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme}
      dir={dir}
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          fontFamily: F,
        },
      }}
    />
  );
}

/* ---------------------------
   PROVIDERS WRAPPER
---------------------------*/
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <PrivilegedMfaGate>{children}</PrivilegedMfaGate>
          <BrandToaster />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

/* ---------------------------
   BACKGROUND BOOTSTRAP (NON-BLOCKING)
---------------------------*/
function AppRuntimeCoordinator() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let cancelScheduledWork = () => {};

    const run = async () => {
      try {
        const validation = validateRuntimeConfiguration();

        if (typeof navigator !== 'undefined') {
          if (import.meta.env.DEV) {
            console.info('[Wasel] Online:', navigator.onLine);
          }
        }

        cancelScheduledWork = scheduleWhenIdle(() => {
          void (async () => {
            if (cancelled) {return;}

            try {
              void import('./platform/event-bus')
                .then(events => {
                  if (cancelled) {return;}

                  void monitoring.initSentry();
                  validation.issues.forEach(issue => {
                    if (issue.severity === 'error') {
                      monitoring.logger.error(issue.message);
                    } else {
                      monitoring.logger.warning(issue.message);
                    }
                  });

                  void import('./services/core')
                    .then(({ warmUpServer }) => warmUpServer())
                    .catch(error => {
                      if (import.meta.env.DEV) {
                        console.warn('[Runtime backend warmup failed]', error);
                      }
                    });

                  const stopEvents = events.domainEventBus.subscribeAll(event => {
                    monitoring.trackDomainEvent(event);
                  });
                  cleanup = stopEvents;
                })
                .catch(error => {
                  if (import.meta.env.DEV) {
                    console.warn('[Runtime deferred modules failed]', error);
                  }
                });
            } catch (e) {
              if (import.meta.env.DEV) {
                console.warn('[Runtime deferred tasks failed]', e);
              }
            }
          })();
        });
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[Runtime bootstrap failed]', e);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      cancelScheduledWork();
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

        <PWAInstallPrompt />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
