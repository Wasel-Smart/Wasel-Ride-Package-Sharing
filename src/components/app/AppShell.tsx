import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import type { waselRouter } from '../../router';
import { Toaster } from 'sonner';
import { AuthProvider } from '../../contexts/AuthContext';
import { LocalAuthProvider } from '../../contexts/LocalAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { PrivacyConsentBanner } from '../PrivacyConsentBanner';
import { AppErrorBoundary } from './ErrorBoundary';
import { AppRuntimeCoordinator } from './RuntimeCoordinator';

interface AppShellProps {
  queryClient: QueryClient;
  initialLanguage: 'en' | 'ar';
  router: typeof waselRouter;
}

export function AppShell({ queryClient, initialLanguage, router }: AppShellProps) {
  const { resolvedTheme } = useTheme();

  return (
    <AppErrorBoundary language={initialLanguage} resolvedTheme={resolvedTheme}>
      <QueryClientProvider client={queryClient}>
        <LocalAuthProvider>
          <AuthProvider>
            <AppRuntimeCoordinator />
            <RouterProvider router={router} />
            <PrivacyConsentBanner />
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
