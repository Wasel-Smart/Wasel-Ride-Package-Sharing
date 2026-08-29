import { motion } from 'framer-motion';
import { CheckCircle2, Search } from 'lucide-react';
import { MapWrapper } from '../../../components/MapWrapper';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DS, midpoint, pill, r, resolveCityCoord } from '../../../pages/waselServiceShared';
import { C, SH } from '../../../utils/wasel-ds';
import type { PackageRequest } from '../../../services/journeyLogistics';
import { tx } from '../../../locales/tx';

type PackageTrackPanelProps = {
  trackId: string;
  setTrackId: (value: string) => void;
  trackedPackage: PackageRequest | null;
  trackingMessage: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  trackedStatusColor: string;
  recentPackages: PackageRequest[];
  onSearch: () => void;
  onVerificationAction: (action: 'share_code' | 'confirm_pickup' | 'confirm_delivery') => void;
  onOpenSupport: () => void;
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
  Salt: import.meta.env.VITE_PACKAGE_TRACK_SALT_LABEL || 'السلط',
};

function cityLabel(city: string, ar: boolean): string {
  return ar ? (CITY_LABELS_AR[city] ?? city) : city;
}

function routeLabel(from: string, to: string, ar: boolean): string {
  return ar ? `${cityLabel(from, ar)} إلى ${cityLabel(to, ar)}` : `${from} to ${to}`;
}

function statusLabel(status: string, ar: boolean): string {
  if (!ar) return status.replace('_', ' ');
  const labels: Record<string, string> = {
    searching: 'قيد البحث',
    matched: 'مطابق',
    in_transit: 'بالطريق',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  };
  return labels[status] ?? status.replace('_', ' ');
}

function timelineLabel(label: string, ar: boolean): string {
  if (!ar) return label;
  return label
    .replace('Matched to a rider trip', 'تمت المطابقة مع رحلة راكب')
    .replace('Searching for a rider trip', 'جاري البحث عن رحلة راكب')
    .replace('Sender shared OTP handoff code', 'المرسل شارك رمز التسليم')
    .replace('Rider pickup confirmed', 'تم تأكيد استلام الراكب')
    .replace('Receiver delivery confirmed', 'تم تأكيد تسليم المستلم');
}

