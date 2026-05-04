import type { CSSProperties } from 'react';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
  framed?: boolean;
}

const WASEL_FULL_SRC = '/brand/wasellogo-512.png';
const WASEL_FULL_SRCSET =
  '/brand/wasellogo-64.png 64w, /brand/wasellogo-96.png 96w, /brand/wasellogo-160.png 160w, /brand/wasellogo-280.png 280w, /brand/wasellogo-512.png 512w';
const WASEL_FULL_RATIO = 945 / 233;

const WASEL_W_SRC = '/brand/wasel-w-mark.png';
const WASEL_W_RATIO = 328 / 233;

function getImageFilter(theme: 'dark' | 'light', framed: boolean) {
  if (theme === 'dark') {
    return framed
      ? 'drop-shadow(0 6px 14px rgba(2, 32, 56, 0.22))'
      : 'drop-shadow(0 3px 8px rgba(2, 32, 56, 0.16))';
  }

  return framed
    ? 'drop-shadow(0 12px 24px rgba(4, 17, 28, 0.28))'
    : 'drop-shadow(0 8px 18px rgba(4, 17, 28, 0.22))';
}

function BrandImage({
  src,
  srcSet,
  alt,
  size,
  ratio,
  framed = false,
  theme,
}: {
  src: string;
  srcSet?: string;
  alt: string;
  size: number;
  ratio: number;
  framed?: boolean;
  theme: 'dark' | 'light';
}) {
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={`${Math.round(size * ratio)}px`}
      alt={alt}
      width={Math.round(size * ratio)}
      height={Math.round(size)}
      decoding="async"
      style={{
        display: 'block',
        width: size * ratio,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        filter: getImageFilter(theme, framed),
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
    <span aria-label="Wasel" style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      <BrandImage
        src={WASEL_FULL_SRC}
        srcSet={WASEL_FULL_SRCSET}
        alt="Wasel"
        size={size}
        ratio={WASEL_FULL_RATIO}
        framed={framed}
        theme={theme}
      />
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
      }}
    >
      <LogoWordmark size={Math.max(36, size * 0.46)} theme="light" framed />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoMonogram size={size} theme="light" />;
}
