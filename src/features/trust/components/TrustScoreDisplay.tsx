import { C, F, FA, R, TYPE } from '../../../utils/wasel-ds';

const RING_SIZE = 120;
const STROKE = 10;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number): string {
  if (score >= 80) {return C.green;}
  if (score >= 50) {return C.gold;}
  return C.error;
}

export function TrustScoreDisplay({
  score,
  label,
  scoreLabel,
  dir,
}: {
  score: number;
  label: string;
  scoreLabel?: string;
  dir?: 'ltr' | 'rtl';
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);
  const labelText = scoreLabel ?? (clamped >= 80 ? 'Strong' : clamped >= 50 ? 'Fair' : 'Weak');
  const offset = CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  const fontFamily = dir === 'rtl' ? FA : F;

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
        <defs>
          <filter id="trust-score-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.35" />
          </filter>
        </defs>
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
          filter="url(#trust-score-glow)"
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
          fontFamily={fontFamily}
          fontSize={32}
          fontWeight={TYPE.weight.ultra}
        >
          {clamped}
        </text>
      </svg>
      <div style={{ fontWeight: TYPE.weight.bold, fontFamily, color: C.textMuted, fontSize: TYPE.size.sm }}>
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
          fontFamily,
          border: `1px solid ${color}28`,
        }}
      >
        {labelText}
      </div>
    </div>
  );
}
