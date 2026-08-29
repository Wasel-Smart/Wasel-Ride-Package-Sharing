/**
 * Error Boundary Component
 * Catches React component errors and provides fallback UI
 */

import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { WaselButton } from '@/components/wasel-ui/WaselButton';
import { WaselCard } from '@/components/wasel-ui/WaselCard';
import { logger } from '@/utils/monitoring';
import { sanitizeLogMessage } from '@/utils/sanitization';
import { tx } from '../../locales/tx';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error boundary when reset keys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index],
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[var(--app-min-height)] flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              {tx('errors.somethingWrong')}
            </h2>

            <p className="text-gray-600 text-center mb-6">
              {tx('errorBoundary.we_re_sorry_for_the_inconvenience_please_try_refreshing_the_page')}
            </p>

            {import.meta.env?.DEV && this.state.error && (
              <details className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                <summary className="cursor-pointer font-medium text-sm text-gray-700 mb-2">
                  {tx('errorBoundary.error_details_development_only')}
                </summary>
                <pre className="text-xs text-red-600 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {tx('system.refreshPage')}
              </button>

              <button
                onClick={this.reset}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {tx('errorBoundary.try_again_2')}
              </button>
            </div>

            <button
              onClick={() => (window.location.href = '/')}
              className="w-full mt-3 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {tx('errors.goHome')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-level error boundary with custom fallback
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-[var(--app-min-height)] flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {tx('errorBoundary.page_error')}
            </h1>
            <p className="text-gray-600 mb-4">{tx('errorBoundary.page_error_description')}</p>
            <button
              onClick={() => (window.location.href = '/app')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {tx('errorBoundary.go_to_dashboard')}
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Feature-level error boundary with minimal fallback
 */
export function FeatureErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            {tx('errorBoundary.feature_temporarily_unavailable')}
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Application-level error boundary (top of the React tree).
 * Suppresses benign cross-frame / iframe runtime noise and renders a
 * design-system card fallback. Kept here so the whole app shares one
 * error-boundary implementation (see components/ErrorBoundary.tsx and
 * components/system/AppErrorBoundary.tsx re-export shims).
 */
interface AppErrorBoundaryState {
  hasError: boolean;
  error: string;
}

function shouldIgnoreRuntimeError(message: string): boolean {
  return [
    'IframeMessageAbortError',
    'message port was destroyed',
    'Message aborted',
    'setupMessageChannel',
  ].some(pattern => message.includes(pattern));
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);

    if (shouldIgnoreRuntimeError(message)) {
      return { hasError: false, error: '' };
    }

    return { hasError: true, error: sanitizeLogMessage(message) };
  }

  componentDidCatch(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    if (!shouldIgnoreRuntimeError(message)) {
      logger.error('Unhandled React runtime error', sanitizeLogMessage(message));
    }

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.appMounted = 'true';
    }

    // Chunk-load failures caused by stale SW caches are the primary driver of
    // app_mount_timeout on mobile. Hard-recover clears the cache before reload.
    const isChunkError =
      /loading chunk/i.test(message) ||
      /failed to fetch dynamically imported module/i.test(message) ||
      /importing a module script failed/i.test(message);
    if (isChunkError) {
      const hardRecover = (window as unknown as Record<string, unknown> & { waselHardRecover?: () => void }).waselHardRecover;
      if (typeof hardRecover === 'function') {
        hardRecover();
      }
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-[var(--app-min-height)] items-center justify-center bg-background p-6 text-foreground">
        <WaselCard variant="elevated" style={{ width: '100%', maxWidth: '32rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <h2 className="text-[length:var(--text-h2)]">
              {tx('appErrorBoundary.app_error')}
            </h2>
            <p className="text-sm text-muted-foreground">{this.state.error}</p>
            <WaselButton onClick={() => window.location.reload()}>
              {tx('appErrorBoundary.reload')}
            </WaselButton>
          </div>
        </WaselCard>
      </main>
    );
  }
}

// Backwards-compatible alias used by src/components/ErrorBoundary.tsx consumers.
export { ErrorBoundary as WaselErrorBoundary };
