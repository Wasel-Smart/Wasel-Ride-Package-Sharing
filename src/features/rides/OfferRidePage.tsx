import { useEffect, useState } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { createGenderMeta, OFFER_RIDE_DRAFT_KEY } from '../../pages/waselCoreRideData';
import { CoreExperienceBanner, DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import { createOfferRideDefaultForm, validateOfferRideStep } from '../../pages/waselCorePageHelpers';
import { readStoredObject } from '../../pages/waselCoreStorage';
import {
  createConnectedRide,
  getConnectedRides,
  getConnectedStats,
} from '../../services/journeyLogistics';
import {
  getBookingsForDriver,
  hydrateRideBookings,
} from '../../services/rideLifecycle';
import { notificationsAPI } from '../../services/notifications.js';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../services/trustRules';
import { OfferRideFormPanel } from './components/OfferRideFormPanel';
import { OfferRideIncomingRequests } from './components/OfferRideIncomingRequests';
import { OFFER_RIDE_SUMMARY_METRICS } from './offerRideContent';

const GENDER_META = createGenderMeta(DS);

export function OfferRidePage() {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const defaultForm = createOfferRideDefaultForm();
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => readStoredObject(OFFER_RIDE_DRAFT_KEY, defaultForm));
  const [submitted, setSubmitted] = useState(false);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [busyState, setBusyState] = useState<'idle' | 'posting'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>('Draft autosaves on this device.');

  const offerGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');
  const driverReadiness = getDriverReadinessSummary(user);
  const corridorCount = getConnectedRides().filter((ride) => ride.from === form.from && ride.to === form.to).length;
  const recentPostedRides = getConnectedRides().filter((ride) => ride.from === form.from && ride.to === form.to).slice(0, 3);
  const incomingRequests = user
    ? getBookingsForDriver(user.id, getConnectedRides()).filter((booking) => booking.status === 'pending_driver').slice(0, 4)
    : [];

  useEffect(() => {
    setNetworkStats(getConnectedStats());
  }, [submitted]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRideBookings(user.id, getConnectedRides());
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OFFER_RIDE_DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const updateForm = (key: string, value: string | number | boolean) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const moveToStep = (targetStep: number) => {
    const nextError = validateOfferRideStep(form, targetStep - 1);
    if (nextError) {
      setFormError(nextError);
      return;
    }
    setFormError(null);
    setStep(targetStep);
  };

  const handlePostRide = async () => {
    if (!user) {
      nav('/app/auth');
      return;
    }
    if (!offerGate.allowed) {
      setFormError(offerGate.reason || 'Your account is not ready to post rides yet.');
      return;
    }
    if (form.acceptsPackages && !packageGate.allowed) {
      setFormError(packageGate.reason || 'Your account is not ready to carry packages yet.');
      return;
    }

    const nextError = validateOfferRideStep(form, 3);
    if (nextError) {
      setFormError(nextError);
      return;
    }

    setBusyState('posting');
    setFormError(null);

    try {
      const createdRide = await createConnectedRide({
        ownerId: user.id,
        from: form.from,
        to: form.to,
        date: form.date,
        time: form.time,
        seats: form.seats,
        price: form.price,
        gender: form.gender,
        prayer: form.prayer,
        carModel: form.carModel,
        note: form.note,
        acceptsPackages: form.acceptsPackages,
        packageCapacity: form.packageCapacity as 'small' | 'medium' | 'large',
        packageNote: form.packageNote,
        status: 'active',
      });

      setSubmitted(true);
      setDraftMessage('Ride posted and draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI.createNotification({
        title: 'Ride posted successfully',
        message: form.acceptsPackages ? `Your ${form.from} to ${form.to} ride is live and accepting packages.` : `Your ${form.from} to ${form.to} ride is now live.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/offer-ride',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not post the ride right now.');
    } finally {
      setBusyState('idle');
    }
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead emoji="+" title="Offer a Ride" titleAr="Ride Posting" sub="Share your journey - Earn fuel money - Carry passengers and packages together" color={DS.blue} />
        <CoreExperienceBanner title="Publish one trip for riders and packages together" detail="Offer Ride now acts as a supply tool for the full Wasel network. Drivers can expose seats, parcel space, and corridor availability in one trusted posting flow." tone={DS.blue} />

        {(!offerGate.allowed || (form.acceptsPackages && !packageGate.allowed)) && (
          <div style={{ marginBottom: 18, background: 'rgba(240,168,48,0.10)', border: `1px solid ${DS.gold}35`, borderRadius: r(16), padding: '14px 16px', color: '#fff' }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Trust readiness required</div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>{(!offerGate.allowed ? offerGate.reason : packageGate.reason) ?? 'Complete account checks before posting.'}</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {driverReadiness.steps.filter((step) => !step.complete).slice(0, 3).map((step) => (
                <div key={step.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{step.label}</div>
                  <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>{step.description}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button onClick={() => nav('/app/driver')} style={{ height: 40, padding: '0 16px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Open Driver Onboarding</button>
              <button onClick={() => nav('/app/trust')} style={{ height: 40, padding: '0 16px', borderRadius: '99px', border: 'none', background: DS.gradG, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Open Trust Center</button>
            </div>
          </div>
        )}

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {OFFER_RIDE_SUMMARY_METRICS.map((item) => {
            const value = item.label === 'Posted rides'
              ? networkStats.ridesPosted
              : item.label === 'Package-ready rides'
                ? networkStats.packageEnabledRides
                : item.label === 'Packages matched'
                  ? networkStats.matchedPackages
                  : networkStats.packagesCreated;

            return (
              <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
                <div style={{ color: DS[item.colorKey], fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{value}</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
                <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.detail}</div>
              </div>
            );
          })}
        </div>

        <OfferRideIncomingRequests incomingRequests={incomingRequests} onStatusMessage={setDraftMessage} />

        {submitted ? (
          <div style={{ background: DS.card, borderRadius: r(20), padding: '60px 28px', textAlign: 'center', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>OK</div>
            <h2 style={{ color: DS.green, fontWeight: 900, fontSize: '1.5rem', margin: '0 0 12px' }}>Ride Posted!</h2>
            <p style={{ color: DS.sub }}>Your ride from <strong style={{ color: '#fff' }}>{form.from}</strong> to <strong style={{ color: '#fff' }}>{form.to}</strong> is now live.</p>
            <p style={{ color: DS.muted, fontSize: '0.85rem', marginTop: 8 }}>{form.acceptsPackages ? 'Passengers and package requests can now discover this route from across the app.' : 'Passengers will contact you when they book.'}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 720, margin: '22px auto 0' }}>
              {[
                { label: 'Corridor readiness', value: corridorCount > 0 ? `${corridorCount + 1} live rides` : 'First live ride' },
                { label: 'Delivery mode', value: form.acceptsPackages ? `Packages on (${form.packageCapacity})` : 'Passengers only' },
                { label: 'Departure plan', value: `${form.date} at ${form.time}` },
              ].map((item) => (
                <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                  <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
              <button onClick={() => { setSubmitted(false); setStep(1); setForm(defaultForm); }} style={{ padding: '12px 28px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 700, fontFamily: DS.F, cursor: 'pointer' }}>Post Another</button>
            </div>
          </div>
        ) : (
          <OfferRideFormPanel
            form={form}
            step={step}
            corridorCount={corridorCount}
            recentPostedRides={recentPostedRides}
            draftMessage={draftMessage}
            formError={formError}
            busyState={busyState}
            genderMeta={GENDER_META}
            onUpdate={updateForm}
            onStepChange={moveToStep}
            onSubmit={handlePostRide}
          />
        )}
      </PageShell>
    </Protected>
  );
}

export default OfferRidePage;
