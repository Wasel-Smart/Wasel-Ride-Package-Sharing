import { motion } from 'motion/react';
import { useId } from 'react';
import { BRAND } from '../../design-system/brand';

const SYMBOL_WIDTH = 440;
const SYMBOL_HEIGHT = 340;

export const EXACT_LOGO_BADGE_ASPECT_RATIO = 1;
export const EXACT_LOGO_SYMBOL_ASPECT_RATIO = SYMBOL_WIDTH / SYMBOL_HEIGHT;

function RouteWSymbol({ glow }: { glow: boolean }) {
  const rawId = useId().replace(/:/g, '');
  const laneGlowId = `${rawId}-laneGlow`;
  const laneCoreId = `${rawId}-laneCore`;
  const laneHighlightId = `${rawId}-laneHighlight`;
  const metalRingId = `${rawId}-metalRing`;
  const nodeCoreWarmId = `${rawId}-nodeCoreWarm`;
  const nodeCoreSoftId = `${rawId}-nodeCoreSoft`;
  const shadowId = `${rawId}-symbolShadow`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SYMBOL_WIDTH} ${SYMBOL_HEIGHT}`}
      fill="none"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      <defs>
        <linearGradient
          id={laneGlowId}
          x1="84"
          y1="68"
          x2="382"
          y2="298"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFF2D8" />
          <stop offset="0.2" stopColor="#FFB357" />
          <stop offset="0.46" stopColor="#F59A2C" />
          <stop offset="0.72" stopColor="#E8C58F" />
          <stop offset="1" stopColor="#F5EFE7" />
        </linearGradient>
        <linearGradient
          id={laneCoreId}
          x1="102"
          y1="88"
          x2="368"
          y2="274"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFD08B" />
          <stop offset="0.32" stopColor="#F59A2C" />
          <stop offset="0.56" stopColor="#C87919" />
          <stop offset="0.8" stopColor="#F0D9B6" />
          <stop offset="1" stopColor="#FFF8F0" />
        </linearGradient>
        <linearGradient
          id={laneHighlightId}
          x1="126"
          y1="88"
          x2="354"
          y2="240"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFDF8" stopOpacity="0.98" />
          <stop offset="0.42" stopColor="#FFE8BD" stopOpacity="0.76" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient
          id={metalRingId}
          x1="70"
          y1="36"
          x2="112"
          y2="122"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.18" stopColor="#E0E3E8" />
          <stop offset="0.42" stopColor="#606671" />
          <stop offset="0.64" stopColor="#161A21" />
          <stop offset="0.84" stopColor="#BBC0C9" />
          <stop offset="1" stopColor="#FBFCFD" />
        </linearGradient>
        <radialGradient
          id={nodeCoreWarmId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0 -1) rotate(90) scale(18)"
        >
          <stop offset="0" stopColor="#FFF8ED" />
          <stop offset="0.5" stopColor="#FFB357" />
          <stop offset="1" stopColor="#C97A18" />
        </radialGradient>
        <radialGradient
          id={nodeCoreSoftId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0 -1) rotate(90) scale(18)"
        >
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.48" stopColor="#F5EFE7" />
          <stop offset="1" stopColor="#D9B783" />
        </radialGradient>
        {glow ? (
          <filter
            id={shadowId}
            x="24"
            y="12"
            width="392"
            height="320"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#2F1B0A" floodOpacity="0.24" />
            <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#F59A2C" floodOpacity="0.16" />
          </filter>
        ) : null}
      </defs>

      <g filter={glow ? `url(#${shadowId})` : undefined}>
        <path
          d="M96 78C111 152 128 243 164 286C189 316 218 254 236 154C254 254 283 316 308 286C344 243 361 152 376 78"
          stroke="#171B22"
          strokeOpacity="0.18"
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M96 78C111 152 128 243 164 286C189 316 218 254 236 154C254 254 283 316 308 286C344 243 361 152 376 78"
          stroke={`url(#${laneGlowId})`}
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M96 78C111 152 128 243 164 286C189 316 218 254 236 154C254 254 283 316 308 286C344 243 361 152 376 78"
          stroke={`url(#${laneCoreId})`}
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M104 84C118 152 136 235 168 279C190 304 216 243 236 162C256 243 282 304 304 279C336 235 354 152 368 84"
          stroke={`url(#${laneHighlightId})`}
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        <g transform="translate(96 78)">
          <circle r="30" fill={`url(#${metalRingId})`} />
          <circle r="21.5" fill="#13171D" />
          <circle r="13.5" fill={`url(#${nodeCoreWarmId})`} />
          <circle cx="-5.5" cy="-6" r="4.2" fill="#FFF7EC" opacity="0.72" />
          <circle r="26.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        </g>

        <g transform="translate(236 154)">
          <circle r="29" fill={`url(#${metalRingId})`} />
          <circle r="20.5" fill="#13171D" />
          <circle r="12.5" fill={`url(#${nodeCoreWarmId})`} />
          <circle cx="-5" cy="-5.5" r="3.9" fill="#FFF7EC" opacity="0.72" />
          <circle r="25.5" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5" />
        </g>

        <g transform="translate(376 78)">
          <circle r="30" fill={`url(#${metalRingId})`} />
          <circle r="21.5" fill="#13171D" />
          <circle r="13.5" fill={`url(#${nodeCoreSoftId})`} />
          <circle cx="-5.5" cy="-6" r="4.2" fill="#FFFFFF" opacity="0.7" />
          <circle r="26.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

export function ExactLogoMark({
  size = 38,
  animated = false,
  framed = false,
  glow = false,
}: {
  size?: number;
  animated?: boolean;
  framed?: boolean;
  glow?: boolean;
}) {
  const aspectRatio = framed ? EXACT_LOGO_BADGE_ASPECT_RATIO : EXACT_LOGO_SYMBOL_ASPECT_RATIO;
  const width = Math.max(1, Math.round(size * aspectRatio));
  const haloInset = framed ? Math.max(10, Math.round(size * 0.2)) : Math.max(14, Math.round(size * 0.18));
  const showGlow = glow || animated;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width,
        height: size,
        flexShrink: 0,
      }}
    >
      {showGlow ? (
        <motion.div
          style={{
            position: 'absolute',
            inset: `-${haloInset}px`,
            borderRadius: framed ? Math.round(size * 0.72) : '999px',
            background:
              'radial-gradient(circle, rgba(245,176,65,0.34) 0%, rgba(230,126,34,0.16) 38%, rgba(230,126,34,0) 78%)',
            filter: 'blur(16px)',
            pointerEvents: 'none',
          }}
          animate={
            animated
              ? { opacity: [0.4, 0.84, 0.4], scale: [0.97, 1.05, 0.97] }
              : { opacity: glow ? 0.64 : 0.4, scale: 1 }
          }
          transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      ) : null}

      <motion.div
        animate={animated ? { y: [0, -1.5, 0], scale: [1, 1.018, 1] } : { y: 0, scale: 1 }}
        transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{
          position: 'relative',
          zIndex: 1,
          width,
          height: size,
        }}
      >
        {framed ? (
          <img
            src={BRAND.logoAssets.badge}
            alt=""
            draggable={false}
            width={width}
            height={size}
            decoding="async"
            style={{
              display: 'block',
              width,
              height: size,
              objectFit: 'contain',
              userSelect: 'none',
            }}
          />
        ) : (
          <RouteWSymbol glow={glow} />
        )}
      </motion.div>
    </div>
  );
}
