import { ShieldCheck } from 'lucide-react';
import { WaselProofOfLifeBlock } from '../../../components/system/WaselPresence';
import { LANDING_COLORS, landingPanel, lc } from './landingTypes';

type LandingTrustSectionProps = {
  ar: boolean;
};

export function LandingTrustSection({ ar }: LandingTrustSectionProps) {
  return (
    <section aria-labelledby="ride-trust-panel-title" style={{ display: 'grid', gap: 16 }}>
      <div
        className="wasel-lift-card"
        style={{
          ...landingPanel(20),
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, color-mix(in srgb, var(--ds-accent-strong) 14%, transparent) 24%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--wasel-button-primary-soft)',
            border: '1px solid var(--wasel-button-primary-border)',
            boxShadow: 'var(--wasel-shadow-sm)',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={22} color="var(--wasel-cyan)" />
        </div>
        <div style={{ flex: 1 }}>
          <h2
            id="ride-trust-panel-title"
            style={{
              margin: 0,
              color: LANDING_COLORS.text,
              fontWeight: 700,
              fontSize: '1.08rem',
              letterSpacing: '-0.02em',
            }}
          >
            {lc(ar ? 'الثقة تظل واضحة' : 'Trust stays clear')}
          </h2>
          <div
            style={{
              marginTop: 4,
              color: LANDING_COLORS.soft,
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            {lc(
              ar ? 'الهوية والدعم سهلان العثور عليهما.' : 'Identity and support are easy to find.',
            )}
          </div>
        </div>
      </div>
      <WaselProofOfLifeBlock ar={ar} />
    </section>
  );
}
