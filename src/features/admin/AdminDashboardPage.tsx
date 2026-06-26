import { useEffect, useState } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';

interface AdminMetrics {
  activeTrips: number;
  totalPackages: number;
  pendingDisputes: number;
  totalRevenueJOD: number;
  activeUsers: number;
}

export function AdminDashboardPage() {
  const { user } = useLocalAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const token = localStorage.getItem('wasel_access_token');
        const response = await fetch('/v1/admin/dashboard/metrics', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to fetch metrics');
        }

        setMetrics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <PageShell>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You do not have permission to view this page.</p>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <p>Loading dashboard...</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1200}>
      <div style={{ padding: 24 }}>
        <h1 style={{ marginBottom: 24 }}>Admin Dashboard</h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          <MetricCard title="Active Trips" value={metrics?.activeTrips ?? 0} />
          <MetricCard title="Total Packages" value={metrics?.totalPackages ?? 0} />
          <MetricCard title="Pending Disputes" value={metrics?.pendingDisputes ?? 0} />
          <MetricCard title="Revenue (JOD)" value={metrics?.totalRevenueJOD ?? 0} />
          <MetricCard title="Active Users" value={metrics?.activeUsers ?? 0} />
        </div>
      </div>
    </PageShell>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 20,
      background: '#fff',
    }}>
      <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value.toLocaleString()}</div>
    </div>
  );
}
