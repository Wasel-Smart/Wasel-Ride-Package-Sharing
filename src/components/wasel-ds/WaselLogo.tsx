import type { CSSProperties } from 'react';

// Single source of truth for the Wasel brand logo
const LOGO_SRC = '/brand/wasel-logo.png';

// Natural aspect ratio — update if the actual image differs
const LOGO_RATIO = 3.5; // width / height

interface WaselLogoProps {
  size?: number;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  /** @deprecated use size + theme instead */
  showWordmark?: boolean;
  /** @deprecated always renders the full logo now */
  variant?: 'full' | 'compact';
  framed?: boolean;
}

function logoFilter(theme: 'dark' | 'light', framed: boolean): string {
  // On a dark background the logo renders as-is.
  // On a light background we invert so it stays visible.
  const shadow = framed
    ? theme === 'dark'
      ? 'drop-shadow(0 6px 14px rgba(2,32,56,0.22))'
      : 'drop-shadow(0 12px 24px rgba(4,17,28,0.28))'
    : theme === 'dark'
      ? 'drop-shadow(0 3px 8px rgba(2,32,56,0.16))'
      : 'drop-shadow(0 8px 18px rgba(4,17,28,0.22))';

  return shadow;
}

export function WaselLogo({
  size = 38,
  theme = 'dark',
  style,
  framed = false,
}: WaselLogoProps) {
  const w = Math.round(size * LOGO_RATIO);
  const h = Math.round(size);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, ...style }}>
      <img
        src={LOGO_SRC}
        alt="Wasel"
        width={w}
        height={h}
        decoding="async"
        draggable={false}
        style={{
          display: 'block',
          width: w,
          height: h,
          objectFit: 'contain',
          flexShrink: 0,
          filter: logoFilter(theme, framed),
          userSelect: 'none',
        }}
      />
    </div>
  );
}

/** Compact square mark — same image, square crop via objectPosition */
export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', flexShrink: 0, ...style }}>
      <img
        src={LOGO_SRC}
        alt="Wasel"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'cover',
          objectPosition: 'left center',
          flexShrink: 0,
          userSelect: 'none',
        }}
      />
    </div>
  );
}

/** Large hero logo used on landing / auth panels */
export function WaselHeroMark({ size = 120 }: { size?: number }) {
  const logoSize = Math.max(36, size * 0.46);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <WaselLogo size={logoSize} theme="light" framed />
    </div>
  );
}

/** Tiny inline icon — square crop of the logo mark */
export function WaselIcon({ size = 20 }: { size?: number }) {
  return <WaselMark size={size} />;
}
