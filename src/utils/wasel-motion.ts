/**
 * Wasel Motion Design System
 *
 * Branded animations, transitions, micro-interactions, and loading states.
 * All motion respects `prefers-reduced-motion` for accessibility.
 */

import { ANIM } from './wasel-ds';

export const MOTION = {
  duration: {
    instant: '0ms',
    fast: ANIM.dur.fast,
    normal: ANIM.dur.normal,
    slow: ANIM.dur.slow,
    slower: ANIM.dur.slower,
  },
  easing: {
    default: ANIM.ease.default,
    spring: ANIM.ease.spring,
    inOut: ANIM.ease.inOut,
    decel: ANIM.ease.decel,
  },
} as const;

export type MotionDuration = keyof typeof MOTION.duration;
export type MotionEasing = keyof typeof MOTION.easing;

export interface MotionConfig {
  duration: MotionDuration;
  easing: MotionEasing;
  delay?: number;
}

export const motionConfig = {
  button: { duration: 'fast' as MotionDuration, easing: 'default' as MotionEasing },
  card: { duration: 'normal' as MotionDuration, easing: 'default' as MotionEasing },
  modal: { duration: 'slow' as MotionDuration, easing: 'spring' as MotionEasing },
  page: { duration: 'slower' as MotionDuration, easing: 'inOut' as MotionEasing },
  tooltip: { duration: 'fast' as MotionDuration, easing: 'default' as MotionEasing },
  toast: { duration: 'normal' as MotionDuration, easing: 'default' as MotionEasing },
  skeleton: { duration: 'slow' as MotionDuration, easing: 'default' as MotionEasing },
};

