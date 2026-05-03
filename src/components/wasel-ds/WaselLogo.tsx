import type { CSSProperties } from 'react';
import { SH } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
}

const WASEL_W_SRC = '/brand/wasel-w-mark.png';
const WASEL_W_RATIO = 540 / 462;

function getMarkShadow(theme: 'dark' | 'light') {
  return theme === 'dark'
    ? 'drop-shadow(0 5px 10px rgba(17, 24, 31, 0.12))'
    : 'drop-shadow(0 10px 22px rgba(4, 17, 28, 0.22))';
}

function getWordStyle(theme: 'dark' | 'light', size: number): CSSProperties {
  const common: CSSProperties = {
    display: 'inline-block',
    fontFamily: "'Segoe UI Black', 'Arial Black', 'Plus Jakarta Sans', sans-serif",
    fontWeight: 900,
    fontSize: Math.max(18, size * 0.84),
    lineHeight: 0.88,
    letterSpacing: '-0.06em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transform: `translateY(${Math.max(1, size * 0.045)}px)`,
    textRendering: 'geometricPrecision',
  };

  if (theme === 'dark') {
    return {
      ...common,
      background: 'linear-gradient(180deg, #1A1F27 0%, #2D3743 100%)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
      WebkitTextStroke: '0.6px rgba(28, 34, 40, 0.12)',
      textShadow: '0 1px 0 rgba(255,255,255,0.14)',
    };
  }

  return {
    ...common,
    background: 'linear-gradient(180deg, #FBFDFF 0%, #EEF4FB 52%, #DEE7F6 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
    WebkitTextStroke: '0.8px rgba(255, 245, 226, 0.24)',
    textShadow: '0 4px 16px rgba(4, 17, 28, 0.22)',
    filter: SH.cyan,
  };
}

function BrandImage({
  src,
  alt,
  size,
  ratio,
  framed = false,
  theme,
}: {
  src: string;
  alt: string;
  size: number;
  ratio: number;
  framed?: boolean;
  theme: 'dark' | 'light';
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={Math.round(size * ratio)}
      height={Math.round(size)}
      style={{
        display: 'block',
        width: size * ratio,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        filter: framed ? getMarkShadow(theme) : undefined,
      }}
    />
  );
}

function LogoMonogram({
  size,
  theme,
  framed = false,
}: {
  size: number;
  theme: 'dark' | 'light';
  framed?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      <BrandImage
        src={WASEL_W_SRC}
        alt="Wasel W mark"
        size={size}
        ratio={WASEL_W_RATIO}
        framed={framed}
        theme={theme}
      />
    </span>
  );
}

function LogoWordmark({
  size,
  theme,
  framed = false,
}: {
  size: number;
  theme: 'dark' | 'light';
  framed?: boolean;
}) {
  return (
    <span
      aria-label="Wasel"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(0, size * 0.006),
        lineHeight: 0,
      }}
    >
      <BrandImage
        src={WASEL_W_SRC}
        alt=""
        size={size}
        ratio={WASEL_W_RATIO}
        framed={framed}
        theme={theme}
      />
      <span
        aria-hidden="true"
        style={{
          ...getWordStyle(theme, size),
          marginInlineStart: Math.max(-6, size * -0.085),
        }}
      >
        asel
      </span>
    </span>
  );
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'dark',
  style,
  variant = 'full',
  framed,
}: WaselLogoProps) {
  const compact = variant === 'compact' || !showWordmark;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      {compact ? (
        <LogoMonogram size={size} theme={theme} framed={framed} />
      ) : (
        <LogoWordmark size={size} theme={theme} framed={framed} />
      )}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoMonogram size={size} theme="light" />
    </div>
  );
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 14px 28px rgba(4, 17, 28, 0.28))',
      }}
    >
      <LogoWordmark size={Math.max(36, size * 0.46)} theme="light" framed />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoMonogram size={size} theme="light" />;
}
