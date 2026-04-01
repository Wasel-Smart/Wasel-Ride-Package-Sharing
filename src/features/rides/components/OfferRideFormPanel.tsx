import { Shield } from 'lucide-react';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, r } from '../../../pages/waselServiceShared';
import type { PostedRide } from '../../../services/journeyLogistics';
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
  onUpdate,
  onStepChange,
  onSubmit,
}: OfferRideFormPanelProps) {
  return (
    <div style={{ background: DS.card, borderRadius: r(20), padding: '28px 28px', border: `1px solid ${DS.border}` }}>
      <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 20 }}>
        <div style={{ background: DS.card2, borderRadius: r(16), padding: '16px 18px', border: `1px solid ${DS.border}` }}>
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>Posting confidence</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Live corridor', value: corridorCount > 0 ? `${corridorCount} rides already posted on this route` : 'No live rides on this route yet' },
              { label: 'Package visibility', value: form.acceptsPackages ? `Eligible for package matching (${form.packageCapacity})` : 'Passengers only' },
              { label: 'Draft status', value: draftMessage || 'Draft autosaves on this device.' },
            ].map((item) => (
              <div key={item.label} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: DS.card }}>
                <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: DS.card2, borderRadius: r(16), padding: '16px 18px', border: `1px solid ${DS.border}` }}>
          <div style={{ color: '#fff', fontWeight: 800, marginBottom: 10 }}>Recent corridor posts</div>
          {recentPostedRides.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentPostedRides.map((ride) => (
                <div key={ride.id} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, padding: '12px 13px', background: DS.card }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>{ride.from} to {ride.to}</div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{ride.date} at {ride.time} · {ride.carModel || 'Vehicle pending'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: DS.muted, fontSize: '0.8rem' }}>This route will become the first visible posting for the current corridor.</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[1, 2, 3].map((item) => (
          <div key={item} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= item ? DS.gradC : DS.card2 }} />
        ))}
      </div>

      {formError && (
        <div style={{ marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center', background: `${DS.gold}12`, border: `1px solid ${DS.gold}30`, borderRadius: r(14), padding: '12px 14px', color: '#fff', fontSize: '0.84rem' }}>
          <Shield size={16} color={DS.gold} />
          <span>{formError}</span>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <h3 style={{ color: '#fff', fontWeight: 800, gridColumn: '1/-1', margin: '0 0 4px' }}>Route Details</h3>
          {[{ label: 'From', key: 'from' as const }, { label: 'To', key: 'to' as const }].map((field) => (
            <div key={field.label}>
              <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{field.label}</label>
              <select value={form[field.key]} onChange={(event) => onUpdate(field.key, event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
                {CITIES.map((city) => (
                  <option key={city} value={city} style={{ background: DS.card }}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Date</label>
            <input type="date" value={form.date} onChange={(event) => onUpdate('date', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Time</label>
            <input type="time" value={form.time} onChange={(event) => onUpdate('time', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
          </div>
          <button data-testid="offer-ride-step-1" onClick={() => onStepChange(2)} style={{ gridColumn: '1/-1', height: 50, borderRadius: r(14), border: 'none', background: DS.gradC, color: '#fff', fontWeight: 800, fontFamily: DS.F, fontSize: '0.95rem', cursor: 'pointer', boxShadow: `0 4px 20px ${DS.cyan}30` }}>
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 4px' }}>Seats, Pricing, and Capacity</h3>
          {[{ label: 'Available Seats', key: 'seats' as const, min: 1, max: 7 }, { label: 'Price per Seat (JOD)', key: 'price' as const, min: 1, max: 50 }].map((field) => (
            <div key={field.label}>
              <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{field.label}</label>
              <input type="number" min={field.min} max={field.max} value={form[field.key]} onChange={(event) => onUpdate(field.key, Number(event.target.value))} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Car Model</label>
            <input placeholder="e.g. Toyota Camry 2023" value={form.carModel} onChange={(event) => onUpdate('carModel', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => onUpdate('acceptsPackages', !form.acceptsPackages)} style={{ padding: '12px 18px', borderRadius: r(10), border: `1px solid ${form.acceptsPackages ? DS.green : DS.border}`, background: form.acceptsPackages ? `${DS.green}10` : DS.card2, color: form.acceptsPackages ? DS.green : DS.sub, fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            Package network: {form.acceptsPackages ? 'Accepting packages on this ride' : 'Passengers only'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Package capacity</label>
              <select value={form.packageCapacity} onChange={(event) => onUpdate('packageCapacity', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
                {OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS.map((size) => (
                  <option key={size} value={size} style={{ background: DS.card }}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onStepChange(1)} style={{ flex: 1, height: 50, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.sub, fontFamily: DS.F, fontWeight: 700, cursor: 'pointer' }}>Back</button>
            <button data-testid="offer-ride-step-2" onClick={() => onStepChange(3)} style={{ flex: 2, height: 50, borderRadius: r(14), border: 'none', background: DS.gradC, color: '#fff', fontWeight: 800, fontFamily: DS.F, cursor: 'pointer', boxShadow: `0 4px 20px ${DS.cyan}30` }}>Continue</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 4px' }}>Preferences and Connected Delivery</h3>
          <div>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Gender Preference</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(genderMeta).map(([key, value]) => (
                <button key={key} onClick={() => onUpdate('gender', key)} style={{ padding: '8px 16px', borderRadius: '99px', border: `1px solid ${form.gender === key ? value.color : DS.border}`, background: form.gender === key ? `${value.color}15` : DS.card2, color: form.gender === key ? value.color : DS.sub, fontFamily: DS.F, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                  {value.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => onUpdate('prayer', !form.prayer)} style={{ padding: '12px 18px', borderRadius: r(10), border: `1px solid ${form.prayer ? DS.gold : DS.border}`, background: form.prayer ? `${DS.gold}10` : DS.card2, color: form.prayer ? DS.gold : DS.sub, fontFamily: DS.F, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }}>
            Prayer stops: {form.prayer ? 'Enabled' : 'Optional'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Package note</label>
              <input placeholder="Example: compact parcels only" value={form.packageNote} onChange={(event) => onUpdate('packageNote', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', color: DS.muted, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Note for passengers</label>
            <textarea rows={2} placeholder="Anything passengers should know" value={form.note} onChange={(event) => onUpdate('note', event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontFamily: DS.F, fontSize: '0.9rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ background: DS.card2, borderRadius: r(14), padding: '18px 20px', border: `1px solid ${DS.border}` }}>
            <h4 style={{ color: DS.cyan, fontWeight: 700, margin: '0 0 12px', fontSize: '0.85rem' }}>Summary</h4>
            <div style={{ color: '#fff', fontSize: '0.9rem', lineHeight: 1.8 }}>
              {form.from} to {form.to} - {form.date || 'Choose date'} at {form.time}
              <br />
              {form.seats} seats - {form.price} JOD/seat - {form.carModel || 'Car TBD'}
              <br />
              {form.acceptsPackages ? `Packages enabled (${form.packageCapacity})` : 'Passengers only'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onStepChange(2)} style={{ flex: 1, height: 50, borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.sub, fontFamily: DS.F, fontWeight: 700, cursor: 'pointer' }}>Back</button>
            <button data-testid="offer-ride-submit" disabled={busyState === 'posting'} onClick={onSubmit} style={{ flex: 2, height: 50, borderRadius: r(14), border: 'none', background: DS.gradG, color: '#fff', fontWeight: 800, fontFamily: DS.F, cursor: busyState === 'posting' ? 'wait' : 'pointer', opacity: busyState === 'posting' ? 0.75 : 1, boxShadow: `0 4px 20px ${DS.green}30` }}>
              {busyState === 'posting' ? 'Posting connected ride...' : 'Post Connected Ride'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