export function PackageTrackPanel({
  trackId,
  setTrackId,
  trackedPackage,
  trackingMessage,
  busyState,
  trackedStatusColor,
  recentPackages,
  onSearch,
  onVerificationAction,
  onOpenSupport,
  onOpenRecent,
}: PackageTrackPanelProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{tx('packageTrackPanel.track')}</div>
      <h3 style={{ color: C.text, fontWeight: 800, margin: '0 0 8px' }}>
        {tx('packageTrackPanel.track_your_package')}
      </h3>
      <p style={{ color: DS.sub, marginBottom: 20 }}>
        {tx('packageTrackPanel.enter_your_tracking_id_to_see_ride_and_package_status_together')}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          placeholder={tx('packageTrackPanel.pkg_xxxxx')}
          value={trackId}
          onChange={event => setTrackId(event.target.value)}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: r(12),
            border: `1px solid ${DS.border}`,
            background: DS.card2,
            color: C.text,
            fontFamily: DS.F,
            fontSize: '0.95rem',
            outline: 'none',
          }}
        />
        <button
          disabled={busyState === 'tracking'}
          onClick={onSearch}
          style={{
            padding: '0 22px',
            borderRadius: r(12),
            border: 'none',
            background: DS.gradC,
            color: C.text,
            fontWeight: 800,
            fontFamily: DS.F,
            cursor: busyState === 'tracking' ? 'wait' : 'pointer',
            opacity: busyState === 'tracking' ? 0.75 : 1,
          }}
        >
          <Search size={18} />
        </button>
      </div>
      {trackingMessage && (
        <div
          style={{
            marginTop: 14,
            color: trackId.trim().length > 0 && trackedPackage ? DS.cyan : DS.muted,
            fontSize: '0.82rem',
          }}
        >
          {trackingMessage}
        </div>
      )}
      {trackedPackage && trackId.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 20,
            background: C.elevated,
            borderRadius: r(16),
            padding: '20px',
            border: `1px solid ${DS.border}`,
            textAlign: 'left',
            boxShadow: SH.card,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: C.text, fontWeight: 800 }}>
              {tx('activity.packageTitle')}
              {trackedPackage.trackingId}
            </span>
            <span style={{ ...pill(trackedStatusColor) }}>
              {statusLabel(trackedPackage.status, ar)}
            </span>
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', marginBottom: 16 }}>
            {trackedPackage.matchedDriver
              ? ar
                ? `تم التعيين إلى ${trackedPackage.matchedDriver} على مسار متصل من ${routeLabel(trackedPackage.from, trackedPackage.to, ar)}.`
                : `Assigned to ${trackedPackage.matchedDriver} on a connected route from ${trackedPackage.from} to ${trackedPackage.to}.`
              : ar
                ? `ما زلنا نبحث عن مشوار منشور من ${routeLabel(trackedPackage.from, trackedPackage.to, ar)}.`
                : `Still searching for a posted ride from ${trackedPackage.from} to ${trackedPackage.to}.`}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: ar ? 'مشاركة الرمز' : 'OTP shared',
                value: trackedPackage.verification.senderCodeSharedAt
                  ? ar
                    ? 'مؤكد'
                    : 'Confirmed'
                  : ar
                    ? 'معلق'
                    : 'Pending',
                tone: trackedPackage.verification.senderCodeSharedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.senderCodeSharedAt
                  ? ar
                    ? 'المرسل شارك رمز التسليم.'
                    : 'Sender shared the handoff code.'
                  : ar
                    ? 'شارك رمز التسليم عند الاستلام.'
                    : 'Share the handoff code at pickup.',
              },
              {
                label: ar ? 'إثبات الاستلام' : 'Pickup proof',
                value: trackedPackage.verification.riderPickupConfirmedAt
                  ? ar
                    ? 'مؤكد'
                    : 'Confirmed'
                  : ar
                    ? 'معلق'
                    : 'Pending',
                tone: trackedPackage.verification.riderPickupConfirmedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.riderPickupConfirmedAt
                  ? ar
                    ? 'الراكب أكد استلام الطرد.'
                    : 'Rider has confirmed pickup.'
                  : ar
                    ? 'أكد عندما يستلم الراكب الطرد.'
                    : 'Confirm when the rider receives the parcel.',
              },
              {
                label: ar ? 'إثبات التسليم' : 'Delivery proof',
                value: trackedPackage.verification.receiverDeliveryConfirmedAt
                  ? ar
                    ? 'مؤكد'
                    : 'Confirmed'
                  : ar
                    ? 'معلق'
                    : 'Pending',
                tone: trackedPackage.verification.receiverDeliveryConfirmedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.receiverDeliveryConfirmedAt
                  ? ar
                    ? 'المستلم أكد التسليم.'
                    : 'Receiver has confirmed delivery.'
                  : ar
                    ? 'أكد فقط بعد تسليم المستلم.'
                    : 'Confirm only after receiver handoff.',
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${item.tone}35`,
                  padding: '12px 13px',
                  background: C.elevated,
                }}
              >
                <div
                  style={{
                    color: DS.muted,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{ color: item.tone, fontWeight: 800, fontSize: '0.82rem', marginTop: 6 }}
                >
                  {item.value}
                </div>
                <div
                  style={{ color: DS.muted, fontSize: '0.72rem', marginTop: 6, lineHeight: 1.45 }}
                >
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              { label: ar ? 'رمز التسليم' : 'Handoff code', value: trackedPackage.handoffCode },
              {
                label: ar ? 'تسليم المستلم' : 'Recipient handoff',
                value: trackedPackage.recipientName || (ar ? 'الاسم قيد الانتظار' : 'Name pending'),
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  padding: '12px 13px',
                  background: C.elevated,
                }}
              >
                <div
                  style={{
                    color: DS.muted,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: ar ? 'المسار' : 'Route',
                value: routeLabel(trackedPackage.from, trackedPackage.to, ar),
              },
              {
                label: ar ? 'الوزن' : 'Weight',
                value: ar ? trackedPackage.weight.replace(/kg/g, 'كغ') : trackedPackage.weight,
              },
              {
                label: ar ? 'النوع' : 'Mode',
                value:
                  trackedPackage.packageType === 'return'
                    ? ar
                      ? 'إرجاع'
                      : 'Return'
                    : ar
                      ? 'توصيل'
                      : 'Delivery',
              },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  padding: '12px 13px',
                  background: C.elevated,
                }}
              >
                <div
                  style={{
                    color: DS.muted,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <button
              onClick={() => onVerificationAction('share_code')}
              disabled={Boolean(trackedPackage.verification.senderCodeSharedAt)}
              style={{
                padding: '10px 16px',
                borderRadius: '99px',
                border: 'none',
                background: trackedPackage.verification.senderCodeSharedAt ? C.greenDim : DS.gradG,
                color: C.text,
                cursor: trackedPackage.verification.senderCodeSharedAt ? 'default' : 'pointer',
                fontFamily: DS.F,
                fontWeight: 700,
                opacity: trackedPackage.verification.senderCodeSharedAt ? 0.8 : 1,
              }}
            >
              {trackedPackage.verification.senderCodeSharedAt
                ? ar
                  ? 'تمت مشاركة الرمز'
                  : 'OTP shared'
                : ar
                  ? 'شارك رمز التسليم'
                  : 'Share OTP handoff'}
            </button>
            <button
              onClick={() => onVerificationAction('confirm_pickup')}
              disabled={
                !trackedPackage.verification.senderCodeSharedAt ||
                Boolean(trackedPackage.verification.riderPickupConfirmedAt)
              }
              style={{
                padding: '10px 16px',
                borderRadius: '99px',
                border: 'none',
                background: trackedPackage.verification.riderPickupConfirmedAt
                  ? C.greenDim
                  : DS.gradC,
                color: C.text,
                cursor:
                  !trackedPackage.verification.senderCodeSharedAt ||
                  trackedPackage.verification.riderPickupConfirmedAt
                    ? 'default'
                    : 'pointer',
                fontFamily: DS.F,
                fontWeight: 700,
                opacity:
                  !trackedPackage.verification.senderCodeSharedAt ||
                  trackedPackage.verification.riderPickupConfirmedAt
                    ? 0.75
                    : 1,
              }}
            >
              {trackedPackage.verification.riderPickupConfirmedAt
                ? ar
                  ? 'تم تأكيد الاستلام'
                  : 'Pickup confirmed'
                : ar
                  ? 'أكد استلام الراكب'
                  : 'Confirm rider pickup'}
            </button>
            <button
              onClick={() => onVerificationAction('confirm_delivery')}
              disabled={
                !trackedPackage.verification.riderPickupConfirmedAt ||
                Boolean(trackedPackage.verification.receiverDeliveryConfirmedAt)
              }
              style={{
                padding: '10px 16px',
                borderRadius: '99px',
                border: 'none',
                background: trackedPackage.verification.receiverDeliveryConfirmedAt
                  ? C.greenDim
                  : DS.gradG,
                color: C.text,
                cursor:
                  !trackedPackage.verification.riderPickupConfirmedAt ||
                  trackedPackage.verification.receiverDeliveryConfirmedAt
                    ? 'default'
                    : 'pointer',
                fontFamily: DS.F,
                fontWeight: 700,
                opacity:
                  !trackedPackage.verification.riderPickupConfirmedAt ||
                  trackedPackage.verification.receiverDeliveryConfirmedAt
                    ? 0.75
                    : 1,
              }}
            >
              {trackedPackage.verification.receiverDeliveryConfirmedAt
                ? ar
                  ? 'تم تأكيد التسليم'
                  : 'Delivery confirmed'
                : ar
                  ? 'أكد تسليم المستلم'
                  : 'Confirm receiver handoff'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <button
              onClick={onOpenSupport}
              style={{
                padding: '10px 16px',
                borderRadius: '99px',
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                cursor: 'pointer',
                fontFamily: DS.F,
                fontWeight: 700,
              }}
            >
              {tx('packageTrackPanel.report_an_issue')}
            </button>
          </div>
          {trackedPackage.timeline.map((step, index) => (
            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: step.complete ? DS.gradC : DS.card,
                  border: `2px solid ${step.complete ? DS.cyan : DS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.complete && <CheckCircle2 size={11} color={C.text} />}
              </div>
              <span
                style={{
                  color: step.complete ? C.text : DS.muted,
                  fontSize: '0.85rem',
                  alignSelf: 'center',
                }}
              >
                {timelineLabel(step.label, ar)}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              borderRadius: r(14),
              overflow: 'hidden',
              border: `1px solid ${DS.border}`,
            }}
          >
            <MapWrapper
              mode="live"
              center={midpoint(
                resolveCityCoord(trackedPackage.from),
                resolveCityCoord(trackedPackage.to),
              )}
              pickupLocation={resolveCityCoord(trackedPackage.from)}
              dropoffLocation={resolveCityCoord(trackedPackage.to)}
              driverLocation={midpoint(
                resolveCityCoord(trackedPackage.from),
                resolveCityCoord(trackedPackage.to),
              )}
              height={220}
              showMosques={false}
              showRadars={false}
            />
          </div>
        </motion.div>
      )}
      {!trackedPackage && trackId.trim().length > 0 && (
        <div style={{ marginTop: 18, color: DS.muted, fontSize: '0.85rem' }}>
          {tx('packageTrackPanel.no_connected_package_found_for_that_tracking_id_yet')}
        </div>
      )}
      {recentPackages.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'left' }}>
          <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
            {tx('packageTrackPanel.recent_tracking_shortcuts')}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {recentPackages.map(item => (
              <button
                key={item.trackingId}
                onClick={() => onOpenRecent(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  width: '100%',
                  textAlign: 'left',
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  padding: '12px 14px',
                  background: DS.card2,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem' }}>
                    {item.trackingId}
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                    {cityLabel(item.from, ar)} {tx('packageTrackPanel.to')}
                    {cityLabel(item.to, ar)}
                  </div>
                </div>
                <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>
                  {statusLabel(item.status, ar)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
