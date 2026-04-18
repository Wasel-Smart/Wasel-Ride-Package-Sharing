import { Shield } from 'lucide-react';
import { DS, r } from '../../../pages/waselServiceShared';
import { PACKAGE_RETURN_STEPS } from '../packagesContent';

type PackageReturnsPanelProps = {
  createError: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  onCreateReturn: () => void;
};

export function PackageReturnsPanel({
  createError,
  busyState,
  onCreateReturn,
}: PackageReturnsPanelProps) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>R</div>
      <h3 style={{ color: DS.text, fontWeight: 800, margin: '0 0 8px' }}>Raje3 Returns</h3>
      <p style={{ color: DS.sub, margin: '0 auto 24px', maxWidth: 480 }}>
        Return e-commerce items through the same shared ride network. Create a return request, match it to a posted route, and keep one tracking ID from pickup to dropoff.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left' }}>
        {PACKAGE_RETURN_STEPS.map((step) => (
          <div key={step.title} style={{ background: DS.card2, borderRadius: r(14), padding: '18px 16px', border: `1px solid ${DS.border}` }}>
            <h4 style={{ color: DS.text, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 6px' }}>{step.title}</h4>
            <p style={{ color: DS.muted, fontSize: '0.75rem', margin: 0 }}>{step.desc}</p>
          </div>
        ))}
      </div>
      {createError && (
        <div style={{ maxWidth: 520, margin: '0 auto 18px', display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: DS.text, fontSize: '0.84rem', textAlign: 'left' }}>
          <Shield size={16} color={DS.gold} />
          <span>{createError}</span>
        </div>
      )}
      <button disabled={busyState === 'creating'} onClick={onCreateReturn} style={{ padding: '14px 32px', borderRadius: '99px', border: 'none', background: DS.gradG, color: '#fff', fontWeight: 800, fontFamily: DS.F, fontSize: '0.95rem', cursor: busyState === 'creating' ? 'wait' : 'pointer', opacity: busyState === 'creating' ? 0.75 : 1, boxShadow: `0 4px 20px ${DS.gold}30` }}>
        {busyState === 'creating' ? 'Starting return...' : 'Start a connected return'}
      </button>
    </div>
  );
}
