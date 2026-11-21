import { type ReactNode } from 'react';
import { F, R, SH, SPACE, TYPE  } from '../../../utils/wasel-ds';
import { StatusBadge } from '../../../components/wasel-ui/WaselPagePrimitives';
import { stateAccent, type TrustStepState } from './VerificationSteps';

export function StepCard({
  title,
  subtitle,
  state,
  icon,
  children,
  footer,
  badgeLabel,
  onBadgeClick,
}: {
  title: string;
  subtitle: string;
  state: TrustStepState;
  icon: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  badgeLabel?: string;
  /** When set, the status badge becomes a real button (e.g. "Not started" starts the step). */
  onBadgeClick?: () => void;
  t?: (key: string) => string;
}) {
  const accent = stateAccent(state);
  const badge = (
    <StatusBadge
      label={
        badgeLabel ??
          (state === 'completed'
            ? 'Completed'
            : state === 'in_progress'
              ? 'In progress'
              : state === 'failed'
                ? 'Failed'
                : 'Not started')
      }
      accent={accent}
    />
  );

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[4],
        padding: SPACE[5],
        borderRadius: R.xxl,
        border: `1px solid ${accent}24`,
        background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), ${'var(--card)'}`,
        boxShadow: SH.md,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: SPACE[4],
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACE[3],
              color: 'var(--foreground)',
              fontWeight: TYPE.weight.bold,
              fontFamily: F,
            }}
          >
            {icon}
            <span>{title}</span>
          </div>
          <div
            style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.sm, fontFamily: F, lineHeight: TYPE.lineHeight.relaxed }}
          >
            {subtitle}
          </div>
        </div>
        {onBadgeClick ? (
          <button
            type="button"
            onClick={onBadgeClick}
            aria-label={badgeLabel ?? title}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
              font: 'inherit',
              color: 'inherit',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {badge}
          </button>
        ) : (
          badge
        )}
      </div>
      {children}
      {footer}
    </div>
  );
}

