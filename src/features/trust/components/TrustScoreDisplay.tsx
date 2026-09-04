import { C, F, R, TYPE } from '../../../utils/wasel-ds';

const RING_SIZE = 120;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number): string {
  if (score >= 80) {return C.green;}
  if (score >= 50) {return C.gold;}
  return C.error;
}

function scoreLabel(score: number): string {
  if (score >= 80) {return 'Strong';}
  if (score >= 50) {return 'Fair';}
  return 'Weak';
}

export function TrustScoreDisplay({
  score,
  label,
}: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);
  const labelText = scoreLabel(clamped);
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '24px 24px 20px',
        borderRadius: R.xl,
        border: `1px solid ${C.border}`,
        background: C.elevated,
      }}
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 130 130">
        <circle
          cx="65"
          cy="65"
          r={RADIUS}
          fill="none"
          stroke={C.border}
          strokeWidth={STROKE - 2}
          opacity={0.3}
        />
        <circle
          cx="65"
          cy="65"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 600ms ease-out, stroke 300ms',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={C.text}
          fontFamily={F}
          fontSize={32}
          fontWeight={TYPE.weight.ultra}
        >
          {clamped}
        </text>
      </svg>
      <div style={{ fontWeight: TYPE.weight.bold, fontFamily: F, color: C.textMuted, fontSize: TYPE.size.sm }}>
        {label}
      </div>
      <div
        style={{
          padding: '2px 8px',
          borderRadius: R.full,
          background: `${color}18`,
          color,
          fontSize: TYPE.size.xs,
          fontWeight: TYPE.weight.bold,
          fontFamily: F,
          border: `1px solid ${color}28`,
        }}
      >
        {labelText}
      </div>
    </div>
  );
}
