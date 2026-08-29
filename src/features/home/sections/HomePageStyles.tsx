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
          linear-gradient(180deg, #081d39 0%, #0a1f3a 34%, #0e2240 100%);
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
        padding: 28px 28px 64px;
      }

      .wasel-home-section {
        margin-top: 36px;
        content-visibility: auto;
        contain-intrinsic-size: auto 400px;
      }

      .wasel-home-section:first-child {
        margin-top: 0;
      }

      .wasel-home-section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .wasel-home-section-icon {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: rgba(20,127,228,0.1);
        border: 1px solid rgba(20,127,228,0.08);
        color: #00E5FF;
        font-size: 0.72rem;
        font-weight: 800;
        flex-shrink: 0;
      }

      .wasel-home-section-title {
        font-weight: 900;
        color: #f8fbff;
        font-size: 1.12rem;
        letter-spacing: 0;
        margin: 0;
        line-height: 1.3;
      }

      .wasel-home-section-action {
        height: 36px;
        padding: 0 14px;
        border-radius: 9999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(20,127,228,0.16);
        cursor: pointer;
        color: rgba(196,220,238,0.86);
        font-size: 0.8125rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: ${F};
        transition: background 160ms ease, border-color 160ms ease;
      }

      .wasel-home-section-action:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(20,127,228,0.28);
      }

      .wasel-home-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .wasel-home-nav-left {
        display: flex;
        align-items: center;
      }

      .wasel-home-nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wasel-home-brand-stack {
        display: grid;
        gap: 12px;
      }

      .wasel-home-eyebrow {
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
        font-size: clamp(3.2rem, 4.8vw, 4.8rem);
        line-height: 1.05;
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

      .wasel-home-hero-actions {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
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
        gap: 10px;
        padding: 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(20,127,228,0.12);
        transition: background 160ms ease, border-color 160ms ease;
      }

      .wasel-home-proof-pill:hover {
        background: rgba(255,255,255,0.06);
        border-color: rgba(20,127,228,0.22);
      }

      .wasel-home-proof-pill-icon {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        flex: 0 0 auto;
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
        background: transparent;
        transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
      }

      .wasel-home-mode-button:hover {
        transform: translateY(-1px);
      }

      .wasel-home-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 14px;
      }

      .wasel-home-action-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 18px;
        border-radius: 16px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
        cursor: pointer;
        text-align: left;
        font-family: ${F};
        transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }

      .wasel-home-action-card:hover {
        transform: translateY(-2px);
        border-color: rgba(20,127,228,0.28);
        box-shadow: 0 8px 24px rgba(8,29,57,0.28);
      }

      .wasel-home-action-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .wasel-home-action-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }

      .wasel-home-action-kicker {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        font-weight: 800;
        color: rgba(248,251,255,0.72);
      }

      .wasel-home-action-kicker-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .wasel-home-action-title {
        color: #f8fbff;
        font-size: 1rem;
        font-weight: 850;
        line-height: 1.25;
      }

      .wasel-home-action-desc {
        color: rgba(196,220,238,0.66);
        font-size: 0.84rem;
        line-height: 1.6;
      }

      .wasel-home-action-outcome {
        color: rgba(196,220,238,0.78);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .wasel-home-action-cta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 4px;
        font-weight: 800;
        font-size: 0.78rem;
      }

      .wasel-home-corridors {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-corridor {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 18px;
        border-radius: 16px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
        cursor: pointer;
        text-align: left;
        font-family: ${F};
        transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }

      .wasel-home-corridor:hover {
        transform: translateY(-2px);
        border-color: rgba(20,127,228,0.28);
        box-shadow: 0 8px 24px rgba(8,29,57,0.28);
      }

      .wasel-home-corridor-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        border: 1px solid;
        width: fit-content;
      }

      .wasel-home-corridor-badge-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .wasel-home-corridor-title {
        color: #f8fbff;
        font-size: 0.96rem;
        font-weight: 850;
        line-height: 1.3;
      }

      .wasel-home-corridor-detail {
        color: rgba(196,220,238,0.66);
        font-size: 0.82rem;
        line-height: 1.55;
      }

      .wasel-home-corridor-insight {
        color: rgba(196,220,238,0.72);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .wasel-home-corridor-cta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: auto;
        font-weight: 800;
        font-size: 0.78rem;
      }

      .wasel-home-corridor-beta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-stats-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        padding: 18px 14px;
        border-radius: 16px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
      }

      .wasel-home-stat-value {
        color: #f8fbff;
        font-size: 1.5rem;
        font-weight: 900;
        line-height: 1;
      }

      .wasel-home-stat-label {
        color: rgba(196,220,238,0.66);
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1.4;
      }

      .wasel-home-steps {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-step {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 18px;
        border-radius: 16px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
      }

      .wasel-home-step-number {
        color: rgba(20,127,228,0.35);
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.06em;
      }

      .wasel-home-step-title {
        color: #f8fbff;
        font-size: 0.96rem;
        font-weight: 850;
        line-height: 1.3;
      }

      .wasel-home-step-desc {
        color: rgba(196,220,238,0.66);
        font-size: 0.82rem;
        line-height: 1.6;
      }

      .wasel-home-testimonials {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-testimonial {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px;
        border-radius: 16px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
      }

      .wasel-home-testimonial-stars {
        display: flex;
        gap: 4px;
      }

      .wasel-home-testimonial-text {
        color: rgba(196,220,238,0.82);
        font-size: 0.92rem;
        line-height: 1.65;
        font-style: italic;
      }

      .wasel-home-testimonial-author {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid rgba(20,127,228,0.1);
      }

      .wasel-home-testimonial-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(20,127,228,0.12);
        border: 1px solid rgba(20,127,228,0.16);
        display: grid;
        place-items: center;
        color: #00E5FF;
        font-size: 0.85rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .wasel-home-testimonial-name {
        color: #f8fbff;
        font-size: 0.88rem;
        font-weight: 700;
      }

      .wasel-home-testimonial-role {
        color: rgba(196,220,238,0.56);
        font-size: 0.75rem;
      }

      .wasel-home-cta-banner {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: 40px 28px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(20,127,228,0.08), rgba(8,29,57,0.88));
        border: 1px solid rgba(20,127,228,0.2);
      }

      .wasel-home-cta-title {
        color: #f8fbff;
        font-size: 2rem;
        font-weight: 900;
        line-height: 1.1;
        max-width: 640px;
        margin: 0;
      }

      .wasel-home-cta-subtitle {
        color: rgba(196,220,238,0.72);
        font-size: 1rem;
        line-height: 1.7;
        max-width: 580px;
        margin: 0;
      }

      .wasel-home-cta-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 8px;
      }

      .wasel-home-primary-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .wasel-home-assurance-strip {
        display: flex;
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

      .wasel-home-preview-top {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .wasel-home-preview-title {
        margin-top: 8px;
        color: #f8fbff;
        font-size: 1.02rem;
        font-weight: 900;
      }

      .wasel-home-live-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
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
        display: flex;
        align-items: center;
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
        display: flex;
        align-items: center;
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
        background: linear-gradient(90deg, #00E5FF, #72c70d);
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

      .wasel-home-proof-grid {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 14px;
      }

      .wasel-home-proof-metrics {
        display: grid;
        gap: 12px;
      }

      .wasel-home-proof-metric-card {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr);
        gap: 14px;
        align-items: center;
        border-radius: 18px;
        padding: 16px 18px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(20,127,228,0.1);
      }

      .wasel-home-proof-metric-value {
        color: #00E5FF;
        font-size: 1.35rem;
        font-weight: 950;
        line-height: 1;
      }

      .wasel-home-proof-metric-label {
        color: #f8fbff;
        font-weight: 850;
        font-size: 0.88rem;
      }

      .wasel-home-proof-metric-detail {
        margin-top: 4px;
        color: rgba(196,220,238,0.66);
        font-size: 0.78rem;
        line-height: 1.55;
      }

      .wasel-home-proof-hero-card {
        border-radius: 18px;
        padding: 24px 24px 22px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .wasel-home-proof-hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 0.72rem;
        font-weight: 850;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .wasel-home-proof-hero-title {
        margin: 14px 0 0;
        color: #f8fbff;
        font-size: 1.75rem;
        line-height: 1.08;
        font-weight: 950;
        letter-spacing: 0;
        max-width: 560px;
      }

      .wasel-home-proof-hero-desc {
        margin: 14px 0 0;
        color: rgba(196,220,238,0.66);
        line-height: 1.72;
        max-width: 620px;
        font-size: 1rem;
      }

      .wasel-home-proof-hero-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 20px;
      }

      .wasel-home-demo-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .wasel-home-demo-card {
        display: flex;
        flex-direction: column;
        border-radius: 18px;
        padding: 18px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
        gap: 14px;
      }

      .wasel-home-demo-card-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #00E5FF;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(20,127,228,0.08);
      }

      .wasel-home-demo-card-number {
        color: rgba(149,178,201,0.56);
        font-size: 0.72rem;
        font-weight: 850;
      }

      .wasel-home-demo-card-title {
        color: #f8fbff;
        font-size: 0.98rem;
        font-weight: 900;
        line-height: 1.25;
      }

      .wasel-home-demo-card-detail {
        color: rgba(196,220,238,0.66);
        font-size: 0.8rem;
        line-height: 1.62;
      }

      .wasel-home-outcome-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .wasel-home-outcome-card {
        display: flex;
        flex-direction: column;
        text-align: left;
        border-radius: 18px;
        padding: 20px;
        background: linear-gradient(180deg, rgba(8,29,57,0.88), rgba(255,255,255,0.04));
        border: 1px solid rgba(20,127,228,0.12);
        gap: 14px;
        cursor: pointer;
        transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }

      .wasel-home-outcome-card:hover {
        transform: translateY(-2px);
        border-color: rgba(20,127,228,0.28);
        box-shadow: 0 8px 24px rgba(8,29,57,0.28);
      }

      .wasel-home-outcome-label {
        font-size: 0.68rem;
        font-weight: 850;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .wasel-home-outcome-title {
        color: #f8fbff;
        font-size: 1.08rem;
        font-weight: 950;
        line-height: 1.16;
      }

      .wasel-home-outcome-detail {
        color: rgba(196,220,238,0.66);
        font-size: 0.83rem;
        line-height: 1.7;
      }

      .wasel-home-outcome-strip {
        display: grid;
        grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
        gap: 14px;
      }

      .wasel-home-outcome-strip-card {
        border-radius: 18px;
        padding: 18px 20px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(20,127,228,0.1);
      }

      .wasel-home-trust-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .wasel-home-trust-card {
        display: flex;
        flex-direction: column;
        text-align: left;
        border-radius: 18px;
        padding: 18px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
        gap: 14px;
        cursor: pointer;
        transition: transform 160ms ease, border-color 160ms ease;
      }

      .wasel-home-trust-card:hover {
        transform: translateY(-2px);
        border-color: rgba(20,127,228,0.28);
      }

      .wasel-home-trust-card-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
      }

      .wasel-home-trust-card-title {
        color: #f8fbff;
        font-size: 0.96rem;
        font-weight: 900;
        line-height: 1.3;
      }

      .wasel-home-trust-card-detail {
        color: rgba(196,220,238,0.66);
        font-size: 0.78rem;
        line-height: 1.62;
      }

      .wasel-home-utility-grid {
        display: grid;
        grid-template-columns: 0.92fr 1.08fr;
        gap: 14px;
      }

      .wasel-home-utility-card {
        border-radius: 18px;
        padding: 20px 20px 18px;
        background: rgba(8,29,57,0.72);
        border: 1px solid rgba(20,127,228,0.14);
      }

      .wasel-home-utility-card--accent {
        background: rgba(20,127,228,0.08);
        border-color: rgba(20,127,228,0.22);
      }

      .wasel-home-cta-banner {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 14px;
        padding: 40px 28px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(20,127,228,0.08), rgba(8,29,57,0.88));
        border: 1px solid rgba(20,127,228,0.2);
      }

      .wasel-home-cta-title {
        color: #f8fbff;
        font-size: 2rem;
        font-weight: 900;
        line-height: 1.1;
        max-width: 640px;
        margin: 0;
      }

      .wasel-home-cta-subtitle {
        color: rgba(196,220,238,0.72);
        font-size: 1rem;
        line-height: 1.7;
        max-width: 580px;
        margin: 0;
      }

      .wasel-home-cta-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 8px;
      }

      .wasel-home-route-grid,
      .wasel-home-utility-grid,
      .wasel-home-proof-grid,
      .wasel-home-demo-grid,
      .wasel-home-outcome-grid,
      .wasel-home-outcome-strip,
      .wasel-home-trust-grid,
      .wasel-home-corridors,
      .wasel-home-corridor-beta-grid,
      .wasel-home-actions,
      .wasel-home-steps,
      .wasel-home-testimonials,
      .wasel-home-stats-strip {
        display: grid;
        gap: 14px;
      }

      .wasel-home-section {
        margin-top: 36px;
        content-visibility: auto;
        contain-intrinsic-size: auto 400px;
      }

      .wasel-home-section:first-child {
        margin-top: 0;
      }

      .wasel-home-section-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .wasel-home-section-icon {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: rgba(20,127,228,0.1);
        border: 1px solid rgba(20,127,228,0.08);
        color: #00E5FF;
        font-size: 0.72rem;
        font-weight: 800;
        flex-shrink: 0;
      }

      .wasel-home-section-title {
        font-weight: 900;
        color: #f8fbff;
        font-size: 1.12rem;
        letter-spacing: 0;
        margin: 0;
        line-height: 1.3;
      }

      .wasel-home-section-action {
        height: 36px;
        padding: 0 14px;
        border-radius: 9999px;
        background: rgba(20,127,228,0.08);
        border: 1px solid rgba(20,127,228,0.22);
        cursor: pointer;
        color: rgba(196,220,238,0.86);
        font-size: 0.8125rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: ${F};
        transition: background 160ms ease, border-color 160ms ease;
      }

      .wasel-home-section-action:hover {
        background: rgba(20,127,228,0.14);
        border-color: rgba(20,127,228,0.32);
      }

      .wasel-home-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .wasel-home-nav-left {
        display: flex;
        align-items: center;
      }

      .wasel-home-nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wasel-home-brand-stack {
        display: grid;
        gap: 12px;
      }

      .wasel-home-eyebrow {
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
        font-size: clamp(3.2rem, 4.8vw, 4.8rem);
        line-height: 1.05;
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

      .wasel-home-hero-actions {
        position: relative;
        z-index: 1;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
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

      @media (max-width: 1100px) {
        .wasel-home-hero {
          grid-template-columns: 1fr;
          min-height: auto;
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
        .wasel-home-corridors,
        .wasel-home-corridor-beta-grid,
        .wasel-home-actions,
        .wasel-home-steps,
        .wasel-home-testimonials,
        .wasel-home-stats-strip {
          grid-template-columns: 1fr !important;
        }

        .wasel-home-title {
          font-size: 3rem;
        }

        .wasel-home-proof-row {
          grid-template-columns: 1fr !important;
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

        .wasel-home-section-header {
          flex-direction: column;
          align-items: flex-start;
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
