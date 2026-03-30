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
    const message = error instanceof Error ? error.message : String(error);
    const ignoredPatterns = [
      'IframeMessageAbortError',
      'message port was destroyed',
      'Message aborted',
      'setupMessageChannel',
      'figma_app-',
    ];

    if (ignoredPatterns.some((pattern) => message.includes(pattern))) {
      return { hasError: false, error: '' };
    }

    return { hasError: true, error: message };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const message = error instanceof Error ? error.message : String(error);
    const ignoredPatterns = [
      'IframeMessageAbortError',
      'message port was destroyed',
      'Message aborted',
      'setupMessageChannel',
    ];

    if (ignoredPatterns.some((pattern) => message.includes(pattern))) return;

    console.error('[Wasel ErrorBoundary]', message, info?.componentStack ?? '');
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
          fontFamily: "-apple-system, 'Inter', sans-serif",
          background: '#F0F4FA',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 16, fontWeight: 900 }}>!</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0B1D45', marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ color: '#8A9ABD', fontSize: '0.875rem', marginBottom: 24, maxWidth: 360 }}>
          {this.state.error || 'An unexpected error occurred.'}
        </p>
        <p style={{ color: '#8A9ABD', fontSize: '0.825rem', marginBottom: 20, maxWidth: 420, lineHeight: 1.6 }}>
          Refresh the page or try again. If the issue continues, return to the home screen and restart the flow.
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: '' })}
          style={{
            padding: '10px 28px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #00CAFF, #2060E8)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Reload Screen
        </button>
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
                    border: '1px solid rgba(0,200,232,0.25)',
                    color: '#EFF6FF',
                    fontFamily: "-apple-system, 'Inter', sans-serif",
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
