import { useState, type CSSProperties } from 'react';

const LOGO_SRC = '/brand/wasel-logo.png';
const LOGO_LIGHT_SRC = '/brand/wasel-logo-light.png';
const LOGO_RATIO = 1;

interface WaselLogoProps {
  size?: number;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  alt?: string;
  /** @deprecated no-op, kept for backward compatibility */
  variant?: 'full' | 'compact';
  framed?: boolean;
}

function logoFilter(theme: 'dark' | 'light', framed: boolean): string {
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
  size = 64,
  theme = 'dark',
  style,
  alt = 'Wasel',
  framed = false,
}: WaselLogoProps) {
  const [broken, setBroken] = useState(false);
  const w = Math.round(size * LOGO_RATIO);
  const h = Math.round(size);
  const src = theme === 'light' && !broken ? LOGO_LIGHT_SRC : LOGO_SRC;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src={broken ? LOGO_SRC : src}
        alt={alt}
        width={w}
        height={h}
        decoding="async"
        draggable={false}
        onError={() => setBroken(true)}
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

export function WaselMark({ size = 40, style }: { size?: number; style?: CSSProperties }) {
  const [broken, setBroken] = useState(false);

  return (
    <div style={{ display: 'inline-flex', flexShrink: 0, ...style }}>
      <img
        src={broken ? LOGO_SRC : LOGO_LIGHT_SRC}
        alt="Wasel"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        onError={() => setBroken(true)}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
          flexShrink: 0,
          userSelect: 'none',
        }}
      />
    </div>
  );
}

export function WaselHeroMark({ size = 160 }: { size?: number }) {
  const logoSize = Math.max(size * 0.9, 64);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <WaselLogo size={logoSize} theme="light" framed alt="Wasel" />
    </div>
  );
}

export function WaselIcon({ size = 24 }: { size?: number }) {
  return <WaselMark size={size} />;
}
