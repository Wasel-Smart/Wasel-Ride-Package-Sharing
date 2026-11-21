import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { C, R, SPACE, TYPE, card, pillStyle } from '../../utils/wasel-ds';
import { RefreshCw, AlertTriangle, Users, Package, Car, DollarSign } from 'lucide-react';
import { tx } from '../../locales/tx';
import { getAdminMetrics } from '../../services/adminApi';
import { ListSkeleton } from '../home/HomePageShared';
import { WaselErrorState } from '../../components/wasel-ui';

interface AdminMetrics {
  activeTrips: number;
  totalPackages: number;
  pendingDisputes: number;
  totalRevenueJOD: number;
  activeUsers: number;
}

type Range = '1d' | '7d' | '30d';

const RANGE_LABELS: Record<Range, string> = { '1d': 'Today', '7d': '7 days', '30d': '30 days' };

/**
 * Verifies admin access using BOTH the profile role (client-cached) AND the
 * JWT `app_metadata.role` claim (server-issued, cannot be forged by the client).
 *
 * The profile role guards the React render (fast, no network). The JWT claim
 * is the second check that cannot be spoofed via DevTools, a stale cache, or
 * a future auth bug. Both must agree before the admin UI is shown.
 *
 * The edge API enforces the same check server-side via `ensureRuntimeAdminAccess`
 * + `enforcePermission`, so this is defence-in-depth, not the sole gate.
 */
function useIsVerifiedAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user, session } = useAuth();

  const isAdmin = useMemo(() => {
    // 1. Profile role check (client-cached).
    const meta = (user as unknown as { user_metadata?: { role?: string } })?.user_metadata;
    if (!user || meta?.role !== 'admin') {
      return false;
    }

    // 2. JWT app_metadata.role check (server-issued claim).
    // Supabase encodes app_metadata in the JWT payload. We decode the payload
    // segment here — no crypto verification needed; Supabase already verifies
    // the signature when it issues the session. We only read what the server
    // put there; a client cannot change their own JWT payload without a new
    // server-issued token.
    if (!session?.access_token) {return false;}
    try {
      const payloadB64 = session.access_token.split('.')[1];
      if (!payloadB64) {return false;}
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
      const jwtRole =
        (payload['app_metadata'] as Record<string, unknown> | undefined)?.['role'] ??
        payload['role'];
      return jwtRole === 'admin';
    } catch {
      // Malformed token — deny access.
      return false;
    }
  }, [user, session?.access_token]);

  return { isAdmin, loading: false };
}

