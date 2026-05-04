export function HomePageStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @media (max-width: 980px) {
        .wasel-home-hero,
        .wasel-home-route-grid,
        .wasel-home-utility-grid {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 760px) {
        .wasel-home-actions,
        .wasel-home-route-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-hero-copy {
          padding: 24px 20px !important;
        }
        .wasel-home-primary-actions {
          flex-direction: column !important;
        }
        .wasel-home-primary-actions > button {
          width: 100% !important;
          justify-content: center !important;
        }
      }
      @media (max-width: 560px) {
        .wasel-home-hero-aside {
          min-height: 300px;
        }
      }
    `}</style>
  );
}
