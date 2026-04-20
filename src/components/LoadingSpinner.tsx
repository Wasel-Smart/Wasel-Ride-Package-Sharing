import { Loader2 } from 'lucide-react';
import { cn, C, R, TYPE } from '../utils/wasel-ds';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: { width: '16px', height: '16px' },
    md: { width: '24px', height: '24px' },
    lg: { width: '32px', height: '32px' },
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      className={cn(className)}
    >
      <Loader2
        style={{ ...sizeClasses[size], animation: 'spin 1s linear infinite', color: C.textMuted }}
      />
      {text && <span style={{ fontSize: TYPE.size.sm, color: C.textMuted }}>{text}</span>}
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingCard({ title = 'Loading...', description, className }: LoadingCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '200px',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        borderRadius: R.xl,
        border: `1px solid ${C.border}`,
        padding: '32px',
      }}
      className={cn(className)}
    >
      <LoadingSpinner size="lg" />
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontWeight: TYPE.weight.semibold, color: C.text }}>{title}</h3>
        {description && (
          <p style={{ marginTop: '4px', fontSize: TYPE.size.sm, color: C.textMuted }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
