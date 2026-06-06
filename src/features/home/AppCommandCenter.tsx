import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock3, Shield, Sparkles, Wallet } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getStoredBusBookings } from '../../services/bus';
import { getConnectedPackages } from '../../services/journeyLogistics';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import { getRideBookings } from '../../services/rideLifecycle';
import { getSupportTickets, type SupportTicket } from '../../services/supportInbox';
import { buildFallbackTrustCenterStatus, type TrustStepId } from '../../services/trustCenterModel';
import { C as DS, F, SH, TYPE } from '../../utils/wasel-ds';

const C = {
  bg: DS.bg,
  border: DS.border,
  borderSoft: DS.borderFaint,
  text: DS.text,
  muted: DS.textSub,
  soft: DS.textMuted,
  cyan: DS.cyan,
  gold: DS.gold,
  green: DS.green,
  red: DS.error,
  card: DS.card,
  elevated: DS.elevated,
  textFull: DS.text,
} as const;

type ActionCard = {
  accent: string;
  title: string;
  detail: string;
  cta: string;
  path: string;
};

function corridorPath(from?: string, to?: string) {
  if (!from || !to) return '/app/find-ride';
  return `/app/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`;
}

function formatJod(value: number) {
  return `JOD ${value.toFixed(2)}`;
}

function nextStepLabel(stepId: TrustStepId | null, ar: boolean) {
  switch (stepId) {
    case 'identity':
      return ar ? 'الهوية' : 'Identity';
    case 'email':
      return ar ? 'البريد الإلكتروني' : 'Email';
    case 'phone':
      return ar ? 'الهاتف' : 'Phone';
    case 'driver_documents':
      return ar ? 'وثائق السائق' : 'Driver documents';
    case 'wallet_standing':
      return ar ? 'سلامة المحفظة' : 'Wallet standing';
    default:
      return ar ? 'جاهز' : 'Ready';
  }
}

function metricCard(
  label: string,
  value: string,
  detail: string,
  accent: string,
  Icon: typeof Clock3,
) {
  return { label, value, detail, accent, Icon };
}

