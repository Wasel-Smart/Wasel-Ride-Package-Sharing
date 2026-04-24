/**
 * Shared UI styles and constants
 * Imported by multiple feature modules (rides, home, etc.)
 * No feature-specific logic — safe for cross-feature use.
 */
import type { CSSProperties } from 'react';

// ── Font families ──────────────────────────────────────────────────────────────

export const FONT_SANS =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif)";
export const FONT_DISPLAY =
  "var(--wasel-font-display, 'Plus Jakarta Sans', 'Montserrat', 'Cairo', 'Tajawal', sans-serif)";
export const FONT_ARABIC = "var(--wasel-font-arabic, 'Cairo', 'Tajawal', sans-serif)";

// Compatibility aliases for legacy modules (RideCard, RideResults, etc.)
export const LANDING_FONT = FONT_DISPLAY;
export const LANDING_DISPLAY = FONT_DISPLAY;

// ── Colour palette ─────────────────────────────────────────────────────────────

export const COLORS = {
  bg: 'var(--background)',
  bgDeep: 'var(--wasel-surface-0)',
  panel: 'var(--wasel-panel-strong)',
  panelSoft: 'var(--wasel-panel-muted)',
  text: 'var(--wasel-copy-primary)',
  muted: 'var(--wasel-copy-muted)',
  soft: 'var(--wasel-copy-soft)',
  cyan: 'var(--ds-accent, #f59a2c)',
  blue: 'var(--ds-accent-strong, #ffb357)',
  gold: 'var(--ds-warning, #efb45d)',
  green: 'var(--ds-success, #79c67d)',
  border: 'var(--ds-border, #313841)',
  borderStrong:
    'color-mix(in srgb, var(--ds-accent-strong, #ffb357) 30%, var(--ds-border, #313841))',
} as const;

// Compatibility aliases for legacy modules
export const LANDING_COLORS = COLORS;

// ── Style helpers ──────────────────────────────────────────────────────────────

/**
 * Card/panel container with consistent styling across features.
 * @param radius Border radius in pixels (default: 28)
 */
export const panelStyle = (radius = 28): CSSProperties => ({
  borderRadius: radius,
  background: 'var(--wasel-panel-strong)',
  border: `1px solid ${COLORS.border}`,
  boxShadow: 'var(--wasel-shadow-lg)',
  backdropFilter: 'blur(22px)',
});

/**
 * Lift-card style for hover/tap interactions.
 */
export const liftCardStyle: CSSProperties = {
  transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
};

/**
 * Identity helper — keeps JSX readable without template literal noise.
 */
export const lc = (value: string): string => value;

