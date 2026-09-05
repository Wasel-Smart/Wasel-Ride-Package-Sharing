import { C, F, R, SPACE, TYPE } from '../../../utils/wasel-ds';

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
          padding: SPACE[4],
          borderRadius: R.xl,
          border: `1px solid ${C.border}`,
          background: C.elevated,
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              height: 14,
              width: '60%',
              borderRadius: R.md,
              background: C.borderFaint,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              height: 12,
              width: '100%',
              borderRadius: R.md,
              background: C.borderFaint,
              opacity: 0.4,
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: SPACE[3] }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: 80,
                borderRadius: R.lg,
                border: `1px solid ${C.border}`,
                background: C.card,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: SPACE[4] }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            style={{
              height: 140,
              borderRadius: R.xl,
              border: `1px solid ${C.border}`,
              background: C.card,
            }}
          />
        ))}
      </div>
    </div>
  );
}
