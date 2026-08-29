import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle2, Shield } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, pill, r } from '../../../pages/waselServiceShared';
import { C, SH } from '../../../utils/wasel-ds';
import type { PackageRequest } from '../../../services/journeyLogistics';
import {
  PACKAGE_EXCELLENCE_POINTS_AR,
  PACKAGE_EXCELLENCE_POINTS,
  PACKAGE_SEND_STEPS_AR,
  PACKAGE_SEND_STEPS,
  PACKAGE_WEIGHT_OPTIONS,
} from '../packagesContent';
import { tx } from '../../../locales/tx';

type ComposerState = {
  from: string;
  to: string;
  weight: string;
  note: string;
  sent: boolean;
  trackingId: string;
  recipientName: string;
  recipientPhone: string;
};

type PackageSendPanelProps = {
  pkg: ComposerState;
  setPkg: Dispatch<SetStateAction<ComposerState>>;
  trackedPackage: PackageRequest | null;
  createError: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  matchingRideCount: number;
  recentPackages: PackageRequest[];
  onCreate: () => void;
  onReset: () => void;
  onOpenTracking: () => void;
  onOpenRecent: (item: PackageRequest) => void;
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

function weightLabel(weight: string, ar: boolean): string {
  return ar ? weight.replace('<1 kg', 'أقل من ١ كغ').replace(/kg/g, 'كغ') : weight;
}

export function PackageSendPanel({
  pkg,
  setPkg,
  trackedPackage,
  createError,
  busyState,
  matchingRideCount,
  recentPackages,
  onCreate,
  onReset,
  onOpenTracking,
  onOpenRecent,
}: PackageSendPanelProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const sendSteps = ar ? PACKAGE_SEND_STEPS_AR : PACKAGE_SEND_STEPS;
  const excellencePoints = ar ? PACKAGE_EXCELLENCE_POINTS_AR : PACKAGE_EXCELLENCE_POINTS;

  const errorDisplay = createError ? (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        gridColumn: '1/-1',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: `${DS.gold}12`,
        border: `1px solid ${DS.gold}30`,
        borderRadius: r(14),
        padding: '12px 14px',
        color: C.text,
        fontSize: '0.84rem',
        marginBottom: 16,
      }}
    >
      <Shield size={16} color={DS.gold} />
      <span>{createError}</span>
    </div>
  ) : null;

  if (pkg.sent) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: r(16),
            margin: '0 auto 16px',
            display: 'grid',
            placeItems: 'center',
            background: C.greenDim,
            border: `1px solid ${DS.green}35`,
            color: DS.green,
          }}
        >
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ color: DS.green, fontWeight: 900, margin: '0 0 8px' }}>
          {tx('packageSendPanel.package_request_created')}
        </h3>
        <p style={{ color: DS.sub }}>
          {trackedPackage?.matchedRideId
            ? ar
              ? `تمت المطابقة مع مشوار متصل من ${cityLabel(pkg.from, ar)} إلى ${cityLabel(pkg.to, ar)}.`
              : `Matched to a connected ride from ${pkg.from} to ${pkg.to}.`
            : ar
              ? `نبحث عن أفضل مشوار متصل من ${cityLabel(pkg.from, ar)} إلى ${cityLabel(pkg.to, ar)}.`
              : `Searching for the best connected ride from ${pkg.from} to ${pkg.to}.`}
        </p>
        <div
          style={{
            margin: '20px auto',
            maxWidth: 360,
            background: C.elevated,
            borderRadius: r(16),
            padding: '16px 20px',
            border: `1px solid ${DS.border}`,
            boxShadow: SH.card,
          }}
        >
          <p style={{ color: DS.muted, fontSize: '0.75rem', marginBottom: 4 }}>
            {tx('packageSendPanel.tracking_id')}
          </p>
          <p style={{ color: DS.cyan, fontWeight: 800, fontSize: '1.2rem', letterSpacing: 0 }}>
            {pkg.trackingId}
          </p>
          <p style={{ color: DS.muted, fontSize: '0.75rem', margin: '14px 0 4px' }}>
            {tx('packageSendPanel.handoff_code')}
          </p>
          <p
            style={{
              color: DS.gold,
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: 0,
            }}
          >
            {trackedPackage?.handoffCode || (ar ? 'بانتظار التعيين' : 'Pending assignment')}
          </p>
          <p style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 8 }}>
            {trackedPackage?.matchedDriver
              ? ar
                ? `تم التعيين إلى ${trackedPackage.matchedDriver}`
                : `Assigned to ${trackedPackage.matchedDriver}`
              : ar
                ? 'بانتظار تعيين المسار'
                : 'Waiting for route assignment'}
          </p>
          <p style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 10 }}>
            {tx(
              'packageSendPanel.share_this_otp_with_the_rider_at_pickup_then_confirm_pickup_and_delivery_from_tracking',
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenTracking}
            style={{
              padding: '10px 24px',
              borderRadius: '99px',
              border: 'none',
              background: DS.gradC,
              color: C.text,
              cursor: 'pointer',
              fontFamily: DS.F,
              fontWeight: 700,
            }}
          >
            {tx('packageSendPanel.open_tracking')}
          </button>
          <button
            onClick={onReset}
            style={{
              padding: '10px 24px',
              borderRadius: '99px',
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: DS.gold,
              cursor: 'pointer',
              fontFamily: DS.F,
              fontWeight: 700,
            }}
          >
            {tx('packageSendPanel.create_another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)',
      }}
    >
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        <h3 style={{ color: C.text, fontWeight: 800, gridColumn: '1/-1', margin: '0 0 4px' }}>
          {tx('packageSendPanel.send_through_the_shared_network')}
        </h3>
        {[
          { l: ar ? 'من' : 'From', k: 'from' as const },
          { l: ar ? 'إلى' : 'To', k: 'to' as const },
        ].map(field => (
          <div key={field.l}>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {field.l}
            </label>
            <select
              value={pkg[field.k]}
              onChange={event =>
                setPkg(previous => ({ ...previous, [field.k]: event.target.value }))
              }
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: r(10),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontFamily: DS.F,
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {CITIES.map(city => (
                <option key={city} value={city} style={{ background: DS.card }}>
                  {cityLabel(city, ar)}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label
            style={{
              display: 'block',
              color: DS.muted,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {tx('packageSendPanel.weight')}
          </label>
          <select
            value={pkg.weight}
            onChange={event => setPkg(previous => ({ ...previous, weight: event.target.value }))}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: r(10),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: C.text,
              fontFamily: DS.F,
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PACKAGE_WEIGHT_OPTIONS.map(weight => (
              <option key={weight} value={weight} style={{ background: DS.card }}>
                {weightLabel(weight, ar)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              color: DS.muted,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {tx('packageSendPanel.recipient')}
          </label>
          <input
            data-testid="package-recipient-name"
            placeholder={tx('packageSendPanel.full_recipient_name')}
            value={pkg.recipientName}
            onChange={event =>
              setPkg(previous => ({ ...previous, recipientName: event.target.value }))
            }
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: r(10),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: C.text,
              fontFamily: DS.F,
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              color: DS.muted,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {tx('common.phone')}
          </label>
          <input
            data-testid="package-recipient-phone"
            placeholder={tx('packageSendPanel.recipient_phone')}
            value={pkg.recipientPhone}
            onChange={event =>
              setPkg(previous => ({ ...previous, recipientPhone: event.target.value }))
            }
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: r(10),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: C.text,
              fontFamily: DS.F,
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              color: DS.muted,
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: 0,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {tx('packageSendPanel.note')}
          </label>
          <input
            placeholder={tx('packageSendPanel.fragile_or_handling_notes')}
            value={pkg.note}
            onChange={event => setPkg(previous => ({ ...previous, note: event.target.value }))}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: r(10),
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: C.text,
              fontFamily: DS.F,
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            gridColumn: '1/-1',
            background: C.elevated,
            borderRadius: r(14),
            padding: '16px 18px',
            border: `1px solid ${DS.border}`,
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, marginBottom: 6 }}>
            {tx('packageSendPanel.connected_flow')}
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
            {tx(
              'packageSendPanel.every_package_request_checks_live_posted_rides_first_if_a_matching_ride_accepts_parcels_the_request_attaches_to_that_route_and_tracking_starts_from_the_same_network',
            )}
          </div>
        </div>
        <div
          style={{
            gridColumn: '1/-1',
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          {sendSteps.map(item => (
            <div
              key={item.title}
              style={{
                borderRadius: r(12),
                border: `1px solid ${DS.border}`,
                padding: '12px 13px',
                background: C.elevated,
              }}
            >
              <div style={{ color: C.text, fontSize: '0.82rem', fontWeight: 700 }}>
                {item.title}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.5 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
        {errorDisplay}
        <button
          data-testid="package-create-request"
          disabled={busyState === 'creating'}
          onClick={onCreate}
          style={{
            gridColumn: '1/-1',
            height: 52,
            borderRadius: r(14),
            border: 'none',
            background: DS.gradG,
            color: C.text,
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
              ? 'جاري إنشاء طلب الطرد...'
              : 'Creating package request...'
            : ar
              ? 'أنشئ طلب طرد متصل'
              : 'Create connected package request'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div
          style={{
            background: C.elevated,
            borderRadius: r(16),
            padding: '18px 18px 16px',
            border: `1px solid ${DS.border}`,
            boxShadow: SH.card,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem' }}>
                {tx('packageSendPanel.route_readiness')}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 4 }}>
                {tx('packageSendPanel.live_visibility_for')}
                {cityLabel(pkg.from, ar)} {tx('packageSendPanel.to')}
                {cityLabel(pkg.to, ar)}
              </div>
            </div>
            <span style={{ ...pill(matchingRideCount > 0 ? DS.green : DS.gold) }}>
              {matchingRideCount > 0
                ? ar
                  ? `${matchingRideCount} رحلات مباشرة`
                  : `${matchingRideCount} rides live`
                : ar
                  ? 'وضع الانتظار'
                  : 'Standby mode'}
            </span>
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
            {matchingRideCount > 0
              ? ar
                ? 'هذا الممر فيه رحلات جاهزة للطرود، لذلك المطابقة غالباً فورية أو قريبة من الفورية.'
                : 'This corridor already has package-ready rides, so matching should be immediate or near-immediate.'
              : ar
                ? 'لا توجد رحلة جاهزة للطرود على هذا المسار حالياً. سننشئ الطلب ونبقيه بالطابور لأقرب كابتن مطابق.'
                : 'No package-ready ride is live for this route yet. We will still create the request and keep it queued for the next matching captain.'}
          </div>
        </div>
        <div
          style={{
            background: C.elevated,
            borderRadius: r(16),
            padding: '18px 18px 16px',
            border: `1px solid ${DS.border}`,
            boxShadow: SH.card,
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>
            {tx('packageSendPanel.what_great_looks_like')}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {excellencePoints.map(item => (
              <div
                key={item.title}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  padding: '12px 13px',
                  background: C.elevated,
                }}
              >
                <div style={{ color: C.text, fontSize: '0.84rem', fontWeight: 700 }}>
                  {item.title}
                </div>
                <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: C.elevated,
            borderRadius: r(16),
            padding: '18px 18px 16px',
            border: `1px solid ${DS.border}`,
            boxShadow: SH.card,
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem', marginBottom: 10 }}>
            {tx('packageSendPanel.recent_requests')}
          </div>
          {recentPackages.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentPackages.map(item => (
                <button
                  key={item.trackingId}
                  onClick={() => onOpenRecent(item)}
                  style={{
                    textAlign: 'left',
                    borderRadius: r(12),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 13px',
                    background: C.elevated,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem' }}>
                      {cityLabel(item.from, ar)} {tx('packageSendPanel.to_2')}
                      {cityLabel(item.to, ar)}
                    </span>
                    <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>
                      {item.trackingId}
                    </span>
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 6 }}>
                    {item.matchedRideId
                      ? ar
                        ? `تم التعيين إلى ${item.matchedDriver || 'كابتن متصل'}`
                        : `Assigned to ${item.matchedDriver || 'connected captain'}`
                      : ar
                        ? 'بانتظار تعيين المسار'
                        : 'Waiting for route assignment'}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: DS.muted, fontSize: '0.8rem' }}>
              {tx(
                'packageSendPanel.your_recent_package_requests_appear_here_for_one_click_tracking',
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
