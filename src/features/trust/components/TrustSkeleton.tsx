import { C, R, SPACE, TYPE } from '../../../utils/wasel-ds';

export function TrustSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading trust center"
      style={{ display: 'grid', gap: SPACE[5] }}
    >
      <div
        style={{
          display: 'grid',
          gap: SPACE[4],
          padding: SPACE[5],
          borderRadius: R.xxl,
          border: `1px solid ${C.border}`,
          background: `linear-gradient(180deg, ${C.card}, rgba(9,22,34,0.92))`,
          boxShadow: '0 1px 0 rgba(0,229,255,0.06)',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="skeleton-base sk-line" style={{ width: '60%' }} />
          <div className="skeleton-base sk-line" style={{ width: '100%' }} />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: SPACE[3],
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-base sk-card" />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: SPACE[4] }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton-base sk-card" />
        ))}
      </div>
    </div>
  );
}
