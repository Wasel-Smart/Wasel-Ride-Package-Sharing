export const LANDING_FONT =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

export const LANDING_DISPLAY =
  "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";

export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: inherit; }
  .landing-shell, .landing-shell * { box-sizing: border-box; }
  .landing-shell > * { min-width: 0; }
  .landing-shell button:focus-visible {
    outline: 2px solid rgba(22,199,242,0.92);
    outline-offset: 3px;
  }
  .wasel-lift-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .landing-live-dot { animation: landingPulse 1.9s ease-in-out infinite; }
  .landing-glow-card { position: relative; overflow: hidden; }
  .landing-glow-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(135deg, rgba(22,199,242,0.18), rgba(22,199,242,0) 36%, rgba(199,255,26,0.16) 100%);
    opacity: 0.9;
    pointer-events: none;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    padding: 1px;
  }
  @keyframes landingPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
  @media (hover: hover) and (pointer: fine) { .wasel-lift-card:hover { transform: translateY(-2px); box-shadow: 0 24px 54px rgba(0,0,0,0.24); } }
  @media (max-width: 1240px) { .landing-main-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 1040px) { .landing-signal-grid, .landing-bottom-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 780px) {
    .landing-action-grid, .landing-auth-grid, .landing-hero-highlights { grid-template-columns: 1fr !important; }
    .landing-hero-shell { grid-template-columns: 1fr !important; }
    .landing-hero-stat-grid { grid-template-columns: 1fr !important; }
    .landing-map-education-grid { grid-template-columns: 1fr !important; }
    .landing-hero-meta, .landing-footer-meta { flex-direction: column !important; align-items: flex-start !important; }
  }
  @media (max-width: 640px) {
    .landing-shell { padding: 22px 14px 72px !important; }
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .landing-map-shell { padding: 12px !important; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
`;
