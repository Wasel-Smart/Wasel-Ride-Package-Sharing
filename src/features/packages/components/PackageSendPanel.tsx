import type { Dispatch, SetStateAction } from 'react';
import { Shield } from 'lucide-react';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, pill, r } from '../../../pages/waselServiceShared';
import type { CorridorOpportunity } from '../../../config/wasel-movement-network';
import type { PackageRequest } from '../../../services/journeyLogistics';
import type { MovementPriceQuote } from '../../../services/movementPricing';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
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
  trackedPackage: PackageRequest | null;
  createError: string | null;
  busyState: 'idle' | 'creating' | 'tracking';
  matchingRideCount: number;
  corridorPlan: CorridorOpportunity | null;
  selectedSignal: LiveCorridorSignal | null;
  selectedPriceQuote: MovementPriceQuote | null;
  recentPackages: PackageRequest[];
  onCreate: () => void;
  onReset: () => void;
  onOpenTracking: () => void;
  onOpenRecent: (item: PackageRequest) => void;
};

export function PackageSendPanel({
  pkg,
  setPkg,
  trackedPackage,
  createError,
  busyState,
  matchingRideCount,
  corridorPlan,
  selectedSignal,
  selectedPriceQuote,
  recentPackages,
  onCreate,
  onReset,
  onOpenTracking,
  onOpenRecent,
}: PackageSendPanelProps) {
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
            background: 'rgba(255,255,255,0.03)',
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
            Share this OTP with the rider at pickup, then confirm pickup and delivery from tracking.
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
        <h3 style={{ color: '#fff', fontWeight: 800, gridColumn: '1/-1', margin: '0 0 4px' }}>
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
              style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
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
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
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
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
            Phone
          </label>
          <input
            data-testid="package-recipient-phone"
            placeholder="Recipient phone"
            value={pkg.recipientPhone}
            onChange={(event) => setPkg((previous) => ({ ...previous, recipientPhone: event.target.value }))}
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
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
            style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ gridColumn: '1/-1', background: 'rgba(255,255,255,0.03)', borderRadius: r(14), padding: '16px 18px', border: `1px solid ${DS.border}` }}>
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 6 }}>Why this stays simple</div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
            Every request checks live rides first. If a matching route accepts parcels, tracking starts on the same route instead of sending you into a second workflow.
          </div>
        </div>
        <div className="pkg-send-steps-grid" style={{ gridColumn: '1/-1', display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {PACKAGE_SEND_STEPS.map((item) => (
            <div key={item.title} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}>{item.title}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        {createError && (
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}>
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
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 10px 22px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>Route readiness</div>
              <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 4 }}>Live visibility for {pkg.from} to {pkg.to}</div>
            </div>
            <span style={{ ...pill(matchingRideCount > 0 ? DS.green : DS.gold) }}>
              {matchingRideCount > 0 ? `${matchingRideCount} rides live` : 'Standby mode'}
            </span>
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
            {matchingRideCount > 0
              ? 'This corridor already has package-ready rides, so matching should be immediate or near-immediate.'
              : 'No package-ready ride is live for this route yet. We will still create the request and keep it queued for the next matching captain.'}
          </div>
          {(selectedSignal || corridorPlan || selectedPriceQuote) && (
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gap: 10,
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              <div style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attach rate</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem', marginTop: 6 }}>
                  {corridorPlan ? `${corridorPlan.attachRatePercent}%` : 'Pending'}
                </div>
              </div>
              <div style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shared price</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem', marginTop: 6 }}>
                  {selectedPriceQuote ? `${selectedPriceQuote.finalPriceJod} JOD` : corridorPlan ? `${corridorPlan.sharedPriceJod} JOD` : 'Pending'}
                </div>
              </div>
              <div style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next wave</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem', marginTop: 6 }}>
                  {selectedSignal?.nextWaveWindow ?? corridorPlan?.autoGroupWindow ?? 'Waiting for demand'}
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 10px 22px rgba(0,0,0,0.12)' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 12 }}>What great looks like</div>
          <div style={{ display: 'grid', gap: 10 }}>
          {PACKAGE_EXCELLENCE_POINTS.slice(0, 2).map((item) => (
            <div key={item.title} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ color: '#fff', fontSize: '0.84rem', fontWeight: 700 }}>{item.title}</div>
              <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4 }}>{item.desc}</div>
            </div>
          ))}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 10px 22px rgba(0,0,0,0.12)' }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginBottom: 10 }}>Recent requests</div>
          {recentPackages.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentPackages.map((item) => (
                <button
                  key={item.trackingId}
                  onClick={() => onOpenRecent(item)}
                  style={{ textAlign: 'left', borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>{item.from} to {item.to}</span>
                    <span style={{ ...pill(item.matchedRideId ? DS.green : DS.gold) }}>{item.trackingId}</span>
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 6 }}>
                    {item.matchedRideId ? `Assigned to ${item.matchedDriver || 'connected captain'}` : 'Waiting for route assignment'}
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
