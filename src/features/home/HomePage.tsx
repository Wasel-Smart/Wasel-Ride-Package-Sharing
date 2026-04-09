import { motion } from 'motion/react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLivePlatformStats, useLiveUserStats } from '../../services/liveDataService';
import { getCorridorDemandLeaders } from '../../services/growthEngine';
import { useCurrency } from '../../utils/currency';
import { C, F } from './HomePageShared';
import {
  FeaturesSection,
  GuestCtaSection,
  GrowthSection,
  HomeStatsGrid,
  MobilityOsSection,
  PopularRoutesSection,
  QuickActionsSection,
  UserSnapshotSection,
} from './HomePageSections';
import { buildFeatureItems, buildQuickActions, buildStatsData, buildTripModeOptions, type HomeTripModeOption } from './homePageConfig';
import { useHomePageDashboard } from './useHomePageDashboard';
import './HomePage.css';

function HomeBackdrop({
  stars,
}: {
  stars: Array<{ x: number; y: number; opacity: number; size: number }>;
}) {
  return (
    <div className="home-backdrop">
      {stars.map((star, index) => (
        <div
          key={`${star.x}-${star.y}-${index}`}
          className="home-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
      <div className="home-glow home-glow-top" />
      <div className="home-glow home-glow-bottom" />
    </div>
  );
}

function HomeHero({
  ar,
  firstName,
  tripMode,
  options,
  onSelectMode,
}: {
  ar: boolean;
  firstName: string;
  tripMode: 'one-way' | 'round';
  options: HomeTripModeOption[];
  onSelectMode: (option: HomeTripModeOption) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="home-stack-lg"
    >
      <div className="home-hero-header">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="home-logo-wrap"
        >
          <div className="home-logo-glow" />
          <div className="home-logo-mark">
            <WaselMark size={80} />
          </div>
        </motion.div>
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            {ar ? 'واصل' : 'WASEL'}
          </p>
          <h1 className="home-hero-title hero-title">
            {ar ? `أهلاً بعودتك${firstName ? `، ${firstName}` : ''}` : `Welcome back${firstName ? `, ${firstName}` : ''}`}
          </h1>
          <p className="home-subtle">
            {ar ? 'إلى أين؟' : 'Where to?'}
          </p>
        </div>
      </div>

      <div className="home-panel home-panel-accent">
        <p className="home-mini-label">{ar ? 'نوع الرحلة' : 'TRIP TYPE'}</p>
        <p className="home-panel-copy">
          {ar ? 'اختر واحدا وابدأ.' : 'Choose once and go.'}
        </p>
        <div className="home-trip-mode-grid">
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = tripMode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectMode(option)}
                className="home-trip-mode-card"
                style={{
                  borderColor: isActive ? option.accent : 'rgba(255,255,255,0.10)',
                  background: isActive ? `${option.accent}26` : 'rgba(255,255,255,0.04)',
                }}
              >
                <Icon size={18} color={isActive ? option.accent : C.textDim} />
                <div className="home-trip-mode-copy">
                  <div className="home-trip-mode-title" style={{ color: isActive ? option.accent : C.text }}>
                    {option.title}
                  </div>
                  <div className="home-trip-mode-description">{option.description}</div>
                </div>
                {isActive ? <CheckCircle size={14} color={option.accent} /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

export function HomePage() {
  const { language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useIframeSafeNavigate();
  const { formatFromJOD } = useCurrency();
  const { stats: liveStats, loading } = useLiveUserStats();
  const platformStats = useLivePlatformStats();
  const ar = language === 'ar';

  const {
    stars,
    refreshing,
    handleRefresh,
    tripMode,
    setTripMode,
    referral,
    referralCode,
    setReferralCode,
    referralMessage,
    growthDashboard,
    redeemReferral,
  } = useHomePageDashboard(user);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const quickActions = buildQuickActions(ar);
  const stats = buildStatsData(ar, liveStats, formatFromJOD);
  const features = buildFeatureItems(ar);
  const tripModeOptions = buildTripModeOptions(ar);
  const corridorLeaders = getCorridorDemandLeaders();
  const estimatedRevenue = formatFromJOD(growthDashboard?.revenueJod ?? 0);

  return (
    <div className="home-root" dir={dir} style={{ background: C.bg, color: C.text, fontFamily: F }}>
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <HomeBackdrop stars={stars} />

      <div className="home-shell">
        <div className="home-toolbar">
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="home-pill-button">
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {ar ? (refreshing ? 'جارٍ التحديث...' : 'تحديث') : refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <HomeHero
          ar={ar}
          firstName={firstName}
          tripMode={tripMode}
          options={tripModeOptions}
          onSelectMode={(option) => {
            setTripMode(option.key);
            navigate(option.path);
          }}
        />

        <HomeStatsGrid loading={loading} stats={stats} />

        <QuickActionsSection
          ar={ar}
          quickActions={quickActions}
          estimatedRevenue={estimatedRevenue}
          growthDashboard={growthDashboard}
          navigate={navigate}
        />

        <GrowthSection
          ar={ar}
          referral={referral}
          referralCode={referralCode}
          referralMessage={referralMessage}
          corridorLeaders={corridorLeaders}
          setReferralCode={setReferralCode}
          redeemReferral={redeemReferral}
          navigate={navigate}
        />

        {user ? (
          <UserSnapshotSection
            ar={ar}
            loading={loading}
            liveStats={liveStats}
            platformStats={platformStats}
            formatFromJOD={formatFromJOD}
          />
        ) : null}

        <MobilityOsSection ar={ar} navigate={navigate} />

        <PopularRoutesSection
          ar={ar}
          loading={loading}
          formatFromJOD={formatFromJOD}
          navigate={navigate}
        />

        <FeaturesSection ar={ar} features={features} />

        {!user ? <GuestCtaSection ar={ar} navigate={navigate} /> : null}
      </div>
    </div>
  );
}
