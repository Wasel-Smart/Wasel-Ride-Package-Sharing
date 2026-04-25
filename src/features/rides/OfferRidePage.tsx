import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Network } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { buildCorridorExperienceSnapshot } from '../../domains/corridors/corridorExperience';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { createGenderMeta, OFFER_RIDE_DRAFT_KEY } from '../../pages/waselCoreRideData';
import {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';
import { createOfferRideDefaultForm, validateOfferRideStep } from '../../pages/waselCorePageHelpers';
import { readStoredObject } from '../../pages/waselCoreStorage';
import { useCorridorTruth } from '../../services/corridorTruth';
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
} from '../../config/wasel-movement-network';
import { OfferRideFormPanel } from './components/OfferRideFormPanel';
import { OfferRideIncomingRequests } from './components/OfferRideIncomingRequests';
import { routeMatchesLocationPair } from '../../utils/jordanLocations';

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
  const driverPlan = useMemo(
    () => buildDriverRoutePlan(form.from, form.to, form.seats),
    [form.from, form.to, form.seats],
  );
  const corridorTruth = useCorridorTruth({ from: form.from, to: form.to });
  const corridor = useMemo(() => buildCorridorExperienceSnapshot(corridorTruth), [corridorTruth]);
  const recentPostedRides = getConnectedRides().filter((ride) => routeMatchesLocationPair(ride.from, ride.to, form.from, form.to, { allowReverse: false })).slice(0, 3);
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
      setFormError(offerGate.reason || 'Your account is not ready to offer a route yet.');
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
        ownerPhone: user.phone,
        ownerEmail: user.email,
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
      setDraftMessage('Route posted and draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI.createNotification({
        title: 'Route posted',
        message: form.acceptsPackages ? `Your ${form.from} to ${form.to} route is live for riders and packages, with WhatsApp as the main coordination lane.` : `Your ${form.from} to ${form.to} route is now live with WhatsApp as the main rider channel.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/offer-ride',
        contact: {
          email: user.email,
          phone: user.phone,
        },
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
      void recordMovementActivity('route_published', corridor.corridorId ?? driverPlan?.corridor.id ?? null);
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
          emoji="🚘"
          title="Offer a ride"
          titleAr="أنشئ رحلة"
          sub="Post seats on a real route and optionally carry packages."
          color={DS.blue}
        />

        <CoreExperienceBanner
          title="Offer one real route."
          detail="Set the route, timing, seats, and optional package space. The ride only goes live after the backend confirms it."
          tone={DS.blue}
        />

        <ClarityBand
          title="Offer a ride in three steps."
          detail="Choose the route, review the seat plan, and publish only when everything looks ready."
          tone={DS.blue}
          items={[
            { label: '1. Route', value: 'Set the route, date, time, and seats.' },
            { label: '2. Review', value: 'Check trust status, price guidance, and package space.' },
            { label: '3. Publish', value: 'Offer the ride and wait for backend confirmation.' },
          ]}
        />

        {(!offerGate.allowed || (form.acceptsPackages && !packageGate.allowed)) && (
          <div style={{ marginBottom: 18, background: 'rgba(168,214,20,0.10)', border: `1px solid ${DS.gold}35`, borderRadius: r(16), padding: '14px 16px', color: DS.text }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Trust readiness required</div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>{(!offerGate.allowed ? offerGate.reason : packageGate.reason) ?? 'Complete account checks before opening supply.'}</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {driverReadiness.steps.filter((readinessStep) => !readinessStep.complete).slice(0, 3).map((readinessStep) => (
                <div key={readinessStep.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: DS.text }}>{readinessStep.label}</div>
                  <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4, lineHeight: 1.5 }}>{readinessStep.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[
            {
              label: 'Recommended seat price',
              value: driverPlan ? `${driverPlan.recommendedSeatPriceJod} JOD` : '--',
              detail: 'Suggested from the current route and seat plan.',
              color: DS.cyan,
            },
            {
              label: 'Gross when full',
              value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
              detail: 'Estimated total if every seat books.',
              color: DS.green,
            },
            {
              label: 'Package bonus',
              value: driverPlan ? `${driverPlan.packageBonusJod} JOD` : '--',
              detail: 'Estimated extra if you carry packages.',
              color: DS.gold,
            },
            {
              label: 'Live demand signal',
              value: corridor.demandScore !== null ? `${corridor.demandScore}/100` : driverPlan ? `${driverPlan.corridor.predictedDemandScore}/100` : String(networkStats.ridesPosted),
              detail: corridor.liveProofSummary ?? (driverPlan ? 'Live route demand for this corridor.' : 'Current ride activity.'),
              color: DS.blue,
            },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 18 }}>
          <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: r(12), background: `${DS.cyan}12`, border: `1px solid ${DS.cyan}28`, display: 'grid', placeItems: 'center' }}>
                <Network size={18} color={DS.cyan} />
              </div>
              <div>
                <div style={{ color: DS.text, fontWeight: 800 }}>Route summary</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  Review the main details before you offer the ride.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[ 
                corridor.recommendationReason ?? driverPlan?.routeNote ?? 'Pick a route to see live price guidance.',
                corridor.pickupSummary ?? driverPlan?.corridor.autoGroupWindow ?? 'Pickup guidance appears here when route data is available.',
                corridor.liveProofSummary ?? (driverPlan ? `Empty-seat risk on this route is about ${driverPlan.emptySeatCostJod} JOD per open seat.` : 'Demand updates appear here when the corridor has live activity.'),
              ].map((line) => (
                <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: DS.text, fontSize: '0.82rem', lineHeight: 1.65 }}>
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
                <div style={{ color: DS.text, fontWeight: 800 }}>What this route can do</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  Keep the ride focused on passengers, packages, and clear updates.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                {
                  title: 'Passengers',
                  detail: 'Riders can book seats once the backend confirms this route.',
                },
                {
                  title: 'Packages',
                  detail: form.acceptsPackages ? `Packages are enabled for ${form.packageCapacity} items on this route.` : 'Turn on package space only if you want to carry packages.',
                },
                {
                  title: 'Updates',
                  detail: 'Status changes appear only when the backend updates the route or booking.',
                },
              ].map((item) => (
                <div key={item.title} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                  <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.82rem' }}>{item.title}</div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.55 }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            {
              title: 'Route details',
              detail: 'Set the route once so riders see clear timing, seats, and price.',
            },
            {
              title: 'Ride status',
              detail: 'The ride does not look live until the backend confirms it.',
            },
            {
              title: 'Package option',
              detail: corridor.routeOwnershipScore !== null && corridor.quotedPriceJod !== null
                ? `This corridor currently shows ${corridor.routeOwnershipScore}/100 route coverage and ${corridor.quotedPriceJod} JOD shared pricing.`
                : (form.acceptsPackages ? 'Packages can move on this route when space is available.' : 'Enable package space only when you want to carry parcels.'),
            },
          ].map((item) => (
            <div key={item.title} style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: r(10), background: `${DS.blue}14`, border: `1px solid ${DS.blue}28`, display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={16} color={DS.blue} />
                </div>
                <div style={{ color: DS.text, fontWeight: 800 }}>{item.title}</div>
              </div>
              <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <OfferRideIncomingRequests incomingRequests={incomingRequests} onStatusMessage={setDraftMessage} />

        {submitted ? (
          <div style={{ background: DS.card, borderRadius: r(20), padding: '60px 28px', textAlign: 'center', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: `${DS.green}14`, border: `2px solid ${DS.green}`, display: 'grid', placeItems: 'center' }}>
                <CheckCircle2 size={40} color={DS.green} />
              </div>
            </div>
            <h2 style={{ color: DS.green, fontWeight: 900, fontSize: '1.5rem', margin: '0 0 12px' }}>Ride is live</h2>
            <p style={{ color: DS.sub }}>
              Your ride from <strong style={{ color: DS.text }}>{form.from}</strong> to <strong style={{ color: DS.text }}>{form.to}</strong> is now available to book.
            </p>
            <p style={{ color: DS.muted, fontSize: '0.85rem', marginTop: 8 }}>
              {form.acceptsPackages ? 'Passengers and package senders can now see this route.' : 'Passengers can now see this ride.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, maxWidth: 760, margin: '22px auto 0' }}>
              {[
                { label: 'Route status', value: corridor.matchingRideCount > 0 ? `${corridor.matchingRideCount + 1} live rides` : 'First live ride' },
                { label: 'Full ride estimate', value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD when full` : 'Estimate unavailable' },
                { label: 'Package setting', value: form.acceptsPackages ? `Packages on (${form.packageCapacity})` : 'Passengers only' },
              ].map((item) => (
                <div key={item.label} style={{ background: DS.card2, borderRadius: r(14), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                  <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.82rem', marginTop: 6 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
              <button onClick={() => { setSubmitted(false); setStep(1); setForm(defaultForm); }} style={{ padding: '12px 28px', borderRadius: '99px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 700, fontFamily: DS.F, cursor: 'pointer' }}>Offer another ride</button>
            </div>
          </div>
        ) : (
          <OfferRideFormPanel
            form={form}
            step={step}
            corridor={corridor}
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


