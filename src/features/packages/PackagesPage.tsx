import { useEffect, useState } from 'react';
import { CheckCircle2, Search, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { MapWrapper } from '../../components/MapWrapper';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { CITIES } from '../../pages/waselCoreRideData';
import { CoreExperienceBanner, DS, midpoint, PageShell, pill, Protected, r, resolveCityCoord, SectionHead } from '../../pages/waselServiceShared';
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
import { createSupportTicket } from '../../services/supportInbox';
import { PackageReturnsPanel } from './components/PackageReturnsPanel';
import { PackageSendPanel } from './components/PackageSendPanel';
import { PackageTrackPanel } from './components/PackageTrackPanel';

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

  const matchingRideCount = getConnectedRides().filter((ride) => ride.acceptsPackages && ride.from === pkg.from && ride.to === pkg.to).length;
  const trackedStatusColor = trackedPackage?.status === 'delivered' ? DS.green : trackedPackage?.status === 'in_transit' ? DS.cyan : trackedPackage?.status === 'matched' ? DS.gold : DS.muted;

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

      notificationsAPI.createNotification({
        title: packageType === 'return' ? 'Return request started' : 'Package booking started',
        message: created.matchedRideId ? `Your package was matched to a live ${created.from} to ${created.to} ride.` : `Your package request is live and waiting for the next matching ride.`,
        type: 'booking',
        priority: 'high',
        action_url: '/app/packages',
      }).catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }

      notify({
        title: packageType === 'return' ? 'Return Started' : 'Package request created',
        body: created.matchedRideId ? `Matched to ${created.matchedDriver || 'a connected ride'}. Tracking ID: ${created.trackingId}` : `Tracking ID: ${created.trackingId}. We are searching for a ride now.`,
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
        <SectionHead emoji="PKG" title="Wasel Packages" titleAr="Package Logistics" sub="Send, track, and return through connected rides" color={DS.gold} action={{ label: 'Post a parcel-ready ride', onClick: () => nav('/app/offer-ride') }} />
        <CoreExperienceBanner title="Package sharing on the same live mobility network" detail="Packages are not treated like a separate product. Matching, tracking, and trust sit on top of the same corridor network used by riders and drivers." tone={DS.gold} />

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Connected rides', value: String(networkStats.ridesPosted), detail: 'Posted routes visible to packages', color: DS.cyan },
            { label: 'Package-ready', value: String(networkStats.packageEnabledRides), detail: 'Rides accepting parcels', color: DS.green },
            { label: 'Requests created', value: String(networkStats.packagesCreated), detail: 'Delivery and returns', color: DS.gold },
            { label: 'Matched packages', value: String(networkStats.matchedPackages), detail: 'Already assigned to a ride', color: DS.blue },
          ].map((item) => (
            <div key={item.label} style={{ background: DS.card, borderRadius: r(18), border: `1px solid ${DS.border}`, padding: '18px 18px 16px' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.2rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: r(16), padding: 6, border: `1px solid ${DS.border}`, marginBottom: 24, boxShadow: '0 10px 22px rgba(0,0,0,0.14)' }}>
          {([['send', 'Send Package'], ['track', 'Track Package'], ['raje3', 'Raje3 Returns']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, height: 44, borderRadius: r(12), border: 'none', cursor: 'pointer', fontFamily: DS.F, fontWeight: activeTab === key ? 800 : 600, fontSize: '0.82rem', letterSpacing: '-0.01em', background: activeTab === key ? DS.gradG : 'transparent', color: activeTab === key ? '#fff' : DS.muted, transition: 'all 0.18s' }}>{label}</button>
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
      </PageShell>
    </Protected>
  );
}

export default PackagesPage;
