import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { WaselLogo } from './components/wasel-ds/WaselLogo';
import { PrivacyConsentBanner } from './components/PrivacyConsentBanner';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';
import { probeBackendHealth, startAvailabilityPolling, warmUpServer } from './services/core';
import { buildAuthPagePath } from './utils/authFlow';
import { shouldIgnoreError, formatErrorMessage } from './utils/errors';
import { getInitialLanguage } from './utils/locale';
import { CONSENT_DECISION_EVENT, hasTelemetryConsent } from './utils/consent';
import { scheduleDeferredTask } from './utils/runtimeScheduling';

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
}

let telemetryModulesPromise: Promise<{
  initSentry: () => void;
  detectLongTasks: () => void;
  initPerformanceMonitoring: () => void;
  captureException: (error: unknown, componentStack?: string | null) => void;
}> | null = null;

function loadTelemetryModules() {
  if (!telemetryModulesPromise) {
    telemetryModulesPromise = Promise.all([
      import('./utils/monitoring'),
      import('./utils/performance'),
    ]).then(([monitoringModule, performanceModule]) => ({
      initSentry: monitoringModule.initSentry,
      detectLongTasks: performanceModule.detectLongTasks,
      initPerformanceMonitoring: performanceModule.initPerformanceMonitoring,
      captureException: (error: unknown, componentStack?: string | null) => {
        monitoringModule.default.captureException(error, {
          contexts: {
            react: { componentStack: componentStack ?? undefined },
          },
        });
      },
    }));
  }

  return telemetryModulesPromise;
}

