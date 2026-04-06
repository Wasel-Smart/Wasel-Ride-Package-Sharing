import { useEffect, useMemo, useState } from 'react';
import { Brain } from 'lucide-react';
import { StakeholderSignalBanner } from '../../components/system/StakeholderSignalBanner';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { CoreExperienceBanner, DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import { createPackageComposer, validatePackageComposer } from '../../pages/waselCorePageHelpers';
import {
  createConnectedPackage,
  getConnectedPackages,
  getConnectedRides,
  getConnectedStats,
  getPackageByTrackingId,
  updatePackageVerification,
  type PackageRequest,
} from '../../services/journeyLogistics';
import { notificationsAPI } from '../../services/notifications.js';
import { recordMovementActivity } from '../../services/movementMembership';
import { createSupportTicket } from '../../services/supportInbox';
import {
  getCorridorOpportunity,
  getFeaturedCorridors,
  getWaselCategoryPosition,
} from '../../config/wasel-movement-network';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { PackageReturnsPanel } from './components/PackageReturnsPanel';
import { PackageSendPanel } from './components/PackageSendPanel';
import { PackageTrackPanel } from './components/PackageTrackPanel';
import { routeMatchesLocationPair } from '../../utils/jordanLocations';

export function PackagesPage() {
  const nav = useIframeSafeNavigate();
  const { notify, requestPermission, permission } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<'send' | 'track' | 'raje3'>('send');
  const [pkg, setPkg] = useState(() => createPackageComposer());
  const [trackId, setTrackId] = useState('');
  const [trackedPackage, setTrackedPackage] = useState<PackageRequest | null>(() => getConnectedPackages()[0] ?? null);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [recentPackages, setRecentPackages] = useState<PackageRequest[]>(() => getConnectedPackages().slice(0, 4));
  const [createError, setCreateError] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<'idle' | 'creating' | 'tracking'>('idle');

  const category = useMemo(() => getWaselCategoryPosition(), []);
  const featuredCorridors = useMemo(() => getFeaturedCorridors(3), []);
  const corridorPlan = useMemo(
    () => getCorridorOpportunity(pkg.from, pkg.to),
    [pkg.from, pkg.to],
  );

  const matchingRideCount = getConnectedRides().filter((ride) => ride.acceptsPackages && routeMatchesLocationPair(ride.from, ride.to, pkg.from, pkg.to, { allowReverse: false })).length;
  const trackedStatusColor = trackedPackage?.status === 'delivered'
    ? DS.green
    : trackedPackage?.status === 'in_transit'
      ? DS.cyan
      : trackedPackage?.status === 'matched'
        ? DS.gold
        : DS.muted;
  const hasAttachRate = typeof corridorPlan?.attachRatePercent === 'number';

  const refreshPackageSnapshot = () => {
    setNetworkStats(getConnectedStats());
    setRecentPackages(getConnectedPackages().slice(0, 4));
  };

  useEffect(() => {
    refreshPackageSnapshot();
  }, [pkg.sent, activeTab]);

  const resetComposer = () => {
    setPkg(createPackageComposer());
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
          sub="Send, track, and manage packages without leaving the same live route network."
          color={DS.gold}
          action={{ label: 'Offer route', onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="Send fast, track clearly, and keep every handoff visible."
          detail={`${category.infrastructureLabel} The best package experience comes from staying close to the ride network, not building a second workflow around it.`}
          tone={DS.gold}
        />

        {Boolean((globalThis as { __showStakeholderBanner?: boolean }).__showStakeholderBanner) && <div style={{ marginBottom: 18 }}>
          <StakeholderSignalBanner
            eyebrow="Wasel · package comms"
            title="Senders, riders, support, and route supply now read from one package story"
            detail="Packages are now framed as a shared corridor workflow so the sender, carrier, and support team can all see the same movement, handoff, and escalation context."
            stakeholders={[
              { label: 'Tracked packages', value: String(networkStats.packagesCreated), tone: 'teal' },
              { label: 'Matched now', value: String(networkStats.matchedPackages), tone: 'green' },
              { label: 'Package-ready routes', value: String(networkStats.packageEnabledRides), tone: 'blue' },
              { label: 'Live rider lanes', value: String(matchingRideCount), tone: 'amber' },
            ]}
            statuses={[
              { label: 'Current tab', value: activeTab === 'send' ? 'Send' : activeTab === 'track' ? 'Track' : 'Returns', tone: 'teal' },
              { label: 'Tracking focus', value: trackedPackage?.trackingId ?? 'Waiting', tone: trackedPackage ? 'green' : 'slate' },
              { label: 'Corridor attach rate', value: hasAttachRate ? `${corridorPlan.attachRatePercent}%` : 'Pending', tone: hasAttachRate ? 'amber' : 'slate' },
            ]}
            lanes={[
              { label: 'Sender lane', detail: 'Creation, tracking, and return flows stay connected to one corridor record.' },
              { label: 'Carrier lane', detail: 'Package-ready drivers and route density are surfaced before the sender commits.' },
              { label: 'Support lane', detail: 'Tracking and support tickets now reference the same package identifiers and movement state.' },
            ]}
          />
        </div>}

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Package-ready routes', value: String(networkStats.packageEnabledRides), detail: 'Live route posts currently accepting packages', color: DS.green },
            { label: 'Corridor attach rate', value: corridorPlan ? `${corridorPlan.attachRatePercent}%` : '--', detail: 'Probability that goods can piggyback on route density', color: DS.gold },
            { label: 'Shared delivery price', value: corridorPlan ? `${corridorPlan.sharedPriceJod} JOD` : '--', detail: 'Reference price for low-friction route matching', color: DS.cyan },
            { label: 'Matched packages', value: String(networkStats.matchedPackages), detail: 'Requests already connected to a live ride', color: DS.blue },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
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
                <div style={{ color: '#fff', fontWeight: 800 }}>Package route brief</div>
                <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 2 }}>
                  Read the lane before the sender commits.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                corridorPlan
                  ? `${corridorPlan.label} is ${corridorPlan.savingsPercent}% cheaper than solo movement when packages attach to shared route density.`
                  : 'Choose a route to see its predicted package economics.',
                corridorPlan
                  ? `Best pickup point: ${corridorPlan.pickupPoints[0] ?? 'Trusted corridor node'}. ${corridorPlan.autoGroupWindow}`
                  : 'Wasel recommends trusted pickup points to reduce handoff friction.',
                corridorPlan
                  ? `Business demand already attached here: ${corridorPlan.businessDemand.join(', ')}.`
                  : 'Returns, documents, and same-day service demand can reinforce weaker package corridors.',
              ].map((line) => (
                <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: '#fff', fontSize: '0.82rem', lineHeight: 1.65 }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: DS.card, borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}` }}>
            <div style={{ color: '#fff', fontWeight: 800, marginBottom: 12 }}>Strong package corridors</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {featuredCorridors.map((corridor) => (
                <button
                  key={corridor.id}
                  type="button"
                  onClick={() => setPkg((previous) => ({ ...previous, from: corridor.from, to: corridor.to }))}
                  style={{ textAlign: 'left', borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{corridor.label}</div>
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
          {([['send', 'Send Package'], ['track', 'Track Package'], ['raje3', 'Raje3 Returns']] as const).map(([key, label]) => (
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

        <ServiceFlowPlaybook
          focusService={
            activeTab === 'track'
              ? 'deliver-package'
              : activeTab === 'raje3'
                ? 'returns'
                : 'send-package'
          }
        />
      </PageShell>
    </Protected>
  );
}

export default PackagesPage;
