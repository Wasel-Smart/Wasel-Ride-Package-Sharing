import type { ReactNode } from 'react';
import { Inbox, C, R, TYPE, F } from '../utils/wasel-ds';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '48px 24px',
        textAlign: 'center',
      }}
      className={className}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: R.xxl,
          background: C.cyanDim,
          color: C.cyan,
        }}
      >
        {icon ?? <Inbox size={28} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <h3
          style={{
            margin: 0,
            fontSize: TYPE.size.lg,
            fontWeight: TYPE.weight.bold,
            color: C.text,
            fontFamily: F,
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              margin: 0,
              fontSize: TYPE.size.sm,
              color: C.textMuted,
              fontFamily: F,
              maxWidth: '280px',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
