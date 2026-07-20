import { useEffect, useState } from 'react';
import { tx } from '../../locales/tx';

interface SystemMetrics {
  apiLatency: { p50: number; p95: number; p99: number };
  errorRate: number;
  activeUsers: number;
  queueLag: Record<string, number>;
  workerHealth: Record<string, 'healthy' | 'degraded' | 'down'>;
  sloCompliance: Record<string, number>;
}

export function ObservabilityDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const isLive = Boolean(metrics);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/summary');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Refresh every 5s

    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <div className="p-8">{tx('observabilityDashboard.loading_metrics')}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {tx('observabilityDashboard.wasel_platform_observability')}
        </h1>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* API Latency Card */}
        <MetricCard
          title={tx('observabilityDashboard.api_latency')}
          value={`${metrics.apiLatency.p95}ms`}
          subtitle={`p50: ${metrics.apiLatency.p50}ms | p99: ${metrics.apiLatency.p99}ms`}
          status={metrics.apiLatency.p95 < 250 ? 'healthy' : 'degraded'}
        />

        {/* Error Rate Card */}
        <MetricCard
          title={tx('observabilityDashboard.error_rate')}
          value={`${(metrics.errorRate * 100).toFixed(2)}%`}
          subtitle={tx('observabilityDashboard.5xx_responses')}
          status={metrics.errorRate < 0.01 ? 'healthy' : 'degraded'}
        />

        {/* Active Users Card */}
        <MetricCard
          title={tx('landing.stats.users')}
          value={metrics.activeUsers.toString()}
          subtitle={tx('observabilityDashboard.last_15_minutes')}
          status="healthy"
        />

        {/* SLO Compliance Card */}
        <MetricCard
          title={tx('observabilityDashboard.slo_compliance')}
          value={`${(Object.values(metrics.sloCompliance).reduce((a, b) => a + b, 0) / Object.values(metrics.sloCompliance).length).toFixed(1)}%`}
          subtitle={tx('observabilityDashboard.average_across_all_services')}
          status={
            Object.values(metrics.sloCompliance).every(v => v >= 99.9) ? 'healthy' : 'degraded'
          }
        />
      </div>

      {/* Queue Lag Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">{tx('observabilityDashboard.queue_health')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(metrics.queueLag).map(([queue, lag]) => (
            <QueueHealthCard key={queue} queue={queue} lagMs={lag} />
          ))}
        </div>
      </div>

      {/* Worker Health Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">{tx('observabilityDashboard.worker_health')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(metrics.workerHealth).map(([worker, status]) => (
            <WorkerHealthCard key={worker} worker={worker} status={status} />
          ))}
        </div>
      </div>

      {/* SLO Details Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          {tx('observabilityDashboard.slo_compliance_by_service')}
        </h2>
        <div className="rounded-lg bg-white p-6 shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-3">{tx('observabilityDashboard.service')}</th>
                <th className="pb-3">{tx('observabilityDashboard.compliance')}</th>
                <th className="pb-3">{tx('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.sloCompliance).map(([service, compliance]) => (
                <tr key={service} className="border-b last:border-0">
                  <td className="py-3">{service}</td>
                  <td className="py-3">{compliance.toFixed(2)}%</td>
                  <td className="py-3">
                    <StatusBadge status={compliance >= 99.9 ? 'healthy' : 'degraded'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  status,
}: {
  title: string;
  value: string;
  subtitle: string;
  status: 'healthy' | 'degraded' | 'down';
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <StatusBadge status={status} />
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function QueueHealthCard({ queue, lagMs }: { queue: string; lagMs: number }) {
  const status = lagMs < 5000 ? 'healthy' : lagMs < 60000 ? 'degraded' : 'down';

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{queue}</span>
        <StatusBadge status={status} />
      </div>
      <div className="text-2xl font-bold">
        {lagMs}
        {tx('observabilityDashboard.ms')}
      </div>
      <div className="text-xs text-gray-500">{tx('observabilityDashboard.processing_lag')}</div>
    </div>
  );
}

function WorkerHealthCard({
  worker,
  status,
}: {
  worker: string;
  status: 'healthy' | 'degraded' | 'down';
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{worker}</span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const colors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colors[status]}`}>{status}</span>
  );
}
