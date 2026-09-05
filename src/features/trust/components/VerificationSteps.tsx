import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';
import type { TrustStepState } from '../../../services/trustCenterModel';

export type { TrustStepState } from '../../../services/trustCenterModel';

export const VERIFICATION_STEP_ORDER = [
  'identity',
  'email',
  'phone',
  'driverDocuments',
  'walletStanding',
] as const;

export function stateAccent(state: TrustStepState): string {
  switch (state) {
    case 'completed':
      return C.green;
    case 'in_progress':
      return C.cyan;
    case 'failed':
      return C.error;
    default:
      return C.gold;
  }
}

export function VerificationSteps({
  steps,
  t,
  dir,
}: {
  steps: Record<string, { state: string; detail?: string }>;
  t: (key: string) => string;
  dir?: 'ltr' | 'rtl';
}) {
  const completedCount = VERIFICATION_STEP_ORDER.filter(
    stepId => (steps[stepId]?.state ?? 'not_started') === 'completed',
  ).length;
  const fontFamily = dir === 'rtl' ? `${F}, ${FA}` : F;

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[4],
        marginBottom: SPACE[6],
        padding: SPACE[5],
        borderRadius: R.xl,
        border: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.card}, rgba(9,22,34,0.92))`,
        boxShadow: '0 1px 0 rgba(0,229,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily }}>
          {t('trustCenterExpanded.checksDone')}
        </span>
        <span
          style={{
            color: C.textSub,
            fontSize: TYPE.size.sm,
            fontWeight: TYPE.weight.bold,
            fontFamily,
          }}
        >
          {completedCount}/{VERIFICATION_STEP_ORDER.length} {t('trustCenterExpanded.completed').toLowerCase()}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {VERIFICATION_STEP_ORDER.map((stepId, index) => {
          const step = steps[stepId];
          const state = (step?.state ?? 'not_started') as TrustStepState;
          const accent = stateAccent(state);
          const isLast = index === VERIFICATION_STEP_ORDER.length - 1;
          const isComplete = state === 'completed';
          const isActive = state === 'in_progress';
          const isFailed = state === 'failed';

          return (
            <div
              key={stepId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 0 }}>
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 999,
                    background: isComplete
                      ? `linear-gradient(90deg, ${C.green}, ${C.cyan})`
                      : isActive
                        ? `linear-gradient(90deg, ${C.cyan}66, ${C.border})`
                        : C.borderFaint,
                    opacity: isComplete || isActive ? 1 : 0.35,
                    transition: 'all 300ms',
                    boxShadow: isActive ? `0 0 8px ${C.cyan}40` : 'none',
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isComplete
                        ? accent
                        : isFailed
                          ? C.error
                          : isActive
                            ? C.cyan
                            : C.border,
                      margin: '0 -5px',
                      flexShrink: 0,
                      boxShadow: isComplete || isActive ? `0 0 0 3px ${C.bgDeep}` : 'none',
                      border: isComplete || isActive ? `2px solid ${C.bgDeep}` : 'none',
                      transition: 'all 300ms',
                    }}
                  />
                )}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 999,
                      background: C.borderFaint,
                      opacity: 0.25,
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  marginTop: SPACE[2],
                  fontSize: TYPE.size.xs,
                  color: isComplete ? C.textSub : isActive ? C.cyan : C.textDim,
                  fontWeight: isComplete ? TYPE.weight.bold : TYPE.weight.regular,
                  fontFamily,
                  textAlign: 'center',
                  lineHeight: 1.35,
                  transition: 'color 300ms',
                }}
              >
                {t(`trustCenterExpanded.${stepId}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
