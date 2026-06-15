import { WaselCard } from '../../design-system';
import { C, R, SPACE, TYPE } from '../../utils/wasel-ds';

type NotificationMetricTone = 'neutral' | 'attention' | 'urgent' | 'archived';

type NotificationMetricProps = {
  label: string;
  value: string | number;
  tone: NotificationMetricTone;
};

const toneStyle: Record<
  NotificationMetricTone,
  { background: string; border: string; value: string }
> = {
  neutral: {
    background: `linear-gradient(135deg, ${C.cardSolid}, ${C.elevated})`,
    border: C.border,
    value: C.text,
  },
  attention: {
    background: `linear-gradient(135deg, ${C.cyanDim}, ${C.elevated})`,
    border: C.cyanDim,
    value: C.cyan,
  },
  urgent: {
    background: `linear-gradient(135deg, ${C.goldDim}, ${C.elevated})`,
    border: C.goldDim,
    value: C.gold,
  },
  archived: {
    background: `linear-gradient(135deg, ${C.elevated}, ${C.cardSolid})`,
    border: C.borderFaint,
    value: C.textSub,
  },
};

export function NotificationMetric({ label, value, tone }: NotificationMetricProps) {
  const style = toneStyle[tone];

  return (
    <WaselCard
      variant="solid"
      padding={SPACE[4]}
      radius={R.xl}
      style={{ background: style.background, borderColor: style.border }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: TYPE.letterSpacing.widest,
          color: C.textMuted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: SPACE[2],
          fontSize: TYPE.size['2xl'],
          fontWeight: TYPE.weight.bold,
          color: style.value,
        }}
      >
        {value}
      </div>
    </WaselCard>
  );
}
