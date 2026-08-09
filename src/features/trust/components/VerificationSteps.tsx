const STEP_ORDER = ['identity', 'email', 'phone', 'driverDocuments', 'walletStanding'] as const;
const STEP_LABELS: Record<string, string> = {
  identity: 'Identity',
  email: 'Email',
  phone: 'Phone',
  driverDocuments: 'Driver documents',
  walletStanding: 'Wallet standing',
};

import { type TrustCenterStatus, type TrustStepStatus } from '../../../services/trustCenterModel';

export function VerificationSteps({
  steps,
  t,
}: {
  steps: TrustCenterStatus['steps'];
  t: (key: string) => string;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {STEP_ORDER.map(stepId => {
        const step = steps[stepId];
        const state = step?.state ?? 'not_started';
        const accent =
          state === 'completed' ? '#22c55e' :
          state === 'in_progress' ? '#38bdf8' :
          state === 'failed' ? '#ef4444' : '#f59e0b';
        return (
          <div
            key={stepId}
            title={t(`trustCenterExpanded.${STEP_LABELS[stepId] ?? stepId}`)}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: accent,
              opacity: state === 'not_started' ? 0.22 : 1,
              transition: 'background 300ms, opacity 300ms',
            }}
          />
        );
      })}
    </div>
  );
}
