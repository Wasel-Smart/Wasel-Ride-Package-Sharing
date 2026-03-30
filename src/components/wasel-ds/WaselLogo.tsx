import { useId, type CSSProperties } from 'react';
import { C, F, R, SH, GRAD_SIGNAL } from '../../utils/wasel-ds';

interface WaselLogoProps {
  size?: number;
  showWordmark?: boolean;
  theme?: 'dark' | 'light';
  style?: CSSProperties;
  variant?: 'full' | 'compact';
}

const MICRO_BREAKPOINT = 34;

function shouldUseMicroMark(size: number) {
  return Math.ceil(size) <= MICRO_BREAKPOINT;
}

function LogoMicroMark({
  size,
  alt = 'Wasel micro logo',
  style,
  onLightSurface = false,
}: {
  size: number;
  alt?: string;
  style?: CSSProperties;
  onLightSurface?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const ringId = `wasel-ring-${uid}`;
  const coreId = `wasel-core-${uid}`;
  const glowId = `wasel-glow-${uid}`;
  const nodeStroke = onLightSurface ? 'rgba(11,29,69,0.12)' : 'rgba(255,255,255,0.08)';
  const centerX = 50;
  const centerY = 50;
  const nodes = [
    { x: 78, y: 24, color: '#F0A830', r: 8 },
    { x: 82, y: 55, color: '#00C875', r: 7.2 },
    { x: 63, y: 81, color: '#18D7C8', r: 7 },
    { x: 27, y: 79, color: '#1EA1FF', r: 7.2 },
    { x: 16, y: 59, color: '#1EA1FF', r: 7.2 },
    { x: 36, y: 31, color: '#00C8E8', r: 6.2 },
  ] as const;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={alt}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={ringId} x1="16" y1="79" x2="82" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1EA1FF" />
          <stop offset="0.48" stopColor="#55E9FF" />
          <stop offset="1" stopColor="#F0A830" />
        </linearGradient>
        <radialGradient id={coreId} cx="0" cy="0" r="1" gradientTransform="translate(50 50) rotate(90) scale(22)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EAFBFF" />
          <stop offset="0.42" stopColor="#7BEFFF" />
          <stop offset="1" stopColor="#18D7C8" />
        </radialGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.8" />
        </filter>
      </defs>

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {nodes.map((node) => (
          <line
            key={`line-${node.x}-${node.y}`}
            x1={centerX}
            y1={centerY}
            x2={node.x}
            y2={node.y}
            stroke={node.color}
            strokeWidth="3.2"
          />
        ))}
      </g>

      <circle
        cx={centerX}
        cy={centerY}
        r="18"
        fill="url(#coreId)"
        opacity={onLightSurface ? 0.14 : 0.18}
        filter={`url(#${glowId})`}
      />
      <circle cx={centerX} cy={centerY} r="14" fill="none" stroke={`url(#${ringId})`} strokeWidth="3.4" />
      <circle cx={centerX} cy={centerY} r="7.2" fill="url(#coreId)" opacity={0.9} />
      <circle cx={centerX} cy={centerY} r="2.6" fill="#FFFFFF" />

      {nodes.map((node) => (
        <g key={`node-${node.x}-${node.y}`}>
          <circle cx={node.x} cy={node.y} r={node.r + 3.4} fill={node.color} opacity={onLightSurface ? 0.08 : 0.14} />
          <circle cx={node.x} cy={node.y} r={node.r + 1.4} fill="none" stroke={node.color} strokeWidth="2.2" />
          <circle cx={node.x} cy={node.y} r={node.r - 1.2} fill="none" stroke={nodeStroke} strokeWidth="1.2" opacity="0.9" />
          <circle cx={node.x} cy={node.y} r={Math.max(2.4, node.r - 3.2)} fill={node.color} />
        </g>
      ))}
    </svg>
  );
}

