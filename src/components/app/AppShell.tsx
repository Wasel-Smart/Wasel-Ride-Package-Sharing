import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import type { waselRouter } from '../../router';
import { AuthProvider } from '../../contexts/AuthContext';
import { LocalAuthProvider } from '../../contexts/LocalAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { PrivacyConsentBanner } from '../PrivacyConsentBanner';
import { AppErrorBoundary } from './ErrorBoundary';
import { AppRuntimeCoordinator } from './RuntimeCoordinator';

interface AppShellProps {
  initialLanguage: 'en' | 'ar';
  queryClient: QueryClient;
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
              theme={resolvedTheme}
              toastOptions={{
                className: 'sonner-toast',
              }}
            />
          </AuthProvider>
        </LocalAuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