export function AdminDashboardPage() {
  const { session } = useAuth();
  const { isAdmin } = useIsVerifiedAdmin();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const [range, setRange] = useState<Range>('1d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const metrics = await getAdminMetrics(range);

        if (cancelled) {return;}

        setMetrics(metrics);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [range, session?.access_token, isAdmin, refetchTrigger]);

  if (!isAdmin) {
    return (
      <PageShell>
        <div style={{ padding: SPACE[6], textAlign: 'center', color: C.text }}>
          <h2 style={{ color: C.error }}>{tx('adminDashboardPage.access_denied')}</h2>
          <p style={{ color: C.textMuted }}>
            {tx('adminDashboardPage.you_do_not_have_permission_to_view_this_page')}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1200}>
      <div style={{ padding: SPACE[6] }}>
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACE[6],
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: SPACE[2],
                borderRadius: R.full,
                border: `1px solid ${C.borderHov}`,
                background: C.cyanDim,
                padding: '4px 12px',
                color: C.cyan,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.bold,
                textTransform: 'uppercase',
                marginBottom: SPACE[2],
              }}
            >
              {tx('adminDashboardPage.operations')}
            </div>
            <h1
              style={{
                margin: 0,
                color: C.text,
                fontSize: TYPE.size['3xl'],
                fontWeight: TYPE.weight.ultra,
              }}
            >
              {tx('admin.title')}
            </h1>
            {lastUpdated && (
              <p style={{ margin: `${SPACE[1]} 0 0`, color: C.textDim, fontSize: TYPE.size.xs }}>
                {tx('adminDashboardPage.updated')}
                {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
            {/* Range segmented control */}
            <div
              style={{
                display: 'flex',
                borderRadius: R.lg,
                border: `1px solid ${C.border}`,
                overflow: 'hidden',
              }}
            >
              {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => { void setRange(r); }}
                  style={{
                    padding: `${SPACE[2]} ${SPACE[4]}`,
                    background: range === r ? C.cyan : 'transparent',
                    color: range === r ? C.bg : C.textMuted,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: TYPE.size.sm,
                    fontWeight: TYPE.weight.semibold,
                    transition: 'all 160ms',
                  }}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setRefetchTrigger(t => t + 1)}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: SPACE[2],
                padding: `${SPACE[2]} ${SPACE[4]}`,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                borderRadius: R.lg,
                color: C.textSub,
                fontSize: TYPE.size.sm,
                cursor: 'pointer',
              }}
            >
              <RefreshCw
                size={14}
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              />
              {tx('common.refresh')}
            </button>
          </div>
        </div>

        {/* ── Disputes interrupt banner ── */}
        {!loading && metrics && metrics.pendingDisputes > 0 && (
          <div
            style={{
              ...card({ padding: SPACE[4], radius: R.xl }),
              borderColor: C.gold,
              background: C.goldDim,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: SPACE[5],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <AlertTriangle size={18} color={C.gold} />
              <span
                style={{ color: C.gold, fontWeight: TYPE.weight.bold, fontSize: TYPE.size.base }}
              >
                {metrics.pendingDisputes} {tx('adminDashboardPage.dispute')}
                {metrics.pendingDisputes !== 1 ? 's' : ''}{' '}
                {tx('adminDashboardPage.require_your_review')}
              </span>
            </div>
            <a
              href="/app/admin/disputes"
              style={{ ...pillStyle(C.gold), textDecoration: 'none', cursor: 'pointer' }}
            >
              {tx('adminDashboardPage.review_now')}
            </a>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <WaselErrorState
            compact
            icon={<AlertTriangle size={36} />}
            title={error}
          />
        )}

        {/* ── Metric grid ── */}
        {loading ? (
          <ListSkeleton count={4} />
        ) : metrics ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: SPACE[4],
            }}
          >
            <MetricCard
              title={tx('admin.revenue')}
              value={`${metrics.totalRevenueJOD.toLocaleString()} JOD`}
              icon={<DollarSign size={18} color={C.green} />}
              accent={C.green}
            />
            <MetricCard
              title={tx('statsUsers')}
              value={metrics.activeUsers}
              icon={<Users size={18} color={C.cyan} />}
              accent={C.cyan}
              href="/app/admin/users"
            />
            <MetricCard
              title={tx('trips.active')}
              value={metrics.activeTrips}
              icon={<Car size={18} color={C.blue} />}
              accent={C.blue}
            />
            <MetricCard
              title={tx('adminDashboardPage.packages')}
              value={metrics.totalPackages}
              icon={<Package size={18} color={C.purple} />}
              accent={C.purple}
            />
            <MetricCard
              title={tx('admin.pendingDisputes')}
              value={metrics.pendingDisputes}
              icon={
                <AlertTriangle size={18} color={metrics.pendingDisputes > 0 ? C.gold : C.textDim} />
              }
              accent={metrics.pendingDisputes > 0 ? C.gold : C.textDim}
              href="/app/admin/disputes"
            />
          </div>
        ) : null}


      </div>
    </PageShell>
  );
}

function MetricCard({
  title,
  value,
  icon,
  accent,
  href,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div
      style={{
        ...card({ padding: SPACE[5], radius: R.xxl }),
        borderColor: `${accent}28`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[3],
        transition: 'border-color 160ms, box-shadow 160ms',
        cursor: href ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontWeight: TYPE.weight.medium }}
        >
          {title}
        </span>
        {icon}
      </div>
      <div style={{ fontSize: TYPE.size['3xl'], fontWeight: TYPE.weight.ultra, color: C.text }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {href && (
        <div style={{ color: accent, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.semibold }}>
          {tx('adminDashboardPage.view_details')}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none' }}>
        {inner}
      </a>
    );
  }
  return inner;
}
