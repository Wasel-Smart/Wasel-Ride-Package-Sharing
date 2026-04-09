export const LANDING_FONT =
  "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

export const LANDING_DISPLAY =
  "var(--wasel-font-display, 'Space Grotesk', 'Plus Jakarta Sans', 'Cairo', sans-serif)";

export const LANDING_RESPONSIVE_STYLES = `
  :root { color-scheme: inherit; }
  .landing-shell, .landing-shell * { box-sizing: border-box; }
  .landing-shell > * { min-width: 0; }
  .landing-shell button:focus-visible {
    outline: 2px solid rgba(71,183,230,0.92);
    outline-offset: 3px;
  }
  .wasel-lift-card { transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .landing-live-dot { animation: landingPulse 1.9s ease-in-out infinite; }
  .landing-glow-card { position: relative; overflow: hidden; }
  .landing-hero-art-column { display: grid; gap: 18px; align-content: center; }
  .landing-hero-visual {
    position: relative;
    min-height: clamp(320px, 42vw, 520px);
    display: grid;
    place-items: center;
    overflow: visible;
    padding-block: clamp(16px, 2.4vw, 24px) 12px;
    isolation: isolate;
  }
  .landing-hero-glow-field {
    position: absolute;
    inset: 6% 4% 8%;
    filter: blur(22px);
    opacity: 1;
    pointer-events: none;
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
    width: min(92%, 420px);
    border: 1px solid rgba(71,183,230,0.14);
    opacity: 0.58;
    animation: landing-orbit-slow 22s linear infinite;
  }
  .landing-hero-orbit--inner {
    width: min(66%, 310px);
    border: 1px solid rgba(107,181,21,0.12);
    opacity: 0.48;
    animation: landing-orbit-reverse 16s linear infinite;
  }
  .landing-hero-mark-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    min-height: clamp(250px, 34vw, 430px);
    padding-top: clamp(8px, 2vw, 20px);
    animation: landing-mark-float 5.4s ease-in-out infinite;
  }
  .landing-hero-mark-glow {
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 50%;
    pointer-events: none;
  }
  .landing-hero-mark-glow--cyan {
    width: min(76vw, 340px);
    height: min(76vw, 340px);
    background: radial-gradient(circle, rgba(71,183,230,0.34) 0%, rgba(71,183,230,0.12) 34%, rgba(71,183,230,0) 74%);
    filter: blur(26px);
    transform: translate(-8px, -10px);
  }
  .landing-hero-mark-glow--green {
    width: min(72vw, 320px);
    height: min(72vw, 320px);
    background: radial-gradient(circle, rgba(107,181,21,0.26) 0%, rgba(107,181,21,0.1) 36%, rgba(107,181,21,0) 74%);
    filter: blur(24px);
    transform: translate(22px, 28px);
  }
  .landing-hero-mark {
    display: inline-flex;
    width: min(100%, 334px);
    align-items: center;
    justify-content: center;
  }
  .landing-glow-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    background: linear-gradient(135deg, rgba(71,183,230,0.18), rgba(71,183,230,0) 36%, rgba(168,214,20,0.16) 100%);
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
    .landing-hero-art-column { gap: 14px; }
    .landing-hero-visual { min-height: clamp(280px, 68vw, 380px); }
    .landing-hero-mark-stage { min-height: clamp(220px, 56vw, 320px); }
  }
  @media (max-width: 640px) {
    .landing-shell { padding: 22px 14px 72px !important; }
    .landing-header-row { flex-direction: column !important; align-items: flex-start !important; }
    .landing-map-shell { padding: 12px !important; }
  }
  @media (max-width: 480px) {
    .landing-hero-visual { min-height: 270px; }
    .landing-hero-mark-stage { min-height: 210px; }
  }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
`;
