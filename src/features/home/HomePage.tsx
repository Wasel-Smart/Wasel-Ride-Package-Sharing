import { motion } from 'motion/react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLivePlatformStats, useLiveUserStats } from '../../services/liveDataService';
import { useCurrency } from '../../utils/currency';
import { C, F } from './HomePageShared';
import {
  FocusHeroSection,
  GuestCtaSection,
  HomeStatsGrid,
  MobilityOsSection,
  PopularRoutesSection,
  QuickActionsSection,
  ServicePillarsSection,
  UserSnapshotSection,
} from './HomePageSections';
import {
  buildHeroHighlights,
  buildQuickActions,
  buildServicePillars,
  buildStatsData,
  buildTripModeOptions,
  type HomeTripModeOption,
} from './homePageConfig';
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
            <WaselMark
              size={176}
              style={{
                filter:
                  'drop-shadow(0 26px 48px rgba(1,10,18,0.34)) drop-shadow(0 0 34px rgba(169,227,255,0.18))',
              }}
            />
          </div>
        </motion.div>
        <div className="home-hero-copy">
          <p className="home-eyebrow">
            {ar ? 'واصل | شبكة الحركة' : 'WASEL | Mobility Network'}
          </p>
          <h1 className="home-hero-title hero-title">
            {ar ? `أهلاً بعودتك${firstName ? `، ${firstName}` : ''}` : `Welcome back${firstName ? `, ${firstName}` : ''}`}
          </h1>
          <p className="home-subtle">
            {ar ? 'نقل أشخاص، طرود، وثقة تشغيلية في تجربة واحدة واضحة.' : 'Move people, packages, and operational trust through one unified experience.'}
          </p>
        </div>
      </div>

      <div className="home-panel home-panel-accent">
        <p className="home-mini-label">{ar ? 'نوع الرحلة' : 'TRIP TYPE'}</p>
        <p className="home-panel-copy">
          {ar ? 'اختر النمط ثم ادخل الشبكة.' : 'Choose the mode, then enter the network.'}
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
  } = useHomePageDashboard(user);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const heroHighlights = buildHeroHighlights(ar);
  const quickActions = buildQuickActions(ar);
  const servicePillars = buildServicePillars(ar);
  const stats = buildStatsData(ar, liveStats, formatFromJOD);
  const tripModeOptions = buildTripModeOptions(ar);

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

        <FocusHeroSection
          ar={ar}
          userName={firstName}
          highlights={heroHighlights}
          navigate={navigate}
        />

        <HomeStatsGrid loading={loading} stats={stats} />

        <QuickActionsSection
          ar={ar}
          quickActions={quickActions}
          navigate={navigate}
        />

        <ServicePillarsSection
          ar={ar}
          pillars={servicePillars}
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

        <PopularRoutesSection
          ar={ar}
          loading={loading}
          formatFromJOD={formatFromJOD}
          navigate={navigate}
        />

        <MobilityOsSection ar={ar} navigate={navigate} />

        {!user ? <GuestCtaSection ar={ar} navigate={navigate} /> : null}
      </div>
    </div>
  );
}
