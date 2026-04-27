import { motion } from 'motion/react';
import { BRAND } from '../../design-system/brand';

const SYMBOL_WIDTH = 392;
const SYMBOL_HEIGHT = 288;

export const EXACT_LOGO_BADGE_ASPECT_RATIO = 1;
export const EXACT_LOGO_SYMBOL_ASPECT_RATIO = SYMBOL_WIDTH / SYMBOL_HEIGHT;

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
  const haloInset = framed ? Math.max(10, Math.round(size * 0.18)) : Math.max(12, Math.round(size * 0.16));
  const showHeroHalo = !framed && (animated || glow);
  const asset = framed ? BRAND.logoAssets.badge : BRAND.logoAssets.symbol;

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
      {showHeroHalo ? (
        <motion.div
          style={{
            position: 'absolute',
            inset: `-${haloInset}px`,
            borderRadius: framed ? Math.round(size * 0.72) : '999px',
            background:
              'radial-gradient(circle, rgba(229,156,54,0.22) 0%, rgba(229,156,54,0.1) 34%, rgba(229,156,54,0) 76%)',
            filter: 'blur(14px)',
            pointerEvents: 'none',
          }}
          animate={
            animated
              ? { opacity: [0.34, 0.6, 0.34], scale: [0.97, 1.04, 0.97] }
              : { opacity: glow ? 0.46 : 0.34, scale: 1 }
          }
          transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      ) : null}

      <motion.img
        src={asset}
        alt=""
        draggable={false}
        width={width}
        height={size}
        decoding="async"
        animate={animated ? { y: [0, -1.5, 0], scale: [1, 1.016, 1] } : { y: 0, scale: 1 }}
        transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          width,
          height: size,
          objectFit: 'contain',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
