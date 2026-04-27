import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card, LayoutContainer } from '../../design-system/components';
import { formatErrorMessage, normalizeError, type WaselError } from '../../utils/errors';
import { logger } from '../../utils/logging';

interface ErrorBoundaryState {
  error: WaselError | null;
  errorId: string | null;
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: WaselError, errorId: string, retry: () => void) => ReactNode;
  language: 'en' | 'ar';
  resolvedTheme: 'light' | 'dark';
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      errorId: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const normalizedError = normalizeError(error);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      error: normalizedError,
      errorId,
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const normalizedError = normalizeError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AppErrorBoundary',
    });

    logger.error('React Error Boundary caught error', {
      error: normalizedError,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });

    if (typeof window !== 'undefined' && 'Sentry' in window) {
      (window as { Sentry?: { captureException?: (error: Error, context: unknown) => void } }).Sentry?.captureException?.(
        error,
        {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
          tags: {
            errorBoundary: 'AppErrorBoundary',
          },
        },
      );
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleRetry = (): void => {
    this.setState({
      error: null,
      errorId: null,
      hasError: false,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleRetry);
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          language={this.props.language}
          onReload={this.handleReload}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: WaselError;
  errorId: string;
  language: 'en' | 'ar';
  onReload: () => void;
  onRetry: () => void;
}

function ErrorFallback({ error, errorId, language, onReload, onRetry }: ErrorFallbackProps) {
  const isArabic = language === 'ar';

  const messages = {
    description: isArabic
      ? 'يمكنك المحاولة مرة أخرى أو إعادة تحميل الصفحة.'
      : 'We apologize for the inconvenience. You can try again or reload the page.',
    errorId: isArabic ? `معرف الخطأ: ${errorId}` : `Error ID: ${errorId}`,
    reload: isArabic ? 'إعادة تحميل' : 'Reload Page',
    reportIssue: isArabic ? 'الإبلاغ عن مشكلة' : 'Report Issue',
    title: isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong',
    tryAgain: isArabic ? 'حاول مرة أخرى' : 'Try Again',
  };

  return (
    <main className="ds-error-boundary" dir={isArabic ? 'rtl' : 'ltr'}>
      <LayoutContainer>
        <div className="ds-error-boundary__frame">
          <Card className="ds-error-boundary__card">
            <div aria-label="Warning" className="ds-error-boundary__icon" role="img">
              !
            </div>
            <h1 className="ds-section-title">{messages.title}</h1>
            <p className="ds-copy ds-copy--tight">{messages.description}</p>
            {error.message ? (
              <div className="ds-inline-feedback" data-tone="error">
                {formatErrorMessage(error)}
              </div>
            ) : null}
            <p className="ds-caption">{messages.errorId}</p>
            <div className="ds-minor-actions ds-error-boundary__actions">
              <Button onClick={onRetry}>{messages.tryAgain}</Button>
              <Button onClick={onReload} variant="secondary">
                {messages.reload}
              </Button>
              <a
                className="ds-button"
                data-variant="ghost"
                href={`mailto:support@wasel.jo?subject=Error Report&body=Error ID: ${errorId}%0A%0AError: ${encodeURIComponent(error.message)}`}
              >
                {messages.reportIssue}
              </a>
            </div>
          </Card>
        </div>
      </LayoutContainer>
    </main>
  );
}
