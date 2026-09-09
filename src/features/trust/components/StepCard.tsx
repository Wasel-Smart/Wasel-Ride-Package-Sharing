import { type ReactNode } from 'react';
import { C, F, R, SH, SPACE, TYPE } from '../../../utils/wasel-ds';
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
}: {
  title: string;
  subtitle: string;
  state: TrustStepState;
  icon: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  badgeLabel?: string;
  t?: (key: string) => string;
}) {
  const accent = stateAccent(state);

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[4],
        padding: SPACE[5],
        borderRadius: R.xxl,
        border: `1px solid ${accent}24`,
        background: `radial-gradient(circle at top left, ${accent}12, transparent 34%), ${C.card}`,
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
              color: C.text,
              fontWeight: TYPE.weight.bold,
              fontFamily: F,
            }}
          >
            {icon}
            <span>{title}</span>
          </div>
          <div
            style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F, lineHeight: TYPE.lineHeight.relaxed }}
          >
            {subtitle}
          </div>
        </div>
        <StatusBadge
          label={
            badgeLabel ??
              (t
                ? t(
                    `trustCenterExpanded.${
                      state === 'completed'
                        ? 'completed'
                        : state === 'in_progress'
                          ? 'inProgress'
                          : state === 'failed'
                            ? 'failed'
                            : 'notStarted'
                    }`,
                  )
                : state === 'completed'
                  ? 'Completed'
                  : state === 'in_progress'
                    ? 'In progress'
                    : state === 'failed'
                      ? 'Failed'
                      : 'Not started')
          }
          accent={accent}
        />
      </div>
      {children}
      {footer}
    </div>
  );
}
