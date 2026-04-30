import { Card, LayoutContainer } from '../../design-system/components';
import { BrandLockup } from '../brand';

export function RouteLoadingFallback() {
  return (
    <LayoutContainer width="wide">
      <section aria-live="polite" className="ds-page" role="status">
        <Card
          className="brand-card-shell"
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            margin: '64px auto 0',
            maxWidth: 560,
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          <BrandLockup showTagline size="lg" surface="light" />
          <div
            aria-hidden="true"
            style={{
              animation: 'pulse 1.8s ease-in-out infinite',
              background:
                'linear-gradient(135deg, rgba(229, 156, 54, 0.18), rgba(23, 33, 43, 0.08))',
              borderRadius: 999,
              height: 12,
              width: 96,
            }}
          />
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 className="ds-section-title" style={{ margin: 0 }}>
              Loading the next route
            </h1>
            <p className="ds-copy ds-copy--tight" style={{ margin: 0 }}>
              Preparing live trip, package, and wallet data.
            </p>
          </div>
        </Card>
      </section>
    </LayoutContainer>
  );
}
