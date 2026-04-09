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
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { WaselLogo } from './components/wasel-ds/WaselLogo';
import { PrivacyConsentBanner } from './components/PrivacyConsentBanner';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';
import { buildAuthPagePath } from './utils/authFlow';
import { shouldIgnoreError, formatErrorMessage } from './utils/errors';
import { getInitialLanguage } from './utils/locale';
import { scheduleDeferredTask } from './utils/runtimeScheduling';

interface ErrorBoundaryState {
  hasError: boolean;
  error: string;
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

    void import('./utils/monitoring').then((monitoring) => {
      monitoring.default.captureException(error, {
        contexts: {
          react: { componentStack: info?.componentStack ?? undefined },
        },
      });
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
          background: `
            ${isLight
              ? 'radial-gradient(circle at 16% 18%, rgba(85,233,255,0.10), transparent 24%), radial-gradient(circle at 82% 12%, rgba(245,177,30,0.08), transparent 20%), radial-gradient(circle at 78% 72%, rgba(51,232,95,0.06), transparent 20%), #f6fbff'
              : 'radial-gradient(circle at 16% 18%, rgba(85,233,255,0.12), transparent 24%), radial-gradient(circle at 82% 12%, rgba(245,177,30,0.12), transparent 20%), radial-gradient(circle at 78% 72%, rgba(51,232,95,0.08), transparent 20%), #040C18'
            }
          `,
          color: isLight ? '#10243d' : '#EFF6FF',
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
            background: isLight
              ? 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,251,255,0.94)), rgba(255,255,255,0.92)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(10,22,40,0.94)',
            border: `1px solid ${isLight ? 'rgba(12,110,168,0.12)' : 'rgba(85,233,255,0.14)'}`,
            boxShadow: isLight ? '0 28px 70px rgba(16,36,61,0.14)' : '0 28px 70px rgba(0,0,0,0.42)',
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
              color: '#55E9FF',
              fontWeight: 800,
            }}
          >
            {ar ? 'شاشة الاسترجاع' : 'Recovery Screen'}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: isLight ? '#10243d' : '#EFF6FF', margin: '0 0 10px' }}>
            {ar ? 'صار خلل ووقف هالجزء من التطبيق' : 'Something interrupted this screen'}
          </h2>
          <p style={{ color: isLight ? 'rgba(16,36,61,0.76)' : 'rgba(239,246,255,0.72)', fontSize: '0.92rem', margin: '0 auto 16px', maxWidth: 420, lineHeight: 1.7 }}>
            {this.state.error || (ar ? 'صار خطأ غير متوقع وإحنا عم نحمّل هالجزء من واصل.' : 'An unexpected error occurred while loading this part of Wasel.')}
          </p>
          <p style={{ color: isLight ? 'rgba(16,36,61,0.60)' : 'rgba(239,246,255,0.52)', fontSize: '0.84rem', margin: '0 auto 22px', maxWidth: 440, lineHeight: 1.7 }}>
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
                background: 'linear-gradient(135deg, #55E9FF 0%, #1EA1FF 55%, #18D7C8 100%)',
                color: '#041018',
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
                border: '1px solid rgba(85,233,255,0.18)',
                background: isLight ? 'rgba(12,110,168,0.04)' : 'rgba(255,255,255,0.03)',
                color: isLight ? '#10243d' : '#EFF6FF',
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
                border: '1px solid rgba(85,233,255,0.18)',
                background: 'transparent',
                color: '#55E9FF',
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

    const cancelMonitoringSetup = scheduleDeferredTask(async () => {
      const [{ initSentry }, { detectLongTasks, initPerformanceMonitoring }] = await Promise.all([
        import('./utils/monitoring'),
        import('./utils/performance'),
      ]);

      if (disposed) return;

      initSentry();
      initPerformanceMonitoring();
      detectLongTasks();
    }, isPublicEntryPath ? 2_500 : 1_500);

    return () => {
      disposed = true;
      cancelMonitoringSetup();
    };
  }, []);

  // Effect 2: Server warmup & availability polling — isolated so monitoring failure doesn't block it
  useEffect(() => {
    let disposed = false;
    let stopPolling: () => void = () => {};
    const currentPath = typeof window === 'undefined' ? '/' : window.location.pathname;
    const isPublicEntryPath = currentPath === '/';

    const cancelWarmup = scheduleDeferredTask(async () => {
      const core = await import('./services/core');
      if (disposed) return;

      stopPolling = core.startAvailabilityPolling(120_000);
      await core.warmUpServer();
      await core.probeBackendHealth();
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
      if (online) {
        void import('./services/core').then((core) => {
          if (!disposed) return core.probeBackendHealth();
          return undefined;
        });
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

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppShell queryClient={queryClient} initialLanguage={initialLanguage} />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppShell({
  queryClient,
  initialLanguage,
}: {
  queryClient: QueryClient;
  initialLanguage: 'en' | 'ar';
}) {
  const { resolvedTheme } = useTheme();

  return (
    <AppErrorBoundary language={initialLanguage} resolvedTheme={resolvedTheme}>
      <QueryClientProvider client={queryClient}>
        <LocalAuthProvider>
          <AuthProvider>
            <AppRuntimeCoordinator />
            <RouterProvider router={waselRouter} />

            {/* ── Privacy/analytics consent banner (GDPR + Jordan PDPL) ─── */}
            <PrivacyConsentBanner />

            {/* ── Global toast notifications ────────────────────────────── */}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: resolvedTheme === 'light' ? 'rgba(255,255,255,0.96)' : '#0A1628',
                  border: `1px solid ${resolvedTheme === 'light' ? 'rgba(12,110,168,0.16)' : 'rgba(71,183,230,0.25)'}`,
                  color: resolvedTheme === 'light' ? '#10243d' : '#EFF6FF',
                  boxShadow: resolvedTheme === 'light' ? '0 18px 40px rgba(16,36,61,0.14)' : '0 18px 44px rgba(1,10,18,0.28)',
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
