import type { CSSProperties } from 'react';
import { C, F, R, SH } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
}

function LogoStroke({ color }: { color: string }) {
  return (
    <path
      d="M18 18c6 26 11 39 18 39 6 0 11-12 16-31 3 20 9 31 16 31 6 0 11-13 18-39"
      fill="none"
      stroke={color}
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function LogoMonogram({ size, color }: { size: number; color: string }) {
  return (
    <svg
      viewBox="0 0 86 72"
      width={size}
      height={size * (72 / 86)}
      role="img"
      aria-label="Wasel mark"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <LogoStroke color={color} />
    </svg>
  );
}

function LogoWordmark({
  size,
  color,
  compact,
}: {
  size: number;
  color: string;
  compact?: boolean;
}) {
  const viewBox = compact ? '0 0 86 72' : '0 0 378 88';

  return (
    <svg
      viewBox={viewBox}
      width={compact ? size * 0.88 : size * 2.86}
      height={size}
      role="img"
      aria-label="Wasel"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <LogoStroke color={color} />
      {!compact && (
        <text
          x="118"
          y="63"
          fill={color}
          fontFamily="'Arial Black', 'Plus Jakarta Sans', 'Inter', sans-serif"
          fontWeight="900"
          fontSize="78"
          letterSpacing="-5"
        >
          asel
        </text>
      )}
    </svg>
  );
}

function LogoPlate({
  size,
  children,
  theme,
}: {
  size: number;
  children: React.ReactNode;
  theme: 'dark' | 'light';
}) {
  const onDark = theme === 'light';
  const halo = Math.max(8, Math.round(size * 0.16));

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: size,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -halo,
          borderRadius: Math.round(size * 0.52),
          background: onDark
            ? 'radial-gradient(circle, rgba(184,138,82,0.16) 0%, rgba(244,239,232,0.06) 38%, rgba(17,19,22,0) 74%)'
            : 'radial-gradient(circle, rgba(184,138,82,0.10) 0%, rgba(17,19,22,0) 72%)',
          filter: 'blur(16px)',
          opacity: onDark ? 0.9 : 0.55,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: Math.round(size * 0.44),
          background: onDark ? 'rgba(247,241,232,0.03)' : 'rgba(17,19,22,0.04)',
          border: `1px solid ${onDark ? 'rgba(244,239,232,0.10)' : 'rgba(17,19,22,0.08)'}`,
          boxShadow: onDark ? SH.card : 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center' }}>{children}</span>
    </div>
  );
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'dark',
  style,
  variant = 'full',
}: WaselLogoProps) {
  const logoColor = theme === 'light' ? C.text : '#121418';
  const compact = variant === 'compact' || !showWordmark;
  const shellSize = compact ? size : Math.max(size, 34);
  const title = compact ? (
    <LogoMonogram size={shellSize} color={logoColor} />
  ) : (
    <LogoWordmark size={shellSize} color={logoColor} compact={false} />
  );
  const tagline = variant === 'full' && showWordmark ? 'Move simply across Jordan' : null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
      <LogoPlate size={shellSize} theme={theme}>
        {title}
      </LogoPlate>
      {tagline && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: Math.max(11, size * 0.18),
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: theme === 'light' ? C.gold : '#6C5A48',
              whiteSpace: 'nowrap',
            }}
          >
            {tagline}
          </span>
        </div>
      )}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoPlate size={size} theme="light">
        <LogoMonogram size={size} color={C.text} />
      </LogoPlate>
    </div>
  );
}

export function WaselHeroMark({ size = 120 }: { size?: number }) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Math.round(size * 0.18),
        borderRadius: R.xxl,
        background: 'linear-gradient(160deg, rgba(247,241,232,0.07), rgba(184,138,82,0.06))',
        border: `1px solid ${C.border}`,
        boxShadow: SH.lg,
      }}
    >
      <LogoWordmark size={size * 0.44} color={C.text} />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoMonogram size={size} color={C.text} />;
}