/**
 * Clamp a number between min and max.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// Global CSS styles injected by PageShell / shared surfaces.
// Extracted from home/landingConstants to break cross-feature dependency.
export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: inherit; }
  .landing-shell, .landing-shell * { box-sizing: border-box; }
  .landing-shell > * { min-width: 0; }
  .landing-shell button:focus-visible {
    outline: 2px solid var(--wasel-cyan);
    outline-offset: 2px;
  }
  .wasel-lift-card { 
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; 
  }
  .landing-glow-card { position: relative; overflow: hidden; }
  .landing-glow-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(169,227,255,0.08) 0%, transparent 40%, rgba(25,231,187,0.06) 100%);
    opacity: 0.8;
    pointer-events: none;
    border-radius: inherit;
  }
  .landing-live-dot { 
    animation: landingPulse 2s ease-in-out infinite; 
  }
  .landing-hero-art-column { display: grid; gap: 20px; align-content: center; }
  .landing-hero-visual {
    position: relative;
    min-height: clamp(280px, 38vw, 420px);
    display: grid;
    place-items: center;
    overflow: visible;
    padding: 20px;
    isolation: isolate;
  }
  .landing-hero-glow-field {
    position: absolute;
    inset: 6% 4% 8%;
    filter: blur(20px);
    opacity: 1;
    pointer-events: none;
    border-radius: 50%;
  }
  .landing-hero-orbit {
    position: absolute;
    inset: 0;
    margin: auto;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    pointer-events: none;
  }
  .landing-hero-orbit--outer {
    width: min(88%, 360px);
    border: 1px solid color-mix(in srgb, var(--wasel-cyan) 14%, transparent);
    opacity: 0.5;
    animation: landing-orbit-slow 24s linear infinite;
  }
  .landing-hero-orbit--inner {
    width: min(62%, 260px);
    border: 1px solid color-mix(in srgb, var(--wasel-green) 12%, transparent);
    opacity: 0.4;
    animation: landing-orbit-reverse 18s linear infinite;
  }
  .landing-hero-mark-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: clamp(200px, 28vw, 340px);
    padding: 16px;
    animation: landing-mark-float 6s ease-in-out infinite;
  }
  .landing-hero-mark-glow {
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 50%;
    pointer-events: none;
  }
  .landing-hero-mark-glow--cyan {
    width: min(68vw, 280px);
    height: min(68vw, 280px);
    background: radial-gradient(circle, color-mix(in srgb, var(--wasel-cyan) 24%, transparent) 0%, color-mix(in srgb, var(--wasel-cyan) 10%, transparent) 28%, transparent 68%);
    filter: blur(24px);
    transform: translate(-6px, -8px);
  }
  .landing-hero-mark-glow--green {
    width: min(62vw, 260px);
    height: min(62vw, 260px);
    background: radial-gradient(circle, color-mix(in srgb, var(--wasel-green) 18%, transparent) 0%, color-mix(in srgb, var(--wasel-green) 6%, transparent) 28%, transparent 68%);
    filter: blur(20px);
    transform: translate(18px, 22px);
  }
  .landing-hero-mark {
    display: inline-flex;
    width: min(94%, 300px);
    align-items: center;
    justify-content: center;
  }
  
  /* Premium Animations */
  @keyframes landingPulse { 
    0%, 100% { opacity: 0.6; transform: scale(1); } 
    50% { opacity: 1; transform: scale(1.06); } 
  }
  
  /* Button Hover Effects */
  .landing-shell button:hover {
    transform: translateY(-2px);
  }
  .landing-shell button:active {
    transform: translateY(0);
    transition-duration: 100ms;
  }
  
  /* Card Interactions */
  @media (hover: hover) and (pointer: fine) { 
    .wasel-lift-card:hover { 
      transform: translateY(-3px); 
      box-shadow: var(--wasel-shadow-xl); 
    } 
  }
  
  /* Tablet */
  @media (max-width: 1024px) { 
    .landing-main-grid { grid-template-columns: 1fr !important; }
    .landing-hero-shell { grid-template-columns: 1fr !important; gap: 24px !important; }
    .landing-action-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  
  /* Mobile Large */
  @media (max-width: 768px) { 
    .landing-signal-grid { grid-template-columns: 1fr !important; }
    .landing-bottom-grid { grid-template-columns: 1fr !important; }
    .landing-map-education-grid { grid-template-columns: 1fr !important; }
    .landing-hero-service-stats { grid-template-columns: repeat(2, 1fr) !important; }
    .landing-shell { padding: 24px 16px 60px !important; }
  }
  
  /* Mobile */
  @media (max-width: 640px) { 
    .landing-action-grid, .landing-auth-grid, .landing-hero-highlights { grid-template-columns: 1fr !important; }
    .landing-hero-shell { grid-template-columns: 1fr !important; }
    .landing-hero-stat-grid { grid-template-columns: 1fr !important; }
    .landing-hero-meta, .landing-footer-meta { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
    .landing-hero-art-column { gap: 16px; }
    .landing-hero-visual { min-height: clamp(240px, 60vw, 320px); }
    .landing-hero-mark-stage { min-height: clamp(180px, 48vw, 260px); }
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
    .landing-map-shell { padding: 16px !important; }
  }
  
  /* Small Mobile */
  @media (max-width: 480px) { 
    .landing-hero-visual { min-height: 220px; }
    .landing-hero-mark-stage { minHeight: 160px; }
    .landing-hero-service-stats { grid-template-columns: 1fr !important; }
  }
  
  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) { 
    *, *::before, *::after { 
      animation-duration: 0.01ms !important; 
      animation-iteration-count: 1 !important; 
      transition-duration: 0.01ms !important; 
    } 
  }
`;
