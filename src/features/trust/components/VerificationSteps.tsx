import { C, F, TYPE } from '../../../utils/wasel-ds';
import type { TrustStepState } from '../../../services/trustCenterModel';

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
}: {
  steps: Record<string, { state: string; detail?: string }>;
  t: (key: string) => string;
}) {
  const completedCount = VERIFICATION_STEP_ORDER.filter(
    stepId => (steps[stepId]?.state ?? 'not_started') === 'completed',
  ).length;

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontFamily: F }}>
          {t('trustCenterExpanded.checksDone')}
        </span>
        <span style={{ color: C.textSub, fontSize: TYPE.size.sm, fontWeight: TYPE.weight.bold, fontFamily: F }}>
          {completedCount}/{VERIFICATION_STEP_ORDER.length} {t('trustCenterExpanded.completed').toLowerCase()}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {VERIFICATION_STEP_ORDER.map((stepId, index) => {
          const step = steps[stepId];
          const state = (step?.state ?? 'not_started') as TrustStepState;
          const accent = stateAccent(state);
          const isLast = index === VERIFICATION_STEP_ORDER.length - 1;

          return (
            <div key={stepId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: state === 'completed' ? accent : C.borderFaint,
                    opacity: state === 'not_started' && index > completedCount ? 0.22 : 1,
                    transition: 'background 300ms, opacity 300ms',
                  }}
                />
                {!isLast && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: accent,
                      margin: '0 -4px',
                      boxShadow: state === 'completed' ? `0 0 0 3px ${C.bgDeep}` : 'none',
                    }}
                  />
                )}
                {!isLast && (
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 999,
                      background: C.borderFaint,
                      opacity: 0.22,
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  marginTop: 6,
                  fontSize: TYPE.size.xs,
                  color: state === 'not_started' ? C.textDim : C.textSub,
                  fontWeight: state === 'completed' ? TYPE.weight.bold : TYPE.weight.regular,
                  fontFamily: F,
                  textAlign: 'center',
                  lineHeight: 1.3,
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
