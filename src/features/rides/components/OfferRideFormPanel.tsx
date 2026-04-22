import { Shield } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, r } from '../../../pages/waselServiceShared';
import type { PostedRide } from '../../../services/journeyLogistics';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import type { DriverRoutePlan } from '../../../config/wasel-movement-network';
import { OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS } from '../offerRideContent';

type OfferRideForm = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender: string;
  prayer: boolean;
  carModel: string;
  note: string;
  acceptsPackages: boolean;
  packageCapacity: string;
  packageNote: string;
};

type OfferRideFormPanelProps = {
  form: OfferRideForm;
  step: number;
  corridorCount: number;
  recentPostedRides: PostedRide[];
  draftMessage: string | null;
  formError: string | null;
  busyState: 'idle' | 'posting';
  genderMeta: Record<string, { label: string; color: string }>;
  driverPlan: DriverRoutePlan | null;
  liveSignal?: LiveCorridorSignal | null;
  onUpdate: (key: string, value: string | number | boolean) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
};

export function OfferRideFormPanel({
  form,
  step,
  corridorCount,
  recentPostedRides,
  draftMessage,
  formError,
  busyState,
  genderMeta,
  driverPlan,
  liveSignal = null,
  onUpdate,
  onStepChange,
  onSubmit,
}: OfferRideFormPanelProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(30,30,50,0.8) 0%, rgba(20,20,35,0.9) 100%)',
        borderRadius: r(24),
        padding: '32px 32px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
      }}
    >
      <div
        className="sp-2col"
        style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, marginBottom: 24 }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: r(18),
            padding: '20px 22px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 14, fontSize: '1rem' }}>
            Posting confidence
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              {
                label: 'Live corridor',
                value:
                  corridorCount > 0
                    ? `${corridorCount} rides already posted on this route`
                    : 'No live rides on this route yet',
              },
              {
                label: 'Route signal',
                value: liveSignal
                  ? `${liveSignal.forecastDemandScore}/100 demand score with ${liveSignal.pricePressure} pricing`
                  : driverPlan
                    ? `${driverPlan.corridor.predictedDemandScore}/100 demand score with ${driverPlan.corridor.density} density`
                    : 'Pick a corridor to unlock route intelligence',
              },
              {
                label: 'Live proof',
                value: liveSignal
                  ? `${liveSignal.liveSearches} searches | ${liveSignal.liveBookings} bookings | ${liveSignal.activeDemandAlerts} alerts`
                  : 'Production proof appears when Wasel sees corridor demand',
              },
              {
                label: 'Package visibility',
                value: form.acceptsPackages
                  ? `Eligible for package matching (${form.packageCapacity})`
                  : 'Passengers only',
              },
              { label: 'Draft status', value: draftMessage || 'Draft autosaves on this device.' },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: r(12),
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.66rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem', marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: r(18),
            padding: '20px 22px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 14, fontSize: '1rem' }}>
            Recent corridor posts
          </div>
          {recentPostedRides.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {recentPostedRides.map(ride => (
                <div
                  key={ride.id}
                  style={{
                    borderRadius: r(12),
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.84rem' }}>
                    {ride.from} to {ride.to}
                  </div>
                  <div
                    style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.74rem', marginTop: 4 }}
                  >
                    {ride.date} at {ride.time} · {ride.carModel || 'Vehicle pending'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.6 }}>
              This route will become the first visible posting for the current corridor.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map(item => (
          <div
            key={item}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background:
                step >= item
                  ? 'linear-gradient(90deg, #06b6d4 0%, #0891b2 100%)'
                  : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

{formError && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: r(16), padding: '14px 18px', color: '#fff', fontSize: '0.9rem' }}>
          <Shield size={18} color="#f59e0b" />
          <span>{formError}</span>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr 1fr' }}>
          <h3
            style={{
              color: '#fff',
              fontWeight: 800,
              gridColumn: '1/-1',
              margin: '0 0 8px',
              fontSize: '1.2rem',
            }}
          >
            Route Details
          </h3>
          {[
            { label: 'From', key: 'from' as const },
            { label: 'To', key: 'to' as const },
          ].map(field => (
            <div key={field.label}>
              <label
                style={{
                  display: 'block',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                {field.label}
              </label>
              <select
                value={form[field.key]}
                onChange={event => onUpdate(field.key, event.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: r(14),
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontFamily: DS.F,
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city} style={{ background: '#1a1a2e' }}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={event => onUpdate('date', event.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: r(14),
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontFamily: DS.F,
                fontSize: '0.95rem',
                outline: 'none',
                colorScheme: resolvedTheme,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Time
            </label>
            <input
              type="time"
              value={form.time}
              onChange={event => onUpdate('time', event.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: r(14),
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontFamily: DS.F,
                fontSize: '0.95rem',
                outline: 'none',
                colorScheme: resolvedTheme,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            data-testid="offer-ride-step-1"
            onClick={() => onStepChange(2)}
            style={{
              gridColumn: '1/-1',
              height: 56,
              borderRadius: r(16),
              border: 'none',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              color: '#fff',
              fontWeight: 800,
              fontFamily: DS.F,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 8px 25px -5px rgba(6,182,212,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            Continue
          </button>
        </div>
      )}

{step === 2 && (
        <div style={{ display: 'grid', gap: 18 }}>
          <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 8px', fontSize: '1.2rem' }}>Seats, Pricing, and Capacity</h3>
          {driverPlan && (
            <div className="sp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              {[
                { label: 'Recommended seat price', value: `${driverPlan.recommendedSeatPriceJod} JOD`, detail: 'Cheaper than solo movement while protecting fill rate' },
                { label: 'Full route gross', value: `${driverPlan.grossWhenFullJod} JOD`, detail: `${driverPlan.corridor.fillTargetSeats} seats is the target load for this corridor` },
                { label: 'Best pickup point', value: liveSignal?.recommendedPickupPoint ?? driverPlan.corridor.pickupPoints[0] ?? 'Trusted corridor node', detail: liveSignal?.nextWaveWindow ?? driverPlan.corridor.autoGroupWindow },
              ].map((item) => (
                <div key={item.label} style={{ borderRadius: r(16), border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px 18px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', marginTop: 8 }}>{item.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.76rem', lineHeight: 1.5, marginTop: 6 }}>{item.detail}</div>
                </div>
              ))}
            </div>
          )}
          {[{ label: 'Available Seats', key: 'seats' as const, min: 1, max: 7 }, { label: 'Price per Seat (JOD)', key: 'price' as const, min: 1, max: 50 }].map((field) => (
            <div key={field.label}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{field.label}</label>
              <input type="number" min={field.min} max={field.max} value={form[field.key]} onChange={(event) => onUpdate(field.key, Number(event.target.value))} style={{ width: '100%', padding: '14px 16px', borderRadius: r(14), border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          {driverPlan && (
            <div style={{ borderRadius: r(16), border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.08)', padding: '16px 18px' }}>
              <div style={{ color: '#06b6d4', fontWeight: 800, fontSize: '0.9rem' }}>Wasel Brain recommendation</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', lineHeight: 1.65, marginTop: 8 }}>
                {driverPlan.waselBrainNote} Empty-seat risk is about {driverPlan.emptySeatCostJod} JOD per open seat, and package-ready supply can add about {driverPlan.packageBonusJod} JOD on this route.
                {liveSignal ? ` Live route proof shows ${liveSignal.routeOwnershipScore}/100 ownership with ${liveSignal.productionSources[0]}.` : ''}
              </div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Car Model</label>
            <input placeholder="e.g. Toyota Camry 2023" value={form.carModel} onChange={(event) => onUpdate('carModel', event.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: r(14), border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => onUpdate('acceptsPackages', !form.acceptsPackages)} style={{ padding: '16px 20px', borderRadius: r(14), border: `1px solid ${form.acceptsPackages ? '#10b981' : 'rgba(255,255,255,0.1)'}`, background: form.acceptsPackages ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', color: form.acceptsPackages ? '#10b981' : 'rgba(255,255,255,0.7)', fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem' }}>
            Package network: {form.acceptsPackages ? 'Accepting packages on this ride' : 'Passengers only'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Package capacity</label>
              <select value={form.packageCapacity} onChange={(event) => onUpdate('packageCapacity', event.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: r(14), border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none', cursor: 'pointer' }}>
                {OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS.map((size) => (
                  <option key={size} value={size} style={{ background: '#1a1a2e' }}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => onStepChange(1)} style={{ flex: 1, height: 56, borderRadius: r(16), border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Back</button>
            <button data-testid="offer-ride-step-2" onClick={() => onStepChange(3)} style={{ flex: 2, height: 56, borderRadius: r(16), border: 'none', background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#fff', fontWeight: 800, fontFamily: DS.F, cursor: 'pointer', boxShadow: '0 8px 25px -5px rgba(6,182,212,0.4)', fontSize: '1rem' }}>Continue</button>
          </div>
        </div>
      )}

{step === 3 && (
        <div style={{ display: 'grid', gap: 18 }}>
          <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 8px', fontSize: '1.2rem' }}>Preferences and Connected Delivery</h3>
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Gender Preference</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {Object.entries(genderMeta).map(([key, value]) => (
                <button key={key} onClick={() => onUpdate('gender', key)} style={{ padding: '12px 20px', borderRadius: 99, border: `1px solid ${form.gender === key ? value.color : 'rgba(255,255,255,0.1)'}`, background: form.gender === key ? `${value.color}15` : 'rgba(255,255,255,0.05)', color: form.gender === key ? value.color : 'rgba(255,255,255,0.7)', fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                  {value.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => onUpdate('prayer', !form.prayer)} style={{ padding: '16px 20px', borderRadius: r(14), border: `1px solid ${form.prayer ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`, background: form.prayer ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', color: form.prayer ? '#f59e0b' : 'rgba(255,255,255,0.7)', fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontSize: '0.95rem' }}>
            Prayer stops: {form.prayer ? 'Enabled' : 'Optional'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Package note</label>
              <input placeholder="Example: compact parcels only" value={form.packageNote} onChange={(event) => onUpdate('packageNote', event.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: r(14), border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Note for passengers</label>
            <textarea rows={3} placeholder="Anything passengers should know" value={form.note} onChange={(event) => onUpdate('note', event.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: r(14), border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: DS.F, fontSize: '0.95rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: 'rgba(6,182,212,0.08)', borderRadius: r(18), padding: '22px 24px', border: '1px solid rgba(6,182,212,0.2)' }}>
            <h4 style={{ color: '#06b6d4', fontWeight: 800, margin: '0 0 16px', fontSize: '0.95rem' }}>Summary</h4>
            <div style={{ color: '#fff', fontSize: '0.95rem', lineHeight: 1.9 }}>
              <strong>{form.from}</strong> to <strong>{form.to}</strong> - {form.date || 'Choose date'} at {form.time}
              <br />
              {form.seats} seats - {form.price} JOD/seat - {form.carModel || 'Car TBD'}
              <br />
              {form.acceptsPackages ? `Packages enabled (${form.packageCapacity})` : 'Passengers only'}
              {driverPlan && (
                <>
                  <br />
                  Wasel Brain target: {driverPlan.recommendedSeatPriceJod} JOD/seat, {driverPlan.corridor.savingsPercent}% cheaper than solo movement, best pickup at {liveSignal?.recommendedPickupPoint ?? driverPlan.corridor.pickupPoints[0] ?? 'the top corridor node'}
                  {liveSignal ? `, with ${liveSignal.activeDemandAlerts} active alerts and ${liveSignal.nextWaveWindow} as the next dense departure window` : ''}
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => onStepChange(2)} style={{ flex: 1, height: 56, borderRadius: r(16), border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>Back</button>
            <button data-testid="offer-ride-submit" disabled={busyState === 'posting'} onClick={onSubmit} style={{ flex: 2, height: 56, borderRadius: r(16), border: 'none', background: busyState === 'posting' ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: busyState === 'posting' ? 'rgba(255,255,255,0.5)' : '#fff', fontWeight: 800, fontFamily: DS.F, cursor: busyState === 'posting' ? 'wait' : 'pointer', opacity: busyState === 'posting' ? 0.75 : 1, boxShadow: busyState === 'posting' ? 'none' : '0 8px 25px -5px rgba(16,185,129,0.4)', fontSize: '1rem' }}>
              {busyState === 'posting' ? 'Posting connected ride...' : 'Post Connected Ride'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
