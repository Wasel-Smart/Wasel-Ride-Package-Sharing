/**
 * Wasel Design Token System — v3.0 "Deep Space Network"
 * Electric Cyan · Solar Gold · Emerald Green
 * Single source of truth — maps to CSS variables in /styles/globals.css
 * ⚠️ Never hardcode hex/px/rgba in components — always use these tokens.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const WaselColors = {
  // Base surfaces — 5-level elevation
  spaceDeep:    '#040C18',   // --background / page bg
  spaceCard:    '#0A1628',   // --card / card surface
  space1:       '#070F1F',   // elevated 1
  space2:       '#0A1628',   // cards
  space3:       '#10203A',   // secondary
  space4:       '#182E4E',   // borders / controls

  // Brand primaries — UPGRADED
  cyan:         '#00C8E8',   // Electric Cyan (primary dark-mode)
  cyanLight:    '#5EE7FF',   // Hover/highlight state
  gold:         '#F0A830',   // Solar Gold (accent)
  goldLight:    '#FFD070',   // Gold highlight
  green:        '#00C875',   // Emerald Green (success)
  greenDark:    '#0078A8',   // Deep cyan (primary light-mode)
  lime:         '#A8E63D',   // Volt Lime

  // Legacy aliases (backwards compat)
  teal:         '#00C8E8',
  bronze:       '#F0A830',
  orange:       '#F0A830',
  borderDark:   'rgba(24,46,78,0.85)',
  navyBase:     '#040C18',
  navyCard:     '#0A1628',

  // Text
  textPrimary:  '#EFF6FF',
  textSecondary:'#4D6A8A',
  textMuted:    '#2D4A6A',

  // Status
  success:      '#00C875',
  warning:      '#F0A830',
  error:        '#FF4455',
  info:         '#00C8E8',

  // Transparent utilities
  cyanGlow:     'rgba(0,200,232,0.15)',
  goldGlow:     'rgba(240,168,48,0.15)',
  greenGlow:    'rgba(0,200,117,0.15)',
  glassBg:      'rgba(10,22,40,0.85)',
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const WaselSpacing = {
  '0':   '0px',
  '1':   '4px',
  '2':   '8px',
  '3':   '12px',
  '4':   '16px',
  '5':   '20px',
  '6':   '24px',
  '8':   '32px',
  '10':  '40px',
  '12':  '48px',
  '16':  '64px',
  '20':  '80px',
  '24':  '96px',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const WaselFonts = {
  sans:    "'Inter', 'Segoe UI', 'Cairo', 'Tajawal', sans-serif",
  arabic:  "'Cairo', 'Tajawal', 'Almarai', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const WaselFontSizes = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.25rem',
  '2xl':'1.5rem',
  '3xl':'1.875rem',
  '4xl':'2.25rem',
  '5xl':'3rem',
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const WaselRadius = {
  sm:   '8px',
  base: '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl':'28px',
  full: '9999px',
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const WaselShadows = {
  sm:         '0 1px 4px rgba(0,0,0,0.5)',
  base:       '0 4px 20px rgba(0,0,0,0.55)',
  lg:         '0 8px 40px rgba(0,0,0,0.6)',
  glow:       '0 0 24px rgba(0,200,232,0.25)',
  glowGold:   '0 0 24px rgba(240,168,48,0.25)',
  glowGreen:  '0 0 24px rgba(0,200,117,0.25)',
  cyanBorder: '0 0 0 1px rgba(0,200,232,0.15), 0 4px 20px rgba(0,0,0,0.5)',
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const WaselZIndex = {
  base:    0,
  raised:  10,
  overlay: 100,
  modal:   200,
  toast:   300,
  tooltip: 400,
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────────

export const WaselTransitions = {
  fast:   '150ms ease',
  base:   '250ms ease',
  slow:   '400ms ease',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Glassmorphism presets ────────────────────────────────────────────────────

export const WaselGlass = {
  card: {
    background: 'rgba(10,22,40,0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,200,232,0.08)',
  },
  overlay: {
    background: 'rgba(4,12,24,0.92)',
    backdropFilter: 'blur(28px)',
  },
  panel: {
    background: 'rgba(7,15,31,0.97)',
    backdropFilter: 'blur(32px)',
    border: '1px solid rgba(0,200,232,0.07)',
  },
} as const;

// ─── Gradient presets ─────────────────────────────────────────────────────────

export const WaselGradients = {
  primaryBtn:  'linear-gradient(135deg, #00C8E8 0%, #0095B8 100%)',
  accentBtn:   'linear-gradient(135deg, #F0A830 0%, #C8751A 100%)',
  successBtn:  'linear-gradient(135deg, #00C875 0%, #009855 100%)',
  heroCard:    'linear-gradient(135deg, rgba(0,200,232,0.12) 0%, rgba(0,200,117,0.05) 100%)',
  constellation: 'linear-gradient(135deg, #00C8E8 0%, #F0A830 100%)',
} as const;
