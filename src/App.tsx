import { Component, useMemo, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/app/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';
import { getInitialLanguage } from './utils/locale';

function AppContent() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: DEFAULT_QUERY_OPTIONS }));
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

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ marginBottom: '12px', color: '#EF4444' }}>Something went wrong</h1>
          <p style={{ color: '#64748B' }}>Please refresh the page or try again later.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              background: '#3A7CA5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </ErrorBoundary>
  );
}
