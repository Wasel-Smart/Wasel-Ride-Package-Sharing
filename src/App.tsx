import { useState } from 'react';
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

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppShell
          initialLanguage={getInitialLanguage()}
          queryClient={queryClient}
          router={waselRouter}
        />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
