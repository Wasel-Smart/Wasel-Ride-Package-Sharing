export function HomePageStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      /* Hero + routes: single column on medium screens */
      @media (max-width: 980px) {
        .wasel-home-hero,
        .wasel-home-route-grid,
        .wasel-home-utility-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-hero-aside {
          min-height: 280px;
        }
      }
      /* Quick actions + hero copy at smaller sizes */
      @media (max-width: 760px) {
        .wasel-home-actions,
        .wasel-home-route-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-hero-copy {
          padding: 20px 16px !important;
          border-radius: 20px !important;
        }
        .wasel-home-primary-actions {
          flex-direction: column !important;
        }
        .wasel-home-primary-actions > button {
          width: 100% !important;
          justify-content: center !important;
        }
      }
      /* Trip mode toggle: side by side even on mobile */
      @media (max-width: 500px) {
        .wasel-home-hero-aside {
          min-height: 240px;
        }
        .wasel-home-hero-copy h1 {
          font-size: 1.7rem !important;
          letter-spacing: -0.04em !important;
        }
      }
      /* Card hover for touch devices: skip transform but keep border glow */
      @media (hover: none) {
        .wasel-home-actions button:hover {
          transform: none !important;
        }
      }
      /* Micro-interaction: action cards */
      .wasel-home-actions button {
        transition:
          transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
          box-shadow 0.22s ease,
          border-color 0.22s ease;
        will-change: transform;
      }
      .wasel-home-actions button:active {
        transform: scale(0.97) !important;
      }
      /* CTA buttons */
      .wasel-home-primary-actions button {
        transition:
          transform 0.18s cubic-bezier(0.34, 1.2, 0.64, 1),
          box-shadow 0.18s ease;
      }
      .wasel-home-primary-actions button:hover {
        transform: translateY(-2px) scale(1.015);
      }
      .wasel-home-primary-actions button:active {
        transform: scale(0.97);
      }
    `}</style>
  );
}
