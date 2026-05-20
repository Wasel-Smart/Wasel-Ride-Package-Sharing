import { ErrorBoundary } from './src/components/ErrorBoundary';
import { QueryProvider } from './src/providers/QueryProvider';
import AppNavigator from './src/navigation/AppNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import { usePerformanceMonitor } from './src/utils/performance';

function AppContent() {
  usePushNotifications();
  usePerformanceMonitor('App');

  return (
    <>
      <OfflineBanner />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </ErrorBoundary>
  );
}
