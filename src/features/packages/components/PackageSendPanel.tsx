import type { Dispatch, SetStateAction } from 'react';
import { Shield } from 'lucide-react';
import { OperationalConfidencePanel } from '../../../components/trust/OperationalConfidencePanel';
import type { CorridorExperienceSnapshot } from '../../../domains/corridors/corridorExperience';
import { getPackageConfidenceSummary } from '../../../domains/trust/operationalConfidence';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, pill, r } from '../../../pages/waselServiceShared';
import type { PackageRequest, PostedRide } from '../../../services/journeyLogistics';
import { buildPreferredWhatsAppUrl, hasWhatsAppContact } from '../../../utils/whatsapp';
import {
  PACKAGE_EXCELLENCE_POINTS,
  PACKAGE_SEND_STEPS,
  PACKAGE_WEIGHT_OPTIONS,
} from '../packagesContent';

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
  corridor: CorridorExperienceSnapshot;
  trackedPackage: PackageRequest | null;
  createError: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  recentPackages: PackageRequest[];
  preferredRide: PostedRide | null;
  onCreate: () => void;
  onReset: () => void;
  onOpenTracking: () => void;
  onOpenRecent: (item: PackageRequest) => void;
};

export function PackageSendPanel({
  pkg,
  setPkg,
  corridor,
  trackedPackage,
  createError,
  busyState,
  recentPackages,
  preferredRide,
  onCreate,
  onReset,
  onOpenTracking,
  onOpenRecent,
}: PackageSendPanelProps) {
  const confidenceSummary = getPackageConfidenceSummary({
    corridor,
    preferredRide,
    recipientPhone: pkg.recipientPhone,
  });
  const recipientWhatsAppUrl = trackedPackage
    ? buildPreferredWhatsAppUrl({
        phone: trackedPackage.recipientPhone,
        message: `Hi ${trackedPackage.recipientName || 'there'}, your Wasel package ${trackedPackage.trackingId} is active from ${trackedPackage.from} to ${trackedPackage.to}.`,
        fallbackMessage: `Hi Wasel, I need WhatsApp support for package ${trackedPackage.trackingId}.`,
      })
    : '';
  const holderWhatsAppUrl = trackedPackage
    ? buildPreferredWhatsAppUrl({
        phone: trackedPackage.matchedDriverPhone,
        message: `Hi ${trackedPackage.matchedDriver || 'captain'}, I am coordinating package ${trackedPackage.trackingId} on the ${trackedPackage.from} to ${trackedPackage.to} route.`,
        fallbackMessage: `Hi Wasel, I need holder coordination for package ${trackedPackage.trackingId}.`,
      })
    : '';
  if (pkg.sent) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>OK</div>
        <h3 style={{ color: DS.green, fontWeight: 900, margin: '0 0 8px' }}>Package request created</h3>
        <p style={{ color: DS.sub }}>
          {trackedPackage?.matchedRideId
            ? `Matched to a connected ride from ${pkg.from} to ${pkg.to}.`
            : `Searching for the best connected ride from ${pkg.from} to ${pkg.to}.`}
        </p>
        <div
          style={{
            margin: '20px auto',
            maxWidth: 360,
            background: DS.card2,
            borderRadius: r(16),
            padding: '16px 20px',
            border: `1px solid ${DS.border}`,
            boxShadow: '0 10px 22px rgba(0,0,0,0.14)',
          }}
        >
          <p style={{ color: DS.muted, fontSize: '0.75rem', marginBottom: 4 }}>Tracking ID</p>
          <p style={{ color: DS.cyan, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.1em' }}>
            {pkg.trackingId}
          </p>
          <p style={{ color: DS.muted, fontSize: '0.75rem', margin: '14px 0 4px' }}>Handoff code</p>
          <p style={{ color: DS.gold, fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.08em' }}>
            {trackedPackage?.handoffCode || 'Pending assignment'}
          </p>
          <p style={{ color: DS.sub, fontSize: '0.8rem', marginTop: 8 }}>
            {trackedPackage?.matchedDriver
              ? `Assigned to ${trackedPackage.matchedDriver}`
              : 'Waiting for route assignment'}
          </p>
          <p style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 10 }}>
            Share this OTP on WhatsApp with the holder and receiver, then confirm pickup and delivery from tracking.
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
              color: '#fff',
              cursor: 'pointer',
              fontFamily: DS.F,
              fontWeight: 700,
            }}
          >
            Open tracking
          </button>
          <a
            href={recipientWhatsAppUrl || undefined}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '10px 24px',
              borderRadius: '99px',
              border: 'none',
              background: 'linear-gradient(135deg, #25d366 0%, #1faa53 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: DS.F,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {hasWhatsAppContact(trackedPackage?.recipientPhone)
              ? 'Recipient WhatsApp'
              : 'Wasel WhatsApp'}
          </a>
          <a
            href={holderWhatsAppUrl || undefined}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '10px 24px',
              borderRadius: '99px',
              border: 'none',
              background: 'linear-gradient(135deg, #25d366 0%, #1faa53 100%)',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: DS.F,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {hasWhatsAppContact(trackedPackage?.matchedDriverPhone)
              ? 'Holder WhatsApp'
              : 'Wasel WhatsApp'}
          </a>
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
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-2col" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)' }}>
      <div className="pkg-send-form-grid" style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
        <h3 style={{ color: DS.text, fontWeight: 800, gridColumn: '1/-1', margin: '0 0 4px' }}>
          Send in one clean flow
        </h3>
        {[{ l: 'From', k: 'from' as const }, { l: 'To', k: 'to' as const }].map((field) => (
          <div key={field.l}>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {field.l}
            </label>
            <select
              value={pkg[field.k]}
              onChange={(event) => setPkg((previous) => ({ ...previous, [field.k]: event.target.value }))}
              style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              {CITIES.map((city) => (
                <option key={city} value={city} style={{ background: DS.card }}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div>
          <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Weight
          </label>
          <select
            value={pkg.weight}
            onChange={(event) => setPkg((previous) => ({ ...previous, weight: event.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
          >
            {PACKAGE_WEIGHT_OPTIONS.map((weight) => (
              <option key={weight} style={{ background: DS.card }}>
                {weight}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Recipient
          </label>
          <input
            data-testid="package-recipient-name"
            placeholder="Full recipient name"
            value={pkg.recipientName}
            onChange={(event) => setPkg((previous) => ({ ...previous, recipientName: event.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Recipient WhatsApp
          </label>
          <input
            data-testid="package-recipient-phone"
            placeholder="Recipient WhatsApp number"
            value={pkg.recipientPhone}
            onChange={(event) => setPkg((previous) => ({ ...previous, recipientPhone: event.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Note
          </label>
          <input
            placeholder="Fragile or handling notes"
            value={pkg.note}
            onChange={(event) => setPkg((previous) => ({ ...previous, note: event.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ gridColumn: '1/-1', background: DS.card2, borderRadius: r(14), padding: '16px 18px', border: `1px solid ${DS.border}` }}>
          <div style={{ color: DS.text, fontWeight: 800, marginBottom: 6 }}>Why this stays simple</div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
            Every request checks live rides first. If a matching route accepts parcels, tracking starts on the same route and WhatsApp stays the main sender, holder, and receiver coordination lane.
          </div>
        </div>
        {preferredRide ? (
          <div style={{ gridColumn: '1/-1', background: `${DS.green}10`, borderRadius: r(14), padding: '16px 18px', border: `1px solid ${DS.green}30` }}>
            <div style={{ color: DS.text, fontWeight: 800, marginBottom: 6 }}>Selected ride holder</div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
              This request will try to attach to the live {preferredRide.from} to {preferredRide.to} ride at {preferredRide.time}. WhatsApp is the main lane between sender, holder, and receiver.
            </div>
          </div>
        ) : null}
        <div className="pkg-send-steps-grid" style={{ gridColumn: '1/-1', display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {PACKAGE_SEND_STEPS.map((item) => (
            <div key={item.title} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: DS.card2 }}>
              <div style={{ color: DS.text, fontSize: '0.82rem', fontWeight: 700 }}>{item.title}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        {createError && (
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: DS.text, fontSize: '0.84rem' }}>
            <Shield size={16} color={DS.gold} />
            <span>{createError}</span>
          </div>
        )}
        <button
          data-testid="package-create-request"
          disabled={busyState === 'creating'}
          onClick={onCreate}
          style={{ gridColumn: '1/-1', height: 52, borderRadius: r(14), border: 'none', background: DS.gradG, color: '#fff', fontWeight: 800, fontFamily: DS.F, fontSize: '0.95rem', cursor: busyState === 'creating' ? 'wait' : 'pointer', opacity: busyState === 'creating' ? 0.75 : 1, boxShadow: `0 4px 20px ${DS.gold}30` }}
        >
          {busyState === 'creating' ? 'Creating package request...' : 'Create connected package request'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <OperationalConfidencePanel summary={confidenceSummary} variant="detail" />
        <div style={{ background: DS.card2, borderRadius: r(16), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 10px 22px rgba(0,0,0,0.12)' }}>
          <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>What great looks like</div>
          <div style={{ display: 'grid', gap: 10 }}>
          {PACKAGE_EXCELLENCE_POINTS.slice(0, 2).map((item) => (
            <div key={item.title} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: DS.card3 }}>
              <div style={{ color: DS.text, fontSize: '0.84rem', fontWeight: 700 }}>{item.title}</div>
              <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4 }}>{item.desc}</div>
            </div>
          ))}
          </div>
        </div>
        <div style={{ background: DS.card2, borderRadius: r(16), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 10px 22px rgba(0,0,0,0.12)' }}>
          <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.95rem', marginBottom: 10 }}>Recent requests</div>
          {recentPackages.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentPackages.map((item) => (
                <button
                  key={item.trackingId}
                  onClick={() => onOpenRecent(item)}
                  style={{ textAlign: 'left', borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: DS.card3, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: DS.text, fontWeight: 700, fontSize: '0.82rem' }}>{item.from} to {item.to}</span>
                    <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>{item.trackingId}</span>
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 6 }}>
                    {item.matchedRideId ? `Assigned to ${item.matchedDriver || 'connected captain'} · WhatsApp-first handoff` : `Waiting for route assignment${corridor.pickupSummary ? ` · ${corridor.pickupSummary}` : ''}`}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: DS.muted, fontSize: '0.8rem' }}>Your recent package requests appear here for one-click tracking.</div>
          )}
        </div>
      </div>
    </div>
  );
}
