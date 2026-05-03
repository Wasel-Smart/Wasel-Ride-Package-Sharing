export function HomePageStyles() {
  return (
    <style>{`
      :root { color-scheme: dark; }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @media (max-width: 760px) {
        .wasel-home-hero,
        .wasel-home-route-grid,
        .wasel-home-proof-grid,
        .wasel-home-utility-grid {
          grid-template-columns: 1fr !important;
        }
        .wasel-home-actions,
        .wasel-home-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
      @media (max-width: 480px) {
        .wasel-home-actions,
        .wasel-home-stats {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}
