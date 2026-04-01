import { motion } from 'motion/react';
import { CheckCircle2, Search } from 'lucide-react';
import { MapWrapper } from '../../../components/MapWrapper';
import { DS, midpoint, pill, r, resolveCityCoord } from '../../../pages/waselServiceShared';
import type { PackageRequest } from '../../../services/journeyLogistics';

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
  return (
    <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto', padding: '20px 0' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>TRACK</div>
      <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 8px' }}>Track your package</h3>
      <p style={{ color: DS.sub, marginBottom: 20 }}>Enter your tracking ID to see ride and package status together.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          placeholder="PKG-XXXXX"
          value={trackId}
          onChange={(event) => setTrackId(event.target.value)}
          style={{ flex: 1, padding: '14px 18px', borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none' }}
        />
        <button
          disabled={busyState === 'tracking'}
          onClick={onSearch}
          style={{ padding: '0 22px', borderRadius: r(12), border: 'none', background: DS.gradC, color: '#fff', fontWeight: 800, fontFamily: DS.F, cursor: busyState === 'tracking' ? 'wait' : 'pointer', opacity: busyState === 'tracking' ? 0.75 : 1 }}
        >
          <Search size={18} />
        </button>
      </div>
      {trackingMessage && (
        <div style={{ marginTop: 14, color: trackId.trim().length > 0 && trackedPackage ? DS.cyan : DS.muted, fontSize: '0.82rem' }}>
          {trackingMessage}
        </div>
      )}
      {trackedPackage && trackId.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: '20px', border: `1px solid ${DS.border}`, textAlign: 'left', boxShadow: '0 10px 22px rgba(0,0,0,0.14)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontWeight: 800 }}>Package {trackedPackage.trackingId}</span>
            <span style={{ ...pill(trackedStatusColor) }}>{trackedPackage.status.replace('_', ' ')}</span>
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', marginBottom: 16 }}>
            {trackedPackage.matchedDriver
              ? `Assigned to ${trackedPackage.matchedDriver} on a connected route from ${trackedPackage.from} to ${trackedPackage.to}.`
              : `Still searching for a posted ride from ${trackedPackage.from} to ${trackedPackage.to}.`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              {
                label: 'OTP shared',
                value: trackedPackage.verification.senderCodeSharedAt ? 'Confirmed' : 'Pending',
                tone: trackedPackage.verification.senderCodeSharedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.senderCodeSharedAt ? 'Sender shared the handoff code.' : 'Share the handoff code at pickup.',
              },
              {
                label: 'Pickup proof',
                value: trackedPackage.verification.riderPickupConfirmedAt ? 'Confirmed' : 'Pending',
                tone: trackedPackage.verification.riderPickupConfirmedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.riderPickupConfirmedAt ? 'Rider has confirmed pickup.' : 'Confirm when the rider receives the parcel.',
              },
              {
                label: 'Delivery proof',
                value: trackedPackage.verification.receiverDeliveryConfirmedAt ? 'Confirmed' : 'Pending',
                tone: trackedPackage.verification.receiverDeliveryConfirmedAt ? DS.green : DS.gold,
                detail: trackedPackage.verification.receiverDeliveryConfirmedAt ? 'Receiver has confirmed delivery.' : 'Confirm only after receiver handoff.',
              },
            ].map((item) => (
              <div key={item.label} style={{ borderRadius: r(12), border: `1px solid ${item.tone}35`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: item.tone, fontWeight: 800, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
                <div style={{ color: DS.muted, fontSize: '0.72rem', marginTop: 6, lineHeight: 1.45 }}>{item.detail}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[{ label: 'Handoff code', value: trackedPackage.handoffCode }, { label: 'Recipient handoff', value: trackedPackage.recipientName || 'Name pending' }].map((item) => (
              <div key={item.label} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[{ label: 'Route', value: `${trackedPackage.from} to ${trackedPackage.to}` }, { label: 'Weight', value: trackedPackage.weight }, { label: 'Mode', value: trackedPackage.packageType === 'return' ? 'Return' : 'Delivery' }].map((item) => (
              <div key={item.label} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <button onClick={() => onVerificationAction('share_code')} disabled={Boolean(trackedPackage.verification.senderCodeSharedAt)} style={{ padding: '10px 16px', borderRadius: '99px', border: 'none', background: trackedPackage.verification.senderCodeSharedAt ? 'rgba(34,197,94,0.16)' : DS.gradG, color: '#fff', cursor: trackedPackage.verification.senderCodeSharedAt ? 'default' : 'pointer', fontFamily: DS.F, fontWeight: 700, opacity: trackedPackage.verification.senderCodeSharedAt ? 0.8 : 1 }}>
              {trackedPackage.verification.senderCodeSharedAt ? 'OTP shared' : 'Share OTP handoff'}
            </button>
            <button onClick={() => onVerificationAction('confirm_pickup')} disabled={!trackedPackage.verification.senderCodeSharedAt || Boolean(trackedPackage.verification.riderPickupConfirmedAt)} style={{ padding: '10px 16px', borderRadius: '99px', border: 'none', background: trackedPackage.verification.riderPickupConfirmedAt ? 'rgba(34,197,94,0.16)' : DS.gradC, color: '#fff', cursor: !trackedPackage.verification.senderCodeSharedAt || trackedPackage.verification.riderPickupConfirmedAt ? 'default' : 'pointer', fontFamily: DS.F, fontWeight: 700, opacity: !trackedPackage.verification.senderCodeSharedAt || trackedPackage.verification.riderPickupConfirmedAt ? 0.75 : 1 }}>
              {trackedPackage.verification.riderPickupConfirmedAt ? 'Pickup confirmed' : 'Confirm rider pickup'}
            </button>
            <button onClick={() => onVerificationAction('confirm_delivery')} disabled={!trackedPackage.verification.riderPickupConfirmedAt || Boolean(trackedPackage.verification.receiverDeliveryConfirmedAt)} style={{ padding: '10px 16px', borderRadius: '99px', border: 'none', background: trackedPackage.verification.receiverDeliveryConfirmedAt ? 'rgba(34,197,94,0.16)' : DS.gradG, color: '#fff', cursor: !trackedPackage.verification.riderPickupConfirmedAt || trackedPackage.verification.receiverDeliveryConfirmedAt ? 'default' : 'pointer', fontFamily: DS.F, fontWeight: 700, opacity: !trackedPackage.verification.riderPickupConfirmedAt || trackedPackage.verification.receiverDeliveryConfirmedAt ? 0.75 : 1 }}>
              {trackedPackage.verification.receiverDeliveryConfirmedAt ? 'Delivery confirmed' : 'Confirm receiver handoff'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <button onClick={onOpenSupport} style={{ padding: '10px 16px', borderRadius: '99px', border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', cursor: 'pointer', fontFamily: DS.F, fontWeight: 700 }}>
              Report an issue
            </button>
          </div>
          {trackedPackage.timeline.map((step, index) => (
            <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: step.complete ? DS.gradC : DS.card, border: `2px solid ${step.complete ? DS.cyan : DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {step.complete && <CheckCircle2 size={11} color="#fff" />}
              </div>
              <span style={{ color: step.complete ? '#fff' : DS.muted, fontSize: '0.85rem', alignSelf: 'center' }}>{step.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, borderRadius: r(14), overflow: 'hidden', border: `1px solid ${DS.border}` }}>
            <MapWrapper
              mode="live"
              center={midpoint(resolveCityCoord(trackedPackage.from), resolveCityCoord(trackedPackage.to))}
              pickupLocation={resolveCityCoord(trackedPackage.from)}
              dropoffLocation={resolveCityCoord(trackedPackage.to)}
              driverLocation={midpoint(resolveCityCoord(trackedPackage.from), resolveCityCoord(trackedPackage.to))}
              height={220}
              showMosques={false}
              showRadars={false}
            />
          </div>
        </motion.div>
      )}
      {!trackedPackage && trackId.trim().length > 0 && (
        <div style={{ marginTop: 18, color: DS.muted, fontSize: '0.85rem' }}>No connected package found for that tracking ID yet.</div>
      )}
      {recentPackages.length > 0 && (
        <div style={{ marginTop: 24, textAlign: 'left' }}>
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>Recent tracking shortcuts</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {recentPackages.map((item) => (
              <button key={item.trackingId} onClick={() => onOpenRecent(item)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', textAlign: 'left', borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 14px', background: DS.card2, cursor: 'pointer' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>{item.trackingId}</div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.from} to {item.to}</div>
                </div>
                <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>{item.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
