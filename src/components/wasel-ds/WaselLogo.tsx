import type { CSSProperties } from 'react';

import { C, SH, TYPE } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  subtitle?: string;
}

const CLEAN_MARK_SRC = '/brand/wasel-mark-clean.svg';

function LogoImage({
  size,
  src,
  alt,
  style,
}: {
  size: number;
  src: string;
  alt: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      style={{
        display: 'block',
        width: size,
        height: size,
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
  const titleColor = onDarkSurface ? '#F7FCFF' : '#0A1D2D';
  const metaColor = onDarkSurface ? 'rgba(203, 232, 246, 0.88)' : 'rgba(10, 29, 45, 0.72)';
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
        size={size}
        src={CLEAN_MARK_SRC}
        alt="Wasel mobility application logo"
        style={{
          filter: onDarkSurface
            ? 'drop-shadow(0 6px 16px rgba(18, 214, 255, 0.14))'
            : 'drop-shadow(0 3px 10px rgba(10, 29, 45, 0.10))',
        }}
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
      <LogoImage size={size} src={CLEAN_MARK_SRC} alt="Wasel logo mark" />
    </div>
  );
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '32%',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)), rgba(7,18,34,0.84)',
        border: `1px solid ${C.border}`,
        boxShadow: SH.card,
        backdropFilter: 'blur(24px)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -24,
          borderRadius: '36%',
          background:
            'radial-gradient(circle, rgba(18,219,255,0.28) 0%, rgba(106,255,69,0.14) 44%, rgba(4,18,30,0) 78%)',
          filter: 'blur(22px)',
        }}
      />
      <LogoImage
        size={Math.round(size * 0.74)}
        src={CLEAN_MARK_SRC}
        alt="Wasel hero logo"
        style={{
          position: 'relative',
          filter: 'drop-shadow(0 10px 26px rgba(18, 214, 255, 0.2))',
        }}
      />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoImage size={size} src={CLEAN_MARK_SRC} alt="Wasel icon" />;
}
