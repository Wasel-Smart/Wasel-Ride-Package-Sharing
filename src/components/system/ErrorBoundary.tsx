/**
 * Error Boundary Component
 * Catches React component errors and provides fallback UI
 */

import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';
import { logger } from '@/utils/monitoring';
import { WaselStateCard } from './WaselStateCard';

const PRIMARY_ACTION_STYLE = {
  minHeight: 44,
  padding: '0 18px',
  borderRadius: 999,
  border: '1px solid rgba(88,221,255,0.24)',
  background: 'linear-gradient(135deg, rgba(88,221,255,0.18), rgba(71,214,158,0.12))',
  color: '#EEF8FF',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const SECONDARY_ACTION_STYLE = {
  ...PRIMARY_ACTION_STYLE,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

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
    logger.error('React Error Boundary caught error', error, {
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
        <WaselStateCard
          eyebrow="Recovery mode"
          title="This surface hit an unexpected error"
          description="Wasel kept the session alive, but this part of the interface needs to recover. Try resetting the view or returning to the main route graph."
          tone="danger"
          minHeight="100vh"
          actions={
            <>
              <button onClick={this.reset} style={PRIMARY_ACTION_STYLE}>
                Try again
              </button>
              <button onClick={() => window.location.reload()} style={SECONDARY_ACTION_STYLE}>
                Reload page
              </button>
              <a href="/app" style={SECONDARY_ACTION_STYLE}>
                Go to home
              </a>
            </>
          }
          footer={
            import.meta.env?.DEV && this.state.error ? (
              <details style={{ textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Error details</summary>
                <pre
                  style={{
                    marginTop: 12,
                    overflow: 'auto',
                    color: '#FFD4DA',
                    fontSize: '0.75rem',
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            ) : (
              'If this view keeps failing, return to the dashboard and reopen the flow.'
            )
          }
        />
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
        <WaselStateCard
          eyebrow="Page error"
          title="This page could not finish loading"
          description="The route opened, but the page state broke before it became interactive."
          tone="danger"
          minHeight="100vh"
          actions={
            <a href="/app" style={PRIMARY_ACTION_STYLE}>
              Go to dashboard
            </a>
          }
        />
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
        <WaselStateCard
          eyebrow="Feature unavailable"
          title="This feature is temporarily offline"
          description="The surrounding page is still available, but this module needs to recover before you can use it again."
          tone="warning"
          minHeight={260}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}
