import { useMemo, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/app/AppShell';
import { DEFAULT_QUERY_OPTIONS } from './utils/performance/cacheStrategy';
import { waselRouter } from './router';
import { getInitialLanguage } from './utils/locale';



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


