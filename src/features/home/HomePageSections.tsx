import { motion } from 'motion/react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { C, POPULAR_ROUTES, SectionHeader, Skeleton, SOSButton, TrustScoreCard } from './HomePageShared';
import type { HomeFeatureItem, HomeQuickAction, HomeStatItem } from './homePageConfig';

interface HomeStatsGridProps {
  loading: boolean;
  stats: HomeStatItem[];
}

interface QuickActionsSectionProps {
  ar: boolean;
  quickActions: HomeQuickAction[];
  estimatedRevenue: string;
  growthDashboard: {
    funnel: {
      searched: number;
      selected: number;
      booked: number;
      completed: number;
    };
    activeDemand: number;
  } | null;
  navigate: (path: string) => void;
}

interface GrowthSectionProps {
  ar: boolean;
  referral: {
    invited: number;
    earnedCredit: number;
    converted: number;
    shareUrl?: string | null;
  } | null;
  referralCode: string;
  referralMessage: string | null;
  corridorLeaders: Array<{
    corridor: string;
    serviceLabel: string;
    active: number;
  }>;
  setReferralCode: (value: string) => void;
  redeemReferral: (ar: boolean) => Promise<void>;
  navigate: (path: string) => void;
}

interface UserSnapshotSectionProps {
  ar: boolean;
  loading: boolean;
  liveStats: {
    walletBalance: number;
  } | null | undefined;
  platformStats: {
    activeDrivers: number;
    avgWaitMinutes: number;
    passengersMatchedToday: number;
  } | null | undefined;
  formatFromJOD: (value: number) => string;
}

interface MobilityOsSectionProps {
  ar: boolean;
  navigate: (path: string) => void;
}

interface PopularRoutesSectionProps {
  ar: boolean;
  loading: boolean;
  formatFromJOD: (value: number) => string;
  navigate: (path: string) => void;
}

interface FeaturesSectionProps {
  ar: boolean;
  features: HomeFeatureItem[];
}

interface GuestCtaSectionProps {
  ar: boolean;
  navigate: (path: string) => void;
}

