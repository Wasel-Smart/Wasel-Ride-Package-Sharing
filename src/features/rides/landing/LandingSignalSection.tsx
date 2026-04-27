import { LANDING_COLORS, clamp, landingPanel, type LandingSignalCard } from './landingTypes';
import { visuallyHiddenStyle } from './landingSectionShared';

type LandingSignalSectionProps = {
  cards: readonly LandingSignalCard[];
};

export function LandingSignalSection({ cards }: LandingSignalSectionProps) {
  return (
    <section aria-labelledby="ride-corridor-signals-title">
      <h2 id="ride-corridor-signals-title" style={visuallyHiddenStyle}>
        Corridor signals
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {cards.map(card => {
          const average = Math.round(
            card.sparkline.reduce((sum, value) => sum + value, 0) / card.sparkline.length,
          );
          const change = card.sparkline[card.sparkline.length - 1] - card.sparkline[0];
          const fill = clamp(average, 18, 92);

          return (
            <div
              key={card.title}
              className="wasel-lift-card"
              style={{
                ...landingPanel(20),
                padding: '22px',
                display: 'grid',
                gap: 18,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `radial-gradient(circle at top right, ${card.accent}12, transparent 24%)`,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <div
                    style={{
                      color: card.accent,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      fontWeight: 800,
                    }}
                  >
                    {card.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: LANDING_COLORS.soft,
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      maxWidth: 280,
                    }}
                  >
                    {card.detail}
                  </p>
                </div>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: `${card.accent}12`,
                    border: `1px solid ${card.accent}28`,
                    color: card.accent,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    textAlign: 'center',
                  }}
                >
                  {card.intensity}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--wasel-surface-muted-strong)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${fill}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${card.accent}, rgba(255,255,255,0.7))`,
                      boxShadow: `0 0 12px ${card.accent}44`,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span
                      style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      Signal
                    </span>
                    <span style={{ color: LANDING_COLORS.text, fontSize: '1rem', fontWeight: 800 }}>
                      {average}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span
                      style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      Trend
                    </span>
                    <span
                      style={{
                        color: change >= 0 ? card.accent : LANDING_COLORS.text,
                        fontSize: '1rem',
                        fontWeight: 800,
                      }}
                    >
                      {change >= 0 ? '+' : ''}
                      {change}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span
                      style={{ color: LANDING_COLORS.muted, fontSize: '0.7rem', fontWeight: 600 }}
                    >
                      Mode
                    </span>
                    <span
                      style={{ color: LANDING_COLORS.text, fontSize: '0.92rem', fontWeight: 700 }}
                    >
                      {card.trendLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