class AppErrorBoundary extends Component<{
  children: ReactNode;
  language: 'en' | 'ar';
  resolvedTheme: 'light' | 'dark';
}, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; language: 'en' | 'ar'; resolvedTheme: 'light' | 'dark' }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (shouldIgnoreError(error)) {
      return { hasError: false, error: '' };
    }
    const message = formatErrorMessage(error);
    return { hasError: true, error: message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }): void {
    if (shouldIgnoreError(error)) return;

    const message = error instanceof Error ? error.message : String(error);
    console.error('[Wasel ErrorBoundary]', message, info?.componentStack ?? '');
    void loadTelemetryModules()
      .then((telemetry) => {
        telemetry.captureException(error, info?.componentStack ?? null);
      })
      .catch(() => {
        // Swallow monitoring failures so the boundary never cascades.
      });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const ar = this.props.language === 'ar';
    const isLight = this.props.resolvedTheme === 'light';

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
          background: 'var(--shell-background)',
          color: 'var(--text-primary)',
          padding: 24,
          textAlign: 'center',
          direction: ar ? 'rtl' : 'ltr',
        }}
      >
        <div
          role="alert"
          style={{
            width: 'min(100%, 560px)',
            borderRadius: 28,
            padding: 28,
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--wasel-shadow-lg)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <WaselLogo size={42} theme={isLight ? 'dark' : 'light'} variant="compact" showWordmark={false} />
          </div>
          <div
            style={{
              fontSize: '0.74rem',
              marginBottom: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontWeight: 800,
            }}
          >
            {ar ? 'شاشة الاسترجاع' : 'Recovery Screen'}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 10px' }}>
            {ar ? 'صار خلل ووقف هالجزء من التطبيق' : 'Something interrupted this screen'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0 auto 16px', maxWidth: 420, lineHeight: 1.7 }}>
            {this.state.error || (ar ? 'صار خطأ غير متوقع وإحنا عم نحمّل هالجزء من واصل.' : 'An unexpected error occurred while loading this part of Wasel.')}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0 auto 22px', maxWidth: 440, lineHeight: 1.7 }}>
            {ar
              ? 'حدّث الصفحة لتكمل. وإذا رجعت المشكلة، ارجع للرئيسية وافتح الخدمة مرة ثانية.'
              : 'Refresh this experience to continue. If the issue repeats, return to the home screen and reopen the flow.'}
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
                background: 'var(--theme-gradient-accent)',
                color: 'var(--text-inverse)',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              {ar ? 'حدّث واصل' : 'Reload Wasel'}
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
                border: '1px solid var(--border)',
                background: 'var(--surface-muted)',
                color: 'var(--text-primary)',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              {ar ? 'ارجع للرئيسية' : 'Back to home'}
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
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--accent)',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              {ar ? 'افتح تسجيل الدخول' : 'Open sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function AppRuntimeCoordinator() {
  // Effect 1: Monitoring & performance — isolated so a failure here doesn't affect warmup
  useEffect(() => {
    let disposed = false;
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isPublicEntryPath = currentPath === '/';
    let cancelMonitoringSetup = () => {};
    let monitoringScheduled = false;

    const scheduleMonitoringSetup = () => {
      if (disposed || monitoringScheduled || !hasTelemetryConsent()) {
        return;
      }

      monitoringScheduled = true;
      cancelMonitoringSetup = scheduleDeferredTask(async () => {
        if (disposed) return;

        const telemetry = await loadTelemetryModules();
        telemetry.initSentry();
        telemetry.initPerformanceMonitoring();
        telemetry.detectLongTasks();
      }, isPublicEntryPath ? 2_500 : 1_500);
    };

    const handleConsentDecision = (event: Event) => {
      const decisionEvent = event as CustomEvent<{ accepted?: boolean }>;
      if (decisionEvent.detail?.accepted) {
        scheduleMonitoringSetup();
      }
    };

    scheduleMonitoringSetup();
    window.addEventListener(CONSENT_DECISION_EVENT, handleConsentDecision as EventListener);

    return () => {
      disposed = true;
      cancelMonitoringSetup();
      window.removeEventListener(CONSENT_DECISION_EVENT, handleConsentDecision as EventListener);
    };
  }, []);

  // Effect 2: Server warmup & availability polling — isolated so monitoring failure doesn't block it
  useEffect(() => {
    let disposed = false;
    let stopPolling: () => void = () => {};
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isPublicEntryPath = currentPath === '/';

    const cancelWarmup = scheduleDeferredTask(async () => {
      if (disposed) return;

      stopPolling = startAvailabilityPolling(120_000);
      await warmUpServer();
      await probeBackendHealth();
    }, isPublicEntryPath ? 2_200 : 900);

    return () => {
      disposed = true;
      cancelWarmup();
      stopPolling();
    };
  }, []);

  // Effect 3: Online/offline network sync — isolated for clarity and independent lifecycle
  useEffect(() => {
    let disposed = false;

    const syncOnlineState = () => {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      onlineManager.setOnline(online);
      if (online && !disposed) {
        void probeBackendHealth();
      }
    };

    syncOnlineState();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', syncOnlineState);
      window.addEventListener('offline', syncOnlineState);
    }

    return () => {
      disposed = true;
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
  const initialLanguage = getInitialLanguage();
  const router = useMemo(() => waselRouter, []);

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppShell queryClient={queryClient} initialLanguage={initialLanguage} router={router} />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppShell({
  queryClient,
  initialLanguage,
  router,
}: {
  queryClient: QueryClient;
  initialLanguage: 'en' | 'ar';
  router: typeof waselRouter;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <AppErrorBoundary language={initialLanguage} resolvedTheme={resolvedTheme}>
      <QueryClientProvider client={queryClient}>
        <LocalAuthProvider>
          <AuthProvider>
            <AppRuntimeCoordinator />
            <RouterProvider router={router} />

            {/* ── Privacy/analytics consent banner (GDPR + Jordan PDPL) ─── */}
            <PrivacyConsentBanner />

            {/* ── Global toast notifications ────────────────────────────── */}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: 'var(--surface-glass)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--wasel-shadow-md)',
                  fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
                },
              }}
            />
          </AuthProvider>
        </LocalAuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
