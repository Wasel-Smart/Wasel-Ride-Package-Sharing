import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';

const FACTORS = [
  { key: 'base', labelKey: 'trustScoreFactorBase', value: 45, max: 45 },
  { key: 'email', labelKey: 'trustScoreFactorEmail', value: 10, max: 10 },
  { key: 'phone', labelKey: 'trustScoreFactorPhone', value: 10, max: 10 },
  { key: 'both', labelKey: 'trustScoreFactorBoth', value: 15, max: 15 },
  { key: 'trips', labelKey: 'trustScoreFactorTrips', value: 20, max: 20 },
  { key: 'rating', labelKey: 'trustScoreFactorRating', value: 10, max: 10 },
];

export function TrustScoreExplanation({
  score,
  t,
  compact,
}: {
  score: number;
  t: (key: string) => string;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[3],
        padding: compact ? SPACE[4] : SPACE[5],
        borderRadius: R.xl,
        border: `1px solid ${C.border}`,
        background: C.card,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: SPACE[2],
        }}
      >
        <div
          style={{
            color: C.text,
            fontWeight: TYPE.weight.bold,
            fontSize: TYPE.size.sm,
            fontFamily: F,
          }}
        >
          {t('trustCenterExpanded.trustScoreBreakdownTitle')}
        </div>
        <div style={{ color: C.textMuted, fontSize: TYPE.size.xs, fontFamily: F }}>
          {t('trustCenterExpanded.trustScoreCurrent')}: {clamped} / {t('trustCenterExpanded.trustScoreMax')}: 100
        </div>
      </div>
      <div style={{ display: 'grid', gap: SPACE[2] }}>
        {FACTORS.map((factor) => {
          const percentage = factor.max > 0 ? (factor.value / factor.max) * 100 : 0;
          return (
            <div key={factor.key} style={{ display: 'grid', gap: 4 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: TYPE.size.xs,
                  fontFamily: F,
                }}
              >
                <span style={{ color: C.textMuted }}>{t(`trustCenterExpanded.${factor.labelKey}`)}</span>
                <span style={{ color: C.textSub, fontWeight: TYPE.weight.bold }}>
                  +{factor.value}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: C.borderFaint,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    borderRadius: 999,
                    background: C.cyan,
                    transition: 'width 600ms ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          color: C.textMuted,
          fontSize: TYPE.size.xs,
          fontFamily: F,
          lineHeight: 1.6,
        }}
      >
        {t('trustCenterExpanded.trustScoreBreakdownSubtitle')}
      </div>
    </div>
  );
}
