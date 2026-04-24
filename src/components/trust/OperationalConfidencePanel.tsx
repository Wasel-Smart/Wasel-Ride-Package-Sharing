import type { CSSProperties } from 'react';
import type { OperationalConfidenceSummary } from '../../domains/trust/operationalConfidence';

const TONE_STYLES = {
  cyan: {
    background: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.24)',
    color: '#67e8f9',
  },
  gold: {
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.24)',
    color: '#fbbf24',
  },
  green: {
    background: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.24)',
    color: '#34d399',
  },
} as const;

interface OperationalConfidencePanelProps {
  summary: OperationalConfidenceSummary;
  variant?: 'compact' | 'detail';
  className?: string;
  style?: CSSProperties;
}

export function OperationalConfidencePanel({
  summary,
  variant = 'compact',
  className,
  style,
}: OperationalConfidencePanelProps) {
  const isDetailed = variant === 'detail';
  const visibleSignals = isDetailed ? summary.signals : summary.signals.slice(0, 3);

  return (
    <section
      className={className}
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
        borderRadius: 18,
        padding: isDetailed ? '18px 18px 16px' : '14px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid',
        gap: isDetailed ? 14 : 12,
        boxShadow: '0 10px 22px rgba(0,0,0,0.12)',
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 14,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 220 }}>
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {summary.scoreLabel}
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: isDetailed ? '1rem' : '0.92rem',
              fontWeight: 900,
              lineHeight: 1.3,
            }}
          >
            {summary.headline}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.68)',
              fontSize: isDetailed ? '0.82rem' : '0.78rem',
              lineHeight: 1.55,
            }}
          >
            {summary.detail}
          </div>
        </div>

        <div
          style={{
            minWidth: isDetailed ? 92 : 80,
            padding: isDetailed ? '12px 14px' : '10px 12px',
            borderRadius: 18,
            border: '1px solid rgba(6,182,212,0.24)',
            background: 'rgba(6,182,212,0.1)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#67e8f9',
              fontSize: isDetailed ? '1.45rem' : '1.2rem',
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {summary.score}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.64)',
              fontSize: isDetailed ? '0.66rem' : '0.62rem',
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {summary.tierLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDetailed
            ? 'repeat(auto-fit, minmax(180px, 1fr))'
            : 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {visibleSignals.map((signal) => {
          const tone = TONE_STYLES[signal.tone];

          return (
            <div
              key={signal.id}
              style={{
                borderRadius: 14,
                border: `1px solid ${tone.border}`,
                background: tone.background,
                padding: '12px 13px',
                display: 'grid',
                gap: 6,
              }}
            >
              <div
                style={{
                  color: tone.color,
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {signal.label}
              </div>
              <div
                style={{
                  color: '#fff',
                  fontSize: isDetailed ? '0.82rem' : '0.78rem',
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                {signal.value}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
