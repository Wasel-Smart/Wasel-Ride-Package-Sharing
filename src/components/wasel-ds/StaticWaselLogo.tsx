import type { CSSProperties } from 'react';
import { ExactLogoMark } from './ExactLogoMark';

type StaticWaselLogoProps = {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  variant?: 'full' | 'compact';
  subtitle?: string;
  style?: CSSProperties;
};

const LOGO_ACCENT = '#A9E3FF';
const LOGO_ACCENT_DARK = '#2F617C';
const LOGO_ACCENT_SOFT = 'rgba(169, 227, 255, 0.72)';
const LOGO_ACCENT_DARK_SOFT = 'rgba(47, 97, 124, 0.72)';

export function StaticWaselLogo({
  size = 36,
  showWordmark = true,
  theme = 'light',
  variant = 'full',
  subtitle = '',
  style,
}: StaticWaselLogoProps) {
  const onDarkSurface = theme === 'light';
  const titleColor = onDarkSurface ? LOGO_ACCENT : LOGO_ACCENT_DARK;
  const metaColor = onDarkSurface ? LOGO_ACCENT_SOFT : LOGO_ACCENT_DARK_SOFT;
  const titleSize =
    variant === 'compact'
      ? Math.max(12, Math.round(size * 0.34))
      : Math.max(14, Math.round(size * 0.38));
  const subtitleSize = Math.max(9, Math.round(size * 0.2));

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(12, Math.round(size * 0.28)),
        ...style,
      }}
    >
      <ExactLogoMark size={size} />
      {showWordmark ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily:
                "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: variant === 'compact' ? '-0.02em' : '-0.035em',
              lineHeight: 1,
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