export function HomeStatsGrid({
  loading,
  stats,
}: HomeStatsGridProps) {
  return (
    <div className="home-stats-grid stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="home-stat-card">
            <div className="home-stat-head">
              <Icon size={14} color={stat.color} />
              <span className="home-stat-label">{stat.label}</span>
            </div>
            <div className="home-stat-value stat-value" style={{ color: stat.color }}>
              {loading ? <Skeleton w={72} h={20} radius={6} /> : stat.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function QuickActionsSection({
  ar,
  quickActions,
  estimatedRevenue,
  growthDashboard,
  navigate,
}: QuickActionsSectionProps) {
  const funnelItems = [
    { label: ar ? 'بحث' : 'Search', value: growthDashboard?.funnel.searched ?? 0, color: C.cyan },
    { label: ar ? 'اختيار' : 'Select', value: growthDashboard?.funnel.selected ?? 0, color: C.gold },
    { label: ar ? 'حجز' : 'Booked', value: growthDashboard?.funnel.booked ?? 0, color: C.green },
    { label: ar ? 'اكتمل' : 'Complete', value: growthDashboard?.funnel.completed ?? 0, color: C.gold },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="home-section"
    >
      <SectionHeader title={ar ? 'ابدأ' : 'Start'} icon="+" />
      <div className="home-quick-grid">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="home-card-button"
              style={{ borderColor: action.border }}
            >
              <div className="home-card-orb" style={{ background: `radial-gradient(circle, ${action.color}15 0%, transparent 70%)` }} />
              <div className="home-badge-box" style={{ background: action.dim, borderColor: action.border }}>
                {action.badge}
              </div>
              <Icon size={18} color={action.color} />
              <span className="home-card-title">{action.title}</span>
              <span className="home-card-description">{action.description}</span>
              <div className="home-card-cta" style={{ color: action.color }}>
                <span>{ar ? 'افتح' : 'Open'}</span>
                <ChevronRight size={10} />
              </div>
            </motion.button>
          );
        })}

        <div className="home-panel">
          <div className="home-panel-title">{ar ? 'حي' : 'Live'}</div>
          <div className="home-funnel-grid">
            {funnelItems.map((item) => (
              <div key={item.label} className="home-metric-tile">
                <div className="home-metric-label">{item.label}</div>
                <div className="home-metric-value" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className="home-inline-metrics">
            <span>{ar ? 'إيراد' : 'Revenue'}: <strong>{estimatedRevenue}</strong></span>
            <span>{ar ? 'طلب' : 'Demand'}: <strong>{growthDashboard?.activeDemand ?? 0}</strong></span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function GrowthSection({
  ar,
  referral,
  referralCode,
  referralMessage,
  corridorLeaders,
  setReferralCode,
  redeemReferral,
  navigate,
}: GrowthSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.18 }}
      className="home-section"
    >
      <SectionHeader title={ar ? 'الإحالات' : 'Referrals'} icon="G" />
      <div className="home-two-column-grid">
        <div className="home-panel">
          <div className="home-panel-title">{ar ? 'الدعوات' : 'Invites'}</div>
          <div className="home-inline-metrics">
            <span>{ar ? 'دعوات مفعلة' : 'Invites activated'}: <strong>{referral?.invited ?? 0}</strong></span>
            <span>{ar ? 'رصيد الإحالات' : 'Referral credits'}: <strong>{referral?.earnedCredit ?? 0}</strong></span>
            <span>{ar ? 'التحويلات' : 'Conversions'}: <strong>{referral?.converted ?? 0}</strong></span>
          </div>
          <div className="home-button-row">
            <button
              type="button"
              className="home-secondary-button"
              onClick={() => {
                if (!referral?.shareUrl) return;
                void navigator.clipboard?.writeText(referral.shareUrl).catch(() => undefined);
              }}
            >
              {ar ? 'انسخ الرابط' : 'Copy link'}
            </button>
            <button type="button" className="home-tertiary-button" onClick={() => navigate('/find-ride')}>
              {ar ? 'الرحلات' : 'Rides'}
            </button>
            <button type="button" className="home-success-button" onClick={() => navigate('/analytics')}>
              {ar ? 'التحليلات' : 'Analytics'}
            </button>
          </div>
          <div className="home-stack-sm">
            <div className="home-subtle-text">
              {ar ? 'أدخل رمز إحالة.' : 'Add a referral code.'}
            </div>
            <div className="home-input-row">
              <input
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                placeholder={ar ? 'رمز الإحالة' : 'Referral code'}
                className="home-input"
              />
              <button type="button" className="home-secondary-button" onClick={() => void redeemReferral(ar)}>
                {ar ? 'تفعيل الرمز' : 'Redeem code'}
              </button>
            </div>
            {referralMessage ? <div className="home-subtle-text home-feedback">{referralMessage}</div> : null}
          </div>
        </div>

        <div className="home-panel">
          <div className="home-panel-title">{ar ? 'الطلب' : 'Demand'}</div>
          <div className="home-stack-sm">
            {corridorLeaders.length > 0 ? corridorLeaders.map((item) => (
              <button
                key={item.corridor}
                type="button"
                className="home-list-button"
                onClick={() => {
                  const [from, to] = item.corridor.split(' to ');
                  navigate(`/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`);
                }}
              >
                <div>
                  <div className="home-list-title">{item.corridor}</div>
                  <div className="home-list-subtitle">{item.serviceLabel}</div>
                </div>
                <span className="home-list-value">{item.active}</span>
              </button>
            )) : (
              <div className="home-subtle-text">
                {ar ? 'سيظهر الطلب هنا.' : 'Demand will appear here.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function UserSnapshotSection({
  ar,
  loading,
  liveStats,
  platformStats,
  formatFromJOD,
}: UserSnapshotSectionProps) {
  const signals = platformStats
    ? [
        { value: platformStats.activeDrivers, label: ar ? 'السائقون' : 'Drivers', color: C.cyan },
        { value: `${platformStats.avgWaitMinutes} min`, label: ar ? 'متوسط الانتظار' : 'Avg Wait', color: C.gold },
        { value: platformStats.passengersMatchedToday.toLocaleString(), label: ar ? 'المطابقات' : 'Matched', color: C.green },
      ]
    : [];

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.24 }}
        className="home-snapshot-row"
      >
        <div className="home-panel home-wallet-panel">
          <div className="home-mini-label">{ar ? 'المحفظة' : 'Wallet'}</div>
          <div className="home-balance-value">
            {loading ? <Skeleton w={100} h={28} radius={6} /> : formatFromJOD(liveStats?.walletBalance ?? 47.5)}
          </div>
          <div className="home-stat-label">{liveStats ? `JOD ${liveStats.walletBalance.toFixed(3)} base` : ''}</div>
        </div>

        {platformStats ? (
          <div className="home-panel home-platform-panel">
            <div className="home-mini-label">{ar ? 'حي' : 'Live'}</div>
            <div className="home-inline-signal-row">
              {signals.map((signal) => (
                <div key={signal.label} className="home-inline-signal">
                  <span className="home-inline-dot" style={{ background: signal.color, boxShadow: `0 0 6px ${signal.color}` }} />
                  <span style={{ color: signal.color, fontWeight: 800 }}>{signal.value}</span>
                  <span className="home-stat-label">{signal.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="home-panel home-sos-panel">
          <div className="home-mini-label">SOS</div>
          <SOSButton ar={ar} />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
        className="home-section"
      >
        <SectionHeader title={ar ? 'الثقة' : 'Trust'} icon="T" />
        {loading ? <Skeleton h={80} radius={16} /> : <TrustScoreCard score={87} ar={ar} />}
      </motion.section>
    </>
  );
}

export function MobilityOsSection({
  ar,
  navigate,
}: MobilityOsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="home-section"
    >
      <motion.button
        type="button"
        onClick={() => navigate('/mobility-os')}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="home-os-button"
      >
        <div className="home-os-grid" />
        <div className="home-os-content">
          <div>
            <div className="home-os-header">
              <span className="home-os-icon">OS</span>
              <span className="home-os-tag">Mobility OS</span>
              <span className="home-os-live">LIVE</span>
            </div>
            <div className="home-os-title">
              {ar ? 'شبكة الأردن الحية' : 'Jordan live network'}
            </div>
            <div className="home-os-subtitle">
              {ar ? 'الطلب | السائقون | المسارات' : 'Demand | drivers | routes'}
            </div>
          </div>
          <div className="home-os-open">
            <span>{ar ? 'افتح' : 'Open'}</span>
            <ArrowUpRight size={18} />
          </div>
        </div>
      </motion.button>
    </motion.section>
  );
}

export function PopularRoutesSection({
  ar,
  loading,
  formatFromJOD,
  navigate,
}: PopularRoutesSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.36 }}
      className="home-section"
    >
      <SectionHeader
        title={ar ? 'المسارات' : 'Routes'}
        icon="R"
        action={ar ? 'الكل' : 'All'}
        onAction={() => navigate('/find-ride')}
      />
      <div className="home-routes-grid routes-grid">
        {loading ? Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="home-route-card">
            <Skeleton w="60%" h={14} radius={6} />
            <div style={{ marginTop: 8 }}>
              <Skeleton w="40%" h={18} radius={6} />
            </div>
          </div>
        )) : POPULAR_ROUTES.map((route) => (
          <motion.button
            key={`${route.from}-${route.to}`}
            type="button"
            onClick={() => navigate(`/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`)}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="home-route-card"
          >
            <div className="home-route-head">
              <span className="home-route-icon">{route.icon}</span>
              <span className="home-route-title">
                {ar ? `${route.fromAr} ← ${route.toAr}` : `${route.from} → ${route.to}`}
              </span>
            </div>
            <div className="home-route-meta">
              <span className="home-stat-label">{route.dist} {ar ? 'كم' : 'km'}</span>
              <span style={{ color: route.color, fontWeight: 800 }}>
                {formatFromJOD(route.priceJod)}
                <span className="home-route-unit">{ar ? '/للمقعد' : '/seat'}</span>
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}

export function FeaturesSection({
  ar,
  features,
}: FeaturesSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.42 }}
      className="home-section"
    >
      <SectionHeader title={ar ? 'لماذا واصل؟' : 'Why Wasel'} icon="W" />
      <div className="home-feature-grid">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.08 + 0.45 }}
              className="home-feature-card"
            >
              <div className="home-feature-head">
                <div className="home-feature-icon-box" style={{ background: `${feature.color}15`, borderColor: `${feature.color}25` }}>
                  <Icon size={14} color={feature.color} />
                </div>
                <span className="home-feature-title">{feature.title}</span>
              </div>
              <p className="home-feature-description">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

export function GuestCtaSection({
  ar,
  navigate,
}: GuestCtaSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="home-section home-guest-cta"
    >
      <div className="home-panel home-guest-panel">
        <div className="home-guest-mark">W</div>
        <h2 className="home-panel-title">{ar ? 'انضم إلى واصل' : 'Join Wasel'}</h2>
        <p className="home-panel-copy">
          {ar ? 'رحلات وباصات وطرود في تطبيق واحد.' : 'Rides, buses, and packages in one app.'}
        </p>
        <div className="home-button-row home-button-row-center">
          <button type="button" className="home-primary-button" onClick={() => navigate('/auth?tab=register')}>
            {ar ? 'ابدأ' : 'Get started'}
          </button>
          <button type="button" className="home-tertiary-button" onClick={() => navigate('/find-ride')}>
            {ar ? 'الرحلات' : 'Browse'}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
