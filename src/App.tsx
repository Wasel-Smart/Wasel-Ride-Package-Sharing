import { Component, useEffect, useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { LocalAuthProvider } from './contexts/LocalAuth';
import { WaselLogo } from './components/wasel-ds/WaselLogo';
import {
  probeBackendHealth,
  startAvailabilityPolling,
  warmUpServer,
} from './services/core';
import { initSentry } from './utils/monitoring';
import {
  detectLongTasks,
  initPerformanceMonitoring,
} from './utils/performance';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';
import { buildAuthPagePath } from './utils/authFlow';
import { shouldIgnoreError, formatErrorMessage, type WaselError } from './utils/errors';

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    // Use centralized error handling to determine if error should be ignored
    if (shouldIgnoreError(error)) {
      return { hasError: false, error: '' };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, error: message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }): void {
    // Ignore framework-level system errors
    if (shouldIgnoreError(error)) return;

    const message = error instanceof Error ? error.message : String(error);
    console.error('[Wasel ErrorBoundary]', message, info?.componentStack ?? '');

    // Send to monitoring (Sentry)
    if (typeof window !== 'undefined' && window.__SENTRY__?.captureException) {
      window.__SENTRY__.captureException(error, {
        contexts: {
          react: {
            componentStack: info?.componentStack ?? undefined,
          },
        },
      });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
          background: `
            radial-gradient(circle at 16% 18%, rgba(85,233,255,0.12), transparent 24%),
            radial-gradient(circle at 82% 12%, rgba(245,177,30,0.12), transparent 20%),
            radial-gradient(circle at 78% 72%, rgba(51,232,95,0.08), transparent 20%),
            #040C18
          `,
          color: '#EFF6FF',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div
          role="alert"
          style={{
            width: 'min(100%, 560px)',
            borderRadius: 28,
            padding: 28,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(10,22,40,0.94)',
            border: '1px solid rgba(85,233,255,0.14)',
            boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={42} theme="light" variant="compact" />
          </div>
          <div
            style={{
              fontSize: '0.74rem',
              marginBottom: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#55E9FF',
              fontWeight: 800,
            }}
          >
            Recovery Screen
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EFF6FF', margin: '0 0 10px' }}>
            Something interrupted this screen
          </h2>
          <p style={{ color: 'rgba(239,246,255,0.72)', fontSize: '0.92rem', margin: '0 auto 16px', maxWidth: 420, lineHeight: 1.7 }}>
            {this.state.error || 'An unexpected error occurred while loading this part of Wasel.'}
          </p>
          <p style={{ color: 'rgba(239,246,255,0.52)', fontSize: '0.84rem', margin: '0 auto 22px', maxWidth: 440, lineHeight: 1.7 }}>
            Refresh this experience to continue. If the issue repeats, return to the home screen and reopen the flow.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.reload();
              }}
              style={{
                minHeight: 48,
                padding: '0 22px',
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
                color: '#041018',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              Reload Wasel
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.assign('/');
              }}
              style={{
                minHeight: 48,
                padding: '0 22px',
                borderRadius: 14,
                border: '1px solid rgba(85,233,255,0.18)',
                background: 'rgba(255,255,255,0.03)',
                color: '#EFF6FF',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              Back to home
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: '' });
                window.location.assign(buildAuthPagePath('signin'));
              }}
              style={{
                minHeight: 48,
                padding: '0 22px',
                borderRadius: 14,
                border: '1px solid rgba(85,233,255,0.18)',
                background: 'transparent',
                color: '#55E9FF',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              Open sign in
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function AppRuntimeCoordinator() {
  useEffect(() => {
    initSentry();
    initPerformanceMonitoring();
    detectLongTasks();
    void warmUpServer();
    void probeBackendHealth();

    const stopPolling = startAvailabilityPolling();
    const syncOnlineState = () => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      onlineManager.setOnline(online);
      if (online) void probeBackendHealth();
    };

    syncOnlineState();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncOnlineState);
      window.addEventListener('offline', syncOnlineState);
    }

    return () => {
      stopPolling();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', syncOnlineState);
        window.removeEventListener('offline', syncOnlineState);
      }
    };
  }, []);

  return null;
}

export default function App() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: DEFAULT_QUERY_OPTIONS }),
  );

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <LocalAuthProvider>
            <AuthProvider>
              <AppRuntimeCoordinator />
              <RouterProvider router={waselRouter} />
              <Toaster
                position="bottom-center"
                toastOptions={{
                  style: {
                    background: '#0A1628',
                    border: '1px solid rgba(22,199,242,0.25)',
                    color: '#EFF6FF',
          fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
                  },
                }}
              />
            </AuthProvider>
          </LocalAuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

