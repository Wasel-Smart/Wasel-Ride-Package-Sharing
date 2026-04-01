import { useEffect, useMemo, useState } from 'react';
import { Brain, Network, TrendingUp } from 'lucide-react';
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
import { recordMovementActivity } from '../../services/movementMembership';
import {
  buildDriverRoutePlan,
  getMarketplaceNodes,
  getWaselCategoryPosition,
} from '../../config/wasel-movement-network';
import { OfferRideFormPanel } from './components/OfferRideFormPanel';
import { OfferRideIncomingRequests } from './components/OfferRideIncomingRequests';

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

  const category = useMemo(() => getWaselCategoryPosition(), []);
  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(2, 5), []);
  const offerGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');
  const driverReadiness = getDriverReadinessSummary(user);
  const driverPlan = useMemo(
    () => buildDriverRoutePlan(form.from, form.to, form.seats),
    [form.from, form.to, form.seats],
  );
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
      setFormError(offerGate.reason || 'Your account is not ready to post route supply yet.');
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
      setDraftMessage('Route supply posted and draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI.createNotification({
        title: 'Route supply posted',
        message: form.acceptsPackages ? `Your ${form.from} to ${form.to} route is live for riders and packages.` : `Your ${form.from} to ${form.to} route is now live.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/offer-ride',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
      void recordMovementActivity('route_published', driverPlan?.corridor.id ?? null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'We could not post the route right now.');
    } finally {
      setBusyState('idle');
    }
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Supply"
          title="Open Route Supply"
          titleAr="Route Supply"
          sub="Publish seats, package space, and corridor capacity in one flow."
          color={DS.blue}
        />

        <CoreExperienceBanner
          title="One route post should unlock people, goods, and service demand together."
          detail={`${category.promise} Drivers are no longer posting isolated rides. They are opening supply on a route graph that Wasel Brain can price, fill, and reuse across the network.`}
          tone={DS.blue}
        />

        {(!offerGate.allowed || (form.acceptsPackages && !packageGate.allowed)) && (
          <div style={{ marginBottom: 18, background: 'rgba(240,168,48,0.10)', border: `1px solid ${DS.gold}35`, borderRadius: r(16), padding: '14px 16px', color: '#fff' }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Trust readiness required</div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>{(!offerGate.allowed ? offerGate.reason : packageGate.reason) ?? 'Complete account checks before opening supply.'}</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {driverReadiness.steps.filter((step) => !step.complete).slice(0, 3).map((step) => (
                <div key={step.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{step.label}</div>
                  <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>{step.description}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button onClick={() => nav('/app/driver')} style={{ height: 40, padding: '0 16px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Open driver dashboard</button>
              <button onClick={() => nav('/app/trust')} style={{ height: 40, padding: '0 16px', borderRadius: '99px', border: 'none', background: DS.gradG, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Open trust center</button>
            </div>
          </div>
        )}

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[
            {
              label: 'Recommended seat price',
              value: driverPlan ? `${driverPlan.recommendedSeatPriceJod} JOD` : '--',
              detail: 'Price tuned for fill rate and route density',
              color: DS.cyan,
            },
            {
              label: 'Gross when full',
              value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
              detail: 'Seats filled through shared route economics',
              color: DS.green,
            },
            {
              label: 'Package bonus',
              value: driverPlan ? `${driverPlan.packageBonusJod} JOD` : '--',
              detail: 'Extra lane value from goods moving on the same route',
              color: DS.gold,
            },
            {
              label: 'Demand signal',
              value: driverPlan ? `${driverPlan.corridor.predictedDemandScore}` : String(networkStats.ridesPosted),
              detail: driverPlan ? 'Wasel Brain route confidence score' : 'Connected network activity',
              color: DS.blue,
            },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
          <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.cyan}12`, border: `1px solid ${DS.cyan}28`, display: 'grid', placeItems: 'center' }}>
                <Brain size={18} color={DS.cyan} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800 }}>Wasel Brain playbook</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  The route engine should optimize driver earnings before a seat goes live.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                driverPlan?.waselBrainNote ?? 'Pick a route to unlock a lane-specific earnings recommendation.',
                driverPlan?.corridor.autoGroupWindow ?? 'Auto-grouping begins when the corridor gets enough saved demand.',
                driverPlan ? `Empty-seat risk on this route is about ${driverPlan.emptySeatCostJod} JOD per unfilled seat.` : 'Fill rate is the lever that keeps the route profitable.',
              ].map((line) => (
                <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: '#fff', fontSize: '0.82rem', lineHeight: 1.65 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.green}12`, border: `1px solid ${DS.green}28`, display: 'grid', placeItems: 'center' }}>
                <Network size={18} color={DS.green} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800 }}>Marketplace pull</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  Route supply can now serve more than passengers.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {marketplaceNodes.map((node) => (
                <div key={node.id} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>{node.title}</div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.55 }}>{node.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <OfferRideIncomingRequests incomingRequests={incomingRequests} onStatusMessage={setDraftMessage} />

        {submitted ? (
          <div style={{ background: DS.card, borderRadius: r(20), padding: '60px 28px', textAlign: 'center', border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>OK</div>
            <h2 style={{ color: DS.green, fontWeight: 900, fontSize: '1.5rem', margin: '0 0 12px' }}>Route supply is live</h2>
            <p style={{ color: DS.sub }}>
              Your route from <strong style={{ color: '#fff' }}>{form.from}</strong> to <strong style={{ color: '#fff' }}>{form.to}</strong> is now part of the Wasel movement network.
            </p>
            <p style={{ color: DS.muted, fontSize: '0.85rem', marginTop: 8 }}>
              {form.acceptsPackages ? 'Passengers, packages, and service demand can now attach to this corridor.' : 'Passengers can now discover this route across the network.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 760, margin: '22px auto 0' }}>
              {[
                { label: 'Corridor readiness', value: corridorCount > 0 ? `${corridorCount + 1} live routes` : 'First live route' },
                { label: 'Driver playbook', value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD when full` : 'Fill seats to unlock savings' },
                { label: 'Delivery mode', value: form.acceptsPackages ? `Packages on (${form.packageCapacity})` : 'Passengers only' },
              ].map((item) => (
                <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                  <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
              <button onClick={() => { setSubmitted(false); setStep(1); setForm(defaultForm); }} style={{ padding: '12px 28px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 700, fontFamily: DS.F, cursor: 'pointer' }}>Post another route</button>
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
            driverPlan={driverPlan}
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
