import type { CSSProperties } from 'react';

type StaticWaselLogoProps = {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  variant?: 'full' | 'compact';
  subtitle?: string;
  style?: CSSProperties;
};

const MARK_SRC = '/brand/wasel-mark-attached-primary.svg?v=20260411pin-no-shell';
const MARK_ASPECT_RATIO = 0.91;

export function StaticWaselLogo({
  size = 36,
  showWordmark = true,
  theme = 'light',
  variant = 'full',
  subtitle = '',
  style,
}: StaticWaselLogoProps) {
  const onDarkSurface = theme === 'light';
  const titleGradient = onDarkSurface
    ? 'linear-gradient(180deg, #D8FFF7 0%, #3AE9C2 52%, #099A7C 100%)'
    : 'linear-gradient(180deg, #0D6C61 0%, #1DD4AF 100%)';
  const titleColor = onDarkSurface ? '#A5FFEA' : '#0E8A6D';
  const metaColor = onDarkSurface
    ? 'rgba(197, 236, 233, 0.76)'
    : 'rgba(16, 112, 101, 0.72)';
  const titleSize =
    variant === 'compact'
      ? Math.max(12, Math.round(size * 0.34))
      : Math.max(14, Math.round(size * 0.38));
  const subtitleSize = Math.max(9, Math.round(size * 0.2));
  const markWidth = Math.max(1, Math.round(size * MARK_ASPECT_RATIO));

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(12, Math.round(size * 0.28)),
        ...style,
      }}
    >
      <img
        src={MARK_SRC}
        alt="Wasel"
        width={markWidth}
        height={size}
        decoding="async"
        draggable={false}
        style={{
          display: 'block',
          width: markWidth,
          height: size,
          objectFit: 'contain',
          userSelect: 'none',
          flexShrink: 0,
          filter: onDarkSurface
            ? 'drop-shadow(0 16px 24px rgba(4, 8, 14, 0.24)) drop-shadow(0 0 12px rgba(25, 231, 187, 0.12))'
            : 'drop-shadow(0 14px 22px rgba(7, 36, 33, 0.14))',
        }}
      />
      {showWordmark ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily:
                "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
              fontSize: titleSize,
              fontWeight: 900,
              letterSpacing: variant === 'compact' ? '-0.02em' : '-0.04em',
              lineHeight: 1,
              background: titleGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: titleColor,
              whiteSpace: 'nowrap',
            }}
          >
            Wasel
          </span>
          {variant === 'full' && subtitle ? (
            <span
              style={{
                fontFamily:
                  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
                fontSize: subtitleSize,
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: metaColor,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
