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
        min-height: var(--app-min-height);
        position: relative;
        overflow: hidden;
        background:
          linear-gradient(180deg, #03080f 0%, #06111b 34%, #0a1824 100%);
      }

      .wasel-home-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(156, 202, 230, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(156, 202, 230, 0.045) 1px, transparent 1px);
        background-size: 88px 88px;
        mask-image: linear-gradient(180deg, black 0%, black 68%, transparent 100%);
      }

      .wasel-home-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(115deg, rgba(88, 221, 255, 0.12), transparent 22%, transparent 68%, rgba(255, 190, 92, 0.08)),
          linear-gradient(180deg, transparent 0%, rgba(3, 8, 15, 0.42) 88%);
      }

      .wasel-home-container {
        width: min(100%, 1280px);
        margin: 0 auto;
        padding: 30px 24px 56px;
      }

      .wasel-home-hero {
        display: grid;
        grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
        gap: 18px;
        align-items: stretch;
        animation: wasel-home-rise 420ms ease both;
      }

      .wasel-home-hero-copy,
      .wasel-home-preview-panel {
        position: relative;
        overflow: hidden;
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(15, 35, 51, 0.9), rgba(6, 17, 27, 0.96));
        border: 1px solid rgba(156, 202, 230, 0.14);
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
      }

      .wasel-home-hero-copy {
        padding: 30px;
      }

      .wasel-home-preview-panel {
        min-height: 100%;
        padding: 18px;
      }

      .wasel-home-hero-copy::before,
      .wasel-home-preview-panel::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(120deg, rgba(255, 255, 255, 0.06), transparent 30%, transparent 76%, rgba(88, 221, 255, 0.08));
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
        border: 1px solid rgba(156, 202, 230, 0.12);
        color: rgba(191, 214, 230, 0.82);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .wasel-home-title {
        position: relative;
        z-index: 1;
        margin: 26px 0 0;
        max-width: 720px;
        color: #f3faff;
        font-size: 3.8rem;
        line-height: 1;
        letter-spacing: 0;
        font-weight: 900;
        text-wrap: balance;
      }

      .wasel-home-lead {
        position: relative;
        z-index: 1;
        max-width: 650px;
        margin: 16px 0 0;
        color: rgba(191, 214, 230, 0.78);
        font-size: 1rem;
        line-height: 1.68;
      }

      .wasel-home-proof-row {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        margin-top: 20px;
      }

      .wasel-home-proof-item {
        min-height: 86px;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(156, 202, 230, 0.1);
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
        color: #f3faff;
        font-size: 0.88rem;
        font-weight: 850;
        letter-spacing: 0;
      }

      .wasel-home-proof-item small,
      .wasel-home-window-grid small,
      .wasel-home-mode-button small {
        display: block;
        margin-top: 6px;
        color: rgba(191, 214, 230, 0.66);
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
        border: 1px solid rgba(156, 202, 230, 0.1);
        color: rgba(232, 244, 252, 0.86);
        font-size: 0.75rem;
        font-weight: 700;
      }

      .wasel-home-start-panel {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 12px;
        margin-top: 18px;
        padding: 14px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(156, 202, 230, 0.12);
      }

      .wasel-home-start-copy {
        display: grid;
        gap: 8px;
      }

      .wasel-home-start-text {
        color: rgba(191, 214, 230, 0.72);
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
        color: #f3faff;
        font-size: 1.02rem;
        font-weight: 900;
      }

      .wasel-home-live-chip {
        min-height: 34px;
        gap: 8px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(71, 214, 158, 0.12);
        border: 1px solid rgba(71, 214, 158, 0.28);
        color: #9af1cf;
        font-size: 0.75rem;
        font-weight: 850;
      }

      .wasel-home-live-chip span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #47d69e;
        box-shadow: 0 0 14px rgba(71, 214, 158, 0.8);
      }

      .wasel-home-map-frame {
        position: relative;
        z-index: 1;
        margin-top: 16px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(88, 221, 255, 0.22);
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
        border: 1px solid rgba(156, 202, 230, 0.14);
        box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
      }

      .wasel-home-product-window {
        padding: 14px;
      }

      .wasel-home-window-toolbar {
        gap: 7px;
        color: rgba(191, 214, 230, 0.72);
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
        color: rgba(232, 244, 252, 0.86);
      }

      .wasel-home-window-route {
        justify-content: space-between;
        gap: 10px;
        margin-top: 14px;
        padding: 12px;
        border-radius: 12px;
        background: rgba(88, 221, 255, 0.08);
        border: 1px solid rgba(88, 221, 255, 0.16);
        color: #f3faff;
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
        border: 1px solid rgba(156, 202, 230, 0.09);
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
        background: linear-gradient(90deg, #58ddff, #47d69e);
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
        color: #ffbe5c;
        font-size: 0.74rem;
        font-weight: 850;
      }

      .wasel-home-phone-screen strong {
        margin-top: 18px;
        color: #f3faff;
        font-size: 1rem;
        line-height: 1.25;
      }

      .wasel-home-phone-screen p {
        margin: 8px 0 0;
        color: rgba(191, 214, 230, 0.72);
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
        border: 1px solid rgba(156, 202, 230, 0.1);
        color: rgba(232, 244, 252, 0.82);
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
        .wasel-home-trust-grid {
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

        .wasel-home-actions,
        .wasel-home-route-grid,
        .wasel-home-proof-row,
        .wasel-home-window-grid,
        .wasel-home-product-stage {
          grid-template-columns: 1fr !important;
        }

        .wasel-home-hero-copy,
        .wasel-home-preview-panel {
          padding: 20px !important;
          border-radius: 16px;
        }

        .wasel-home-title {
          font-size: 2.35rem;
          line-height: 1.04;
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
          min-height: 112px;
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
