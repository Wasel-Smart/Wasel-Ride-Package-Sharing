import { useEffect, useState } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { C } from '../../utils/wasel-ds';
import { 
  Users, 
  MapPin, 
  Package, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Ban, 
  Download, 
  Radio
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminMetrics {
  activeTrips: number;
  totalPackages: number;
  pendingDisputes: number;
  totalRevenueJOD: number;
  activeUsers: number;
  todaysRides: number;
}

interface VerificationRequest {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SystemEvent {
  id: string;
  timestamp: string;
  type: string;
  user: string;
  status: string;
}

const MOCK_EVENTS: SystemEvent[] = [
  { id: '1', timestamp: '2026-07-01 07:00:12', type: 'PAYMENT_CAPTURE', user: 'Ali M.', status: 'SUCCESS' },
  { id: '2', timestamp: '2026-07-01 06:58:45', type: 'RIDE_MATCH', user: 'Sara K.', status: 'SUCCESS' },
  { id: '3', timestamp: '2026-07-01 06:55:10', type: 'DRIVER_ONBOARD', user: 'Ahmad T.', status: 'PENDING' },
  { id: '4', timestamp: '2026-07-01 06:50:33', type: 'DISPUTE_RAISED', user: 'Hasan Y.', status: 'WARNING' },
  { id: '5', timestamp: '2026-07-01 06:45:00', type: 'PACKAGE_DELIVERED', user: 'Rama A.', status: 'SUCCESS' },
];

const MOCK_VERIFICATIONS: VerificationRequest[] = [
  { id: '1', name: 'Tareq Nabulsi', phone: '+962 7 9123 4567', licenseNumber: 'DL-88273', status: 'pending' },
  { id: '2', name: 'Dina Masri', phone: '+962 7 8876 5432', licenseNumber: 'DL-19928', status: 'pending' },
];

const MOCK_CHART_DATA = [
  { name: 'Mon', rides: 145 },
  { name: 'Tue', rides: 180 },
  { name: 'Wed', rides: 210 },
  { name: 'Thu', rides: 285 },
  { name: 'Fri', rides: 320 },
  { name: 'Sat', rides: 240 },
  { name: 'Sun', rides: 190 },
];

export function AdminDashboardPage() {
  const { user } = useLocalAuth();
  const { language, dir } = useLanguage();
  const ar = language === 'ar';

  const [metrics, setMetrics] = useState<AdminMetrics>({
    activeTrips: 42,
    totalPackages: 128,
    pendingDisputes: 4,
    totalRevenueJOD: 3450,
    activeUsers: 1420,
    todaysRides: 284,
  });

  const [verifications, setVerifications] = useState<VerificationRequest[]>(MOCK_VERIFICATIONS);
  const [events, setEvents] = useState<SystemEvent[]>(MOCK_EVENTS);
  const [systemStatus, setSystemStatus] = useState({
    api: 'healthy',
    database: 'healthy',
    redis: 'healthy',
    payment: 'healthy',
  });

  const [loading, setLoading] = useState(false);

  const handleApproveDriver = (id: string) => {
    setVerifications(prev => prev.filter(v => v.id !== id));
  };

  const handleRejectDriver = (id: string) => {
    setVerifications(prev => prev.filter(v => v.id !== id));
  };

  if (!user || user.role !== 'admin') {
    return (
      <PageShell>
        <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#0c0f16', color: '#fff', borderRadius: 12 }}>
          <ShieldAlert size={48} color={C.cyan} style={{ margin: '0 auto 16px' }} />
          <h2>{ar ? 'غير مسموح بالدخول' : 'Access Denied'}</h2>
          <p>{ar ? 'لا تملك صلاحيات كافية لعرض لوحة التحكم للمشرفين.' : 'You do not have administrative privileges to access this console.'}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth={1200} dir={dir}>
      <div style={{ padding: 24, backgroundColor: '#0b0d13', minHeight: '100vh', color: '#f3f4f6' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#fff' }}>
              {ar ? 'لوحة تحكم المشرف' : 'Admin Operations Control'}
            </h1>
            <p style={{ color: '#9ca3af', marginTop: 4 }}>
              {ar ? 'إدارة منصة واصل والتحكم في العمليات والتحقق والنزاعات.' : 'Monitor Wasel infrastructure, verifications, system health, and disputes.'}
            </p>
          </div>
          <button 
            onClick={() => setLoading(true)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              padding: '10px 16px', 
              backgroundColor: C.cyan, 
              color: '#0c0f16', 
              border: 'none', 
              borderRadius: 8, 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            <RefreshCw size={16} />
            {ar ? 'تحديث البيانات' : 'Refresh System'}
          </button>
        </div>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 20,
          marginBottom: 32
        }}>
          <MetricBlock title={ar ? 'الرحلات النشطة' : 'Active Trips'} value={metrics.activeTrips} icon={<MapPin color={C.cyan} />} />
          <MetricBlock title={ar ? 'رحلات اليوم' : "Today's Rides"} value={metrics.todaysRides} icon={<TrendingUp color={C.cyan} />} />
          <MetricBlock title={ar ? 'الطرود المشحونة' : 'Active Packages'} value={metrics.totalPackages} icon={<Package color={C.cyan} />} />
          <MetricBlock title={ar ? 'المستخدمين النشطين' : 'Active Users'} value={metrics.activeUsers} icon={<Users color={C.cyan} />} />
          <MetricBlock title={ar ? 'النزاعات المعلقة' : 'Pending Disputes'} value={metrics.pendingDisputes} icon={<ShieldAlert color={C.gold} />} />
          <MetricBlock title={ar ? 'إجمالي الإيرادات (دينار)' : 'Total Revenue (JOD)'} value={`${metrics.totalRevenueJOD} JOD`} icon={<TrendingUp color={C.cyan} />} />
        </div>

        {/* Chart & Health */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Chart */}
          <div style={{ backgroundColor: '#11141c', padding: 24, borderRadius: 12, border: '1px solid #1f2937' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, color: '#fff' }}>{ar ? 'حجم حركة الرحلات اليومية' : 'Daily Ride Activity Volume'}</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={MOCK_CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#11141c', borderColor: '#374151', color: '#fff' }} />
                  <Line type="monotone" dataKey="rides" stroke={C.cyan} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* System Health */}
          <div style={{ backgroundColor: '#11141c', padding: 24, borderRadius: 12, border: '1px solid #1f2937' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, color: '#fff' }}>{ar ? 'حالة النظام' : 'Infrastructure Health'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <HealthItem label="API Gateway" status={systemStatus.api} />
              <HealthItem label="PostgreSQL DB" status={systemStatus.database} />
              <HealthItem label="Redis Geo-Bus" status={systemStatus.redis} />
              <HealthItem label="Stripe / CliQ Bridge" status={systemStatus.payment} />
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 8, alignItems: 'center', color: '#9ca3af', fontSize: 12 }}>
              <Radio size={14} color={C.cyan} />
              <span>{ar ? 'تحديث حي من الخوادم' : 'Live stream from k8s cluster telemetry'}</span>
            </div>
          </div>
        </div>

        {/* Verifications & Recent Events */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Driver Verifications */}
          <div style={{ backgroundColor: '#11141c', padding: 24, borderRadius: 12, border: '1px solid #1f2937' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, color: '#fff' }}>{ar ? 'طلبات توثيق السائقين' : 'Driver Onboarding Verification'}</h3>
            {verifications.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>{ar ? 'لا توجد طلبات معلقة.' : 'No pending driver verification requests.'}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {verifications.map(v => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#161b26', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{v.phone} • {v.licenseNumber}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => handleApproveDriver(v.id)} 
                        style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        {ar ? 'موافقة' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => handleRejectDriver(v.id)} 
                        style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        {ar ? 'رفض' : 'Reject'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Operations Events */}
          <div style={{ backgroundColor: '#11141c', padding: 24, borderRadius: 12, border: '1px solid #1f2937' }}>
            <h3 style={{ marginBottom: 20, fontSize: 18, color: '#fff' }}>{ar ? 'سجل العمليات الأخير' : 'Recent Telemetry Logs'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 10, borderBottom: '1px solid #1f2937' }}>
                  <div>
                    <span style={{ color: '#9ca3af', marginRight: 12 }}>{e.timestamp.split(' ')[1]}</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{e.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: '#9ca3af' }}>{e.user}</span>
                    <span style={{ 
                      color: e.status === 'SUCCESS' ? '#10b981' : e.status === 'WARNING' ? C.gold : C.cyan,
                      fontWeight: 600 
                    }}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div style={{ backgroundColor: '#11141c', padding: 24, borderRadius: 12, border: '1px solid #1f2937' }}>
          <h3 style={{ marginBottom: 20, fontSize: 18, color: '#fff' }}>{ar ? 'إجراءات تشغيل سريعة' : 'Critical Ops Quick Actions'}</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <ActionButton label={ar ? 'تصدير التقارير المالية' : 'Export Reconciliation Report'} icon={<Download size={16} />} color="#1f2937" />
            <ActionButton label={ar ? 'بث تنبيه عام للمستخدمين' : 'Broadcast Push Message'} icon={<Radio size={16} />} color="#1f2937" />
            <ActionButton label={ar ? 'تجميد حساب مشبوه' : 'Freeze Compromised Wallet'} icon={<Ban size={16} />} color="#7f1d1d" />
            <ActionButton label={ar ? 'إعادة مطابقة الطوابير' : 'Force Matching Run'} icon={<RefreshCw size={16} />} color="#1e3a8a" />
          </div>
        </div>

      </div>
    </PageShell>
  );
}

function MetricBlock({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#11141c',
      border: '1px solid #1f2937',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div>
        <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{value}</div>
      </div>
      <div style={{ backgroundColor: '#1c2230', padding: 12, borderRadius: 10 }}>{icon}</div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string; status: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#161b26', borderRadius: 8 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          backgroundColor: status === 'healthy' ? '#10b981' : '#ef4444' 
        }} />
        <span style={{ fontSize: 12, color: status === 'healthy' ? '#10b981' : '#ef4444', textTransform: 'capitalize' }}>
          {status}
        </span>
      </div>
    </div>
  );
}

function ActionButton({ label, icon, color }: { label: string; icon: React.ReactNode; color: string }) {
  return (
    <button style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 20px',
      backgroundColor: color,
      border: '1px solid #374151',
      borderRadius: 8,
      color: '#fff',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    }}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
