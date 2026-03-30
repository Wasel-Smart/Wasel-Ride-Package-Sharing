/**
 * Wasel Design System Tokens v6.0
 * Cosmic Dark Theme: Deep Space · Electric Cyan · Gold Accents
 * bg: #040C18 | cyan: #00C8E8 | gold: #F0A830
 *
 * ✅ v6.0 additions:
 *   - SPACE spacing scale (4px grid)
 *   - TYPE typography scale (sizes, weights, line-heights)
 *   - ANIM animation durations & easings
 *   - BREAK responsive breakpoints
 *   - All token aliases consolidated — no more inline hex literals needed
 */

// ── Color Palette ─────────────────────────────────────────────────────────────
export const C = {
  // Backgrounds — cosmic dark
  bg:        '#040C18',
  bgAlt:     '#060E1E',
  bgDeep:    '#020810',    // MobilityOS deep bg — unified here
  card:      'rgba(255,255,255,0.045)',
  cardSolid: '#0A1628',   // Opaque card bg for Payments / Moderation
  card2:     '#0C1B33',
  panel:     'rgba(255,255,255,0.03)',
  elevated:  'rgba(255,255,255,0.07)',

  // Brand blues
  navy:      '#0B1D45',
  navyMid:   '#162C6A',
  navyLight: '#2D4A8A',

  // Accent palette
  cyan:      '#00C8E8',
  cyanDark:  '#0090D8',
  cyanDim:   'rgba(0,200,232,0.12)',
  cyanGlow:  'rgba(0,200,232,0.25)',
  blue:      '#2060E8',
  blueLight: '#5590FF',
  blueDim:   'rgba(32,96,232,0.10)',
  gold:      '#F0A830',
  goldDim:   'rgba(240,168,48,0.12)',
  green:     '#00C875',
  greenDim:  'rgba(0,200,117,0.12)',
  purple:    '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.12)',
  orange:    '#FB923C',
  orangeDim: 'rgba(251,146,60,0.12)',

  // Text — light on dark
  text:      '#EFF6FF',
  textSub:   'rgba(203,213,225,0.85)',
  textMuted: 'rgba(148,163,184,0.6)',
  textDim:   'rgba(100,130,180,0.5)',

  // Borders — subtle glow
  border:    'rgba(0,200,232,0.16)',
  borderHov: 'rgba(0,200,232,0.3)',
  borderFaint: 'rgba(255,255,255,0.08)',

  // States
  error:     '#FF4455',
  errorDim:  'rgba(255,68,85,0.12)',
  warning:   '#F0A830',
  success:   '#00C875',
  info:      '#00C8E8',

  // Overlays
  overlay:   'rgba(4,12,24,0.82)',
  glass:     'rgba(6,15,35,0.9)',
} as const;

// ── Font Families ─────────────────────────────────────────────────────────────
export const F = "-apple-system, BlinkMacSystemFont, 'Inter', 'Cairo', 'Tajawal', sans-serif";
export const FA = "'Cairo', 'Tajawal', sans-serif";         // Arabic-primary
export const FM = "'JetBrains Mono', 'Fira Mono', monospace"; // Monospace

// ── Typography Scale ──────────────────────────────────────────────────────────
export const TYPE = {
  size: {
    xs:   '0.65rem',   // 10.4px — labels, badges
    sm:   '0.75rem',   // 12px   — secondary text
    base: '0.875rem',  // 14px   — body
    md:   '1rem',      // 16px   — sub-headings
    lg:   '1.125rem',  // 18px   — section heads
    xl:   '1.25rem',   // 20px
    '2xl':'1.5rem',    // 24px
    '3xl':'1.875rem',  // 30px
    '4xl':'2.25rem',   // 36px
    '5xl':'3rem',      // 48px   — hero
  },
  weight: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    800,
    ultra:    900,
  },
  lineHeight: {
    tight:   1.1,
    snug:    1.3,
    normal:  1.5,
    relaxed: 1.65,
    loose:   1.8,
  },
  letterSpacing: {
    tighter: '-0.04em',
    tight:   '-0.02em',
    normal:  '0',
    wide:    '0.06em',
    wider:   '0.1em',
    widest:  '0.14em',
  },
} as const;

// ── Spacing Scale (4px grid) ──────────────────────────────────────────────────
export const SPACE = {
  0:   '0px',
  1:   '4px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  7:   '28px',
  8:   '32px',
  9:   '36px',
  10:  '40px',
  12:  '48px',
  14:  '56px',
  16:  '64px',
  20:  '80px',
  24:  '96px',
} as const;

// ── Border Radius ─────────────────────────────────────────────────────────────
export const R = {
  none: '0px',
  xs:   '4px',
  sm:   '8px',
  md:   '10px',
  lg:   '12px',
  xl:   '16px',
  xxl:  '20px',
  '3xl':'28px',
  full: '9999px',
} as const;

