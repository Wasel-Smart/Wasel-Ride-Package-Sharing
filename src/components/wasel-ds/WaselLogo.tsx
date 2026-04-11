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

const LOGO_ASSET_VERSION = '20260411pin-no-shell';
const LOGO_MARK_SOURCES = {
  default: `/brand/wasel-investor-pin.svg?v=${LOGO_ASSET_VERSION}`,
  attachedPrimary: `/brand/wasel-mark-attached-primary.svg?v=${LOGO_ASSET_VERSION}`,
} as const;
const LOGO_MARK_ASPECT_RATIO = 0.91;

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
  const markHeight = size;
  const markWidth = Math.round(size * LOGO_MARK_ASPECT_RATIO);
  const markSrc =
    markAsset === 'attached-primary'
      ? LOGO_MARK_SOURCES.attachedPrimary
      : LOGO_MARK_SOURCES.default;
  const titleColor = onDarkSurface ? '#FFF4D0' : '#8A6220';
  const metaColor = onDarkSurface ? 'rgba(243, 226, 185, 0.76)' : 'rgba(104, 78, 33, 0.72)';
  const titleGradient = onDarkSurface
    ? 'linear-gradient(180deg, #FFF4D0 0%, #F7D777 55%, #D89B20 100%)'
    : 'linear-gradient(180deg, #7D5719 0%, #D29A26 100%)';
  const titleSize =
    variant === 'compact'
      ? Math.max(12, Math.round(size * 0.34))
      : Math.max(14, Math.round(size * 0.38));
  const metaSize = Math.max(9, Math.round(size * 0.2));
  const markElement = (
    <LogoImage
      width={markWidth}
      height={markHeight}
      src={markSrc}
      alt="Wasel main logo"
      style={{
        filter: onDarkSurface
          ? 'drop-shadow(0 24px 34px rgba(4, 8, 14, 0.4))'
          : 'drop-shadow(0 18px 24px rgba(33, 23, 7, 0.16))',
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
              textShadow: onDarkSurface ? '0 12px 28px rgba(8, 7, 4, 0.24)' : 'none',
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
  const markSrc =
    markAsset === 'attached-primary'
      ? LOGO_MARK_SOURCES.attachedPrimary
      : LOGO_MARK_SOURCES.default;
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoImage
        width={Math.round(size * LOGO_MARK_ASPECT_RATIO)}
        height={size}
        src={markSrc}
        alt="Wasel main logo"
        style={{
          filter: 'drop-shadow(0 20px 30px rgba(4, 8, 14, 0.34))',
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
  const markSrc =
    markAsset === 'attached-primary'
      ? LOGO_MARK_SOURCES.attachedPrimary
      : LOGO_MARK_SOURCES.default;
  return (
    <div
      style={{
        width: Math.round(size * LOGO_MARK_ASPECT_RATIO),
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LogoImage
        width={Math.round(size * 0.92 * LOGO_MARK_ASPECT_RATIO)}
        height={Math.round(size * 0.92)}
        src={markSrc}
        alt="Wasel main logo"
        style={{
          filter: 'drop-shadow(0 28px 44px rgba(7, 10, 17, 0.34))',
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
  const markSrc =
    markAsset === 'attached-primary'
      ? LOGO_MARK_SOURCES.attachedPrimary
      : LOGO_MARK_SOURCES.default;
  return (
    <LogoImage
      width={Math.round(size * LOGO_MARK_ASPECT_RATIO)}
      height={size}
      src={markSrc}
      alt="Wasel main logo"
    />
  );
}
