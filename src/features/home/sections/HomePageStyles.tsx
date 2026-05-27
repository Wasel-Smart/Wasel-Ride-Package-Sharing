export function HomePageStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { overflow-x: clip; }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .wasel-home-shell {
        width: min(100%, 1140px);
        padding: clamp(16px, 3vw, 32px) clamp(14px, 4vw, 28px) calc(32px + env(safe-area-inset-bottom, 0px));
      }
      .wasel-home-card {
        min-width: 0;
        overflow-wrap: normal;
        word-break: normal;
      }
      .wasel-home-card *, .wasel-home-hero * {
        min-width: 0;
      }
      .wasel-home-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.06fr) minmax(320px, 0.94fr);
        gap: 16px;
        align-items: stretch;
      }
      .wasel-home-hero-copy {
        border-radius: 22px;
        padding: clamp(20px, 4vw, 28px);
        background: linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.025));
        border: 1px solid rgba(255,255,255,0.09);
        box-shadow: 0 18px 44px rgba(0,0,0,0.22);
      }
      .wasel-home-hero-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .wasel-home-brand-stack { display: grid; gap: 10px; }
      .wasel-home-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        min-height: 32px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.09);
        color: rgba(218,231,238,0.82);
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .wasel-home-title {
        margin: 0;
        max-width: 680px;
        color: #f4fbff;
        font-size: clamp(2rem, 6vw, 3.55rem);
        line-height: 1.02;
        letter-spacing: 0;
        font-weight: 900;
        text-wrap: balance;
        overflow-wrap: normal;
        word-break: normal;
        hyphens: none;
      }
      .wasel-home-subtitle {
        margin: 14px 0 0;
        max-width: 620px;
        color: rgba(218,231,238,0.78);
        font-size: clamp(1rem, 2vw, 1.12rem);
        line-height: 1.72;
        text-wrap: pretty;
      }
      .wasel-home-primary-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 22px;
      }
      .wasel-home-primary-actions button,
      .wasel-home-search-submit {
        min-height: 50px;
        border-radius: 14px;
        font-weight: 900;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }
      .wasel-home-primary-actions button {
        padding: 0 18px;
        border: 1px solid rgba(255,255,255,0.13);
        background: rgba(255,255,255,0.04);
        color: #eef8ff;
      }
      .wasel-home-primary-actions button.is-primary,
      .wasel-home-search-submit {
        border: 0;
        background: linear-gradient(135deg, #58ddff 0%, #25b6ff 55%, #47d69e 100%);
        color: #041018;
        box-shadow: 0 14px 30px rgba(37,182,255,0.2);
      }
      .wasel-home-chip-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      .wasel-home-trust-chip {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 34px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.09);
        color: rgba(218,231,238,0.84);
        font-size: 0.78rem;
        font-weight: 700;
      }
      .wasel-home-trust-chip svg { color: #58ddff; flex: 0 0 auto; }
      .wasel-home-search-card {
        margin-top: 22px;
        border-radius: 18px;
        padding: 18px;
        background: rgba(8,20,32,0.9);
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 18px 38px rgba(0,0,0,0.22);
      }
      .wasel-home-search-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .wasel-home-eyebrow {
        color: #58ddff;
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .wasel-home-search-subtitle,
      .wasel-home-empty-state {
        margin-top: 5px;
        color: rgba(218,231,238,0.72);
        font-size: 0.82rem;
        line-height: 1.5;
      }
      .wasel-home-price-note {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0 12px;
        background: rgba(71,214,158,0.12);
        border: 1px solid rgba(71,214,158,0.22);
        color: #bdf8df;
        font-size: 0.78rem;
        font-weight: 800;
      }
      .wasel-home-trip-toggle {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 14px;
      }
      .wasel-home-trip-toggle button {
        min-height: 48px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid transparent;
        background: rgba(255,255,255,0.035);
        color: #eef8ff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 800;
        line-height: 1.2;
      }
      .wasel-home-trip-toggle button.is-selected {
        background: rgba(88,221,255,0.14);
        border-color: rgba(88,221,255,0.32);
      }
      .wasel-home-search-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
      }
      .wasel-home-field {
        display: grid;
        gap: 7px;
        min-width: 0;
      }
      .wasel-home-field span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: rgba(218,231,238,0.72);
        font-size: 0.74rem;
        font-weight: 800;
      }
      .wasel-home-field input {
        width: 100%;
        min-height: 48px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: #f4fbff;
        padding: 0 12px;
        font: inherit;
        font-weight: 750;
      }
      .wasel-home-field input:focus-visible,
      .wasel-home-trip-toggle button:focus-visible,
      .wasel-home-primary-actions button:focus-visible,
      .wasel-home-search-submit:focus-visible,
      .wasel-home-actions button:focus-visible,
      .wasel-home-route-grid button:focus-visible {
        outline: 3px solid rgba(88,221,255,0.45);
        outline-offset: 2px;
      }
      .wasel-home-form-error {
        margin-top: 10px;
        color: #ffb4bf;
        font-size: 0.82rem;
        line-height: 1.45;
      }
      .wasel-home-search-skeleton {
        display: grid;
        grid-template-columns: 1.2fr 0.7fr 0.9fr;
        gap: 8px;
        margin-top: 12px;
      }
      .wasel-home-search-skeleton span {
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12), rgba(255,255,255,0.04));
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite linear;
      }
      .wasel-home-search-submit {
        width: 100%;
        margin-top: 14px;
        padding: 0 20px;
      }
      .wasel-home-search-submit:disabled {
        opacity: 0.78;
        cursor: wait;
      }
      .wasel-home-section-action { flex-shrink: 0; }
      .wasel-home-actions button {
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      }
      @media (hover: hover) {
        .wasel-home-actions button:hover,
        .wasel-home-primary-actions button:hover,
        .wasel-home-search-submit:hover {
          transform: translateY(-1px);
        }
      }
      @media (max-width: 1080px) {
        .wasel-home-hero,
        .wasel-home-utility-grid,
        .wasel-home-route-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-hero-aside {
          min-height: 320px;
          order: 2;
        }
      }
      @media (max-width: 860px) {
        .wasel-home-search-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 820px) {
        .wasel-home-actions,
        .wasel-home-route-grid,
        .wasel-home-utility-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-hero-aside { min-height: 280px; }
      }
      @media (max-width: 640px) {
        .wasel-home-shell {
          padding-inline: 12px;
          padding-top: 14px;
        }
        .wasel-home-section-header,
        .wasel-home-hero-topbar {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        .wasel-home-hero-copy {
          border-radius: 18px;
          padding: 18px 14px;
        }
        .wasel-home-title {
          font-size: clamp(1.9rem, 10vw, 2.35rem);
          line-height: 1.08;
        }
        .wasel-home-primary-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
        .wasel-home-primary-actions button,
        .wasel-home-section-action {
          width: 100%;
        }
        .wasel-home-chip-row {
          display: grid;
          grid-template-columns: 1fr;
        }
        .wasel-home-trust-chip {
          width: 100%;
          justify-content: flex-start;
        }
        .wasel-home-trip-toggle,
        .wasel-home-search-grid,
        .wasel-home-search-skeleton {
          grid-template-columns: 1fr;
        }
        .wasel-home-card,
        .wasel-home-cta-card,
        .wasel-home-action-card,
        .wasel-home-corridor-card {
          border-radius: 18px !important;
        }
        .wasel-home-action-card,
        .wasel-home-corridor-card {
          min-height: auto !important;
          padding: 18px 16px !important;
        }
      }
      @media (max-width: 430px) {
        .wasel-home-shell { padding-inline: 10px; }
        .wasel-home-search-card { padding: 14px; }
        .wasel-home-hero-aside { min-height: 240px; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          scroll-behavior: auto !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
