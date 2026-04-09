import type { CSSProperties } from 'react';

import { TYPE } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  subtitle?: string;
}

const LOGO_ASSET_VERSION = '20260410b';
const CLEAN_MARK_SRC = `/brand/wasel-mark-clean.svg?v=${LOGO_ASSET_VERSION}`;
const LOGO_MARK_ASPECT_RATIO = 464 / 360;

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
}: WaselLogoProps) {
  const onDarkSurface = theme === 'light';
  const markHeight = size;
  const markWidth = Math.round(size * LOGO_MARK_ASPECT_RATIO);
  const titleColor = onDarkSurface ? '#F4F8FE' : '#173862';
  const metaColor = onDarkSurface ? 'rgba(194, 214, 236, 0.82)' : 'rgba(23, 56, 98, 0.64)';
  const titleSize =
    variant === 'compact'
      ? Math.max(11, Math.round(size * 0.34))
      : Math.max(13, Math.round(size * 0.37));
  const metaSize = Math.max(9, Math.round(size * 0.19));

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(12, Math.round(size * 0.26)),
        ...style,
      }}
    >
      <LogoImage
        width={markWidth}
        height={markHeight}
        src={CLEAN_MARK_SRC}
        alt="Wasel mobility application logo"
      />

      {showWordmark ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily:
                "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
              fontSize: titleSize,
              fontWeight: TYPE.weight.black,
              letterSpacing: variant === 'compact' ? '0.12em' : '0.1em',
              lineHeight: TYPE.lineHeight.tight,
              textTransform: 'uppercase',
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
                fontSize: metaSize,
                fontWeight: TYPE.weight.semibold,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: metaColor,
                whiteSpace: 'nowrap',
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

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoImage
        width={Math.round(size * LOGO_MARK_ASPECT_RATIO)}
        height={size}
        src={CLEAN_MARK_SRC}
        alt="Wasel logo mark"
      />
    </div>
  );
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
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
        width={Math.round(size * 0.74 * LOGO_MARK_ASPECT_RATIO)}
        height={Math.round(size * 0.74)}
        src={CLEAN_MARK_SRC}
        alt="Wasel hero logo"
      />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return (
    <LogoImage
      width={Math.round(size * LOGO_MARK_ASPECT_RATIO)}
      height={size}
      src={CLEAN_MARK_SRC}
      alt="Wasel icon"
    />
  );
}
