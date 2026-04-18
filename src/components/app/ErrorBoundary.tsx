import { Component, type ErrorInfo, type ReactNode } from 'react';
import { normalizeError, formatErrorMessage, type WaselError } from '../../utils/errors';
import { logger } from '../../utils/logging';

interface ErrorBoundaryState {
  hasError: boolean;
  error: WaselError | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  language: 'en' | 'ar';
  resolvedTheme: 'light' | 'dark';
  fallback?: (error: WaselError, errorId: string, retry: () => void) => ReactNode;
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const normalizedError = normalizeError(error);
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error: normalizedError,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const normalizedError = normalizeError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AppErrorBoundary',
    });

    // Log error with full context
    logger.error('React Error Boundary caught error', {
      error: normalizedError,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Report to external monitoring if available
    if (typeof window !== 'undefined' && 'Sentry' in window) {
      (window as any).Sentry?.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: 'AppErrorBoundary',
        },
      });
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
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
          theme={this.props.resolvedTheme}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
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
  theme: 'light' | 'dark';
  onRetry: () => void;
  onReload: () => void;
}

function ErrorFallback({ error, errorId, language, theme, onRetry, onReload }: ErrorFallbackProps) {
  const isArabic = language === 'ar';
  const isDark = theme === 'dark';

  const messages = {
    title: isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong',
    description: isArabic 
      ? 'نعتذر، حدث خطأ في التطبيق. يمكنك المحاولة مرة أخرى أو إعادة تحميل الصفحة.'
      : 'We apologize for the inconvenience. You can try again or reload the page.',
    errorMessage: formatErrorMessage(error),
    errorId: isArabic ? `معرف الخطأ: ${errorId}` : `Error ID: ${errorId}`,
    tryAgain: isArabic ? 'حاول مرة أخرى' : 'Try Again',
    reload: isArabic ? 'إعادة تحميل' : 'Reload Page',
    reportIssue: isArabic ? 'الإبلاغ عن مشكلة' : 'Report Issue',
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
    background: isDark ? '#0a0a0a' : '#ffffff',
    color: isDark ? '#ffffff' : '#000000',
    direction: isArabic ? 'rtl' : 'ltr',
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: '500px',
    width: '100%',
    padding: '32px',
    borderRadius: '16px',
    background: isDark ? '#1a1a1a' : '#f8f9fa',
    border: `1px solid ${isDark ? '#333' : '#e1e5e9'}`,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    margin: '8px',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#3b82f6',
    color: 'white',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'transparent',
    color: isDark ? '#ffffff' : '#000000',
    border: `1px solid ${isDark ? '#333' : '#d1d5db'}`,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>
          {messages.title}
        </h1>
        <p style={{ fontSize: '16px', marginBottom: '16px', opacity: 0.8 }}>
          {messages.description}
        </p>
        {error.message && (
          <div style={{
            padding: '12px',
            background: isDark ? '#2a2a2a' : '#f1f3f4',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}>
            {messages.errorMessage}
          </div>
        )}
        <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '24px' }}>
          {messages.errorId}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          <button
            onClick={onRetry}
            style={primaryButtonStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#3b82f6';
            }}
          >
            {messages.tryAgain}
          </button>
          <button
            onClick={onReload}
            style={secondaryButtonStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.background = isDark ? '#333' : '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {messages.reload}
          </button>
          <a
            href={`mailto:support@wasel.jo?subject=Error Report&body=Error ID: ${errorId}%0A%0AError: ${encodeURIComponent(error.message)}`}
            style={{
              ...secondaryButtonStyle,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {messages.reportIssue}
          </a>
        </div>
      </div>
    </div>
  );
}