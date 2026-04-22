import type { CSSProperties } from 'react';

const FONT = "var(--wasel-font-sans, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";

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
  teal: {
    color: 'var(--ds-accent)',
    border: 'color-mix(in srgb, var(--ds-accent) 28%, transparent)',
    background: 'color-mix(in srgb, var(--ds-accent) 12%, transparent)',
  },
  blue: {
    color: 'var(--ds-accent-strong)',
    border: 'color-mix(in srgb, var(--ds-accent-strong) 28%, transparent)',
    background: 'color-mix(in srgb, var(--ds-accent-strong) 12%, transparent)',
  },
  green: {
    color: 'var(--wasel-brand-gradient-start)',
    border: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 28%, transparent)',
    background: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 12%, transparent)',
  },
  amber: {
    color: 'var(--wasel-brand-gradient-start)',
    border: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 28%, transparent)',
    background: 'color-mix(in srgb, var(--wasel-brand-gradient-start) 12%, transparent)',
  },
  rose: {
    color: 'var(--wasel-brand-hover)',
    border: 'color-mix(in srgb, var(--wasel-brand-hover) 28%, transparent)',
    background: 'color-mix(in srgb, var(--wasel-brand-hover) 12%, transparent)',
  },
  slate: {
    color: 'var(--ds-text-soft)',
    border: 'color-mix(in srgb, var(--ds-text-soft) 22%, transparent)',
    background: 'color-mix(in srgb, var(--ds-text-soft) 10%, transparent)',
  },
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
          'linear-gradient(135deg, color-mix(in srgb, var(--ds-page-muted) 88%, var(--ds-accent) 12%), color-mix(in srgb, var(--ds-page) 92%, var(--ds-accent-strong) 8%) 42%, color-mix(in srgb, var(--ds-page) 96%, white 4%))',
        border: '1px solid color-mix(in srgb, var(--ds-accent) 18%, var(--ds-border))',
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
            color: 'var(--ds-accent-strong)',
            marginBottom: 6,
            fontFamily: FONT,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            color: 'var(--ds-text)',
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
            color: 'var(--ds-text-muted)',
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
              border: '1px solid var(--ds-border)',
              background: 'color-mix(in srgb, var(--ds-surface) 92%, transparent)',
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: 'var(--ds-text-soft)',
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
                    color: 'var(--ds-text-muted)',
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
              border: '1px solid var(--ds-border)',
              background: 'color-mix(in srgb, var(--ds-surface) 92%, transparent)',
              padding: '10px 12px',
            }}
          >
            <div
              style={{
                color: 'var(--ds-text-soft)',
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
                  <div style={{ color: 'var(--ds-text)', fontSize: '0.74rem', fontWeight: 700, fontFamily: FONT }}>
                    {lane.label}
                  </div>
                  {lane.detail ? (
                    <div
                      style={{
                        color: 'var(--ds-text-soft)',
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
