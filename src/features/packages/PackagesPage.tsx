import { useEffect, useMemo, useState } from 'react';
import { Boxes } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import {
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';
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
import { walletApi } from '../../services/wallet/walletApi';
import { calculateDirectPrice } from '../../shared/pricing/priceCalculator';
import { getCorridorOpportunity } from '../../config/wasel-movement-network';
import { SH  } from '../../utils/wasel-ds';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { PackageReturnsPanel } from './components/PackageReturnsPanel';
import { PackageSendPanel } from './components/PackageSendPanel';
import { PackageTrackPanel } from './components/PackageTrackPanel';
import { tx } from '../../locales/tx';

function packageStatusMessage(
  action: 'share_code' | 'confirm_pickup' | 'confirm_delivery',
  trackingId: string,
  ar: boolean,
): string {
  if (action === 'share_code') {
    return ar ? `تمت مشاركة الرمز لـ ${trackingId}.` : `Code shared for ${trackingId}.`;
  }
  if (action === 'confirm_pickup') {
    return ar ? `تم تأكيد الاستلام لـ ${trackingId}.` : `Pickup confirmed for ${trackingId}.`;
  }
  return ar ? `تم التسليم: ${trackingId}.` : `Delivered: ${trackingId}.`;
}

export function PackagesPage() {
  const nav = useIframeSafeNavigate();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { user } = useLocalAuth();
  const { notify, requestPermission, permission } = usePushNotifications();
  const [activeTab, setActiveTab] = useState<'send' | 'track' | 'raje3'>('send');
  const [pkg, setPkg] = useState(() => createPackageComposer());
  const [trackId, setTrackId] = useState('');
  const [trackedPackage, setTrackedPackage] = useState<PackageRequest | null>(
    () => getConnectedPackages()[0] ?? null,
  );
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [recentPackages, setRecentPackages] = useState<PackageRequest[]>(() =>
    getConnectedPackages().slice(0, 4),
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<'idle' | 'creating' | 'tracking'>('idle');
  const [returnTrackingId, setReturnTrackingId] = useState<string | null>(null);

  const corridorPlan = useMemo(() => getCorridorOpportunity(pkg.from, pkg.to), [pkg.from, pkg.to]);

  const matchingRideCount = getConnectedRides().filter(
    ride => ride.acceptsPackages && ride.from === pkg.from && ride.to === pkg.to,
  ).length;

  const trackedStatusColor =
    trackedPackage?.status === 'delivered'
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

  const resetComposer = () => {
    setPkg(createPackageComposer());
    setCreateError(null);
  };

  const focusTrackingItem = (item: PackageRequest, activateTrack = false) => {
    if (activateTrack) { setActiveTab('track'); }
    setTrackId(item.trackingId);
    setTrackedPackage(item);
    setTrackingMessage(ar ? `التتبع جاهز: ${item.trackingId}.` : `Tracking ready: ${item.trackingId}.`);
  };

  const handlePackageCreate = async (packageType: 'delivery' | 'return' = 'delivery') => {
    const validationError = validatePackageComposer(pkg);
    if (validationError) { setCreateError(validationError); return; }

    setBusyState('creating');
    setCreateError(null);

    try {
      const weightKg = parseFloat(pkg.weight.match(/\d+(?:\.\d+)?/)?.[0] || '0.5');
      const priceResult = calculateDirectPrice('package', weightKg, 8);

      const created = await createConnectedPackage({
        from: pkg.from,
        to: pkg.to,
        weight: pkg.weight,
        note: pkg.note,
        packageType,
        recipientName: pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
      });

      setPkg(previous => ({
        ...previous,
        sent: packageType === 'delivery' ? true : previous.sent,
        trackingId: packageType === 'delivery' ? created.trackingId : previous.trackingId,
      }));
      if (packageType === 'return') { setReturnTrackingId(created.trackingId); }
      setTrackedPackage(created);
      setTrackId(created.trackingId);
      setTrackingMessage(ar ? `التتبع مباشر: ${created.trackingId}.` : `Tracking live: ${created.trackingId}.`);
      refreshPackageSnapshot();
      void recordMovementActivity('package_created', corridorPlan?.id ?? null);

      if (user?.id) {
        try {
          await walletApi.pay(user.id, priceResult.price, 'package_delivery', {
            referenceId: created.id,
            metadata: { trackingId: created.trackingId, from: created.from, to: created.to, weight: pkg.weight },
          });
        } catch (paymentError) {
          console.error('[Wallet] package payment failed:', paymentError);
          setTrackingMessage(
            ar
              ? `تم إنشاء طلب الطرد لكن الدفع لم يكتمل. لا تسلّم الطرد قبل تأكيد الدفع.`
              : `Package request created, but payment did not complete. Do not hand over the package until payment is confirmed.`,
          );
        }
      }

      notificationsAPI.createNotification({
        title: packageType === 'return'
          ? ar ? 'تم بدء طلب الإرجاع' : 'Return request started'
          : ar ? 'تم بدء حجز الطرد' : 'Package booking started',
        message: created.matchedRideId
          ? ar ? `تمت مطابقة طردك مع مسار مباشر.` : `Your package was matched to a live route.`
          : ar ? 'طلب الطرد مباشر وينتظر أقرب مسار مطابق.' : 'Your package request is live and waiting for the next matching route.',
        type: 'booking',
        priority: 'high',
        action_url: '/app/packages',
      }).catch(() => {});

      if (permission === 'default') { requestPermission().catch(() => {}); }

      notify({
        title: packageType === 'return'
          ? ar ? 'بدأ الإرجاع' : 'Return Started'
          : ar ? 'تم إنشاء طلب الطرد' : 'Package request created',
        body: created.matchedRideId
          ? ar ? `تمت المطابقة. رقم التتبع: ${created.trackingId}` : `Matched. Tracking ID: ${created.trackingId}`
          : ar ? `رقم التتبع: ${created.trackingId}.` : `Tracking ID: ${created.trackingId}.`,
        tag: 'package-created',
      });
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : ar ? 'لم نتمكن من إنشاء طلب الطرد الآن.' : 'We could not create the package request right now.',
      );
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
      setTrackingMessage(
        found
          ? ar ? `تم تحميل التتبع: ${found.trackingId}.` : `Tracking loaded: ${found.trackingId}.`
          : ar ? 'لم يتم العثور على طرد.' : 'No package found.',
      );
      refreshPackageSnapshot();
    } finally {
      setBusyState('idle');
    }
  };

  const handleVerificationAction = async (
    action: 'share_code' | 'confirm_pickup' | 'confirm_delivery',
  ) => {
    if (!trackedPackage) { return; }
    setBusyState('tracking');
    try {
      const updated = await updatePackageVerification(trackedPackage.trackingId, action);
      if (!updated) { return; }
      setTrackedPackage(updated);
      setTrackId(updated.trackingId);
      setTrackingMessage(packageStatusMessage(action, updated.trackingId, ar));
      refreshPackageSnapshot();
    } catch (error) {
      setTrackingMessage(
        error instanceof Error
          ? error.message
          : ar ? 'تأكيد الطرد غير متاح الآن.' : 'Package verification is unavailable right now.',
      );
    } finally {
      setBusyState('idle');
    }
  };

  const handleOpenSupport = () => {
    if (!trackedPackage) { return; }
    void (async () => {
      const ticket = await createSupportTicket(user?.id, {
        topic: 'package_issue',
        subject: `Package tracking help for ${trackedPackage.trackingId}`,
        detail: `Support requested for ${trackedPackage.from} to ${trackedPackage.to}. Current status: ${trackedPackage.status}.`,
        relatedId: trackedPackage.trackingId,
        routeLabel: `${trackedPackage.from} to ${trackedPackage.to}`,
      });
      setTrackingMessage(ar ? `تم فتح الدعم: ${ticket.id}.` : `Support opened: ${ticket.id}.`);
      notificationsAPI.createNotification({
        title: ar ? 'تم فتح دعم الطرد' : 'Package support opened',
        message: ar ? `الدعم يتابع الآن ${trackedPackage.trackingId}.` : `Support is now following ${trackedPackage.trackingId}.`,
        type: 'support',
        priority: 'high',
        action_url: '/app/profile',
      }).catch(() => {});
    })();
  };

  const tabs = [
    { key: 'send' as const, en: 'Send', ar: 'أرسل' },
    { key: 'track' as const, en: 'Track', ar: 'تتبع' },
    { key: 'raje3' as const, en: 'Returns', ar: 'إرجاع' },
  ];

  const stats = [
    {
      value: String(networkStats.packageEnabledRides),
      label: ar ? 'مسارات جاهزة' : 'Ready routes',
      color: DS.green,
    },
    {
      value: corridorPlan ? `${corridorPlan.attachRatePercent}%` : null,
      label: ar ? 'نسبة المطابقة' : 'Match rate',
      color: DS.gold,
    },
    {
      value: corridorPlan ? `${corridorPlan.sharedPriceJod} ${ar ? 'د.أ' : 'JOD'}` : null,
      label: ar ? 'السعر المشترك' : 'Shared price',
      color: DS.cyan,
    },
    {
      value: String(networkStats.matchedPackages),
      label: ar ? 'مطابقة' : 'Matched',
      color: DS.blue,
    },
  ];

  return (
    <Protected>
      <PageShell>
        <style>{`
          .pkg-field:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(0,229,255,0.28); }
          .pkg-btn:focus-visible   { outline: none; box-shadow: 0 0 0 3px rgba(0,229,255,0.28); }
          .pkg-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .pkg-send-layout { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }
          .pkg-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .pkg-form-grid input, .pkg-form-grid select { box-sizing: border-box; max-width: 100%; }
          .pkg-send-layout > * { min-width: 0; }
          .pkg-steps-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .pkg-panel-shell { padding: 28px 24px; }
          @media (max-width: 899px) {
            .pkg-send-layout { grid-template-columns: minmax(0, 1fr) !important; }
            .pkg-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .pkg-panel-shell { padding: 22px 18px !important; }
          }
          @media (max-width: 640px) {
            .pkg-form-grid { grid-template-columns: minmax(0, 1fr) !important; }
            .pkg-steps-grid { grid-template-columns: minmax(0, 1fr) !important; }
            .pkg-track-search { flex-direction: column; }
            .pkg-track-search > button { min-height: 46px; }
            .pkg-track-three-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .pkg-track-actions { display: grid !important; grid-template-columns: minmax(0, 1fr); }
            .pkg-track-actions > button { width: 100%; }
          }
          @media (max-width: 420px) {
            .pkg-track-three-grid { grid-template-columns: minmax(0, 1fr) !important; }
          }
          @media (max-width: 480px) {
            .pkg-panel-shell { padding: 18px 14px !important; }
          }
          @keyframes pkg-pulse {
            0%,100% { opacity: 1; } 50% { opacity: 0.35; }
          }
          .pkg-stat-dash { animation: pkg-pulse 1.6s ease-in-out infinite; }
        `}</style>
        <SectionHead
          emoji={<Boxes size={24} />}
          title={tx('packagesPage.send_a_package')}
          titleAr="أرسل طرداً"
          sub={tx('packagesPage.match_parcels_to_live_routes_returns_and_tracked_handoffs')}
          color={DS.gold}
          action={{ label: tx('dashboard.offerRide'), onClick: () => nav('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title={tx('packagesPage.package_flow_is_tied_to_the_same_live_corridor_graph')}
          tone={DS.gold}
        />

        {/* Stats strip */}
        <div
          className="pkg-stats-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}
        >
          {stats.map(s => (
            <div
              key={s.label}
              style={{
                background: 'var(--card)',
                borderRadius: r(16),
                border: `1px solid ${'var(--border)'}`,
                padding: '16px 18px',
                boxShadow: SH.sm,
              }}
            >
              <div style={{ color: s.color, fontWeight: 900, fontSize: '1.25rem', marginBottom: 4 }}>
                {s.value ?? <span className="pkg-stat-dash" style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>—</span>}
              </div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: '0.78rem', fontWeight: 600 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div
          className="pkg-tab-list"
          style={{
            display: 'flex',
            gap: 6,
            background: 'var(--muted)',
            borderRadius: r(16),
            padding: 5,
            border: `1px solid ${'var(--border)'}`,
            marginBottom: 20,
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { void setActiveTab(tab.key); }}
              className="pkg-btn"
              style={{
                flex: 1,
                height: 42,
                borderRadius: r(12),
                border: 'none',
                cursor: 'pointer',
                fontFamily: DS.F,
                fontWeight: activeTab === tab.key ? 800 : 600,
                fontSize: '0.85rem',
                background: activeTab === tab.key ? DS.gradG : 'transparent',
                color: activeTab === tab.key ? 'var(--foreground)' : 'var(--muted-foreground)',
                transition: 'all 0.18s',
                position: 'relative',
              }}
            >
              {ar ? tab.ar : tab.en}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div
          className="pkg-panel-shell"
          style={{
            background: 'var(--card)',
            borderRadius: r(22),
            padding: '28px 24px',
            border: `1px solid ${'var(--border)'}`,
            boxShadow: SH.card,
            marginBottom: 24,
          }}
        >
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
              onOpenRecent={item => focusTrackingItem(item, true)}
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
              onOpenRecent={item => focusTrackingItem(item)}
            />
          )}
          {activeTab === 'raje3' && (
            <PackageReturnsPanel
              pkg={pkg}
              setPkg={setPkg}
              trackingId={returnTrackingId}
              createError={createError}
              busyState={busyState}
              onCreateReturn={() => handlePackageCreate('return')}
              onReset={() => { setReturnTrackingId(null); setCreateError(null); }}
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

