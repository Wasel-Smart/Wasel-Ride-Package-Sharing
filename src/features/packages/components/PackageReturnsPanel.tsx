import type { Dispatch, SetStateAction } from 'react';
import { RotateCcw, Shield } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DS, r } from '../../../pages/waselServiceShared';
import { PACKAGE_RETURN_STEPS, PACKAGE_RETURN_STEPS_AR } from '../packagesContent';
import { tx } from '../../../locales/tx';

type ReturnComposerState = {
  from: string;
  to: string;
  weight: string;
  note: string;
  sent: boolean;
  trackingId: string;
  recipientName: string;
  recipientPhone: string;
};

type PackageReturnsPanelProps = {
  pkg: ReturnComposerState;
  setPkg: Dispatch<SetStateAction<ReturnComposerState>>;
  trackingId: string | null;
  createError: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  onCreateReturn: () => void;
  onReset: () => void;
};

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان',
  Aqaba: 'العقبة',
  Irbid: 'إربد',
  Zarqa: 'الزرقاء',
  'Dead Sea': 'البحر الميت',
  Karak: 'الكرك',
  Madaba: 'مادبا',
  Petra: 'البتراء',
  Jerash: 'جرش',
  Mafraq: 'المفرق',
  Salt: 'السلط',
};

function cityLabel(city: string, ar: boolean): string {
  return ar ? (CITY_LABELS_AR[city] ?? city) : city;
}

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: r(10),
  border: `1px solid ${DS.border}`,
  background: DS.card2,
  color: 'var(--foreground)',
  fontFamily: DS.F,
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block',
  color: 'var(--muted-foreground)',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: 6,
};

