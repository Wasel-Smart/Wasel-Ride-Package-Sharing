import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ANIM } from '@/utils/wasel-ds';

interface WaselPageTransitionProps {
  children: ReactNode;
  mode?: 'wait' | 'sync';
  transition?: {
    initial?: { opacity?: number; y?: number };
    animate?: { opacity?: number; y?: number };
    exit?: { opacity?: number; y?: number };
    duration?: number;
  };
}

export function WaselPageTransition ({
  children,
  mode = 'wait',
  transition = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    duration: 0.35,
  },
}: WaselPageTransitionProps) {
  return (
    <motion.div
      key="page"
      initial={transition.initial}
      animate={transition.animate}
      exit={transition.exit}
      transition={{
        duration: ANIM.dur.page / 1000,
        ease: ANIM.ease.default,
        ...transition,
      }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export function WaselPageTransitionWrap ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: ANIM.ease.default,
      }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export function WaselStaggerContainer ({
  children,
  gap = 8,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.05,
          },
        },
      }}
      style={{ display: 'flex', gap: `${gap}px`, width: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export function WaselStaggerItem () {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: ANIM.dur.normal / 1000,
            ease: ANIM.ease.default,
          },
        },
      }}
    />
  );
}
