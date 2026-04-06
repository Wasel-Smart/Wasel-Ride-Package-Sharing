import { useId, type CSSProperties } from 'react';

import { C, F, GRAD_SIGNAL, R, SH, TYPE } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
}

function LogoMark({
  size,
  emissive,
  style,
}: {
  size: number;
  emissive: boolean;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const cyanStroke = `wasel-cyan-stroke-${uid}`;
  const cyanFill = `wasel-cyan-fill-${uid}`;
  const limeStroke = `wasel-lime-stroke-${uid}`;
  const limeFill = `wasel-lime-fill-${uid}`;
  const lowerFill = `wasel-lower-fill-${uid}`;
  const linkFill = `wasel-link-fill-${uid}`;
  const cyanGlow = `wasel-cyan-glow-${uid}`;
  const limeGlow = `wasel-lime-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 112 112"
      width={size}
      height={size}
      role="img"
      aria-label="Wasel linked mobility mark"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient
          id={cyanStroke}
          x1="18"
          y1="16"
          x2="76"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#18CFF5" />
          <stop offset="1" stopColor="#0C6EA8" />
        </linearGradient>
        <linearGradient
          id={cyanFill}
          x1="20"
          y1="16"
          x2="70"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#12D6F4" />
          <stop offset="1" stopColor="#63E2F4" />
        </linearGradient>
        <linearGradient
          id={limeStroke}
          x1="56"
          y1="48"
          x2="98"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#49A82F" />
          <stop offset="1" stopColor="#B7F70A" />
        </linearGradient>
        <linearGradient
          id={limeFill}
          x1="58"
          y1="44"
          x2="94"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#7CE642" />
          <stop offset="1" stopColor="#E4FF3A" />
        </linearGradient>
        <linearGradient
          id={lowerFill}
          x1="18"
          y1="64"
          x2="74"
          y2="92"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#2FD3B8" />
          <stop offset="0.48" stopColor="#77E346" />
          <stop offset="1" stopColor="#D5FF2A" />
        </linearGradient>
        <linearGradient
          id={linkFill}
          x1="64"
          y1="24"
          x2="64"
          y2="88"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0B77C9" />
          <stop offset="0.46" stopColor="#11C5F0" />
          <stop offset="1" stopColor="#B8F612" />
        </linearGradient>
        <filter id={cyanGlow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id={limeGlow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {emissive ? (
        <g aria-hidden="true">
          <rect
            x="10"
            y="8"
            width="68"
            height="46"
            rx="18"
            fill="rgba(24,207,245,0.24)"
            filter={`url(#${cyanGlow})`}
          />
          <rect
            x="52"
            y="36"
            width="50"
            height="34"
            rx="14"
            fill="rgba(183,247,10,0.26)"
            filter={`url(#${limeGlow})`}
          />
          <rect
            x="8"
            y="58"
            width="70"
            height="44"
            rx="18"
            fill="rgba(96,197,54,0.22)"
            filter={`url(#${limeGlow})`}
          />
        </g>
      ) : null}

      <rect
        x="16"
        y="12"
        width="58"
        height="34"
        rx="12"
        fill={`url(#${cyanFill})`}
        stroke={`url(#${cyanStroke})`}
        strokeWidth="6"
      />
      <rect
        x="62"
        y="44"
        width="34"
        height="22"
        rx="8"
        fill={`url(#${limeFill})`}
        stroke={`url(#${limeStroke})`}
        strokeWidth="6"
      />
      <rect
        x="16"
        y="66"
        width="58"
        height="34"
        rx="12"
        fill={`url(#${lowerFill})`}
        stroke={`url(#${limeStroke})`}
        strokeWidth="6"
      />
      <rect x="59" y="27" width="10" height="56" rx="5" fill={`url(#${linkFill})`} />
    </svg>
  );
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'light',
  style,
  variant = 'full',
}: WaselLogoProps) {
  const onDarkSurface = theme === 'light';
  const titleColor = onDarkSurface ? C.text : C.navy;
  const metaColor = onDarkSurface ? C.textMuted : 'rgba(16,36,61,0.6)';
  const titleSize =
    variant === 'compact'
      ? Math.max(11, Math.round(size * 0.28))
      : Math.max(12, Math.round(size * 0.3));
  const metaSize = Math.max(9, Math.round(size * 0.14));

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(10, Math.round(size * 0.22)),
        ...style,
      }}
    >
      <LogoMark size={size} emissive={onDarkSurface && size >= 28} />

      {showWordmark ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: titleSize,
              fontWeight: TYPE.weight.bold,
              letterSpacing:
                variant === 'compact'
                  ? TYPE.letterSpacing.wider
                  : TYPE.letterSpacing.widest,
              lineHeight: TYPE.lineHeight.tight,
              textTransform: 'uppercase',
              color: titleColor,
              backgroundImage: onDarkSurface ? GRAD_SIGNAL : 'none',
              WebkitBackgroundClip: onDarkSurface ? 'text' : undefined,
              WebkitTextFillColor: onDarkSurface ? 'transparent' : undefined,
              textShadow: onDarkSurface ? '0 0 22px rgba(22,199,242,0.18)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Wasel
          </span>
          {variant === 'full' ? (
            <span
              style={{
                fontFamily: F,
                fontSize: metaSize,
                fontWeight: TYPE.weight.semibold,
                letterSpacing: TYPE.letterSpacing.wider,
                textTransform: 'uppercase',
                color: metaColor,
                whiteSpace: 'nowrap',
              }}
            >
              Linked Mobility Network
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
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoMark size={size} emissive={false} />
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
        borderRadius: R.xxl,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)), rgba(8,27,43,0.82)',
        border: `1px solid ${C.border}`,
        boxShadow: SH.card,
        backdropFilter: 'blur(24px)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -18,
          borderRadius: R['3xl'],
          background:
            'radial-gradient(circle, rgba(22,199,242,0.24) 0%, rgba(96,197,54,0.14) 42%, rgba(4,18,30,0) 78%)',
          filter: 'blur(18px)',
        }}
      />
      <LogoMark size={Math.round(size * 0.76)} emissive />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoMark size={size} emissive={false} />;
}
