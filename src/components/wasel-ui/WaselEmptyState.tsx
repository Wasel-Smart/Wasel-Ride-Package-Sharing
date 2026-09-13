import type { CSSProperties, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { tx } from '@/locales/tx';
import { C, R, TYPE, SPACE } from '@/utils/wasel-ds';

interface WaselEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  accent?: string;
}

export function WaselEmptyState ({
  icon,
  title,
  description,
  action,
  accent = C.cyan,
}: WaselEmptyStateProps) {
  return (
    <div
      style={ {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: `${SPACE[ 16 ]} ${SPACE[ 8 ]}`,
        minHeight: '50vh',
      } }
    >
      <div
        style={ {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: R['3xl'],
          background: `${accent}12`,
          border: `1px solid ${accent}24`,
          marginBottom: SPACE[ 5 ],
          color: accent,
        } }
      >
        {icon}
      </div>
      <h3
        style={ {
          margin: `0 0 ${SPACE[ 2 ]}`,
          fontSize: TYPE.size.lg,
          fontWeight: TYPE.weight.bold,
          color: C.text,
          lineHeight: TYPE.lineHeight.tight,
        } }
      >
        {title}
      </h3>
      {description ? (
        <p
          style={ {
            margin: `0 0 ${SPACE[ 5 ]}`,
            fontSize: TYPE.size.base,
            color: C.textMuted,
            lineHeight: TYPE.lineHeight.relaxed,
            maxWidth: 400,
          } }
        >
          {description}
        </p>
      ) : null}
      {action ? (
        <div style={{ display: 'flex', gap: SPACE[3] }}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyTripsIcon () {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
      <line x1="9" y1="7" x2="9" y2="7" strokeDasharray="2 2" />
    </svg>
  );
}

export function EmptyNotificationsIcon () {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
      <line x1="15" y1="3" x2="9" y2="9" strokeDasharray="1 2" />
    </svg>
  );
}

export function EmptySearchIcon () {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="8" x2="8" y2="8" strokeDasharray="1 1" />
    </svg>
  );
}
