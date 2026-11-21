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
  if (!from || !to) {return '/app/find-ride';}
  return `/app/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`;
}

function formatJod(value: number) {
  return `JOD ${value.toFixed(2)}`;
}

function nextStepLabel(stepId: TrustStepId | null, ar: boolean) {
  switch (stepId) {
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
    if (typeof window === 'undefined') {return;}

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
      if (!cancelled) {setSupportTickets(tickets);}
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

  if (!user) {return null;}

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
      ? { label: ar ? 'Ù†Ø´Ø·Ø©' : 'Active', accent: C.green }
      : user.walletStatus === 'limited'
        ? { label: ar ? 'Ù…Ø­Ø¯ÙˆØ¯Ø©' : 'Limited', accent: C.gold }
        : { label: ar ? 'ØªØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø©' : 'Needs review', accent: C.red };

  let nextAction: ActionCard;
  if (trustNeedsAction) {
    nextAction = {
      accent: trustStatus?.blockedSteps.length ? C.red : C.gold,
      title: ar ? 'Ø£ÙƒÙ…Ù„ Ø¬Ø§Ù‡Ø²ÙŠØ© Ø§Ù„Ø«Ù‚Ø© Ø£ÙˆÙ„Ø§Ù‹' : 'Complete trust readiness first',
      detail: trustStatus?.blockedSteps.length
        ? ar
          ? 'Ù‡Ù†Ø§Ùƒ Ø®Ø·ÙˆØ© Ù…Ø­Ø¸ÙˆØ±Ø© ØªØ¤Ø«Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø³Ø§Ø¦Ù‚ Ø£Ùˆ Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø£Ùˆ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø­Ø³Ø§Ø³Ø©.'
          : 'A blocked trust step is affecting driver, wallet, or sensitive operations.'
        : ar
          ? `ØªØ¨Ù‚Ù‰ ${trustRemaining} Ø®Ø·ÙˆØ§Øª Ù‚Ø¨Ù„ ÙØªØ­ ÙƒÙ„ Ù‚Ø¯Ø±Ø§Øª Ø§Ù„Ø­Ø³Ø§Ø¨ Ø¨ÙˆØ¶ÙˆØ­.`
          : `${trustRemaining} checks remain before the account is fully unlocked.`,
      cta: ar ? 'Ø§ÙØªØ­ Ù…Ø±ÙƒØ² Ø§Ù„Ø«Ù‚Ø©' : 'Open trust center',
      path: '/app/trust',
    };
  } else if (totalAttention > 0) {
    nextAction = {
      accent: C.gold,
      title: ar ? 'Ù‡Ù†Ø§Ùƒ Ø¹Ù†Ø§ØµØ± ØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©' : 'There are items that need attention',
      detail: ar
        ? `${totalAttention} Ø¹Ù†Ø§ØµØ± ØªØ­ØªØ§Ø¬ Ù‚Ø±Ø§Ø±Ø§Ù‹ Ø£Ùˆ Ø¯Ø¹Ù…Ø§Ù‹ Ø£Ùˆ Ù…Ø·Ø§Ø¨Ù‚Ø© Ø£ÙØ¶Ù„.`
        : `${totalAttention} items currently need a decision, support, or a better match.`,
      cta: ar ? 'Ø±Ø§Ø¬Ø¹ Ø§Ù„Ø¹Ù†Ø§ØµØ± Ø§Ù„Ù…Ø¹Ù„Ù‚Ø©' : 'Review pending items',
      path: '/app/my-trips?filter=attention',
    };
  } else if (totalActive > 0) {
    nextAction = {
      accent: 'var(--primary)',
      title: ar ? 'Ø­Ø±ÙƒØªÙƒ Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù…Ø§ Ø²Ø§Ù„Øª Ø¬Ø§Ø±ÙŠØ©' : 'Your current movement is still live',
      detail: ar
        ? `${totalActive} Ø¹Ù†Ø§ØµØ± Ù†Ø´Ø·Ø© Ø¨ÙŠÙ† Ø§Ù„Ø±Ø­Ù„Ø§Øª ÙˆØ§Ù„Ø·Ø±ÙˆØ¯ ÙˆØ§Ù„Ø¨Ø§Øµ.`
        : `${totalActive} active items are moving across rides, parcels, and buses.`,
      cta: ar ? 'Ø§ÙØªØ­ Ø§Ù„Ø±Ø­Ù„Ø§Øª' : 'Open my trips',
      path: '/app/my-trips',
    };
  } else {
    nextAction = {
      accent: C.green,
      title: ar ? 'Ø£Ø¹Ø¯ ÙØªØ­ Ø§Ù„Ù…Ù…Ø± Ø§Ù„Ø£Ù‚Ø±Ø¨ Ù„Ùƒ' : 'Reopen your most likely corridor',
      detail: dailyCorridor
        ? ar
          ? `${dailyCorridor.label} ÙŠØ¨Ù‚Ù‰ Ø£ÙØ¶Ù„ Ù†Ù‚Ø·Ø© Ø¨Ø¯Ø§ÙŠØ© Ø³Ø±ÙŠØ¹Ø© Ø§Ù„Ø¢Ù†.`
          : `${dailyCorridor.label} remains the fastest corridor to reopen right now.`
        : ar
          ? 'Ø§Ø¨Ø¯Ø£ Ù…Ù† Ù…Ø³Ø§Ø± Ø­ÙŠ Ø«Ù… Ù‚Ø±Ø± Ø¨ÙŠÙ† Ø§Ù„Ø±ÙƒÙˆØ¨ Ø£Ùˆ Ø§Ù„Ø¹Ø±Ø¶ Ø£Ùˆ Ø§Ù„Ø·Ø±ÙˆØ¯ Ø£Ùˆ Ø§Ù„Ø¨Ø§Øµ.'
          : 'Start from a live corridor, then choose rides, supply, parcels, or bus.',
      cta: ar ? 'Ø§Ø¨Ø­Ø« ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù…Ø±' : 'Search this corridor',
      path: corridorPath(dailyCorridor?.from, dailyCorridor?.to),
    };
  }

  const metrics = [
    metricCard(
      ar ? 'Ø­Ø±ÙƒØ© Ù†Ø´Ø·Ø©' : 'Active movement',
      `${totalActive}`,
      ar ? 'Ø±Ø­Ù„Ø§Øª ÙˆØ·Ø±ÙˆØ¯ ÙˆØ¨Ø§ØµØ§Øª Ø¬Ø§Ø±ÙŠØ© Ø§Ù„Ø¢Ù†.' : 'Trips, parcels, and buses currently in motion.',
      'var(--primary)',
      Clock3,
    ),
    metricCard(
      ar ? 'ØªØ­ØªØ§Ø¬ Ù…ØªØ§Ø¨Ø¹Ø©' : 'Needs attention',
      `${totalAttention}`,
      ar
        ? 'Ø¹Ù†Ø§ØµØ± ØªÙ†ØªØ¸Ø± Ù…ÙˆØ§ÙÙ‚Ø© Ø£Ùˆ Ø¯Ø¹Ù…Ø§Ù‹ Ø£Ùˆ Ø­Ù„Ø§Ù‹.'
        : 'Items waiting on approval, support, or resolution.',
      totalAttention > 0 ? C.gold : C.green,
      AlertTriangle,
    ),
    metricCard(
      ar ? 'Ø±ØµÙŠØ¯ Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Wallet balance',
      formatJod(user.balance ?? 0),
      ar ? `Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø­ÙØ¸Ø©: ${walletHealth.label}` : `Wallet status: ${walletHealth.label}`,
      walletHealth.accent,
      Wallet,
    ),
    metricCard(
      ar ? 'Ø¯Ø±Ø¬Ø© Ø§Ù„Ø«Ù‚Ø©' : 'Trust readiness',
      trustStatus ? `${trustStatus.completedSteps}/${trustStatus.totalSteps}` : '0/5',
      trustStatus?.nextStepId
        ? ar
          ? `Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„ØªØ§Ù„ÙŠØ©: ${nextStepLabel(trustStatus.nextStepId, ar)}`
          : `Next step: ${nextStepLabel(trustStatus.nextStepId, ar)}`
        : ar
          ? 'ÙƒÙ„ Ø§Ù„Ø®Ø·ÙˆØ§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…Ø­Ø³ÙˆÙ…Ø©.'
          : 'All core trust checks are resolved.',
      trustNeedsAction ? nextAction.accent : C.green,
      Shield,
    ),
  ];

  const guidedFlows = [
    {
      label: ar ? 'Ø§Ø¨Ø­Ø« Ø¹Ù† Ø±Ø­Ù„Ø©' : 'Book',
      detail: ar ? 'Ø§Ø¨Ø¯Ø£ Ù…Ù† Ø§Ù„Ù…Ø³Ø§Ø±' : 'Route, seats, fare',
      accent: 'var(--primary)',
    },
    {
      label: ar ? 'Ø§Ø¹Ø±Ø¶ Ø±Ø­Ù„Ø©' : 'Request',
      detail: ar ? 'Ø£Ø±Ø³Ù„ Ø§Ù„Ø³ÙŠØ§Ù‚' : 'Approver context',
      accent: C.green,
    },
    {
      label: ar ? 'Ø§ÙØªØ­ Ø§Ù„Ø±Ø­Ù„Ø§Øª' : 'Approve',
      detail: ar ? 'Ø±Ø§Ø¬Ø¹ Ø§Ù„Ù…Ø¹Ù„Ù‚' : 'Pending decisions',
      accent: C.gold,
    },
    {
      label: ar ? 'Ø§ÙØªØ­ Ø§Ù„Ù…Ø­ÙØ¸Ø©' : 'Manage',
      detail: ar ? 'ØªØªØ¨Ø¹ Ø§Ù„Ø­Ø±ÙƒØ©' : 'Trips and supply',
      accent: 'var(--primary)',
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
          borderRadius: 20,
          border: `1px solid ${nextAction.accent}22`,
          background: `linear-gradient(180deg, ${'var(--card)'}, rgba(8,29,57,0.94))`,
          boxShadow: SH.sm,
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
              {ar ? 'Ù…Ø±ÙƒØ² Ù‚ÙŠØ§Ø¯Ø© ÙˆØ§ØµÙ„' : 'Wasel Command Deck'}
            </div>
            <h2
              style={{
                margin: '14px 0 8px',
                color: 'var(--foreground)',
                fontSize: '2rem',
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
                color: 'var(--muted)',
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
            onClick={() => { void navigate(nextAction.path); }}
            style={{
              minHeight: 52,
              padding: '0 18px',
              borderRadius: 18,
              border: 'none',
              background: nextAction.accent,
              color: 'var(--background)',
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
                  borderRadius: 16,
                  border: `1px solid ${item.accent}24`,
                  background: 'var(--secondary)',
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
                    color: 'var(--foreground)',
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
                    color: 'var(--secondary)',
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
              borderRadius: 16,
              border: `1px solid ${'var(--border)'}`,
              background: `linear-gradient(180deg, ${'var(--secondary)'}, ${'var(--card)'})`,
              padding: '18px 18px 16px',
              display: 'grid',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  color: 'var(--primary)',
                  fontSize: TYPE.size.xs,
                  fontWeight: TYPE.weight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: TYPE.letterSpacing.wider,
                }}
              >
                {ar ? 'Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ø³ÙŠØ§Ù‚' : 'Context to reopen'}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: 'var(--foreground)',
                  fontSize: '1rem',
                  fontWeight: TYPE.weight.ultra,
                  fontFamily: F,
                }}
              >
                {dailyCorridor?.label ??
                  (ar ? 'Ø§Ø¨Ø¯Ø£ Ù…Ù† Ø£ÙŠ Ù…Ù…Ø± Ø­ÙŠ' : 'Start from any live corridor')}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: 'var(--muted)',
                  fontSize: TYPE.size.sm,
                  lineHeight: 1.7,
                }}
              >
                {dailyCorridor
                  ? ar
                    ? `${dailyCorridor.sharedPriceJod} JOD Ù„Ù„Ù…Ù‚Ø¹Ø¯ Ø§Ù„Ù…Ø´ØªØ±Ùƒ Â· ØªÙˆÙÙŠØ± ${dailyCorridor.savingsPercent}% Â· ${dailyCorridor.autoGroupWindow}`
                    : `${dailyCorridor.sharedPriceJod} JOD shared fare Â· ${dailyCorridor.savingsPercent}% savings Â· ${dailyCorridor.autoGroupWindow}`
                  : ar
                    ? 'Ø§Ø®ØªØ± Ù…Ù…Ø± Ø§Ù„Ø±Ø­Ù„Ø© Ø£ÙˆÙ„Ø§Ù‹ Ø«Ù… Ø§ØªØ±Ùƒ Ø¨Ù‚ÙŠØ© Ø§Ù„Ù‚Ø±Ø§Ø± ÙŠØªØ¨Ø¹Ù‡.'
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
                  {ar ? 'Ø§Ù„Ø±ØµÙŠØ¯ ÙˆØ§Ù„ØªØ¬Ø¯ÙŠØ¯' : 'Balance and continuity'}
                </div>
                <div style={{ marginTop: 6, color: 'var(--foreground)', fontWeight: TYPE.weight.ultra }}>
                  {formatJod(user.balance ?? 0)}
                </div>
                <div style={{ marginTop: 6, color: 'var(--secondary)', fontSize: TYPE.size.sm }}>
                  {membership.plusActive
                    ? ar
                      ? 'ÙˆØ§ØµÙ„ Ø¨Ù„Ø³ ÙØ¹Ø§Ù„Ø© Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨.'
                      : 'Wasel Plus is active on this account.'
                    : ar
                      ? 'ÙŠÙ…ÙƒÙ† ØªÙØ¹ÙŠÙ„ Ø¨Ù„Ø³ Ù…Ù† Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©.'
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
                  {ar ? 'Ø§Ù„Ø«Ù‚Ø© Ø§Ù„ØªØ´ØºÙŠÙ„ÙŠØ©' : 'Operational trust'}
                </div>
                <div style={{ marginTop: 6, color: 'var(--foreground)', fontWeight: TYPE.weight.ultra }}>
                  {trustStatus?.nextStepId
                    ? nextStepLabel(trustStatus.nextStepId, ar)
                    : ar
                      ? 'Ø¬Ø§Ù‡Ø²'
                      : 'Ready'}
                </div>
                <div style={{ marginTop: 6, color: 'var(--secondary)', fontSize: TYPE.size.sm }}>
                  {trustNeedsAction
                    ? ar
                      ? 'Ø£ÙƒÙ…Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ø®Ø·ÙˆØ© Ù‚Ø¨Ù„ ØªÙˆØ³ÙŠØ¹ Ø§Ù„Ø¹Ø±Ø¶ Ø£Ùˆ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª.'
                      : 'Resolve this step before expanding supply or payouts.'
                    : ar
                      ? 'Ø¬Ø§Ù‡Ø² Ù„Ù„Ø±Ø­Ù„Ø§Øª Ø§Ù„Ø­Ø³Ø§Ø³Ø© ÙˆØ§Ù„Ù…Ø­ÙØ¸Ø© ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª.'
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
                    border: `1px solid ${index === 0 ? `${action.accent}30` : 'var(--border)'}`,
                    background: index === 0 ? `${action.accent}10` : 'var(--secondary)',
                    color: 'var(--foreground)',
                    fontWeight: TYPE.weight.bold,
                    fontFamily: F,
                    fontSize: TYPE.size.sm,
                    display: 'grid',
                    gap: 4,
                    padding: '12px 14px',
                  }}
                >
                  <span style={{ color: index === 0 ? action.accent : 'var(--foreground)' }}>
                    {action.label}
                  </span>
                  <span style={{ color: 'var(--secondary)', fontSize: TYPE.size.xs, lineHeight: 1.4 }}>
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