// ── Shadows — dark-optimised ─────────────────────────────────────────────────
export const SH = {
  none:  'none',
  xs:    '0 1px 2px rgba(0,0,0,0.25)',
  sm:    '0 1px 4px rgba(0,0,0,0.3)',
  card:  '0 2px 12px rgba(0,0,0,0.4)',
  md:    '0 4px 20px rgba(0,0,0,0.5)',
  lg:    '0 10px 40px rgba(0,0,0,0.5)',
  xl:    '0 20px 60px rgba(0,0,0,0.6)',
  navy:  '0 8px 32px rgba(0,0,0,0.4)',
  cyan:  '0 4px 20px rgba(0,200,232,0.25)',
  cyanL: '0 10px 36px rgba(0,200,232,0.38)',
  blue:  '0 6px 22px rgba(32,96,232,0.26)',
  green: '0 6px 22px rgba(0,200,117,0.26)',
  gold:  '0 6px 22px rgba(240,168,48,0.26)',
  inner: 'inset 0 1px 3px rgba(0,0,0,0.3)',
} as const;

// ── Gradients ─────────────────────────────────────────────────────────────────
export const GRAD        = 'linear-gradient(135deg, #00C8E8, #2060E8)';
export const GRAD_GOLD   = 'linear-gradient(135deg, #F0A830, #FF9500)';
export const GRAD_GREEN  = 'linear-gradient(135deg, #00C875, #0EA5E9)';
export const GRAD_NAVY   = 'linear-gradient(135deg, #0B1D45, #1E3A6F)';
export const GRAD_PURPLE = 'linear-gradient(135deg, #8B5CF6, #6D28D9)';
export const GRAD_HERO   = 'linear-gradient(145deg, #040C18 0%, #07162B 56%, #0A1F37 100%)';
export const GRAD_SIGNAL = 'linear-gradient(135deg, #00C8E8 0%, #2060E8 58%, #8B5CF6 100%)';
export const GRAD_AURORA = 'radial-gradient(circle at top, rgba(0,200,232,0.24), rgba(32,96,232,0.12) 42%, rgba(4,12,24,0) 74%)';

// ── Animation ─────────────────────────────────────────────────────────────────
export const ANIM = {
  dur: {
    fast:    '100ms',
    normal:  '160ms',
    slow:    '250ms',
    slower:  '400ms',
    page:    '500ms',
  },
  ease: {
    default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
    inOut:   'cubic-bezier(0.4, 0, 0.2, 1)',
    decel:   'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

// ── Responsive Breakpoints ────────────────────────────────────────────────────
export const BREAK = {
  xs:  480,
  sm:  640,
  md:  768,
  lg:  900,
  xl:  1024,
  '2xl': 1280,
  '3xl': 1536,
} as const;

// ── Z-Index Stack ─────────────────────────────────────────────────────────────
export const Z = {
  base:    0,
  raised:  10,
  sticky:  100,
  overlay: 200,
  modal:   300,
  toast:   400,
  tooltip: 500,
} as const;

// ── Component Helpers ─────────────────────────────────────────────────────────

/** Dark glassmorphism card */
export function card({ padding = '20px', radius = R.xl }: { padding?: string; radius?: string } = {}): Record<string, string | number> {
  return {
    background:    C.card,
    border:        `1px solid ${C.border}`,
    borderRadius:  radius,
    padding,
    boxShadow:     SH.card,
    backdropFilter:'blur(12px)',
  };
}

/** Solid dark card (for Payments, Moderation — fully opaque) */
export function solidCard({ padding = '20px', radius = R.xl }: { padding?: string; radius?: string } = {}): Record<string, string | number> {
  return {
    background:   C.cardSolid,
    border:       `1px solid ${C.border}`,
    borderRadius: radius,
    padding,
    boxShadow:    SH.card,
  };
}

/** Accent glow focus ring helper */
export function focusRing(color = C.cyan): string {
  return `0 0 0 3px ${color}30`;
}

/** Status colour helper */
export function statusColor(status: 'success' | 'warning' | 'error' | 'info' | 'neutral'): string {
  return { success: C.green, warning: C.gold, error: C.error, info: C.cyan, neutral: C.textMuted }[status];
}

/** Pill badge inline style */
export function pillStyle(color: string): Record<string, string> {
  return {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '4px',
    padding:      '3px 10px',
    borderRadius: R.full,
    background:   `${color}14`,
    border:       `1px solid ${color}28`,
    fontSize:     TYPE.size.xs,
    fontWeight:   String(TYPE.weight.bold),
    color,
  };
}

// ── Global CSS Keyframes ──────────────────────────────────────────────────────
export const GLOBAL_STYLES = `
@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes slide-down {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0);     }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1);    }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1);    }
  50%       { opacity: 0.5; transform: scale(0.9); }
}
@keyframes pulse-glow {
  0%,100% { box-shadow: 0 0 12px rgba(0,200,232,0.2); }
  50%     { box-shadow: 0 0 28px rgba(0,200,232,0.45); }
}
@keyframes shimmer {
  0%   { background-position: -1000px 0; }
  100% { background-position:  1000px 0; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes float {
  0%,100% { transform: translateY(0);    }
  50%     { transform: translateY(-8px); }
}
@keyframes orb-drift {
  0%,100% { transform: translate(0, 0);       }
  50%     { transform: translate(30px, -20px); }
}
`;
