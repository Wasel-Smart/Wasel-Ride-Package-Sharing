/**
 * EmptyState — unified design system
 */

import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
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
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-tertiary)',
          color: 'var(--accent)',
        }}
      >
        {icon ?? <Inbox size={24} />}
      </div>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
