import type { ReactNode } from 'react';
import { R, TYPE, SPACE  } from '../../utils/wasel-ds';

interface WaselErrorStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

/**
 * Shared error state — the error twin of WaselEmptyState.
 * Brand rose accent, soft navy shadow, no glow spreads.
 */
export function WaselErrorState({
  icon,
  title,
  description,
  action,
  compact = false,
}: WaselErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: compact ? `${SPACE[10]} ${SPACE[8]}` : `${SPACE[16]} ${SPACE[8]}`,
        minHeight: compact ? 'auto' : '50vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: R['3xl'],
          background: 'var(--destructive)12',
          border: `1px solid color-mix(in srgb, 'var(--destructive)' 24%, transparent)`,
          marginBottom: SPACE[5],
          color: `var(--destructive)`,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: `0 0 ${SPACE[2]}`,
          fontSize: TYPE.size.lg,
          fontWeight: TYPE.weight.bold,
          color: `var(--foreground)`,
          lineHeight: TYPE.lineHeight.tight,
        }}
      >
        {title}
      </h3>
      {description ? (
        <p
          style={{
            margin: `0 0 ${SPACE[5]}`,
            fontSize: TYPE.size.base,
            color: `var(--muted-foreground)`,
            lineHeight: TYPE.lineHeight.relaxed,
            maxWidth: 400,
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ display: 'flex', gap: SPACE[3] }}>{action}</div> : null}
    </div>
  );
}
