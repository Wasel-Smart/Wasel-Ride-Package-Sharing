import { WaselCard } from '../wasel-ui';
import { C,  R, SPACE, TYPE  } from '../../utils/wasel-ds';

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
    background: `linear-gradient(135deg, var(--card), var(--secondary))`,
    border: 'var(--border)',
    value: 'var(--foreground)',
  },
  attention: {
    background: `linear-gradient(135deg, ${C.cyanDim}, var(--secondary))`,
    border: C.cyanDim,
    value: C.cyan,
  },
  urgent: {
    background: `linear-gradient(135deg, ${C.goldDim}, var(--secondary))`,
    border: C.goldDim,
    value: C.gold,
  },
  archived: {
    background: `linear-gradient(135deg, var(--secondary), var(--card))`,
    border: 'var(--border)',
    value: 'var(--muted-foreground)',
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
          color: 'var(--muted-foreground)',
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