export function PackageReturnsPanel({
  pkg,
  setPkg,
  trackingId,
  createError,
  busyState,
  onCreateReturn,
  onReset,
}: PackageReturnsPanelProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const returnSteps = ar ? PACKAGE_RETURN_STEPS_AR : PACKAGE_RETURN_STEPS;
  const phoneDigits = pkg.recipientPhone.replace(/[^\d]/g, '').length;
  const canCreate = pkg.from !== pkg.to && pkg.recipientName.trim().length > 0 && phoneDigits >= 9;

  return (
    <div style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: r(16),
            margin: '0 auto 16px',
            display: 'grid',
            placeItems: 'center',
            background: `${DS.cyan}12`,
            border: `1px solid ${DS.cyan}28`,
          }}
        >
          <RotateCcw size={24} color={DS.cyan} />
        </div>
        <h3 style={{ color: 'var(--foreground)', fontWeight: 800, margin: '0 0 8px', fontSize: '1.1rem' }}>
          {tx('packageReturnsPanel.raje3_returns')}
        </h3>
        <p style={{ color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.6, fontSize: '0.82rem' }}>
          {tx('packageReturnsPanel.return_e_commerce_items_through_the_same_shared_ride_network_create_a_return_request_match_it_to_a_posted_route_and_keep_one_tracking_id_from_pickup_to_dropoff')}
        </p>
      </div>

      {/* Steps */}
      <div className="pkg-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 24 }}>
        {returnSteps.map((step, i) => (
          <div
            key={step.title}
            style={{
              background: 'var(--muted)',
              borderRadius: r(12),
              padding: '14px 12px',
              border: `1px solid ${'var(--border)'}`,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: `${DS.cyan}14`,
                border: `1px solid ${DS.cyan}28`,
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 10px',
                color: DS.cyan,
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              {i + 1}
            </div>
            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>
              {step.title}
            </div>
            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.73rem', lineHeight: 1.5 }}>
              {step.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Success state */}
      {trackingId && (
        <div
          style={{
            background: 'var(--muted)',
            borderRadius: r(16),
            padding: '18px 20px',
            border: `1px solid ${DS.cyan}28`,
            marginBottom: 20,
          }}
        >
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {ar ? 'رقم التتبع' : 'Tracking ID'}
          </p>
          <p
            data-testid="package-return-tracking-id"
            style={{ color: DS.cyan, fontWeight: 900, fontSize: '1.1rem', margin: '0 0 10px' }}
          >
            {trackingId}
          </p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', margin: 0, lineHeight: 1.55 }}>
            {ar
              ? 'طلب الإرجاع مُنشأ. افتح تبويب "تتبع طرد" لمتابعة الاستلام والتسليم.'
              : 'Return request is live. Open the Track tab to follow pickup and delivery.'}
          </p>
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
        <div>
          <label htmlFor="pkg-return-recipient-name" style={labelStyle}>
            {ar ? 'اسم المستلم' : 'Recipient name'}
          </label>
          <input
            id="pkg-return-recipient-name"
            data-testid="package-return-recipient-name"
            value={pkg.recipientName}
            onChange={e => setPkg(p => ({ ...p, recipientName: e.target.value }))}
            placeholder={ar ? 'مثال: محل نون' : 'e.g. Noon store'}
            className="pkg-field"
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="pkg-return-recipient-phone" style={labelStyle}>
            {ar ? 'هاتف المستلم' : 'Recipient phone'}
          </label>
          <input
            id="pkg-return-recipient-phone"
            data-testid="package-return-recipient-phone"
            value={pkg.recipientPhone}
            onChange={e => setPkg(p => ({ ...p, recipientPhone: e.target.value }))}
            placeholder="07xxxxxxxx"
            className="pkg-field"
            style={fieldStyle}
          />
        </div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem', margin: 0, lineHeight: 1.55 }}>
          {ar
            ? `سيتم الإرجاع من ${cityLabel(pkg.from, ar)} إلى ${cityLabel(pkg.to, ar)} بنفس رقم التتبع.`
            : `The return runs on the ${pkg.from} → ${pkg.to} corridor using the same tracking ID.`}
        </p>
      </div>

      {/* Error */}
      {createError && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: `${DS.gold}12`,
            border: `1px solid ${DS.gold}30`,
            borderRadius: r(12),
            padding: '12px 14px',
            color: 'var(--foreground)',
            fontSize: '0.84rem',
            marginBottom: 16,
          }}
        >
          <Shield size={15} color={DS.gold} />
          <span>{createError}</span>
        </div>
      )}

      {/* CTA */}
      {trackingId ? (
        <button
          onClick={onReset}
          className="pkg-btn"
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: r(14),
            border: `1px solid ${'var(--border)'}`,
            background: 'transparent',
            color: DS.gold,
            fontWeight: 800,
            fontFamily: DS.F,
            fontSize: '0.92rem',
            cursor: 'pointer',
          }}
        >
          {ar ? 'ابدأ إرجاعاً آخر' : 'Start another return'}
        </button>
      ) : (
        <button
          disabled={busyState === 'creating' || !canCreate}
          onClick={() => { void onCreateReturn(); }}
          className="pkg-btn"
          style={{
            width: '100%',
            padding: '13px 0',
            borderRadius: r(14),
            border: 'none',
            background: canCreate ? DS.gradG : 'var(--muted)',
            color: canCreate ? 'var(--foreground)' : 'var(--muted-foreground)',
            fontWeight: 800,
            fontFamily: DS.F,
            fontSize: '0.92rem',
            cursor: busyState === 'creating' ? 'wait' : canCreate ? 'pointer' : 'not-allowed',
            opacity: busyState === 'creating' ? 0.75 : 1,
            boxShadow: canCreate ? `0 4px 20px ${DS.gold}30` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <RotateCcw size={16} />
          {busyState === 'creating'
            ? ar ? 'جاري بدء الإرجاع...' : 'Starting return...'
            : ar ? 'ابدأ إرجاعاً متصلاً' : 'Start a connected return'}
        </button>
      )}
    </div>
  );
}


