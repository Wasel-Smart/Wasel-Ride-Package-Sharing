import type { ReactNode } from 'react';
import { LoaderCircle, type LucideIcon } from 'lucide-react';
import { C, F, GRAD, R, SH } from '../../utils/wasel-ds';

type WaselStateTone = 'default' | 'warning' | 'danger' | 'success';

const TONE_STYLES: Record<WaselStateTone, { accent: string; border: string; glow: string }> = {
  default: {
    accent: C.cyan,
    border: C.border,
    glow: 'rgba(88,221,255,0.16)',
  },
  warning: {
    accent: C.gold,
    border: 'rgba(255,190,92,0.22)',
    glow: 'rgba(255,190,92,0.16)',
  },
  danger: {
    accent: C.error,
    border: 'rgba(255,124,139,0.22)',
    glow: 'rgba(255,124,139,0.16)',
  },
  success: {
    accent: C.green,
    border: 'rgba(71,214,158,0.22)',
    glow: 'rgba(71,214,158,0.16)',
  },
};

interface WaselStateCardProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: LucideIcon;
  tone?: WaselStateTone;
  loading?: boolean;
  actions?: ReactNode;
  footer?: ReactNode;
  minHeight?: string | number;
}

export function WaselStateCard({
  title,
  description,
  eyebrow,
  icon: Icon,
  tone = 'default',
  loading = false,
  actions,
  footer,
  minHeight = 360,
}: WaselStateCardProps) {
  const theme = TONE_STYLES[tone];
  const AccentIcon = loading ? LoaderCircle : Icon;

  return (
    <div
      style={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(100%, 620px)',
          overflow: 'hidden',
          borderRadius: R.xxl,
          padding: 28,
          background: `linear-gradient(180deg, rgba(15,35,51,0.96), rgba(6,17,27,0.98))`,
          border: `1px solid ${theme.border}`,
          boxShadow: `${SH.lg}, inset 0 1px 0 rgba(255,255,255,0.04)`,
          color: C.text,
          fontFamily: F,
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 30%)',
          }}
        />

        <div style={{ position: 'relative' }}>
          {AccentIcon ? (
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 18px',
                borderRadius: R.xl,
                display: 'grid',
                placeItems: 'center',
                background: `${theme.accent}14`,
                border: `1px solid ${theme.accent}30`,
                boxShadow: `0 14px 34px ${theme.glow}`,
              }}
            >
              <AccentIcon
                size={30}
                color={theme.accent}
                style={loading ? { animation: 'spin 1s linear infinite' } : undefined}
              />
            </div>
          ) : null}

          {eyebrow ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 30,
                padding: '0 14px',
                borderRadius: R.full,
                marginBottom: 14,
                background: `${theme.accent}14`,
                border: `1px solid ${theme.accent}24`,
                color: theme.accent,
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: 0,
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: loading ? GRAD : theme.accent,
                  boxShadow: `0 0 16px ${theme.accent}`,
                }}
              />
              {eyebrow}
            </div>
          ) : null}

          <h2
            style={{
              margin: 0,
              fontSize: '1.95rem',
              lineHeight: 1.06,
              letterSpacing: 0,
              fontWeight: 900,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: '12px auto 0',
              maxWidth: 480,
              color: C.textMuted,
              fontSize: '0.96rem',
              lineHeight: 1.8,
            }}
          >
            {description}
          </p>

          {actions ? (
            <div
              style={{
                marginTop: 22,
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              {actions}
            </div>
          ) : null}

          {footer ? (
            <div
              style={{
                marginTop: 20,
                color: C.textDim,
                fontSize: '0.78rem',
                lineHeight: 1.7,
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
