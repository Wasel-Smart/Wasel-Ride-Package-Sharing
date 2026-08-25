import { motion } from 'framer-motion';
import type { CorridorBetaPlan } from '../../../services/corridorBeta';
import { C, R, SH, TYPE } from '../../../utils/wasel-ds';
import { corridorLabel, corridorNextAction, corridorReason, stageColor, stageLabel } from './corridorBetaHelpers';

interface CorridorBetaCardProps {
  corridor: CorridorBetaPlan['focusCorridors'][number];
  ar: boolean;
  onNavigate: (path: string, source?: string) => void;
}

export function CorridorBetaCard({ corridor, ar, onNavigate }: CorridorBetaCardProps) {
  const accent = stageColor(corridor.stage);

  return (
    <motion.button
      type="button"
      onClick={() => onNavigate(corridor.path, 'corridor_beta_card')}
      style={{
        minHeight: 224,
        textAlign: 'left',
        borderRadius: R.xxl,
        padding: 18,
        background: `linear-gradient(180deg, ${accent}18, ${C.card})`,
        border: `1px solid ${accent}55`,
        boxShadow: SH.sm,
        cursor: 'pointer',
        color: C.text,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: TYPE.weight.black,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            {stageLabel(corridor.stage, ar)}
          </div>
          <div style={{ marginTop: 8, fontSize: '1.02rem', fontWeight: TYPE.weight.black }}>
            {corridorLabel(corridor.corridor, ar)}
          </div>
        </div>
        <div
          style={{
            minWidth: 58,
            padding: '6px 8px',
            borderRadius: R.lg,
            background: C.elevated,
            border: `1px solid ${accent}44`,
            color: accent,
            fontWeight: TYPE.weight.black,
            textAlign: 'center',
          }}
        >
          {corridor.proofScore}
        </div>
      </div>

      <div
        style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
      >
        <div style={{ padding: 10, borderRadius: R.lg, background: C.elevated }}>
          <div
            style={{
              color: C.textMuted,
              fontSize: '0.66rem',
              fontWeight: TYPE.weight.semibold,
            }}
          >
            {corridor.weeklyRides}/{corridor.weeklyRideGoal}
          </div>
          <div style={{ marginTop: 4, fontWeight: TYPE.weight.black }}>
            weekly rides
          </div>
        </div>
        <div style={{ padding: 10, borderRadius: R.lg, background: C.elevated }}>
          <div
            style={{
              color: C.textMuted,
              fontSize: '0.66rem',
              fontWeight: TYPE.weight.semibold,
            }}
          >
            {Math.round(corridor.repeatRideRate * 100)}%
          </div>
          <div style={{ marginTop: 4, fontWeight: TYPE.weight.black }}>
            repeat rate
          </div>
        </div>
      </div>

      <p
        style={{
          margin: '14px 0 0',
          color: C.textMuted,
          fontSize: TYPE.size.sm,
          lineHeight: 1.55,
        }}
      >
        {corridorReason(corridor.reason, ar)}
      </p>

      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${C.borderFaint}`,
          color: accent,
          fontSize: '0.76rem',
          fontWeight: TYPE.weight.bold,
          lineHeight: 1.45,
        }}
      >
        {corridorNextAction(corridor.nextAction, ar)}
      </div>
    </motion.button>
  );
}
