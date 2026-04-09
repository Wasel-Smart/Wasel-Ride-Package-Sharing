import { useState } from 'react';
import { Car, Package, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { trackGrowthEvent } from '../../services/growthEngine';
import { friendlyAuthError } from '../../utils/authHelpers';
import { buildAuthPagePath } from '../../utils/authFlow';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import {
  LANDING_COLORS,
  type LandingActionCard,
  type LandingRowDefinition,
  type LandingSignalCard,
  LandingFooterSlot,
  LandingHeader,
  LandingHeroSection,
  LandingMapSection,
  LandingPageFrame,
  LandingSignalSection,
  LandingSlotRows,
  LandingTrustSection,
  LandingWhySlot,
} from './LandingSections';

const LANDING_ROWS: readonly LandingRowDefinition[] = [
  {
    id: 'main',
    className: 'landing-main-grid',
    style: { display: 'grid', gridTemplateColumns: '1fr', gap: 20, alignItems: 'stretch' },
    slots: ['hero'],
  },
  { id: 'map', style: { marginTop: 4 }, slots: ['map'] },
  {
    id: 'signals',
    className: 'landing-signal-grid',
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 16,
    },
    slots: ['signals'],
  },
  {
    id: 'trust',
    className: 'landing-bottom-grid',
    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 },
    slots: ['why', 'trust'],
  },
  { id: 'footer', style: { marginTop: 16 }, slots: ['footer'] },
] as const;

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [authError, setAuthError] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'google' | 'facebook' | null>(null);
  const ar = language === 'ar';
  const profile = getWaselPresenceProfile();
  const defaultReturnTo = '/app/find-ride';
  const signInPath = buildAuthPagePath('signin', defaultReturnTo);
  const signUpPath = buildAuthPagePath('signup', defaultReturnTo);

  const buildPath = (path: string, requiresAuth = false) =>
    !requiresAuth || user ? path : buildAuthPagePath('signin', path);
  const handleLandingNavigate = (path: string) => {
    const eventMap = [
      {
        match: '/app/find-ride',
        eventName: 'landing_find_ride_opened',
        serviceType: 'ride' as const,
      },
      {
        match: '/app/offer-ride',
        eventName: 'landing_offer_ride_opened',
        serviceType: 'ride' as const,
      },
      {
        match: '/app/packages',
        eventName: 'landing_packages_opened',
        serviceType: 'package' as const,
      },
      {
        match: '/app/mobility-os',
        eventName: 'landing_mobility_os_opened',
        serviceType: 'ride' as const,
      },
      {
        match: '/app/my-trips',
        eventName: 'landing_my_trips_opened',
        serviceType: 'ride' as const,
      },
      { match: 'tab=signup', eventName: 'landing_signup_opened', serviceType: 'referral' as const },
      { match: 'tab=signin', eventName: 'landing_signin_opened', serviceType: 'referral' as const },
    ].find(item => path.includes(item.match));

    void trackGrowthEvent({
      userId: user?.id,
      eventName: eventMap?.eventName ?? 'landing_navigation',
      funnelStage: 'selected',
      serviceType: eventMap?.serviceType ?? 'ride',
      metadata: {
        path,
        authState: user ? 'authenticated' : 'guest',
        locale: language,
      },
    });

    navigate(path);
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setAuthError('');
    setOauthProvider(provider);
    const result =
      provider === 'google'
        ? await signInWithGoogle(defaultReturnTo)
        : await signInWithFacebook(defaultReturnTo);
    if (result.error) {
      setAuthError(
        friendlyAuthError(
          result.error,
          provider === 'google' ? 'Google sign-in failed.' : 'Facebook sign-in failed.',
        ),
      );
      setOauthProvider(null);
    }
  };

  const primaryActions: readonly LandingActionCard[] = [
    {
      title: ar ? 'ابحث عن رحلة' : 'Find a ride',
      detail: ar
        ? 'رحلات حية'
        : 'Live routes',
      path: buildPath('/app/find-ride'),
      icon: Search,
      color: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'أنشئ رحلة' : 'Create a ride',
      detail: ar
        ? 'شارك المقاعد'
        : 'Share seats',
      path: buildPath('/app/offer-ride', true),
      icon: Car,
      color: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'أرسل طردا' : 'Send a package',
      detail: ar
        ? 'توصيل عبر الرحلات'
        : 'Ride-based delivery',
      path: buildPath('/app/packages'),
      icon: Package,
      color: LANDING_COLORS.green,
    },
  ] as const;

  const signalCards: readonly LandingSignalCard[] = [
    {
      title: ar ? 'للركاب' : 'For riders',
      detail: ar
        ? 'الممرات الأقوى أولا'
        : 'See the strongest lanes first.',
      accent: LANDING_COLORS.cyan,
      trendLabel: ar ? 'تحسن' : 'Up',
      trendDirection: 'up',
      intensity: ar ? 'قوي' : 'Strong',
      sparkline: [32, 36, 40, 44, 48, 55],
    },
    {
      title: ar ? 'لمنشئي الرحلات' : 'For ride creators',
      detail: ar
        ? 'افتح حيث يوجد طلب'
        : 'Open where demand is high.',
      accent: LANDING_COLORS.gold,
      trendLabel: ar ? 'صاعد' : 'Up',
      trendDirection: 'up',
      intensity: ar ? 'متوازن' : 'Balanced',
      sparkline: [24, 29, 27, 34, 38, 43],
    },
    {
      title: ar ? 'للطرود' : 'For packages',
      detail: ar
        ? 'طرود على نفس الشبكة'
        : 'Packages on the same network.',
      accent: LANDING_COLORS.green,
      trendLabel: ar ? 'أكثر ثباتا' : 'Stable',
      trendDirection: 'down',
      intensity: ar ? 'سلس' : 'Smooth',
      sparkline: [62, 58, 54, 49, 45, 41],
    },
  ] as const;

  const heroBullets = [
    ar ? 'ابدأ من الخريطة.' : 'Start from the map.',
    ar ? 'اختر أسرع.' : 'Choose faster.',
  ] as const;

  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <LandingPageFrame>
      <LandingHeader
        ar={ar}
        signinPath={signInPath}
        signupPath={signUpPath}
        showAuthActions={!user}
        onNavigate={handleLandingNavigate}
      />
      <LandingSlotRows
        rows={LANDING_ROWS}
        slots={{
          hero: (
            <LandingHeroSection
              ar={ar}
              emailAuthPath={signInPath}
              signupAuthPath={signUpPath}
              findRidePath={buildPath('/app/find-ride')}
              mobilityOsPath="/app/mobility-os"
              myTripsPath={buildPath('/app/my-trips', true)}
              supportLine={supportLine}
              businessAddress={businessAddress}
              heroBullets={heroBullets}
              primaryActions={primaryActions}
              authError={authError}
              oauthLoadingProvider={oauthProvider}
              showQuickAuth={!user}
              onGoogleAuth={() => {
                void handleOAuth('google');
              }}
              onFacebookAuth={() => {
                void handleOAuth('facebook');
              }}
              onNavigate={handleLandingNavigate}
            />
          ),
          map: (
            <LandingMapSection
              ar={ar}
              onNavigate={handleLandingNavigate}
              mobilityOsPath="/app/mobility-os"
              findRidePath={buildPath('/app/find-ride')}
              packagesPath={buildPath('/app/packages')}
            />
          ),
          signals: <LandingSignalSection cards={signalCards} />,
          why: <LandingWhySlot ar={ar} />,
          trust: <LandingTrustSection ar={ar} />,
          footer: <LandingFooterSlot ar={ar} />,
        }}
      />
    </LandingPageFrame>
  );
}
