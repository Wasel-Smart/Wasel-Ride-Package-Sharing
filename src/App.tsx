import { Component, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';

import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider } from './contexts/LocalAuth';

import { domainEventBus } from './platform/event-bus';
import { validateRuntimeConfiguration } from './utils/env';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';

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

    if (ignored.some((p) => message.includes(p))) {
      return { hasError: false, error: '' };
    }

    return { hasError: true, error: message };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ padding: 40, color: 'white', background: '#0A0F1A' }}>
        <h2>App Error</h2>
        <p>{this.state.error}</p>
        <button onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
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

    const run = async () => {
      try {
        const validation = validateRuntimeConfiguration();

        // VERY LIGHT FIRST STEP ONLY
        if (typeof navigator !== 'undefined') {
          console.log('[Wasel] Online:', navigator.onLine);
        }

        // DEFER EVERYTHING HEAVY
        setTimeout(async () => {
          if (cancelled) return;

          const monitoring = await import('./utils/monitoring');
          const performance = await import('./utils/performance');
          const core = await import('./services/core');

          monitoring.initSentry();
          performance.initPerformanceMonitoring();

          validation.issues.forEach((issue) => {
            if (issue.severity === 'error') {
              monitoring.logger.error(issue.message);
            } else {
              monitoring.logger.warning(issue.message);
            }
          });

          core.warmUpServer();

          const stopPolling = core.startAvailabilityPolling();

          const stopEvents = domainEventBus.subscribeAll((event) => {
            monitoring.trackDomainEvent(event);
          });

          return () => {
            stopPolling?.();
            stopEvents?.();
          };
        }, 1500);
      } catch (e) {
        console.warn('[Runtime bootstrap failed]', e);
      }
    };

    run();

    return () => {
      cancelled = true;
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
        
        {/* Router stays stable → fixes navigation lag */}
        <Router />

        {/* Providers no longer affect routing */}
        <AppProviders>
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

      </QueryClientProvider>
    </AppErrorBoundary>
  );
}