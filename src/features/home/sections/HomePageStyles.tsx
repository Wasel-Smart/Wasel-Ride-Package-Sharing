import { F } from '../HomePageShared';

export function HomePageStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      @keyframes wasel-home-rise {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes wasel-scan {
        0% { transform: translateX(-100%); opacity: 0; }
        18% { opacity: 0.6; }
        70% { opacity: 0.28; }
        100% { transform: translateX(100%); opacity: 0; }
      }

      .wasel-home-shell {
        min-height: 100dvh;
        position: relative;
        overflow-x: hidden;
        overflow-y: visible;
        background:
          radial-gradient(circle at 16% 8%, rgba(20,127,228,0.34), transparent 30%),
          radial-gradient(circle at 84% 16%, rgba(255,138,11,0.18), transparent 26%),
          radial-gradient(circle at 50% 56%, rgba(114,199,13,0.09), transparent 32%),
          linear-gradient(180deg, #06172d 0%, #081d39 38%, #0c203b 100%);
      }

      .wasel-home-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(20,127,228,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(20,127,228,0.04) 1px, transparent 1px);
        background-size: 88px 88px;
        mask-image: linear-gradient(180deg, black 0%, black 68%, transparent 100%);
      }

      .wasel-home-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(115deg, rgba(20,127,228,0.1), transparent 22%, transparent 68%, rgba(255,138,11,0.06)),
          linear-gradient(180deg, transparent 0%, rgba(8,29,57,0.45) 88%);
      }

      .wasel-home-container {
        width: min(100%, 1360px);
        margin: 0 auto;
        padding: 28px 28px 72px;
      }

      .wasel-home-container > .wasel-home-section {
        animation: wasel-home-rise 520ms ease both;
      }

      /* Sticky bottom CTA for mobile */
      .wasel-home-sticky-cta {
        display: none;
      }

      @media (max-width: 760px) {
        .wasel-home-sticky-cta {
          display: flex;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 90;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
          background: rgba(3, 8, 15, 0.96);
          border-top: 1px solid rgba(20,127,228,0.12);
          backdrop-filter: blur(12px);
          gap: 10px;
        }
        .wasel-home-sticky-cta > button {
          flex: 1;
        }
        .wasel-home-container {
          padding-bottom: 100px;
        }
      }

      .wasel-home-hero {
        display: grid;
        grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
        gap: 28px;
        align-items: center;
        min-height: min(780px, calc(100svh - 92px));
        animation: wasel-home-rise 420ms ease both;
      }


      .wasel-home-stats-strip,
      .wasel-home-steps,
      .wasel-home-testimonials {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-stats-strip {
        padding: 16px;
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(20,127,228,0.06));
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 24px 70px rgba(3,8,15,0.24);
      }

      .wasel-home-stat-item,
      .wasel-home-step,
      .wasel-home-testimonial,
      .wasel-home-cta-banner {
        position: relative;
        overflow: hidden;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(15,35,51,0.86), rgba(6,17,27,0.92));
        border: 1px solid rgba(255,255,255,0.09);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 18px 50px rgba(3,8,15,0.22);
      }

      .wasel-home-stat-item { padding: 18px; }
      .wasel-home-stat-value { color: #f8fbff; font-size: 2rem; font-weight: 950; line-height: 1; }
      .wasel-home-stat-label { margin-top: 7px; color: rgba(196,220,238,0.72); font-size: 0.8rem; font-weight: 750; }

      .wasel-home-steps { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .wasel-home-step { padding: 18px; min-height: 190px; }
      .wasel-home-step-number { color: rgba(20,127,228,0.32); font-size: 2.2rem; font-weight: 950; line-height: 1; margin-bottom: 18px; }
      .wasel-home-step-title { color: #f8fbff; font-size: 1rem; font-weight: 900; }
      .wasel-home-step-desc { margin-top: 14px; color: rgba(196,220,238,0.72); font-size: 0.86rem; line-height: 1.65; }

      .wasel-home-testimonials { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .wasel-home-testimonial { padding: 20px; }
      .wasel-home-testimonial-stars { display: flex; gap: 4px; }
      .wasel-home-testimonial-text { margin-top: 16px; color: rgba(248,251,255,0.88); font-size: 0.96rem; line-height: 1.65; }
      .wasel-home-testimonial-author { display: flex; align-items: center; gap: 12px; margin-top: 22px; }
      .wasel-home-testimonial-avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, rgba(20,127,228,0.32), rgba(255,138,11,0.22)); color: #fff; font-weight: 950; }
      .wasel-home-testimonial-name { color: #f8fbff; font-weight: 900; }
      .wasel-home-testimonial-role { margin-top: 3px; color: rgba(196,220,238,0.62); font-size: 0.78rem; }

      .wasel-home-cta-banner {
        padding: clamp(28px, 5vw, 54px);
        text-align: center;
        background:
          radial-gradient(circle at top left, rgba(20,127,228,0.25), transparent 36%),
          radial-gradient(circle at bottom right, rgba(255,138,11,0.19), transparent 34%),
          linear-gradient(135deg, rgba(15,35,51,0.96), rgba(6,17,27,0.94));
      }
      .wasel-home-cta-title { margin: 0; color: #f8fbff; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1; font-weight: 950; text-wrap: balance; }
      .wasel-home-cta-subtitle { max-width: 620px; margin: 16px auto 0; color: rgba(196,220,238,0.76); line-height: 1.7; }
      .wasel-home-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 24px; }

      @media (max-width: 1100px) {        .wasel-home-hero {
          min-height: auto;
        }
      }

      .wasel-home-hero-copy {
        position: relative;
        overflow: visible;
        padding: 38px 12px 34px 0;
      }

      .wasel-home-nav {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }

      .wasel-home-nav-left,
      .wasel-home-nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wasel-home-nav-actions {
        padding: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,0.045);
        border: 1px solid rgba(255,255,255,0.08);
        backdrop-filter: blur(18px);
      }

      .wasel-home-preview-panel {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        background:
          linear-gradient(180deg, rgba(15, 35, 51, 0.9), rgba(6, 17, 27, 0.96));
        border: 1px solid rgba(20,127,228,0.14);
        box-shadow: 0 32px 80px rgba(8,29,57,0.45);
        min-height: 100%;
        padding: 18px;
      }

      .wasel-home-hero-copy::before,
      .wasel-home-preview-panel::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(120deg, rgba(255, 255, 255, 0.06), transparent 30%, transparent 76%, rgba(20,127,228,0.08));
      }

      .wasel-home-hero-copy::before {
        display: none;
      }

      .wasel-home-preview-panel::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 34%;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
        animation: wasel-scan 4.8s ease-in-out infinite;
      }

      .wasel-home-identity-row,
      .wasel-home-preview-top,
      .wasel-home-window-toolbar,
      .wasel-home-window-route,
      .wasel-home-live-chip,
      .wasel-home-assurance-strip,
      .wasel-home-hero-actions,
      .wasel-home-primary-actions {
        display: flex;
        align-items: center;
      }

      .wasel-home-identity-row,
      .wasel-home-preview-top {
        position: relative;
        z-index: 1;
        justify-content: space-between;
        gap: 16px;
      }

      .wasel-home-brand-stack {
        display: grid;
        gap: 12px;
      }

      .wasel-home-eyebrow,
      .wasel-home-kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        min-height: 30px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.055);
        border: 1px solid rgba(20,127,228,0.12);
        color: rgba(196,220,238,0.82);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .wasel-home-title {
        position: relative;
        z-index: 1;
        margin: 30px 0 0;
        max-width: 720px;
        color: #f8fbff;
        font-size: clamp(3.6rem, 5.4vw, 5.4rem);
        line-height: 0.94;
        letter-spacing: 0;
        font-weight: 900;
        text-wrap: balance;
      }

      .wasel-home-lead {
        position: relative;
        z-index: 1;
        max-width: 650px;
        margin: 16px 0 0;
        color: rgba(196,220,238,0.78);
        font-size: 1rem;
        line-height: 1.68;
      }

      .wasel-home-proof-row {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 28px;
      }

      .wasel-home-proof-pill {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035));
        border: 1px solid rgba(255,255,255,0.09);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px rgba(3,8,15,0.18);
      }

      .wasel-home-proof-pill-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        flex: 0 0 auto;
      }

      .wasel-home-proof-pill strong,
      .wasel-home-proof-pill small {
        display: block;
      }

      .wasel-home-proof-pill small {
        margin-top: 5px;
        font-size: 0.74rem;
        line-height: 1.45;
      }

      .wasel-home-proof-item {
        min-height: auto;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 0 0 0 14px;
        border-left: 1px solid rgba(20,127,228,0.18);
      }

      .wasel-home-proof-item > span {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        flex: 0 0 auto;
      }

      .wasel-home-proof-item strong,
      .wasel-home-window-grid strong,
      .wasel-home-mode-button strong {
        display: block;
        color: #f8fbff;
        font-size: 0.88rem;
        font-weight: 850;
        letter-spacing: 0;
      }

      .wasel-home-proof-item small,
      .wasel-home-window-grid small,
      .wasel-home-mode-button small {
        display: block;
        margin-top: 6px;
        color: rgba(196,220,238,0.66);
        font-size: 0.75rem;
        line-height: 1.55;
      }

      .wasel-home-hero-actions {
        position: relative;
        z-index: 1;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .wasel-home-assurance-strip {
        position: relative;
        z-index: 1;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 18px;
      }

      .wasel-home-assurance-strip span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-height: 34px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(20,127,228,0.1);
        color: rgba(248,251,255,0.86);
        font-size: 0.75rem;
        font-weight: 700;
      }

      .wasel-home-start-panel {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 12px;
        margin-top: 24px;
        padding: 18px 0 0;
        border-top: 1px solid rgba(20,127,228,0.14);
      }

      .wasel-home-start-copy {
        display: grid;
        gap: 8px;
      }

      .wasel-home-start-text {
        color: rgba(196,220,238,0.72);
        font-size: 0.84rem;
        line-height: 1.6;
      }

      .wasel-home-mode-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .wasel-home-mode-button {
        min-height: 74px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid;
        cursor: pointer;
        text-align: left;
        font-family: ${F};
        transition: transform var(--wasel-motion-fast), border-color var(--wasel-motion-fast), background var(--wasel-motion-fast);
      }

      .wasel-home-mode-button:hover {
        transform: translateY(-1px);
      }

      .wasel-home-primary-actions {
        gap: 10px;
        flex-wrap: wrap;
      }

      .wasel-home-preview-title {
        margin-top: 8px;
        color: #f8fbff;
        font-size: 1.02rem;
        font-weight: 900;
      }

      .wasel-home-live-chip {
        min-height: 34px;
        gap: 8px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(114,199,13,0.12);
        border: 1px solid rgba(114,199,13,0.28);
        color: #9af1cf;
        font-size: 0.75rem;
        font-weight: 850;
      }

      .wasel-home-live-chip span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #72c70d;
        box-shadow: 0 0 14px rgba(114,199,13,0.2);
      }

      .wasel-home-map-frame {
        position: relative;
        z-index: 1;
        margin-top: 16px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(20,127,228,0.22);
      }

      .wasel-home-product-stage {
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 176px;
        gap: 12px;
        margin-top: 12px;
        align-items: stretch;
      }

      .wasel-home-product-window,
      .wasel-home-phone-frame {
        border-radius: 16px;
        background: rgba(3, 8, 15, 0.72);
        border: 1px solid rgba(20,127,228,0.14);
        box-shadow: 0 18px 38px rgba(8,29,57,0.32);
      }

      .wasel-home-product-window {
        padding: 14px;
      }

      .wasel-home-window-toolbar {
        gap: 7px;
        color: rgba(196,220,238,0.72);
        font-size: 0.72rem;
      }

      .wasel-home-window-toolbar span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.22);
      }

      .wasel-home-window-toolbar strong {
        margin-left: 6px;
        color: rgba(248,251,255,0.86);
      }

      .wasel-home-window-route {
        justify-content: space-between;
        gap: 10px;
        margin-top: 14px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(20,127,228,0.08);
        border: 1px solid rgba(20,127,228,0.16);
        color: #f8fbff;
        font-weight: 850;
      }

      .wasel-home-window-route span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .wasel-home-window-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 9px;
        margin-top: 12px;
      }

      .wasel-home-window-grid div {
        min-height: 66px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(20,127,228,0.09);
      }

      .wasel-home-window-progress {
        height: 8px;
        margin-top: 12px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.08);
      }

      .wasel-home-window-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #147fe4, #72c70d);
      }

      .wasel-home-phone-frame {
        position: relative;
        min-height: 100%;
        padding: 10px;
      }

      .wasel-home-phone-notch {
        width: 54px;
        height: 5px;
        margin: 0 auto 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.24);
      }

      .wasel-home-phone-screen {
        min-height: 188px;
        display: flex;
        flex-direction: column;
        border-radius: 12px;
        padding: 12px;
        background: linear-gradient(180deg, rgba(20, 44, 63, 0.96), rgba(6, 17, 27, 0.98));
      }

      .wasel-home-phone-status {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #ff8a0b;
        font-size: 0.74rem;
        font-weight: 850;
      }

      .wasel-home-phone-screen strong {
        margin-top: 18px;
        color: #f8fbff;
        font-size: 1rem;
        line-height: 1.25;
      }

      .wasel-home-phone-screen p {
        margin: 8px 0 0;
        color: rgba(196,220,238,0.72);
        font-size: 0.74rem;
        line-height: 1.55;
      }

      .wasel-home-phone-tags {
        display: grid;
        gap: 7px;
        margin-top: auto;
        padding-top: 14px;
      }

      .wasel-home-phone-tags span {
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(20,127,228,0.1);
        color: rgba(248,251,255,0.82);
        font-size: 0.68rem;
        font-weight: 800;
      }

      @media (max-width: 1100px) {
        .wasel-home-hero {
          grid-template-columns: 1fr;
        }

        .wasel-home-preview-panel {
          min-height: auto;
        }
      }

      @media (max-width: 980px) {
        .wasel-home-route-grid,
        .wasel-home-utility-grid,
        .wasel-home-proof-grid,
        .wasel-home-demo-grid,
        .wasel-home-outcome-grid,
        .wasel-home-outcome-strip,
        .wasel-home-trust-grid,
        .wasel-home-stats-strip,
        .wasel-home-steps,
        .wasel-home-testimonials {
          grid-template-columns: 1fr !important;
        }

        .wasel-home-title {
          font-size: 3rem;
        }
      }

      @media (max-width: 760px) {
        .wasel-home-container {
          padding: 18px 14px 44px;
        }

        .wasel-home-nav { flex-direction: column; }
        .wasel-home-nav-actions { width: fit-content; }

        .wasel-home-actions,
        .wasel-home-route-grid,
        .wasel-home-proof-row,
        .wasel-home-window-grid,
        .wasel-home-product-stage {
          grid-template-columns: 1fr !important;
        }

        .wasel-home-hero-copy {
          padding: 8px 6px 18px !important;
        }

        .wasel-home-preview-panel {
          padding: 16px !important;
          border-radius: 16px;
        }

        .wasel-home-title {
          font-size: 2.7rem;
          line-height: 0.98;
        }

        .wasel-home-lead {
          font-size: 0.95rem;
        }

        .wasel-home-hero-actions,
        .wasel-home-primary-actions {
          flex-direction: column !important;
          align-items: stretch !important;
        }

        .wasel-home-hero-actions > button,
        .wasel-home-primary-actions > button {
          width: 100% !important;
          justify-content: center !important;
        }

        .wasel-home-mode-grid {
          grid-template-columns: 1fr;
        }

        .wasel-home-phone-frame {
          min-height: 218px;
        }
      }

      @media (max-width: 560px) {
        .wasel-home-identity-row,
        .wasel-home-preview-top {
          align-items: flex-start;
          flex-direction: column;
        }

        .wasel-home-map-frame canvas {
          min-height: 300px !important;
        }

        .wasel-home-proof-item {
          min-height: auto;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .wasel-home-preview-panel::after,
        .wasel-home-hero {
          animation: none !important;
        }
      }
    `}</style>
  );
}
