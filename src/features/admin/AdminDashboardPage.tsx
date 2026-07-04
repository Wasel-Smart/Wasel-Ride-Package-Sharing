import { useEffect, useState } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { C, R, SPACE, TYPE, card, pillStyle } from '../../utils/wasel-ds';
import { RefreshCw, AlertTriangle, Users, Package, Car, DollarSign } from 'lucide-react';

interface AdminMetrics {
  activeTrips: number;
  totalPackages: number;
  pendingDisputes: number;
  totalRevenueJOD: number;
  activeUsers: number;
}

type Range = '1d' | '7d' | '30d';

interface AdminApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const RANGE_LABELS: Record<Range, string> = { '1d': 'Today', '7d': '7 days', '30d': '30 days' };

export function AdminDashboardPage() {
  const { user } = useLocalAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('1d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchMetrics(r: Range) {
    setLoading(true);
    try {
      const token = localStorage.getItem('wasel_access_token');
      if (!token) throw new Error('Missing admin session token');

      const response = await fetch(`/v1/admin/dashboard/metrics?range=${r}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      const data = (await response.json()) as AdminApiResponse<AdminMetrics>;
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error?.message ?? 'Failed to fetch metrics');
      }

      setMetrics(data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void fetchMetrics(range);
    else setLoading(false);
  }, [user?.role, range]);

  if (!user || user.role !== 'admin') {
    return (
      <PageShell>
        <div style={{ padding: SPACE[6], textAlign: 'center', color: C.text }}>
          <h2 style={{ color: C.error }}>Access denied</h2>
          <p style={{ color: C.textMuted }}>You do not have permission to view this page.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1200}>
      <div style={{ padding: SPACE[6] }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE[6] }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: SPACE[2],
              borderRadius: R.full, border: `1px solid ${C.borderHov}`,
              background: C.cyanDim, padding: '4px 12px',
              color: C.cyan, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.bold,
              textTransform: 'uppercase', marginBottom: SPACE[2],
            }}>
              Operations
            </div>
            <h1 style={{ margin: 0, color: C.text, fontSize: TYPE.size['3xl'], fontWeight: TYPE.weight.ultra }}>
              Admin Dashboard
            </h1>
            {lastUpdated && (
              <p style={{ margin: `${SPACE[1]} 0 0`, color: C.textDim, fontSize: TYPE.size.xs }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
            {/* Range segmented control */}
            <div style={{
              display: 'flex', borderRadius: R.lg,
              border: `1px solid ${C.border}`, overflow: 'hidden',
            }}>
              {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: `${SPACE[2]} ${SPACE[4]}`,
                    background: range === r ? C.cyan : 'transparent',
                    color: range === r ? C.bg : C.textMuted,
                    border: 'none', cursor: 'pointer',
                    fontSize: TYPE.size.sm, fontWeight: TYPE.weight.semibold,
                    transition: 'all 160ms',
                  }}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>

            <button
              onClick={() => void fetchMetrics(range)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE[2],
                padding: `${SPACE[2]} ${SPACE[4]}`,
                background: C.elevated, border: `1px solid ${C.border}`,
                borderRadius: R.lg, color: C.textSub,
                fontSize: TYPE.size.sm, cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Disputes interrupt banner ── */}
        {!loading && metrics && metrics.pendingDisputes > 0 && (
          <div style={{
            ...card({ padding: SPACE[4], radius: R.xl }),
            borderColor: C.gold,
            background: C.goldDim,
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: SPACE[5],
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <AlertTriangle size={18} color={C.gold} />
              <span style={{ color: C.gold, fontWeight: TYPE.weight.bold, fontSize: TYPE.size.base }}>
                {metrics.pendingDisputes} dispute{metrics.pendingDisputes !== 1 ? 's' : ''} require your review
              </span>
            </div>
            <a
              href="/app/admin/disputes"
              style={{ ...pillStyle(C.gold), textDecoration: 'none', cursor: 'pointer' }}
            >
              Review now →
            </a>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div style={{
            ...card({ padding: SPACE[4], radius: R.xl }),
            borderColor: C.error, background: C.errorDim,
            color: C.error, marginBottom: SPACE[5],
          }}>
            {error}
          </div>
        )}

        {/* ── Metric grid ── */}
        {loading ? (
          <div style={{ color: C.textMuted, textAlign: 'center', padding: SPACE[12] }}>
            Loading metrics…
          </div>
        ) : metrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: SPACE[4] }}>
            <MetricCard
              title="Revenue"
              value={`${metrics.totalRevenueJOD.toLocaleString()} JOD`}
              icon={<DollarSign size={18} color={C.green} />}
              accent={C.green}
            />
            <MetricCard
              title="Active Users"
              value={metrics.activeUsers}
              icon={<Users size={18} color={C.cyan} />}
              accent={C.cyan}
            />
            <MetricCard
              title="Active Trips"
              value={metrics.activeTrips}
              icon={<Car size={18} color={C.blue} />}
              accent={C.blue}
            />
            <MetricCard
              title="Packages"
              value={metrics.totalPackages}
              icon={<Package size={18} color={C.purple} />}
              accent={C.purple}
            />
            <MetricCard
              title="Pending Disputes"
              value={metrics.pendingDisputes}
              icon={<AlertTriangle size={18} color={metrics.pendingDisputes > 0 ? C.gold : C.textDim} />}
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
  title, value, icon, accent, href,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  href?: string;
}) {
  const inner = (
    <div style={{
      ...card({ padding: SPACE[5], radius: R.xxl }),
      borderColor: `${accent}28`,
      display: 'flex', flexDirection: 'column', gap: SPACE[3],
      transition: 'border-color 160ms, box-shadow 160ms',
      cursor: href ? 'pointer' : 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: C.textMuted, fontSize: TYPE.size.sm, fontWeight: TYPE.weight.medium }}>
          {title}
        </span>
        {icon}
      </div>
      <div style={{ fontSize: TYPE.size['3xl'], fontWeight: TYPE.weight.ultra, color: C.text }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {href && (
        <div style={{ color: accent, fontSize: TYPE.size.xs, fontWeight: TYPE.weight.semibold }}>
          View details →
        </div>
      )}
    </div>
  );

  if (href) {
    return <a href={href} style={{ textDecoration: 'none' }}>{inner}</a>;
  }
  return inner;
}
