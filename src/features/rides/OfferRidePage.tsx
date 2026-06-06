import { useEffect, useMemo, useState } from 'react';
import { Brain, Network } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { createGenderMeta, OFFER_RIDE_DRAFT_KEY } from '../../pages/waselCoreRideData';
import { DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import {
  createOfferRideDefaultForm,
  validateOfferRideStep,
} from '../../pages/waselCorePageHelpers';
import { readStoredObject } from '../../pages/waselCoreStorage';
import {
  createConnectedRide,
  getConnectedRides,
  getConnectedStats,
} from '../../services/journeyLogistics';
import { getBookingsForDriver, type RideBookingRecord } from '../../services/rideLifecycle';
import { notificationsAPI } from '../../services/notifications.js';
import { subscribeToRideBookingRealtime } from '../../services/rideRealtime';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../services/trustRules';
import { recordMovementActivity } from '../../services/movementMembership';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { buildDriverRoutePlan, getMarketplaceNodes } from '../../config/wasel-movement-network';
import { C } from '../../utils/wasel-ds';
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
  const [rideBookings, setRideBookings] = useState<RideBookingRecord[]>([]);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [busyState, setBusyState] = useState<'idle' | 'posting'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>('Draft saved on this device.');

  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(2, 5), []);
  const offerGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');
  const driverReadiness = getDriverReadinessSummary(user);
  const driverPlan = useMemo(
    () => buildDriverRoutePlan(form.from, form.to, form.seats),
    [form.from, form.to, form.seats],
  );
  const routeIntelligence = useLiveRouteIntelligence({ from: form.from, to: form.to });
  const selectedSignal = routeIntelligence.selectedSignal;
  const corridorCount = getConnectedRides().filter(
    ride => ride.from === form.from && ride.to === form.to,
  ).length;
  const recentPostedRides = getConnectedRides()
    .filter(ride => ride.from === form.from && ride.to === form.to)
    .slice(0, 3);
  const incomingRequests = user
    ? getBookingsForDriver(user.id, getConnectedRides())
        .filter(booking => {
          const liveBooking = rideBookings.find(item => item.id === booking.id);
          return (liveBooking ?? booking).status === 'pending_driver';
        })
        .slice(0, 4)
    : [];

  useEffect(() => {
    setNetworkStats(getConnectedStats());
  }, [submitted]);

  useEffect(() => {
    if (!user?.id) return;
    return subscribeToRideBookingRealtime({
      userId: user.id,
      rides: getConnectedRides(),
      onBookingsChange: setRideBookings,
    });
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(OFFER_RIDE_DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const updateForm = (key: string, value: string | number | boolean) => {
    setForm(previous => ({ ...previous, [key]: value }));
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
      setFormError(offerGate.reason || 'Your account is not ready to offer a ride yet.');
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
      setDraftMessage('Ride posted. Draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI
        .createNotification({
          title: 'Ride offer posted',
          message: form.acceptsPackages
            ? `Your ${form.from} to ${form.to} route is live for riders and packages.`
            : `Your ${form.from} to ${form.to} route is now live.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/offer-ride',
        })
        .catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
      void recordMovementActivity('route_published', driverPlan?.corridor.id ?? null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'We could not post the route right now.',
      );
    } finally {
      setBusyState('idle');
    }
  };

  const quickMetrics = [
    {
      label: 'Seat',
      value: driverPlan ? `${driverPlan.recommendedSeatPriceJod} JOD` : '--',
      color: DS.cyan,
    },
    {
      label: 'Full trip',
      value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
      color: DS.green,
    },
    {
      label: 'Package',
      value: driverPlan ? `${driverPlan.packageBonusJod} JOD` : '--',
      color: DS.gold,
    },
    {
      label: 'Demand',
      value: selectedSignal
        ? `${selectedSignal.forecastDemandScore}/100`
        : driverPlan
          ? `${driverPlan.corridor.predictedDemandScore}/100`
          : `${networkStats.ridesPosted}`,
      color: DS.blue,
    },
  ];

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Supply"
          title="Offer a Ride"
          titleAr="اعرض مشوار"
          sub="Route. Price. Go live."
          color={DS.blue}
        />

        {(!offerGate.allowed || (form.acceptsPackages && !packageGate.allowed)) && (
          <div
            style={{
              marginBottom: 18,
              background: C.goldDim,
              border: `1px solid ${DS.gold}35`,
              borderRadius: r(18),
              padding: '16px 18px',
              color: C.text,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Finish trust setup</div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>
              {(!offerGate.allowed ? offerGate.reason : packageGate.reason) ??
                'Finish account checks before going live.'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button
                onClick={() => nav('/app/trust')}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: '99px',
                  border: 'none',
                  background: DS.gradG,
                  color: C.text,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Finish checks
              </button>
              <button
                onClick={() => nav('/app/driver')}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: '99px',
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Driver console
              </button>
            </div>
          </div>
        )}

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.18fr 0.82fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div>
            {submitted ? (
              <div
                style={{
                  background: DS.card,
                  borderRadius: r(24),
                  padding: '56px 28px',
                  textAlign: 'center',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div style={{ fontSize: '4rem', marginBottom: 18 }}>OK</div>
                <h2
                  style={{
                    color: DS.green,
                    fontWeight: 900,
                    fontSize: '1.6rem',
                    margin: '0 0 12px',
                  }}
                >
                  Ride offer is live
                </h2>
                <p style={{ color: DS.sub, margin: 0 }}>
                  <strong style={{ color: C.text }}>{form.from}</strong> to{' '}
                  <strong style={{ color: C.text }}>{form.to}</strong> is now open across the
                  movement network.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 12,
                    marginTop: 22,
                  }}
                >
                  {[
                    {
                      label: 'Live routes',
                      value: corridorCount > 0 ? `${corridorCount + 1}` : '1',
                    },
                    {
                      label: 'Full trip',
                      value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
                    },
                    {
                      label: 'Mode',
                      value: form.acceptsPackages
                        ? `Packages ${form.packageCapacity}`
                        : 'Passengers',
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{
                        background: DS.card2,
                        borderRadius: r(16),
                        padding: '14px 15px',
                        border: `1px solid ${DS.border}`,
                      }}
                    >
                      <div
                        style={{
                          color: DS.muted,
                          fontSize: '0.68rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          color: C.text,
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          marginTop: 6,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setStep(1);
                    setForm(defaultForm);
                  }}
                  style={{
                    height: 46,
                    marginTop: 24,
                    padding: '0 20px',
                    borderRadius: '999px',
                    border: 'none',
                    background: DS.gradC,
                    color: C.text,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Post another route
                </button>
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
                liveSignal={selectedSignal}
                onUpdate={updateForm}
                onStepChange={moveToStep}
                onSubmit={handlePostRide}
              />
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${C.cyanDim}, ${C.cardSolid} 62%, ${C.goldDim})`,
                borderRadius: r(22),
                padding: '20px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div
                style={{
                  color: DS.cyan,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Launch route
              </div>
              <h2
                style={{
                  color: C.text,
                  fontWeight: 900,
                  fontSize: '1.5rem',
                  lineHeight: 1.1,
                  margin: '8px 0 10px',
                }}
              >
                {form.from} to {form.to}
              </h2>
              <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>
                {selectedSignal?.recommendedReason ??
                  driverPlan?.waselBrainNote ??
                  'Choose the route, keep the price sharp, and open supply fast.'}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {quickMetrics.map(item => (
                  <div
                    key={item.label}
                    style={{
                      background: C.elevated,
                      borderRadius: r(16),
                      border: `1px solid ${DS.border}`,
                      padding: '14px 14px 12px',
                    }}
                  >
                    <div style={{ color: item.color, fontWeight: 900, fontSize: '1rem' }}>
                      {item.value}
                    </div>
                    <div
                      style={{ color: C.text, fontWeight: 800, fontSize: '0.74rem', marginTop: 4 }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '18px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Brain size={18} color={DS.cyan} />
                <div style={{ color: C.text, fontWeight: 900 }}>Corridor pulse</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  selectedSignal
                    ? `${selectedSignal.activeDemandAlerts} alerts • ${selectedSignal.liveBookings} bookings`
                    : `${corridorCount} live route${corridorCount === 1 ? '' : 's'} on this lane`,
                  selectedSignal
                    ? `${selectedSignal.nextWaveWindow} • ${selectedSignal.recommendedPickupPoint}`
                    : (driverPlan?.corridor.autoGroupWindow ?? 'Best pickup window appears here'),
                  selectedSignal
                    ? selectedSignal.productionSources.slice(0, 3).join(' • ')
                    : driverPlan
                      ? `${driverPlan.emptySeatCostJod} JOD lost per empty seat`
                      : 'Route intelligence appears after lane selection',
                ].map(line => (
                  <div
                    key={line}
                    style={{
                      borderRadius: r(14),
                      border: `1px solid ${DS.border}`,
                      background: DS.card2,
                      padding: '12px 14px',
                      color: C.text,
                      fontSize: '0.78rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '18px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Network size={18} color={DS.green} />
                <div style={{ color: C.text, fontWeight: 900 }}>Add-on demand</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {marketplaceNodes.map(node => (
                  <div
                    key={node.id}
                    style={{
                      borderRadius: r(14),
                      border: `1px solid ${DS.border}`,
                      background: DS.card2,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ color: C.text, fontWeight: 700, fontSize: '0.8rem' }}>
                      {node.title}
                    </div>
                    <div
                      style={{
                        color: DS.muted,
                        fontSize: '0.74rem',
                        lineHeight: 1.5,
                        marginTop: 4,
                      }}
                    >
                      {node.summary}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '18px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ color: C.text, fontWeight: 900, marginBottom: 12 }}>Quick actions</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {driverReadiness.steps
                  .filter(step => !step.complete)
                  .slice(0, 2)
                  .map(step => (
                    <div
                      key={step.id}
                      style={{
                        borderRadius: r(14),
                        border: `1px solid ${DS.border}`,
                        background: DS.card2,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem' }}>
                        {step.label}
                      </div>
                      <div
                        style={{
                          color: DS.muted,
                          fontSize: '0.74rem',
                          lineHeight: 1.5,
                          marginTop: 4,
                        }}
                      >
                        {step.description}
                      </div>
                    </div>
                  ))}
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => nav('/app/driver')}
                  style={{
                    height: 42,
                    borderRadius: '999px',
                    border: 'none',
                    background: DS.gradC,
                    color: C.text,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Open driver console
                </button>
                <button
                  onClick={() => nav('/app/trust')}
                  style={{
                    height: 42,
                    borderRadius: '999px',
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    color: C.text,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Trust center
                </button>
              </div>
            </div>
          </div>
        </div>

        <OfferRideIncomingRequests
          incomingRequests={incomingRequests}
          onStatusMessage={setDraftMessage}
        />
      </PageShell>
    </Protected>
  );
}

export default OfferRidePage;
