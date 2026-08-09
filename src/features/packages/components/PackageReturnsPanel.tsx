import { Shield } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DS, r } from '../../../pages/waselServiceShared';
import { C } from '../../../utils/wasel-ds';
import { PACKAGE_RETURN_STEPS, PACKAGE_RETURN_STEPS_AR } from '../packagesContent';
import { tx } from '../../../locales/tx';

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
  const { language } = useLanguage();
  const ar = language === 'ar';
  const returnSteps = ar ? PACKAGE_RETURN_STEPS_AR : PACKAGE_RETURN_STEPS;

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{tx('packageReturnsPanel.r')}</div>
      <h3 style={{ color: C.text, fontWeight: 800, margin: '0 0 8px' }}>
        {tx('packageReturnsPanel.raje3_returns')}
      </h3>
      <p style={{ color: DS.sub, margin: '0 auto 24px', maxWidth: 480 }}>
        {tx(
          'packageReturnsPanel.return_e_commerce_items_through_the_same_shared_ride_network_create_a_return_request_match_it_to_a_posted_route_and_keep_one_tracking_id_from_pickup_to_dropoff',
        )}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 12,
          marginBottom: 24,
          textAlign: 'left',
        }}
      >
        {returnSteps.map(step => (
          <div
            key={step.title}
            style={{
              background: DS.card2,
              borderRadius: r(14),
              padding: '18px 16px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <h4 style={{ color: C.text, fontWeight: 700, fontSize: '0.85rem', margin: '0 0 6px' }}>
              {step.title}
            </h4>
            <p style={{ color: DS.muted, fontSize: '0.75rem', margin: 0 }}>{step.desc}</p>
          </div>
        ))}
      </div>

      {createError && (
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto 18px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: `${DS.gold}12`,
            border: `1px solid ${DS.gold}30`,
            borderRadius: r(14),
            padding: '12px 14px',
            color: C.text,
            fontSize: '0.84rem',
            textAlign: 'left',
          }}
        >
          <Shield size={16} color={DS.gold} />
          <span>{createError}</span>
        </div>
      )}

      <button
        disabled={busyState === 'creating'}
        onClick={onCreateReturn}
        style={{
          padding: '14px 32px',
          borderRadius: '99px',
          border: 'none',
          background: DS.gradG,
          color: C.bgDeep,
          fontWeight: 800,
          fontFamily: DS.F,
          fontSize: '0.95rem',
          cursor: busyState === 'creating' ? 'wait' : 'pointer',
          opacity: busyState === 'creating' ? 0.75 : 1,
          boxShadow: `0 4px 20px ${DS.gold}30`,
        }}
      >
        {busyState === 'creating'
          ? ar
            ? 'جاري بدء الإرجاع...'
            : 'Starting return...'
          : ar
            ? 'ابدأ إرجاعاً متصلاً'
            : 'Start a connected return'}
      </button>
    </div>
  );
}
