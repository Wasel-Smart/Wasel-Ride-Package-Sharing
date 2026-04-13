import type { CSSProperties } from 'react';

import { TYPE } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  subtitle?: string;
  framed?: boolean;
  markAsset?: 'default' | 'attached-primary';
}

const LOGO_ASSET_VERSION = '20260413network-teal-glow';
const LOGO_MARK_SOURCES = {
  default: {
    src: `/brand/wasel-main-network-logo.svg?v=${LOGO_ASSET_VERSION}`,
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
  theme = 'light',
  style,
  variant = 'full',
  subtitle = 'Mobility OS',
  markAsset = 'default',
}: WaselLogoProps) {
  const onDarkSurface = theme === 'light';
  const mark = getLogoMark(markAsset);
  const markHeight = size;
  const markWidth = Math.max(1, Math.round(size * mark.aspectRatio));
  const titleColor = onDarkSurface ? '#A5FFEA' : '#0E8A6D';
  const metaColor = onDarkSurface ? 'rgba(197, 236, 233, 0.76)' : 'rgba(16, 112, 101, 0.72)';
  const titleGradient = onDarkSurface
    ? 'linear-gradient(180deg, #D8FFF7 0%, #3AE9C2 52%, #099A7C 100%)'
    : 'linear-gradient(180deg, #0D6C61 0%, #1DD4AF 100%)';
  const titleSize =
    variant === 'compact'
      ? Math.max(12, Math.round(size * 0.34))
      : Math.max(14, Math.round(size * 0.38));
  const metaSize = Math.max(9, Math.round(size * 0.2));
  const markElement = (
    <LogoImage
      width={markWidth}
      height={markHeight}
      src={mark.src}
      alt="Wasel main logo"
        style={{
        filter: onDarkSurface
          ? 'drop-shadow(0 18px 28px rgba(4, 8, 14, 0.32)) drop-shadow(0 0 18px rgba(25, 231, 187, 0.16))'
          : 'drop-shadow(0 14px 22px rgba(7, 36, 33, 0.18))',
      }}
    />
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
              fontWeight: TYPE.weight.black,
              letterSpacing: variant === 'compact' ? '-0.02em' : '-0.04em',
              lineHeight: TYPE.lineHeight.tight,
              background: titleGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: titleColor,
              whiteSpace: 'nowrap',
              textShadow: onDarkSurface ? '0 12px 28px rgba(4, 16, 22, 0.24)' : 'none',
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
}: {
  size?: number;
  style?: CSSProperties;
  markAsset?: 'default' | 'attached-primary';
}) {
  const mark = getLogoMark(markAsset);
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoImage
        width={Math.max(1, Math.round(size * mark.aspectRatio))}
        height={size}
        src={mark.src}
        alt="Wasel main logo"
        style={{
          filter: 'drop-shadow(0 18px 28px rgba(4, 8, 14, 0.24)) drop-shadow(0 0 18px rgba(25, 231, 187, 0.14))',
        }}
      />
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
      <LogoImage
        width={Math.max(1, Math.round(size * 0.92 * mark.aspectRatio))}
        height={Math.round(size * 0.92)}
        src={mark.src}
        alt="Wasel main logo"
        style={{
          filter: 'drop-shadow(0 22px 36px rgba(7, 10, 17, 0.26)) drop-shadow(0 0 24px rgba(25, 231, 187, 0.18))',
        }}
      />
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
  return (
    <LogoImage
      width={Math.max(1, Math.round(size * mark.aspectRatio))}
      height={size}
      src={mark.src}
      alt="Wasel main logo"
    />
  );
}
