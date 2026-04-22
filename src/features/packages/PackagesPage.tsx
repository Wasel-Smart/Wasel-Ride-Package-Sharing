import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Brain } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import {
  ClarityBand,
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';
import {
  createPackageComposer,
  parsePackagePrefillParams,
  validatePackageComposer,
} from '../../pages/waselCorePageHelpers';
import { useCorridorTruth } from '../../services/corridorTruth';
import {
  createConnectedPackage,
  getConnectedPackages,
  getConnectedStats,
  getPackageByTrackingId,
  updatePackageVerification,
  type PackageRequest,
} from '../../services/journeyLogistics';
import { notificationsAPI } from '../../services/notifications.js';
import { recordMovementActivity } from '../../services/movementMembership';
import { createSupportTicket } from '../../services/supportInbox';
import {
  getFeaturedCorridors,
} from '../../config/wasel-movement-network';
import { PackageReturnsPanel } from './components/PackageReturnsPanel';
import { PackageSendPanel } from './components/PackageSendPanel';
import { PackageTrackPanel } from './components/PackageTrackPanel';

export function PackagesPage() {
  const nav = useIframeSafeNavigate();
  const location = useLocation();
  const { user } = useLocalAuth();
  const { notify, requestPermission, permission } = usePushNotifications();
  const initialPackagePrefill = parsePackagePrefillParams(location.search);
  const [activeTab, setActiveTab] = useState<'send' | 'track' | 'raje3'>('send');
  const [pkg, setPkg] = useState(() =>
    createPackageComposer({
      from: initialPackagePrefill.initialFrom,
      to: initialPackagePrefill.initialTo,
    }),
  );
  const [trackId, setTrackId] = useState('');
  const [trackedPackage, setTrackedPackage] = useState<PackageRequest | null>(() => getConnectedPackages()[0] ?? null);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [recentPackages, setRecentPackages] = useState<PackageRequest[]>(() => getConnectedPackages().slice(0, 4));
  const [createError, setCreateError] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<'idle' | 'creating' | 'tracking'>('idle');

  const featuredCorridors = useMemo(() => getFeaturedCorridors(3), []);
  const corridorTruth = useCorridorTruth({ from: pkg.from, to: pkg.to });
  const { corridorPlan, packageReadyRideCount, selectedPriceQuote, selectedSignal } = corridorTruth;
  const matchingRideCount = packageReadyRideCount;
  const trackedStatusColor = trackedPackage?.status === 'delivered'
    ? DS.green
    : trackedPackage?.status === 'in_transit'
      ? DS.cyan
      : trackedPackage?.status === 'matched'
        ? DS.gold
        : DS.muted;

  const refreshPackageSnapshot = () => {
    setNetworkStats(getConnectedStats());
    setRecentPackages(getConnectedPackages().slice(0, 4));
  };

  useEffect(() => {
    refreshPackageSnapshot();
  }, [pkg.sent, activeTab]);

  useEffect(() => {
    const nextPrefill = parsePackagePrefillParams(location.search);
    setPkg(previous => ({
      ...previous,
      from: nextPrefill.initialFrom,
      to: nextPrefill.initialTo,
    }));
  }, [location.search]);

  const resetComposer = () => {
    setPkg(createPackageComposer({ from: pkg.from, to: pkg.to }));
    setCreateError(null);
  };

  const focusTrackingItem = (item: PackageRequest, activateTrack = false) => {
    if (activateTrack) setActiveTab('track');
    setTrackId(item.trackingId);
    setTrackedPackage(item);
    setTrackingMessage(`Tracking ready for ${item.trackingId}.`);
  };

  const handlePackageCreate = async (packageType: 'delivery' | 'return' = 'delivery') => {
    const validationError = validatePackageComposer(pkg);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    setBusyState('creating');
    setCreateError(null);

    try {
      const created = await createConnectedPackage({
        from: pkg.from,
        to: pkg.to,
        weight: pkg.weight,
        note: pkg.note,
        packageType,
        recipientName: pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
        senderName: user?.name,
        senderEmail: user?.email,
      });

      setPkg((previous) => ({ ...previous, sent: true, trackingId: created.trackingId }));
      setTrackedPackage(created);
      setTrackId(created.trackingId);
      setTrackingMessage(`Tracking is live for ${created.trackingId}.`);
      refreshPackageSnapshot();
      void recordMovementActivity('package_created', corridorPlan?.id ?? null);

      notificationsAPI.createNotification({
        title: packageType === 'return' ? 'Return request started' : 'Package booking started',
        message: created.matchedRideId ? `Your package was matched to a live ${created.from} to ${created.to} route.` : 'Your package request is live and waiting for the next matching route.',
        type: 'booking',
        priority: 'high',
        action_url: '/app/packages',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }

      notify({
        title: packageType === 'return' ? 'Return Started' : 'Package request created',
        body: created.matchedRideId ? `Matched to ${created.matchedDriver || 'a connected route'}. Tracking ID: ${created.trackingId}` : `Tracking ID: ${created.trackingId}. We are searching for the next corridor match now.`,
        tag: 'package-created',
      });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'We could not create the package request right now.');
    } finally {
      setBusyState('idle');
    }
  };

  const handleTrackingSearch = async () => {
    setBusyState('tracking');
    setTrackingMessage(null);

    try {
      const found = await getPackageByTrackingId(trackId);
      setTrackedPackage(found);
      setTrackingMessage(found ? `Tracking loaded for ${found.trackingId}.` : 'No package was found for that tracking ID yet.');
      refreshPackageSnapshot();
    } finally {
      setBusyState('idle');
    }
  };

  const handleVerificationAction = (action: 'share_code' | 'confirm_pickup' | 'confirm_delivery') => {
    if (!trackedPackage) return;
    const updated = updatePackageVerification(trackedPackage.trackingId, action);
    if (!updated) return;

    setTrackedPackage(updated);
    setTrackId(updated.trackingId);
    setTrackingMessage(
      action === 'share_code'
        ? `OTP handoff is now shared for ${updated.trackingId}.`
        : action === 'confirm_pickup'
          ? `Rider pickup confirmed for ${updated.trackingId}.`
          : `Delivery confirmed for ${updated.trackingId}.`,
    );
    refreshPackageSnapshot();
  };

  const handleOpenSupport = () => {
    if (!trackedPackage) return;

    const ticket = createSupportTicket({
      topic: 'package_issue',
      subject: `Package tracking help for ${trackedPackage.trackingId}`,
      detail: `Support requested for ${trackedPackage.from} to ${trackedPackage.to}. Current status: ${trackedPackage.status}.`,
      relatedId: trackedPackage.trackingId,
      routeLabel: `${trackedPackage.from} to ${trackedPackage.to}`,
    });

    setTrackingMessage(`Support ticket ${ticket.id} was opened for ${trackedPackage.trackingId}.`);
    notificationsAPI.createNotification({
      title: 'Package support opened',
      message: `Support is now following ${trackedPackage.trackingId}.`,
      type: 'support',
      priority: 'high',
      action_url: '/app/profile',
    }).catch(() => {});
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="📦"
          title="Packages"
          titleAr="شبكة البضائع"
          sub="Send and track on one route network."
          color={DS.gold}
          action={{ label: 'Offer route', onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="One package flow."
          detail="Create, track, and handle returns in one place."
          tone={DS.gold}
        />

        <ClarityBand
          title="Keep packages in one rhythm."
          detail="Use this page to send, track, and handle returns without jumping into separate flows."
          tone={DS.gold}
          items={[
            { label: '1. Send', value: 'Create the package and attach it to a live route.' },
            { label: '2. Track', value: 'Keep the current status, proof, and route visible.' },
            { label: '3. Return', value: 'Start Raje3 from the same package network.' },
          ]}
        />

        <div className="sp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Ready routes', value: String(networkStats.packageEnabledRides), detail: 'Accepting packages', color: DS.green },
            { label: 'Attach rate', value: corridorPlan ? `${corridorPlan.attachRatePercent}%` : '--', detail: 'Chance of a fast match', color: DS.gold },
            { label: 'Shared price', value: corridorPlan ? `${corridorPlan.sharedPriceJod} JOD` : '--', detail: 'Current reference price', color: DS.cyan },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.45 }}>{item.detail}</div>
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
                <div style={{ color: DS.text, fontWeight: 800 }}>Package route brief</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  Key route details.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                corridorPlan
                  ? `${corridorPlan.label} saves ${corridorPlan.savingsPercent}%.`
                  : 'Choose a route to see package pricing.',
                corridorPlan
                  ? `Pickup: ${corridorPlan.pickupPoints[0] ?? 'Trusted node'}.`
                  : 'Pickup points appear here.',
              ].map((line) => (
                <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: DS.text, fontSize: '0.82rem', lineHeight: 1.65 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
              <div style={{ color: DS.text, fontWeight: 800, marginBottom: 12 }}>Top corridors</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {featuredCorridors.map((corridor) => (
                <button
                  key={corridor.id}
                  type="button"
                  onClick={() => setPkg((previous) => ({ ...previous, from: corridor.from, to: corridor.to }))}
                  style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: DS.text, fontWeight: 800, fontSize: '0.84rem' }}>{corridor.label}</div>
                    <span style={{ color: DS.cyan, fontSize: '0.72rem', fontWeight: 700 }}>{corridor.predictedDemandScore}/100</span>
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.55, marginTop: 8 }}>
                    {corridor.routeMoat}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: 6, border: `1px solid ${DS.border}`, marginBottom: 24, boxShadow: '0 10px 22px rgba(0,0,0,0.14)' }}>
          {([['send', 'Send'], ['track', 'Track'], ['raje3', 'Returns']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, height: 44, borderRadius: r(12), border: 'none', cursor: 'pointer', fontFamily: DS.F, fontWeight: activeTab === key ? 800 : 600, fontSize: '0.82rem', letterSpacing: '-0.01em', background: activeTab === key ? DS.gradG : 'transparent', color: activeTab === key ? '#fff' : DS.muted, transition: 'all 0.18s' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(22), padding: '28px 28px', border: `1px solid ${DS.border}`, boxShadow: '0 16px 38px rgba(0,0,0,0.18)' }}>
          {activeTab === 'send' && (
            <PackageSendPanel
              pkg={pkg}
              setPkg={setPkg}
              trackedPackage={trackedPackage}
              createError={createError}
              busyState={busyState}
              matchingRideCount={matchingRideCount}
              corridorPlan={corridorPlan}
              selectedSignal={selectedSignal}
              selectedPriceQuote={selectedPriceQuote}
              recentPackages={recentPackages}
              onCreate={() => handlePackageCreate('delivery')}
              onReset={resetComposer}
              onOpenTracking={() => setActiveTab('track')}
              onOpenRecent={(item) => focusTrackingItem(item, true)}
            />
          )}

          {activeTab === 'track' && (
            <PackageTrackPanel
              trackId={trackId}
              setTrackId={setTrackId}
              trackedPackage={trackedPackage}
              trackingMessage={trackingMessage}
              busyState={busyState}
              trackedStatusColor={trackedStatusColor}
              recentPackages={recentPackages}
              onSearch={handleTrackingSearch}
              onVerificationAction={handleVerificationAction}
              onOpenSupport={handleOpenSupport}
              onOpenRecent={(item) => focusTrackingItem(item)}
            />
          )}

          {activeTab === 'raje3' && (
            <PackageReturnsPanel
              createError={createError}
              busyState={busyState}
              onCreateReturn={() => handlePackageCreate('return')}
            />
          )}
        </div>

      </PageShell>
    </Protected>
  );
}

export default PackagesPage;
