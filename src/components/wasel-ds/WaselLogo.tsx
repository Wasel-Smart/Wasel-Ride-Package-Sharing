import type { CSSProperties } from 'react';

import { useTheme } from '../../contexts/ThemeContext';
import { TYPE } from '../../utils/wasel-ds';
import { ExactLogoMark } from './ExactLogoMark';

const LOGO_ACCENT = 'var(--accent-secondary)';
const LOGO_ACCENT_DARK = 'color-mix(in srgb, var(--text-primary) 84%, var(--accent-secondary) 16%)';
const LOGO_ACCENT_SOFT = 'rgb(var(--accent-secondary-rgb) / 0.72)';
const LOGO_ACCENT_DARK_SOFT = 'color-mix(in srgb, var(--text-primary) 72%, transparent)';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light' | 'auto';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  subtitle?: string;
  framed?: boolean;
  markAsset?: 'default' | 'attached-primary';
  animated?: boolean;
}

const LOGO_MARK_SOURCES = {
  default: {
    src: '',
    aspectRatio: 1,
  },
  'attached-primary': {
    src: '/brand/wasel-mark-attached-primary.svg?v=20260411pin-no-shell',
    aspectRatio: 0.91,
  },
} as const;

function getLogoMark(markAsset: 'default' | 'attached-primary') {
  return LOGO_MARK_SOURCES[markAsset];
}

function LogoImage({
  width,
  height,
  src,
  alt,
  style,
}: {
  width: number;
  height: number;
  src: string;
  alt: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      draggable={false}
      decoding="async"
      style={{
        display: 'block',
        width,
        height,
        flexShrink: 0,
        objectFit: 'contain',
        userSelect: 'none',
        ...style,
      }}
    />
  );
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'auto',
  style,
  variant = 'full',
  subtitle = 'Mobility OS',
  markAsset = 'default',
  animated = false,
}: WaselLogoProps) {
  const { resolvedTheme } = useTheme();
  const effectiveTheme = theme === 'auto' ? (resolvedTheme === 'light' ? 'dark' : 'light') : theme;
  const onDarkSurface = effectiveTheme === 'light';
  const mark = getLogoMark(markAsset);
  const markHeight = size;
  const markWidth = Math.max(1, Math.round(size * mark.aspectRatio));
  const usesUploadedMark = markAsset === 'default';
  const titleColor = onDarkSurface ? LOGO_ACCENT : LOGO_ACCENT_DARK;
  const metaColor = onDarkSurface ? LOGO_ACCENT_SOFT : LOGO_ACCENT_DARK_SOFT;
  const titleSize =
    variant === 'compact'
      ? Math.max(12, Math.round(size * 0.34))
      : Math.max(14, Math.round(size * 0.38));
  const metaSize = Math.max(9, Math.round(size * 0.2));
  const markElement = (
    <div
      className={animated ? 'wasel-logo-breathe wasel-logo-breathe--inline' : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {animated ? <span className="wasel-logo-breathe__halo" aria-hidden="true" /> : null}
      {usesUploadedMark ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ExactLogoMark size={markHeight} animated={animated} />
        </div>
      ) : (
        <LogoImage
          width={markWidth}
          height={markHeight}
          src={mark.src}
          alt="Wasel main logo"
          style={{
            position: 'relative',
            zIndex: 1,
            filter: onDarkSurface
              ? 'drop-shadow(0 16px 24px rgba(5, 12, 20, 0.28)) drop-shadow(0 0 14px rgba(169, 227, 255, 0.14))'
              : 'drop-shadow(0 12px 20px rgba(7, 18, 28, 0.16))',
          }}
        />
      )}
    </div>
  );

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(14, Math.round(size * 0.3)),
        ...style,
      }}
    >
      {markElement}

      {showWordmark ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily:
                "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: variant === 'compact' ? '-0.02em' : '-0.035em',
              lineHeight: TYPE.lineHeight.tight,
              color: titleColor,
              whiteSpace: 'nowrap',
              textShadow: onDarkSurface ? '0 10px 24px rgba(6, 16, 24, 0.22)' : 'none',
            }}
          >
            Wasel
          </span>
          {variant === 'full' && subtitle ? (
            <span
              style={{
                fontFamily:
                  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
                fontSize: metaSize,
                fontWeight: TYPE.weight.semibold,
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

export function WaselMark({
  size = 38,
  style,
  markAsset = 'default',
  animated = false,
}: {
  size?: number;
  style?: CSSProperties;
  markAsset?: 'default' | 'attached-primary';
  animated?: boolean;
}) {
  const mark = getLogoMark(markAsset);
  const usesUploadedMark = markAsset === 'default';
  return (
    <div
      className={animated ? 'wasel-logo-breathe wasel-logo-breathe--mark' : undefined}
      style={{ display: 'inline-flex', position: 'relative', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      {animated ? <span className="wasel-logo-breathe__halo" aria-hidden="true" /> : null}
      {usesUploadedMark ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ExactLogoMark size={size} animated={animated} />
        </div>
      ) : (
        <LogoImage
          width={Math.max(1, Math.round(size * mark.aspectRatio))}
          height={size}
          src={mark.src}
          alt="Wasel main logo"
          style={{
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 16px 24px rgba(5, 12, 20, 0.26)) drop-shadow(0 0 14px rgba(169, 227, 255, 0.12))',
          }}
        />
      )}
    </div>
  );
}

export function WaselHeroMark({
  size = 120,
  markAsset = 'default',
}: {
  size?: number;
  markAsset?: 'default' | 'attached-primary';
}) {
  const mark = getLogoMark(markAsset);
  const usesUploadedMark = markAsset === 'default';
  return (
    <div
      style={{
        width: Math.max(1, Math.round(size * mark.aspectRatio)),
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {usesUploadedMark ? (
        <ExactLogoMark size={Math.round(size * 0.92)} animated />
      ) : (
        <LogoImage
          width={Math.max(1, Math.round(size * 0.92 * mark.aspectRatio))}
          height={Math.round(size * 0.92)}
          src={mark.src}
          alt="Wasel main logo"
          style={{
            filter: 'drop-shadow(0 20px 34px rgba(7, 12, 18, 0.26)) drop-shadow(0 0 20px rgba(169, 227, 255, 0.16))',
          }}
        />
      )}
    </div>
  );
}

export function WaselIcon({
  size = 20,
  markAsset = 'default',
}: {
  size?: number;
  markAsset?: 'default' | 'attached-primary';
}) {
  const mark = getLogoMark(markAsset);
  if (markAsset === 'default') {
    return <ExactLogoMark size={size} />;
  }

  return (
    <LogoImage
      width={Math.max(1, Math.round(size * mark.aspectRatio))}
      height={size}
      src={mark.src}
      alt="Wasel main logo"
    />
  );
}
