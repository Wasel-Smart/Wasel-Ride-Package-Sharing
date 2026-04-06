import type { CSSProperties } from 'react';

const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

type StakeholderTone = 'teal' | 'blue' | 'green' | 'amber' | 'rose' | 'slate';

export interface StakeholderSignalItem {
  label: string;
  value?: string;
  tone?: StakeholderTone;
}

export interface StakeholderLaneItem {
  label: string;
  detail?: string;
}

export interface StakeholderStatusItem {
  label: string;
  value: string;
  tone?: StakeholderTone;
}

export interface StakeholderSignalBannerProps {
  eyebrow: string;
  title: string;
  detail: string;
  stakeholders: StakeholderSignalItem[];
  lanes?: StakeholderLaneItem[];
  statuses?: StakeholderStatusItem[];
  dir?: 'ltr' | 'rtl';
}

const toneMap: Record<StakeholderTone, { color: string; border: string; background: string }> = {
  teal: { color: '#67E8F9', border: 'rgba(34,211,238,0.28)', background: 'rgba(34,211,238,0.12)' },
  blue: { color: '#93C5FD', border: 'rgba(96,165,250,0.28)', background: 'rgba(96,165,250,0.12)' },
  green: { color: '#86EFAC', border: 'rgba(34,197,94,0.28)', background: 'rgba(34,197,94,0.12)' },
  amber: { color: '#FCD34D', border: 'rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.12)' },
  rose: { color: '#FDA4AF', border: 'rgba(244,63,94,0.28)', background: 'rgba(244,63,94,0.12)' },
  slate: { color: '#CBD5E1', border: 'rgba(148,163,184,0.22)', background: 'rgba(148,163,184,0.1)' },
};

function badgeStyle(tone: StakeholderTone = 'slate'): CSSProperties {
  const palette = toneMap[tone];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    color: palette.color,
    fontSize: '0.72rem',
    fontWeight: 700,
    fontFamily: FONT,
  };
}

export function StakeholderSignalBanner({
  eyebrow,
  title,
  detail,
  stakeholders,
  lanes = [],
  statuses = [],
  dir = 'ltr',
}: StakeholderSignalBannerProps) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        borderRadius: 18,
        padding: '14px 16px',
        background:
          'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(59,130,246,0.05) 42%, rgba(255,255,255,0.02))',
        border: '1px solid rgba(34,211,238,0.14)',
        direction: dir,
      }}
    >
      <div>
        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#67E8F9',
            marginBottom: 6,
            fontFamily: FONT,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            color: '#EFF6FF',
            fontWeight: 900,
            fontSize: '0.94rem',
            marginBottom: 4,
            fontFamily: FONT,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: 'rgba(203,213,225,0.84)',
            fontSize: '0.78rem',
            lineHeight: 1.55,
            fontFamily: FONT,
          }}
        >
          {detail}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {stakeholders.map((stakeholder) => (
            <span key={`${stakeholder.label}-${stakeholder.value ?? ''}`} style={badgeStyle(stakeholder.tone)}>
              <span>{stakeholder.label}</span>
              {stakeholder.value ? <strong>{stakeholder.value}</strong> : null}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {statuses.length > 0 ? (
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: 'rgba(148,163,184,0.76)',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: FONT,
                marginBottom: 8,
              }}
            >
              Shared Status
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {statuses.map((status) => (
                <div
                  key={`${status.label}-${status.value}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    color: '#CBD5E1',
                    fontSize: '0.72rem',
                    fontFamily: FONT,
                  }}
                >
                  <span>{status.label}</span>
                  <strong style={{ color: toneMap[status.tone ?? 'slate'].color }}>{status.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {lanes.length > 0 ? (
          <div
            style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: 'rgba(148,163,184,0.76)',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: FONT,
                marginBottom: 8,
              }}
            >
              Communication Lanes
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {lanes.map((lane) => (
                <div key={`${lane.label}-${lane.detail ?? ''}`}>
                  <div style={{ color: '#EFF6FF', fontSize: '0.74rem', fontWeight: 700, fontFamily: FONT }}>
                    {lane.label}
                  </div>
                  {lane.detail ? (
                    <div
                      style={{
                        color: 'rgba(148,163,184,0.74)',
                        fontSize: '0.7rem',
                        lineHeight: 1.55,
                        marginTop: 3,
                        fontFamily: FONT,
                      }}
                    >
                      {lane.detail}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