export function AppCommandCenter() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const ar = language === 'ar';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => setRefreshKey(value => value + 1);
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSupport() {
      const tickets = await getSupportTickets(user?.id);
      if (!cancelled) setSupportTickets(tickets);
    }

    void loadSupport();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, user?.id]);

  const membership = useMemo(() => getMovementMembershipSnapshot(), [refreshKey]);
  const rides = useMemo(() => getRideBookings(), [refreshKey]);
  const packages = useMemo(() => getConnectedPackages(), [refreshKey]);
  const buses = useMemo(() => getStoredBusBookings(), [refreshKey]);
  const trustStatus = useMemo(() => (user ? buildFallbackTrustCenterStatus(user) : null), [user]);

  if (!user) return null;

  const supportOpen = supportTickets.filter(
    ticket => ticket.status !== 'resolved' && ticket.status !== 'closed',
  );
  const rideAttention = rides.filter(
    booking =>
      booking.status === 'pending_driver' ||
      booking.paymentStatus === 'failed' ||
      booking.paymentStatus === 'refunded' ||
      booking.supportThreadOpen,
  );
  const rideActive = rides.filter(
    booking =>
      booking.status !== 'completed' &&
      booking.status !== 'cancelled' &&
      booking.status !== 'rejected',
  );
  const packageAttention = packages.filter(pkg => pkg.status === 'searching');
  const packageActive = packages.filter(pkg => pkg.status !== 'delivered');
  const busActive = buses.filter(booking => booking.status === 'confirmed');

  const totalAttention = rideAttention.length + packageAttention.length + supportOpen.length;
  const totalActive = rideActive.length + packageActive.length + busActive.length;
  const trustRemaining = trustStatus ? trustStatus.totalSteps - trustStatus.completedSteps : 0;
  const trustNeedsAction = Boolean(
    trustStatus && (trustStatus.blockedSteps.length > 0 || trustStatus.nextStepId),
  );
  const dailyCorridor = membership.dailyRoute;
  const walletHealth =
    user.walletStatus === 'active'
      ? { label: ar ? 'نشطة' : 'Active', accent: C.green }
      : user.walletStatus === 'limited'
        ? { label: ar ? 'محدودة' : 'Limited', accent: C.gold }
        : { label: ar ? 'تحتاج مراجعة' : 'Needs review', accent: C.red };

  let nextAction: ActionCard;
  if (trustNeedsAction) {
    nextAction = {
      accent: trustStatus?.blockedSteps.length ? C.red : C.gold,
      title: ar ? 'أكمل جاهزية الثقة أولاً' : 'Complete trust readiness first',
      detail: trustStatus?.blockedSteps.length
        ? ar
          ? 'هناك خطوة محظورة تؤثر على السائق أو المحفظة أو العمليات الحساسة.'
          : 'A blocked trust step is affecting driver, wallet, or sensitive operations.'
        : ar
          ? `تبقى ${trustRemaining} خطوات قبل فتح كل قدرات الحساب بوضوح.`
          : `${trustRemaining} checks remain before the account is fully unlocked.`,
      cta: ar ? 'افتح مركز الثقة' : 'Open trust center',
      path: '/app/trust',
    };
  } else if (totalAttention > 0) {
    nextAction = {
      accent: C.gold,
      title: ar ? 'هناك عناصر تحتاج متابعة' : 'There are items that need attention',
      detail: ar
        ? `${totalAttention} عناصر تحتاج قراراً أو دعماً أو مطابقة أفضل.`
        : `${totalAttention} items currently need a decision, support, or a better match.`,
      cta: ar ? 'راجع العناصر المعلقة' : 'Review pending items',
      path: '/app/my-trips?filter=attention',
    };
  } else if (totalActive > 0) {
    nextAction = {
      accent: C.cyan,
      title: ar ? 'حركتك الحالية ما زالت جارية' : 'Your current movement is still live',
      detail: ar
        ? `${totalActive} عناصر نشطة بين الرحلات والطرود والباص.`
        : `${totalActive} active items are moving across rides, parcels, and buses.`,
      cta: ar ? 'افتح الرحلات' : 'Open my trips',
      path: '/app/my-trips',
    };
  } else {
    nextAction = {
      accent: C.green,
      title: ar ? 'أعد فتح الممر الأقرب لك' : 'Reopen your most likely corridor',
      detail: dailyCorridor
        ? ar
          ? `${dailyCorridor.label} يبقى أفضل نقطة بداية سريعة الآن.`
          : `${dailyCorridor.label} remains the fastest corridor to reopen right now.`
        : ar
          ? 'ابدأ من مسار حي ثم قرر بين الركوب أو العرض أو الطرود أو الباص.'
          : 'Start from a live corridor, then choose rides, supply, parcels, or bus.',
      cta: ar ? 'ابحث في هذا الممر' : 'Search this corridor',
      path: corridorPath(dailyCorridor?.from, dailyCorridor?.to),
    };
  }

  const metrics = [
    metricCard(
      ar ? 'حركة نشطة' : 'Active movement',
      `${totalActive}`,
      ar ? 'رحلات وطرود وباصات جارية الآن.' : 'Trips, parcels, and buses currently in motion.',
      C.cyan,
      Clock3,
    ),
    metricCard(
      ar ? 'تحتاج متابعة' : 'Needs attention',
      `${totalAttention}`,
      ar
        ? 'عناصر تنتظر موافقة أو دعماً أو حلاً.'
        : 'Items waiting on approval, support, or resolution.',
      totalAttention > 0 ? C.gold : C.green,
      AlertTriangle,
    ),
    metricCard(
      ar ? 'رصيد المحفظة' : 'Wallet balance',
      formatJod(user.balance ?? 0),
      ar ? `حالة المحفظة: ${walletHealth.label}` : `Wallet status: ${walletHealth.label}`,
      walletHealth.accent,
      Wallet,
    ),
    metricCard(
      ar ? 'درجة الثقة' : 'Trust readiness',
      trustStatus ? `${trustStatus.completedSteps}/${trustStatus.totalSteps}` : '0/5',
      trustStatus?.nextStepId
        ? ar
          ? `الخطوة التالية: ${nextStepLabel(trustStatus.nextStepId, ar)}`
          : `Next step: ${nextStepLabel(trustStatus.nextStepId, ar)}`
        : ar
          ? 'كل الخطوات الأساسية محسومة.'
          : 'All core trust checks are resolved.',
      trustNeedsAction ? nextAction.accent : C.green,
      Shield,
    ),
  ];

  const guidedFlows = [
    {
      label: ar ? 'ابحث عن رحلة' : 'Book',
      detail: ar ? 'ابدأ من المسار' : 'Route, seats, fare',
      accent: C.cyan,
    },
    {
      label: ar ? 'اعرض رحلة' : 'Request',
      detail: ar ? 'أرسل السياق' : 'Approver context',
      accent: C.green,
    },
    {
      label: ar ? 'افتح الرحلات' : 'Approve',
      detail: ar ? 'راجع المعلق' : 'Pending decisions',
      accent: C.gold,
    },
    {
      label: ar ? 'افتح المحفظة' : 'Manage',
      detail: ar ? 'تتبع الحركة' : 'Trips and supply',
      accent: C.cyan,
    },
  ];

  return (
    <section
      style={{
        maxWidth: 1240,
        margin: '0 auto 28px',
        display: 'grid',
        gap: 18,
      }}
    >
      <div
        style={{
          borderRadius: 30,
          border: `1px solid ${nextAction.accent}22`,
          background: `radial-gradient(circle at top left, ${nextAction.accent}18, transparent 32%), ${C.card}`,
          boxShadow: SH.navy,
          padding: '24px 24px 20px',
          display: 'grid',
          gap: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 999,
                background: `${nextAction.accent}14`,
                border: `1px solid ${nextAction.accent}26`,
                color: nextAction.accent,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                textTransform: 'uppercase',
                letterSpacing: TYPE.letterSpacing.wider,
              }}
            >
              <Sparkles size={14} />
              {ar ? 'مركز قيادة واصل' : 'Wasel Command Deck'}
            </div>
            <h2
              style={{
                margin: '14px 0 8px',
                color: C.textFull,
                fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
                lineHeight: TYPE.lineHeight.tight,
                fontWeight: TYPE.weight.ultra,
                fontFamily: F,
              }}
            >
              {nextAction.title}
            </h2>
            <p
              style={{
                margin: 0,
                color: C.muted,
                fontSize: TYPE.size.base,
                lineHeight: 1.75,
                maxWidth: 720,
              }}
            >
              {nextAction.detail}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(nextAction.path)}
            style={{
              minHeight: 52,
              padding: '0 18px',
              borderRadius: 18,
              border: 'none',
              background: nextAction.accent,
              color: C.bg,
              fontWeight: TYPE.weight.ultra,
              fontFamily: F,
              fontSize: TYPE.size.sm,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: `0 14px 32px ${nextAction.accent}24`,
            }}
          >
            {nextAction.cta}
            <ArrowRight size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
            }}
          >
            {metrics.map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${item.accent}24`,
                  background: C.elevated,
                  padding: '16px 16px 14px',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: `${item.accent}16`,
                    border: `1px solid ${item.accent}26`,
                    color: item.accent,
                  }}
                >
                  <item.Icon size={18} />
                </div>
                <div
                  style={{
                    marginTop: 14,
                    color: C.textFull,
                    fontSize: '1.2rem',
                    fontWeight: TYPE.weight.ultra,
                    fontFamily: F,
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    color: item.accent,
                    fontSize: TYPE.size.xs,
                    fontWeight: TYPE.weight.bold,
                    letterSpacing: TYPE.letterSpacing.wider,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: C.soft,
                    fontSize: TYPE.size.sm,
                    lineHeight: 1.6,
                  }}
                >
                  {item.detail}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: 24,
              border: `1px solid ${C.borderSoft}`,
              background:
                `linear-gradient(180deg, ${C.elevated}, ${C.card})`,
              padding: '18px 18px 16px',
              display: 'grid',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  color: C.cyan,
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                }}
              >
                {ar ? 'إعادة فتح السياق' : 'Context to reopen'}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: C.textFull,
                  fontSize: '1rem',
                  fontWeight: TYPE.weight.ultra,
                  fontFamily: F,
                }}
              >
                {dailyCorridor?.label ??
                  (ar ? 'ابدأ من أي ممر حي' : 'Start from any live corridor')}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: C.muted,
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.7,
                }}
              >
                {dailyCorridor
                  ? ar
                    ? `${dailyCorridor.sharedPriceJod} JOD للمقعد المشترك · توفير ${dailyCorridor.savingsPercent}% · ${dailyCorridor.autoGroupWindow}`
                    : `${dailyCorridor.sharedPriceJod} JOD shared fare · ${dailyCorridor.savingsPercent}% savings · ${dailyCorridor.autoGroupWindow}`
                  : ar
                    ? 'اختر ممر الرحلة أولاً ثم اترك بقية القرار يتبعه.'
                    : 'Choose the route first, then let the rest of the decision follow.'}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${C.gold}24`,
                  background: `${C.gold}10`,
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{ color: C.gold, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold }}
                >
                  {ar ? 'الرصيد والتجديد' : 'Balance and continuity'}
                </div>
                <div style={{ marginTop: 6, color: C.textFull, fontWeight: TYPE.weight.ultra }}>
                  {formatJod(user.balance ?? 0)}
                </div>
                <div style={{ marginTop: 6, color: C.soft, fontSize: TYPE.size.sm }}>
                  {membership.plusActive
                    ? ar
                      ? 'واصل بلس فعالة على هذا الحساب.'
                      : 'Wasel Plus is active on this account.'
                    : ar
                      ? 'يمكن تفعيل بلس من المحفظة عند الحاجة.'
                      : 'Plus can be activated from Wallet when needed.'}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${trustNeedsAction ? nextAction.accent : C.green}24`,
                  background: `${trustNeedsAction ? nextAction.accent : C.green}10`,
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    color: trustNeedsAction ? nextAction.accent : C.green,
                    fontSize: TYPE.size.xs,
                    fontWeight: TYPE.weight.bold,
                  }}
                >
                  {ar ? 'الثقة التشغيلية' : 'Operational trust'}
                </div>
                <div style={{ marginTop: 6, color: C.textFull, fontWeight: TYPE.weight.ultra }}>
                  {trustStatus?.nextStepId
                    ? nextStepLabel(trustStatus.nextStepId, ar)
                    : ar
                      ? 'جاهز'
                      : 'Ready'}
                </div>
                <div style={{ marginTop: 6, color: C.soft, fontSize: TYPE.size.sm }}>
                  {trustNeedsAction
                    ? ar
                      ? 'أكمل هذه الخطوة قبل توسيع العرض أو المدفوعات.'
                      : 'Resolve this step before expanding supply or payouts.'
                    : ar
                      ? 'جاهز للرحلات الحساسة والمحفظة والمدفوعات.'
                      : 'Ready for sensitive flows, wallet actions, and payouts.'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 10,
              }}
            >
              {guidedFlows.map((action, index) => (
                <div
                  key={action.label}
                  style={{
                    minHeight: 48,
                    borderRadius: 16,
                    border: `1px solid ${index === 0 ? `${action.accent}30` : C.borderSoft}`,
                    background: index === 0 ? `${action.accent}10` : C.elevated,
                    color: C.textFull,
                    fontWeight: TYPE.weight.bold,
                    fontFamily: F,
                    fontSize: TYPE.size.sm,
                    display: 'grid',
                    gap: 4,
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ color: index === 0 ? action.accent : C.textFull }}>
                    {action.label}
                  </span>
                  <span style={{ color: C.soft, fontSize: TYPE.size.xs, lineHeight: 1.4 }}>
                    {action.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