export function getMotionStyle(config: MotionConfig): React.CSSProperties {
  const duration = config.duration === 'instant' ? '0ms' : ANIM.dur[config.duration as keyof typeof ANIM.dur];
  const easing = ANIM.ease[config.easing as keyof typeof ANIM.ease];
  return {
    transitionDuration: duration,
    transitionTimingFunction: easing,
    transitionDelay: config.delay ? `${config.delay}ms` : undefined,
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getSafeDuration(duration: MotionDuration): string {
  if (prefersReducedMotion()) return '0ms';
  return duration === 'instant' ? '0ms' : ANIM.dur[duration as keyof typeof ANIM.dur];
}

export function getSafeEasing(easing: MotionEasing): string {
  if (prefersReducedMotion()) return 'linear';
  return ANIM.ease[easing as keyof typeof ANIM.ease];
}

export const CSS_CLASSES = {
  slideUp: `animate-slide-up`,
  slideDown: `animate-slide-down`,
  fadeIn: `animate-fade-in`,
  scaleIn: `animate-scale-in`,
  pulseGlow: `animate-pulse-glow`,
  shimmer: `animate-shimmer`,
  spin: `animate-spin`,
  float: `animate-float`,
  orbDrift: `animate-orb-drift`,
  orbit: `animate-orbit`,
  waselPulse: `animate-wasel-pulse`,
} as const;

export const LOADING_STATES = {
  skeleton: {
    base: 'animate-pulse bg-cyan/10 rounded-lg',
    text: 'h-4 bg-cyan/10 rounded mb-2',
    title: 'h-6 bg-cyan/10 rounded mb-3 w-3/4',
    image: 'h-48 bg-cyan/10 rounded-lg mb-3',
    button: 'h-12 bg-cyan/10 rounded-lg w-full',
  },
  spinner: {
    default: 'w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin',
    brand: 'w-8 h-8 border-2 border-transparent border-t-cyan rounded-full animate-orbit',
    pulse: 'w-8 h-8 bg-cyan/20 rounded-full animate-wasel-pulse',
  },
  shimmer: {
    base: 'relative overflow-hidden bg-cyan/5',
    overlay: 'absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-cyan/10 to-transparent',
  },
  skeletonCard: {
    base: 'p-4 rounded-xl bg-navyMid/50 border border-cyan/10',
    header: 'flex items-center gap-3 mb-4',
    avatar: 'w-10 h-10 rounded-full bg-cyan/10',
    lines: 'flex-1 space-y-2',
    line: 'h-3 bg-cyan/10 rounded',
  },
};

export const MICRO_INTERACTIONS = {
  button: {
    press: 'scale-[0.97] transition-transform duration-fast',
    hover: 'hover:scale-[1.02] transition-transform duration-fast',
    active: 'active:scale-[0.97]',
  },
  card: {
    hover: 'hover:-translate-y-1 hover:shadow-cyan transition-all duration-normal',
    press: 'active:scale-[0.99] transition-transform duration-fast',
  },
  input: {
    focus: 'focus:ring-2 focus:ring-cyan/40 focus:border-cyan/40 transition-all duration-fast',
    hover: 'hover:border-cyan/30 transition-colors duration-fast',
  },
  icon: {
    hover: 'hover:scale-110 hover:text-cyan transition-all duration-fast',
    press: 'active:scale-95 transition-transform duration-instant',
  },
  nav: {
    item: 'hover:bg-cyan/10 hover:text-cyan transition-colors duration-fast',
    active: 'text-cyan border-l-2 border-cyan pl-3',
  },
  fab: {
    hover: 'hover:scale-110 hover:shadow-cyan-lg transition-all duration-normal',
    press: 'active:scale-95 transition-transform duration-instant',
  },
};

export const PAGE_TRANSITIONS = {
  fade: {
    enter: 'opacity-0',
    enterActive: 'opacity-100 transition-opacity duration-slower',
    exit: 'opacity-100',
    exitActive: 'opacity-0 transition-opacity duration-normal',
  },
  slideUp: {
    enter: 'opacity-0 translate-y-4',
    enterActive: 'opacity-100 translate-y-0 transition-all duration-slower ease-in-out',
    exit: 'opacity-100 translate-y-0',
    exitActive: 'opacity-0 translate-y-4 transition-all duration-normal ease-in-out',
  },
  slideRight: {
    enter: 'opacity-0 -translate-x-4',
    enterActive: 'opacity-100 translate-x-0 transition-all duration-slower ease-in-out',
    exit: 'opacity-100 translate-x-0',
    exitActive: 'opacity-0 translate-x-4 transition-all duration-normal ease-in-out',
  },
  scale: {
    enter: 'opacity-0 scale-95',
    enterActive: 'opacity-100 scale-100 transition-all duration-slow ease-spring',
    exit: 'opacity-100 scale-100',
    exitActive: 'opacity-0 scale-95 transition-all duration-fast ease-in',
  },
};

export const GESTURE_FEEDBACK = {
  swipe: {
    start: 'transition-transform duration-fast',
    active: 'transition-none',
    end: 'transition-transform duration-normal ease-decel',
  },
  drag: {
    start: 'cursor-grab',
    active: 'cursor-grabbing scale-[1.02] shadow-lg',
    end: 'transition-transform duration-fast',
  },
  pullToRefresh: {
    idle: 'transition-transform duration-decel',
    pulling: 'transition-none',
    releasing: 'transition-transform duration-normal ease-spring',
  },
};

export const BRAND_ANIMATIONS = {
  logoReveal: {
    keyframes: [
      { opacity: '0', transform: 'scale(0.9)', offset: 0 },
      { opacity: '1', transform: 'scale(1)', offset: 0.6 },
      { opacity: '1', transform: 'scale(1)', offset: 1 },
    ],
    options: { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' as const },
  },
  routeTransition: {
    keyframes: [
      { opacity: '0', transform: 'translateY(8px)', offset: 0 },
      { opacity: '1', transform: 'translateY(0)', offset: 1 },
    ],
    options: { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' as const },
  },
  orbitPulse: {
    keyframes: [
      { opacity: '0.6', transform: 'scale(0.95)', offset: 0 },
      { opacity: '0', transform: 'scale(1.3)', offset: 0.7 },
      { opacity: '0', transform: 'scale(1.3)', offset: 1 },
    ],
    options: { duration: 2000, easing: 'ease-out', fill: 'forwards' as const },
  },
  shimmer: {
    keyframes: [
      { backgroundPosition: '-1000px 0', offset: 0 },
      { backgroundPosition: '1000px 0', offset: 1 },
    ],
    options: { duration: 1500, iterations: Infinity, easing: 'linear' },
  },
};

export const STAGGER = {
  children: (count: number, baseDelay = 50) =>
    Array.from({ length: count }, (_, i) => ({
      animationDelay: `${i * baseDelay}ms`,
      animationFillMode: 'both' as const,
    })),
  grid: (rows: number, cols: number, baseDelay = 50) =>
    Array.from({ length: rows * cols }, (_, i) => ({
      animationDelay: `${(Math.floor(i / cols) + (i % cols)) * baseDelay}ms`,
      animationFillMode: 'both' as const,
    })),
};

export const REDUCED_MOTION = {
  duration: '0ms',
  easing: 'linear',
  animation: 'none',
  transition: 'none',
};
