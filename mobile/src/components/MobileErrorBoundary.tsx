import React, { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Linking } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors } from '../theme';
import { sanitizeLogValue } from '../utils/sanitize';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `err_${timestamp}_${randomPart}`;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { errorId } = this.state;
    const safeId = errorId ? errorId.replace(/[^a-z0-9_]/gi, '') : 'unknown';
    console.error('[ErrorBoundary] Caught error (id redacted):', sanitizeLogValue(error), sanitizeLogValue(errorInfo));
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ErrorBoundary:${safeId}] Error stack:`, sanitizeLogValue(errorInfo.componentStack));
    }

    Sentry.withScope(scope => {
      scope.setTag('boundary_error_id', errorId);
      scope.setExtra('componentStack', errorInfo.componentStack);
      scope.captureException(error);
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleContactSupport = (): void => {
    const { errorId } = this.state;
    const subject = encodeURIComponent(`Support request — error ${errorId ?? 'unknown'}`);
    const body = encodeURIComponent(`Error ID: ${errorId ?? 'unknown'}\n\nPlease describe what happened:`);
    Linking.openURL(`mailto:support@wasel.app?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId } = this.state;
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <View style={styles.container} accessible accessibilityLabel="شاشة خطأ">
          <Text style={styles.title}>حدث خطأ غير متوقع</Text>
          <Text style={styles.message} accessible accessibilityLabel="رسالة الخطأ">
            تعذر إكمال هذه الشاشة الآن. تم تسجيل المشكلة بأمان ويمكنك المحاولة مجدداً.
          </Text>
          {errorId ? (
            <Text style={styles.errorId} accessible accessibilityLabel="معرف الخطأ">
              معرف الخطأ: {errorId}
            </Text>
          ) : null}
          {isDev && error ? (
            <Text style={styles.devError} accessible accessibilityLabel="تفاصيل الخطأ">
              {error.message}
            </Text>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={this.handleReset}
              accessible
              accessibilityRole="button"
              accessibilityLabel="حاول مرة ثانية"
            >
              <Text style={styles.buttonText}>حاول مرة ثانية</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.supportButton]}
              onPress={this.handleContactSupport}
              accessible
              accessibilityRole="button"
              accessibilityLabel="اتصل بالدعم"
            >
              <Text style={styles.buttonText}>دعم</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: '80%',
  },
  errorId: {
    fontSize: 13,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: 8,
    textAlign: 'center',
  },
  devError: {
    fontSize: 12,
    color: colors.red,
    fontFamily: 'monospace',
    marginBottom: 16,
    textAlign: 'center',
    padding: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  retryButton: {
    backgroundColor: colors.teal,
  },
  supportButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