function LogoImage({
  size,
  alt = 'Wasel logo',
  style,
  priority = false,
}: {
  size: number;
  alt?: string;
  style?: CSSProperties;
  priority?: boolean;
}) {
  const rounded = Math.ceil(size);
  const src =
    rounded <= 64
      ? '/brand/wasellogo-64.png'
      : rounded <= 96
        ? '/brand/wasellogo-96.png'
        : rounded <= 160
          ? '/brand/wasellogo-160.png'
          : rounded <= 280
            ? '/brand/wasellogo-280.png'
            : '/brand/wasellogo-512.png';

  return (
    <img
      src={src}
      srcSet="/brand/wasellogo-64.png 64w, /brand/wasellogo-96.png 96w, /brand/wasellogo-160.png 160w, /brand/wasellogo-280.png 280w, /brand/wasellogo-512.png 512w"
      sizes={`${rounded}px`}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      style={{
        display: 'block',
        width: size,
        height: size,
        objectFit: 'cover',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

function LogoVisual({
  size,
  alt,
  style,
  priority = false,
  theme = 'dark',
  forceMicro = false,
}: {
  size: number;
  alt?: string;
  style?: CSSProperties;
  priority?: boolean;
  theme?: 'dark' | 'light';
  forceMicro?: boolean;
}) {
  if (forceMicro || shouldUseMicroMark(size)) {
    return <LogoMicroMark size={size} alt={alt} style={style} onLightSurface={theme === 'dark'} />;
  }

  return <LogoImage size={size} alt={alt} style={style} priority={priority} />;
}

export function WaselLogo({
  size = 38,
  showWordmark = true,
  theme = 'dark',
  style,
  variant = 'full',
}: WaselLogoProps) {
  const onLightSurface = theme === 'dark';
  const useMicroMark = shouldUseMicroMark(size);
  const titleColor = onLightSurface ? C.navy : C.text;
  const subColor = onLightSurface ? 'rgba(11,29,69,0.6)' : C.textMuted;
  const frameInset = useMicroMark ? Math.max(1, Math.round(size * 0.03)) : Math.max(2, Math.round(size * 0.04));
  const shellRadius = useMicroMark ? Math.max(10, Math.round(size * 0.34)) : Math.max(12, Math.round(size * 0.3));
  const haloSize = size <= 28 ? 0 : useMicroMark ? Math.round(size * 0.08) : Math.round(size * 0.2);
  const tagline = variant === 'full' ? 'Jordan Mobility Network' : '';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: Math.max(10, Math.round(size * 0.22)), ...style }}>
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {haloSize > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: -haloSize,
              borderRadius: shellRadius + haloSize,
              background: 'radial-gradient(circle, rgba(0,200,232,0.24) 0%, rgba(32,96,232,0.12) 36%, rgba(139,92,246,0.10) 54%, rgba(4,12,24,0) 78%)',
              filter: 'blur(14px)',
              opacity: onLightSurface ? 0.16 : 0.92,
            }}
          />
        )}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: -frameInset,
            borderRadius: shellRadius + frameInset,
            background: useMicroMark
              ? `linear-gradient(145deg, rgba(0,200,232,0.18), rgba(32,96,232,0.12) 58%, rgba(240,168,48,0.14))`
              : `linear-gradient(145deg, ${C.cyanGlow}, rgba(32,96,232,0.18) 58%, rgba(240,168,48,0.16))`,
            border: `1px solid ${onLightSurface ? 'rgba(11,29,69,0.10)' : C.border}`,
            boxShadow: onLightSurface ? '0 10px 24px rgba(11,29,69,0.12)' : SH.cyan,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: shellRadius,
            background: useMicroMark
              ? (onLightSurface ? 'rgba(255,255,255,0.98)' : 'rgba(4,12,24,0.96)')
              : (onLightSurface ? 'rgba(255,255,255,0.96)' : 'rgba(4,12,24,0.92)'),
            border: `1px solid ${onLightSurface ? 'rgba(11,29,69,0.08)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: onLightSurface ? 'inset 0 1px 0 rgba(255,255,255,0.7)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: Math.max(5, Math.round(size * 0.16)),
            borderRadius: shellRadius * 0.72,
            border: `1px solid ${onLightSurface ? 'rgba(11,29,69,0.07)' : 'rgba(0,200,232,0.16)'}`,
            opacity: useMicroMark ? 0.4 : 0.75,
          }}
        />
        <LogoVisual
          size={size}
          priority={size >= 40}
          theme={theme}
          style={{
            position: 'relative',
            zIndex: 1,
            borderRadius: shellRadius,
          }}
        />
      </div>
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: size * 0.42,
              lineHeight: 0.95,
              fontWeight: 900,
              letterSpacing: '-0.04em',
              color: titleColor,
              backgroundImage: onLightSurface ? 'none' : GRAD_SIGNAL,
              WebkitBackgroundClip: onLightSurface ? undefined : 'text',
              WebkitTextFillColor: onLightSurface ? undefined : 'transparent',
              textShadow: onLightSurface ? 'none' : '0 0 24px rgba(0,200,232,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            {variant === 'compact' ? 'W' : 'Wasel'}
          </span>
          {variant === 'full' && (
            <span
              style={{
                fontFamily: F,
                fontSize: size * 0.16,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: subColor,
                whiteSpace: 'nowrap',
              }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function WaselMark({ size = 38, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'inline-flex', ...style }}>
      <LogoVisual size={size} theme="light" />
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
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -Math.round(size * 0.18),
          borderRadius: Math.round(size * 0.42),
          background: 'radial-gradient(circle, rgba(0,200,232,0.30) 0%, rgba(32,96,232,0.14) 38%, rgba(4,12,24,0) 76%)',
          filter: 'blur(18px)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: Math.round(size * 0.34),
          background: `linear-gradient(145deg, ${C.cyanGlow}, rgba(32,96,232,0.16) 56%, rgba(240,168,48,0.18))`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: Math.round(size * 0.3),
          background: 'rgba(4,12,24,0.92)',
          border: `1px solid ${C.border}`,
        }}
      />
      <LogoImage
        size={size}
        alt="Wasel logo hero"
        priority
        style={{
          position: 'relative',
          zIndex: 1,
          borderRadius: Math.round(size * 0.3),
        }}
      />
    </div>
  );
}

export function WaselIcon({ size = 20 }: { size?: number }) {
  return <LogoVisual size={size} alt="Wasel icon" theme="light" forceMicro />;
}
