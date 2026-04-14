import { motion } from 'motion/react';

const LOGO_COLOR = '#A9E3FF';
const LOGO_COLOR_SOFT = 'rgba(169, 227, 255, 0.28)';
const LOGO_COLOR_FAINT = 'rgba(169, 227, 255, 0.14)';
const BADGE_TOP = '#23384A';
const BADGE_BOTTOM = '#142433';
const BADGE_BORDER = 'rgba(169, 227, 255, 0.18)';
const SYMBOL_GUIDE = 'rgba(169, 227, 255, 0.42)';
const SYMBOL_DETAIL = 'rgba(169, 227, 255, 0.54)';

function SimpleNetworkSymbol({ animated }: { animated: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 72 72"
      style={{
        position: 'relative',
        zIndex: 2,
        width: '72%',
        height: '72%',
        overflow: 'visible',
      }}
      animate={animated ? { y: [0, -1.25, 0], scale: [1, 1.02, 1] } : { y: 0, scale: 1 }}
      transition={animated ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 50L33 34L53 22" stroke={SYMBOL_GUIDE} strokeWidth="7.5" />
        <path d="M18 50L33 34L53 22" stroke={LOGO_COLOR} strokeWidth="4.4" />
        <path d="M24 24L33 34L46 46" stroke={SYMBOL_DETAIL} strokeWidth="2.8" />
      </g>

      <g fill={LOGO_COLOR}>
        <circle cx="18" cy="50" r="5.25" />
        <circle cx="33" cy="34" r="6.6" />
        <circle cx="53" cy="22" r="5.25" />
      </g>

      <g fill="#EDF8FF" opacity="0.84">
        <circle cx="18" cy="50" r="2.15" />
        <circle cx="33" cy="34" r="2.55" />
        <circle cx="53" cy="22" r="2.15" />
      </g>

      <g fill={LOGO_COLOR} opacity="0.52">
        <circle cx="24" cy="24" r="2.4" />
        <circle cx="46" cy="46" r="2.65" />
      </g>
    </motion.svg>
  );
}

export function ExactLogoMark({
  size = 38,
  animated = false,
}: {
  size?: number;
  animated?: boolean;
}) {
  const borderRadius = Math.max(12, Math.round(size * 0.3));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: -Math.max(8, Math.round(size * 0.16)),
          borderRadius: '50%',
          background: `radial-gradient(circle, ${LOGO_COLOR_SOFT} 0%, rgba(169, 227, 255, 0.1) 42%, rgba(169, 227, 255, 0) 74%)`,
          filter: 'blur(10px)',
        }}
        animate={animated ? { opacity: [0.42, 0.9, 0.42], scale: [0.94, 1.08, 0.94] } : { opacity: 0.62, scale: 1 }}
        transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          border: `1px solid ${BADGE_BORDER}`,
          background: `linear-gradient(180deg, ${BADGE_TOP} 0%, ${BADGE_BOTTOM} 100%)`,
        }}
        animate={
          animated
            ? {
                y: [0, -1.5, 0],
                scale: [1, 1.02, 1],
                boxShadow: [
                  `0 14px 28px rgba(5, 12, 20, 0.26), 0 0 0 1px ${LOGO_COLOR_FAINT}`,
                  `0 18px 34px rgba(5, 12, 20, 0.32), 0 0 24px ${LOGO_COLOR_SOFT}`,
                  `0 14px 28px rgba(5, 12, 20, 0.26), 0 0 0 1px ${LOGO_COLOR_FAINT}`,
                ],
              }
            : {
                y: 0,
                scale: 1,
                boxShadow: `0 14px 28px rgba(5, 12, 20, 0.26), 0 0 0 1px ${LOGO_COLOR_FAINT}`,
              }
        }
        transition={animated ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
      >
        <div
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: Math.max(10, borderRadius - 1),
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.015) 42%, rgba(255,255,255,0) 100%)',
            pointerEvents: 'none',
          }}
        />
        <SimpleNetworkSymbol animated={animated} />
      </motion.div>
    </div>
  );
}
