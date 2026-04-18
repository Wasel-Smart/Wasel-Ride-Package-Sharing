import { Component, type ReactNode } from 'react';
import { shouldIgnoreError, formatErrorMessage } from '../utils/errors';

interface Props {
  children: ReactNode;
  /** Shown in the fallback heading — e.g. "Wallet", "Find a Ride" */
  featureName?: string;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Feature-level error boundary.
 *
 * Wrap individual feature pages/sections so a crash in one feature
 * does not take down the entire app shell.
 *
 * Usage:
 *   <FeatureErrorBoundary featureName="Wallet">
 *     <WalletDashboard />
 *   </FeatureErrorBoundary>
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    if (shouldIgnoreError(error)) return { hasError: false, message: '' };
    return { hasError: true, message: formatErrorMessage(error) };
  }

  componentDidCatch(error: unknown): void {
    if (shouldIgnoreError(error)) return;
    // Lazy-load monitoring to avoid circular deps
    import('../utils/monitoring').then(({ Sentry }) => {
      Sentry.captureException(error);
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const name = this.props.featureName ?? 'This section';

    return (
      <div
        role="alert"
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: 'var(--text-primary, #fff)',
          background: 'var(--surface-strong, rgba(11,33,53,0.88))',
          borderRadius: 20,
          border: '1px solid var(--border, rgba(71,183,230,0.14))',
          margin: '24px auto',
          maxWidth: 480,
        }}
      >
        <p style={{ fontWeight: 800, marginBottom: 8 }}>{name} could not be loaded</p>
        <p style={{ color: 'var(--text-secondary, rgba(255,255,255,0.6))', fontSize: '0.88rem', marginBottom: 20 }}>
          {this.state.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ hasError: false, message: '' });
            window.location.reload();
          }}
          style={{
            padding: '10px 24px',
            borderRadius: 12,
            border: 'none',
            background: 'var(--theme-gradient-accent, linear-gradient(135deg,#47B7E6,#1E5FAE))',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
