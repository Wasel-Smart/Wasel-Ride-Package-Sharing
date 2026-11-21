import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';
import { TRUST_SCORE_MAX, type TrustScoreFactor } from '../../../domain/trust/score';

export function TrustScoreExplanation({
  score,
  factors,
  t,
  compact,
}: {
  score: number;
  /**
   * Real per-factor contribution from `deriveAccountTrustScoreFactors`. When it
   * is absent the component shows the score alone and says the breakdown is
   * unavailable — it never renders invented factors.
   */
  factors?: TrustScoreFactor[];
  t: (key: string) => string;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(TRUST_SCORE_MAX, score));
  const realFactors = factors ?? null;

  return (
    <div
      style={{
        display: 'grid',
        gap: SPACE[3],
        padding: compact ? SPACE[4] : SPACE[5],
        borderRadius: R.xl,
        border: `1px solid ${'var(--border)'}`,
        background: 'var(--card)',
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
            color: 'var(--foreground)',
            fontWeight: TYPE.weight.bold,
            fontSize: TYPE.size.sm,
            fontFamily: F,
          }}
        >
          {t('trustCenterExpanded.trustScoreBreakdownTitle')}
        </div>
        <div style={{ color: 'var(--muted-foreground)', fontSize: TYPE.size.xs, fontFamily: F }}>
          {t('trustCenterExpanded.trustScoreCurrent')}: {clamped} / {t('trustCenterExpanded.trustScoreMax')}:{' '}
          {TRUST_SCORE_MAX}
        </div>
      </div>
      {realFactors ? (
        <>
          <div style={{ display: 'grid', gap: SPACE[2] }}>
            {realFactors.map(factor => {
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
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {t(`trustCenterExpanded.trustScoreFactor${capitalize(factor.key)}`)}
                    </span>
                    <span style={{ color: 'var(--foreground)', fontWeight: TYPE.weight.bold }}>
                      +{factor.value} / {factor.max}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: 'var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        borderRadius: 999,
                        background: 'var(--primary)',
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
              color: 'var(--muted-foreground)',
              fontSize: TYPE.size.xs,
              fontFamily: F,
              lineHeight: 1.6,
            }}
          >
            {t('trustCenterExpanded.trustScoreBreakdownCapped')}
          </div>
        </>
      ) : (
        <div
          style={{
            color: 'var(--muted-foreground)',
            fontSize: TYPE.size.xs,
            fontFamily: F,
            lineHeight: 1.6,
          }}
        >
          {t('trustCenterExpanded.trustScoreBreakdownUnavailable')}
        </div>
      )}
      <div
        style={{
          color: 'var(--muted-foreground)',
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}