import { useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/app/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createWaselQueryClient } from './services/queryClient';
import { waselRouter } from './router';
import { getInitialLanguage } from './utils/locale';

function AppContent() {
  const [queryClient] = useState(() => createWaselQueryClient());

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
