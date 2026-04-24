import { motion } from 'motion/react';
import { CheckCircle, RefreshCw } from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLivePlatformStats, useLiveUserStats } from '../../services/liveDataService';
import { useCurrency } from '../../utils/currency';
import { getLocalizedCopy } from '../../utils/localizedCopy';
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

const HOME_COPY = {
  eyebrow: {
    ar: 'واصل | شبكة الحركة',
    en: 'WASEL | Mobility Network',
  },
  heroSubtitle: {
    ar: 'انقل أشخاصًا وطرودًا وثقة تشغيلية في تجربة واحدة واضحة.',
    en: 'Move people, packages, and operational trust through one unified experience.',
  },
  refresh: {
    ar: 'تحديث',
    en: 'Refresh',
  },
  refreshing: {
    ar: 'جارٍ التحديث...',
    en: 'Refreshing...',
  },
  tripModeDetail: {
    ar: 'اختر النمط ثم ادخل الشبكة.',
    en: 'Choose the mode, then enter the network.',
  },
  tripModeLabel: {
    ar: 'نوع الرحلة',
    en: 'TRIP TYPE',
  },
  welcomeBack: {
    ar: 'أهلاً بعودتك',
    en: 'Welcome back',
  },
} as const;

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
  eyebrowText,
  headlineText,
  options,
  onSelectMode,
  subtitleText,
  tripMode,
  tripModeDetail,
  tripModeLabel,
}: {
  eyebrowText: string;
  headlineText: string;
  options: HomeTripModeOption[];
  onSelectMode: (option: HomeTripModeOption) => void;
  subtitleText: string;
  tripMode: 'one-way' | 'round';
  tripModeDetail: string;
  tripModeLabel: string;
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
          <p className="home-eyebrow">{eyebrowText}</p>
          <h1 className="home-hero-title hero-title">{headlineText}</h1>
          <p className="home-subtle">{subtitleText}</p>
        </div>
      </div>

      <div className="home-panel home-panel-accent">
        <p className="home-mini-label">{tripModeLabel}</p>
        <p className="home-panel-copy">{tripModeDetail}</p>
        <div className="home-trip-mode-grid">
          {options.map(option => {
            const Icon = option.icon;
            const isActive = tripMode === option.key;
            return (
              <button
                aria-label={option.title}
                aria-pressed={isActive}
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
                  <div
                    className="home-trip-mode-title"
                    style={{ color: isActive ? option.accent : C.text }}
                  >
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

  const { stars, refreshing, handleRefresh, tripMode, setTripMode } = useHomePageDashboard(user);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';
  const eyebrowText = getLocalizedCopy(language, HOME_COPY.eyebrow);
  const headlinePrefix = getLocalizedCopy(language, HOME_COPY.welcomeBack);
  const headlineText =
    language === 'ar'
      ? `${headlinePrefix}${firstName ? `، ${firstName}` : ''}`
      : `${headlinePrefix}${firstName ? `, ${firstName}` : ''}`;
  const subtitleText = getLocalizedCopy(language, HOME_COPY.heroSubtitle);
  const tripModeLabel = getLocalizedCopy(language, HOME_COPY.tripModeLabel);
  const tripModeDetail = getLocalizedCopy(language, HOME_COPY.tripModeDetail);
  const refreshLabel = refreshing
    ? getLocalizedCopy(language, HOME_COPY.refreshing)
    : getLocalizedCopy(language, HOME_COPY.refresh);
  const heroHighlights = buildHeroHighlights(ar);
  const quickActions = buildQuickActions(ar);
  const servicePillars = buildServicePillars(ar);
  const stats = buildStatsData(ar, liveStats, formatFromJOD);
  const tripModeOptions = buildTripModeOptions(ar);

  return (
    <div className="home-root" dir={dir} style={{ background: C.bg, color: C.text, fontFamily: F }}>
      <HomeBackdrop stars={stars} />

      <div className="home-shell">
        <div className="home-toolbar">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="home-pill-button"
          >
            <RefreshCw
              size={12}
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
            />
            {refreshLabel}
          </button>
        </div>

        <HomeHero
          eyebrowText={eyebrowText}
          headlineText={headlineText}
          tripMode={tripMode}
          tripModeDetail={tripModeDetail}
          tripModeLabel={tripModeLabel}
          options={tripModeOptions}
          subtitleText={subtitleText}
          onSelectMode={option => {
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

        <QuickActionsSection ar={ar} quickActions={quickActions} navigate={navigate} />

        <ServicePillarsSection ar={ar} pillars={servicePillars} navigate={navigate} />

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
