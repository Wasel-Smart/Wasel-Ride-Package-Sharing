import { motion } from 'motion/react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { C, POPULAR_ROUTES, SectionHeader, Skeleton, SOSButton } from './HomePageShared';
import type {
  HomeFeatureItem,
  HomeHeroHighlight,
  HomeQuickAction,
  HomeServicePillar,
  HomeStatItem,
} from './homePageConfig';

interface HomeStatsGridProps {
  loading: boolean;
  stats: HomeStatItem[];
}

interface FocusHeroSectionProps {
  ar: boolean;
  userName: string;
  highlights: HomeHeroHighlight[];
  navigate: (path: string) => void;
}

interface ServicePillarsSectionProps {
  ar: boolean;
  pillars: HomeServicePillar[];
  navigate: (path: string) => void;
}

interface QuickActionsSectionProps {
  ar: boolean;
  quickActions: HomeQuickAction[];
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
  liveStats:
    | {
        walletBalance: number;
      }
    | null
    | undefined;
  platformStats:
    | {
        activeDrivers: number;
        seatAvailability: number;
        passengersMatchedToday: number;
      }
    | null
    | undefined;
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

export function HomeStatsGrid({ loading, stats }: HomeStatsGridProps) {
  return (
    <div className="home-stats-grid stats-grid">
      {stats.map(stat => {
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

export function FocusHeroSection({ ar, userName, highlights, navigate }: FocusHeroSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.04 }}
      className="home-section home-section-tight"
    >
      <div className="home-focus-hero">
        <div className="home-focus-copy">
          <div className="home-mini-label">{ar ? 'منصة حركة واحدة' : 'One movement platform'}</div>
          <h2 className="home-focus-title">
            {ar
              ? `كل ما تحتاجه للتنقل والإرسال في واجهة واحدة${userName ? `، ${userName}` : ''}`
              : `Everything for moving people and packages in one flow${userName ? `, ${userName}` : ''}`}
          </h2>
          <p className="home-focus-description">
            {ar
              ? 'واسِل يجمع الرحلات والطرود والباصات والثقة التشغيلية في تجربة أوضح وأسهل.'
              : 'Wasel brings rides, packages, buses, and trust operations into a clearer, tighter experience.'}
          </p>
          <div className="home-button-row">
            <button
              type="button"
              className="home-primary-button"
              onClick={() => navigate('/find-ride')}
            >
              {ar ? 'ابدأ برحلة' : 'Start a trip'}
            </button>
            <button
              type="button"
              className="home-tertiary-button"
              onClick={() => navigate('/mobility-os')}
            >
              {ar ? 'شاهد الشبكة الحية' : 'View live network'}
            </button>
          </div>
        </div>

        <div className="home-focus-highlights">
          {highlights.map(item => (
            <div
              key={item.title}
              className="home-focus-highlight"
              style={{ borderColor: `${item.color}30` }}
            >
              <span className="home-focus-dot" style={{ background: item.color }} />
              <div>
                <div className="home-card-title">{item.title}</div>
                <div className="home-card-description">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function ServicePillarsSection({ ar, pillars, navigate }: ServicePillarsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="home-section home-section-tight"
    >
      <SectionHeader title={ar ? 'ماذا يمكنك أن تفعل هنا؟' : 'What can you do here?'} icon="W" />
      <div className="home-pillars-grid">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <motion.button
              key={pillar.title}
              type="button"
              onClick={() => navigate(pillar.path)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.06 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="home-pillar-card"
              style={{ borderColor: pillar.border }}
            >
              <div
                className="home-feature-icon-box"
                style={{ background: pillar.dim, borderColor: pillar.border }}
              >
                <Icon size={16} color={pillar.color} />
              </div>
              <div className="home-card-title">{pillar.title}</div>
              <div className="home-card-description">{pillar.description}</div>
              <div className="home-card-cta" style={{ color: pillar.color }}>
                <span>{pillar.metric}</span>
                <ChevronRight size={10} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

export function QuickActionsSection({ ar, quickActions, navigate }: QuickActionsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="home-section"
    >
      <SectionHeader
        title={ar ? '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646' : 'Start now'}
        icon="+"
      />
      <div className="home-quick-grid">
        <div className="home-panel home-featured-panel">
          <div className="home-mini-label">
            {ar ? '\u0627\u0644\u0628\u062f\u0627\u064a\u0629' : 'Start'}
          </div>
          <div className="home-featured-title">
            {ar
              ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u062e\u062f\u0645\u0629'
              : 'Choose a service'}
          </div>
          <p className="home-panel-copy home-featured-copy">
            {ar
              ? '\u0631\u062d\u0644\u0629\u060c \u0637\u0631\u062f\u060c \u0623\u0648 \u0628\u0627\u0635.'
              : 'Ride, package, or bus.'}
          </p>
          <div className="home-button-row">
            <button
              type="button"
              className="home-primary-button"
              onClick={() => navigate('/find-ride')}
            >
              {ar
                ? '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629'
                : 'Find a ride'}
            </button>
            <button
              type="button"
              className="home-secondary-button"
              onClick={() => navigate('/offer-ride')}
            >
              {ar ? '\u0627\u0639\u0631\u0636 \u0631\u062d\u0644\u0629' : 'Offer a ride'}
            </button>
          </div>
        </div>

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
              <div
                className="home-card-orb"
                style={{
                  background: `radial-gradient(circle, ${action.color}15 0%, transparent 70%)`,
                }}
              />
              <div
                className="home-badge-box"
                style={{ background: action.dim, borderColor: action.border }}
              >
                {action.badge}
              </div>
              <Icon size={18} color={action.color} />
              <span className="home-card-title">{action.title}</span>
              <span className="home-card-description">{action.description}</span>
              <div className="home-card-cta" style={{ color: action.color }}>
                <span>{ar ? '\u0627\u0641\u062a\u062d' : 'Open'}</span>
                <ChevronRight size={10} />
              </div>
            </motion.button>
          );
        })}
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
      <SectionHeader title={ar ? 'النمو والطلب' : 'Growth and demand'} icon="G" />
      <div className="home-two-column-grid">
        <div className="home-panel">
          <div className="home-panel-title">{ar ? 'الإحالات' : 'Referrals'}</div>
          <div className="home-inline-metrics">
            <span>
              {ar ? 'دعوات مفعلة' : 'Invites activated'}: <strong>{referral?.invited ?? 0}</strong>
            </span>
            <span>
              {ar ? 'رصيد الإحالات' : 'Referral credits'}:{' '}
              <strong>{referral?.earnedCredit ?? 0}</strong>
            </span>
            <span>
              {ar ? 'التحويلات' : 'Conversions'}: <strong>{referral?.converted ?? 0}</strong>
            </span>
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
            <button
              type="button"
              className="home-tertiary-button"
              onClick={() => navigate('/find-ride')}
            >
              {ar ? 'الرحلات' : 'Rides'}
            </button>
            <button
              type="button"
              className="home-success-button"
              onClick={() => navigate('/analytics')}
            >
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
                onChange={event => setReferralCode(event.target.value.toUpperCase())}
                placeholder={ar ? 'رمز الإحالة' : 'Referral code'}
                className="home-input"
              />
              <button
                type="button"
                className="home-secondary-button"
                onClick={() => void redeemReferral(ar)}
              >
                {ar ? 'تفعيل الرمز' : 'Redeem code'}
              </button>
            </div>
            {referralMessage ? (
              <div className="home-subtle-text home-feedback">{referralMessage}</div>
            ) : null}
          </div>
        </div>

        <div className="home-panel">
          <div className="home-panel-title">
            {ar ? 'أعلى المسارات طلباً' : 'Highest demand corridors'}
          </div>
          <div className="home-stack-sm">
            {corridorLeaders.length > 0 ? (
              corridorLeaders.map(item => (
                <button
                  key={item.corridor}
                  type="button"
                  className="home-list-button"
                  onClick={() => {
                    const [from, to] = item.corridor.split(' to ');
                    navigate(
                      `/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`,
                    );
                  }}
                >
                  <div>
                    <div className="home-list-title">{item.corridor}</div>
                    <div className="home-list-subtitle">{item.serviceLabel}</div>
                  </div>
                  <span className="home-list-value">{item.active}</span>
                </button>
              ))
            ) : (
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
        {
          value: platformStats.activeDrivers,
          label: ar ? '\u0627\u0644\u0633\u0627\u0626\u0642\u0648\u0646' : 'Drivers',
          color: C.cyan,
        },
        {
          value: platformStats.seatAvailability.toLocaleString(),
          label: ar ? '\u0627\u0644\u0645\u0642\u0627\u0639\u062f' : 'Seats open',
          color: C.gold,
        },
        {
          value: platformStats.passengersMatchedToday.toLocaleString(),
          label: ar ? '\u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0627\u062a' : 'Matched',
          color: C.green,
        },
      ]
    : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.24 }}
      className="home-snapshot-row"
    >
      <div className="home-panel home-wallet-panel">
        <div className="home-mini-label">
          {ar ? '\u0627\u0644\u0645\u062d\u0641\u0638\u0629' : 'Wallet'}
        </div>
        <div className="home-balance-value">
          {loading ? (
            <Skeleton w={100} h={28} radius={6} />
          ) : (
            formatFromJOD(liveStats?.walletBalance ?? 0)
          )}
        </div>
        <div className="home-stat-label">
          {liveStats ? `JOD ${liveStats.walletBalance.toFixed(3)}` : ''}
        </div>
      </div>

      {platformStats ? (
        <div className="home-panel home-platform-panel">
          <div className="home-mini-label">{ar ? '\u062d\u064a' : 'Live'}</div>
          <div className="home-inline-signal-row">
            {signals.map(signal => (
              <div key={signal.label} className="home-inline-signal">
                <span
                  className="home-inline-dot"
                  style={{ background: signal.color, boxShadow: `0 0 6px ${signal.color}` }}
                />
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
  );
}

export function MobilityOsSection({ ar, navigate }: MobilityOsSectionProps) {
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
            <div className="home-os-title">{ar ? 'شبكة الأردن الحية' : 'Jordan live network'}</div>
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
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="home-route-card">
                <Skeleton w="60%" h={14} radius={6} />
                <div style={{ marginTop: 8 }}>
                  <Skeleton w="40%" h={18} radius={6} />
                </div>
              </div>
            ))
          : POPULAR_ROUTES.map(route => (
              <motion.button
                key={`${route.from}-${route.to}`}
                type="button"
                onClick={() =>
                  navigate(
                    `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`,
                  )
                }
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
                  <span className="home-stat-label">
                    {route.dist} {ar ? 'كم' : 'km'}
                  </span>
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

export function FeaturesSection({ ar, features }: FeaturesSectionProps) {
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
                <div
                  className="home-feature-icon-box"
                  style={{ background: `${feature.color}15`, borderColor: `${feature.color}25` }}
                >
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

export function GuestCtaSection({ ar, navigate }: GuestCtaSectionProps) {
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
          <button
            type="button"
            className="home-primary-button"
            onClick={() => navigate('/auth?tab=register')}
          >
            {ar ? 'ابدأ' : 'Get started'}
          </button>
          <button
            type="button"
            className="home-tertiary-button"
            onClick={() => navigate('/find-ride')}
          >
            {ar ? 'الرحلات' : 'Browse'}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
