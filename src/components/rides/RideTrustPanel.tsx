import type { RideResult } from '../../modules/rides/ride.types';
import {
  getRideTrustSummary,
  type RideTrustLanguage,
} from '../../domains/trust/rideTrust';
import { FONT_DISPLAY as LANDING_FONT } from '../../styles/shared-ui';

const TRUST_TONE_STYLES = {
  cyan: {
    background: 'rgba(6,182,212,0.12)',
    border: 'rgba(6,182,212,0.26)',
    color: '#67e8f9',
  },
  gold: {
    background: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.26)',
    color: '#fbbf24',
  },
  green: {
    background: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.26)',
    color: '#34d399',
  },
} as const;

interface RideTrustPanelProps {
  language: RideTrustLanguage;
  ride: RideResult;
  supportLine?: string;
  variant?: 'compact' | 'detail';
}

export function RideTrustPanel({
  language,
  ride,
  supportLine,
  variant = 'compact',
}: RideTrustPanelProps) {
  const summary = getRideTrustSummary(ride, language, { supportLine });
  const isDetailed = variant === 'detail';

  if (!isDetailed) {
    return (
      <div
        style={{
          display: 'grid',
          gap: 10,
          marginTop: 12,
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <div
              style={{
                color: 'rgba(255,255,255,0.48)',
                fontFamily: LANDING_FONT,
                fontSize: '0.66rem',
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
                fontFamily: LANDING_FONT,
                fontSize: '0.9rem',
                fontWeight: 800,
                lineHeight: 1.3,
              }}
            >
              {summary.headline}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              minWidth: 72,
              padding: '8px 10px',
              borderRadius: 16,
              border: '1px solid rgba(6,182,212,0.24)',
              background: 'rgba(6,182,212,0.1)',
            }}
          >
            <div
              style={{
                color: '#67e8f9',
                fontFamily: LANDING_FONT,
                fontSize: '1.15rem',
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {summary.score}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontFamily: LANDING_FONT,
                fontSize: '0.62rem',
                fontWeight: 700,
              }}
            >
              {summary.tierLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {summary.signals.slice(0, 3).map((signal) => {
            const tone = TRUST_TONE_STYLES[signal.tone];

            return (
              <div
                key={signal.id}
                style={{
                  display: 'grid',
                  gap: 4,
                  minWidth: 150,
                  flex: '1 1 0',
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: `1px solid ${tone.border}`,
                  background: tone.background,
                }}
              >
                <div
                  style={{
                    color: tone.color,
                    fontFamily: LANDING_FONT,
                    fontSize: '0.64rem',
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
                    fontFamily: LANDING_FONT,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {signal.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 18,
        padding: '18px 18px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid',
        gap: 14,
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
              color: 'rgba(255,255,255,0.48)',
              fontFamily: LANDING_FONT,
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
              fontFamily: LANDING_FONT,
              fontSize: '1rem',
              fontWeight: 900,
              lineHeight: 1.3,
            }}
          >
            {summary.headline}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.64)',
              fontFamily: LANDING_FONT,
              fontSize: '0.82rem',
              lineHeight: 1.55,
            }}
          >
            {summary.detail}
          </div>
        </div>

        <div
          style={{
            minWidth: 92,
            padding: '12px 14px',
            borderRadius: 18,
            border: '1px solid rgba(6,182,212,0.24)',
            background: 'rgba(6,182,212,0.1)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: '#67e8f9',
              fontFamily: LANDING_FONT,
              fontSize: '1.45rem',
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {summary.score}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.64)',
              fontFamily: LANDING_FONT,
              fontSize: '0.66rem',
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
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {summary.signals.map((signal) => {
          const tone = TRUST_TONE_STYLES[signal.tone];

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
                  fontFamily: LANDING_FONT,
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
                  fontFamily: LANDING_FONT,
                  fontSize: '0.82rem',
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
