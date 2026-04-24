import { useCallback, useEffect, useMemo } from 'react';
import { Car, Package, Search } from 'lucide-react';
import { Protected } from '../../pages/waselServiceShared';
import { parseFindRideParams } from '../../pages/waselCorePageHelpers';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { trackGrowthEvent } from '../../services/growthEngine';
import { buildAuthPagePath } from '../../utils/authFlow';
import { normalizeTextTree } from '../../utils/textEncoding';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import { LandingPageFrame } from './landing/LandingPageFrame';
import { panelStyle } from '../../styles/shared-ui';
import { LANDING_FONT } from '../../styles/shared-ui';
import {
  LANDING_COLORS,
  LandingHeader,
  LandingHeroSection,
  LandingMapSection,
  LandingSignalSection,
  LandingTrustSection,
  LandingFooterSlot,
  type LandingActionCard,
  type LandingSignalCard,
} from './landing/LandingSections';
import { RideResults, type RideResultsCopy } from '../../components/rides/RideResults';
import { RideSearchForm, type RideSearchFormCopy } from '../../components/rides/RideSearchForm';
import { useRideSearch } from '../../modules/rides/ride.hooks';
import type { RideResult } from '../../modules/rides/ride.types';
import { useLocation } from 'react-router';

function buildRidePageCopy(language: 'en' | 'ar') {
  if (language === 'ar') {
    const searchForm: RideSearchFormCopy = {
      badge: 'مطابقة الرحلات',
      title: 'اعثر على رحلتك فوراً',
      description: 'بحث سريع وواضح مع سائقين موثوقين ومطابقة تبدأ مباشرة بعد إرسال الطلب.',
      searchModeLabel: 'وضع البحث',
      modeNowLabel: 'الآن',
      modeScheduleLabel: 'جدولة',
      fromLabel: 'من',
      fromPlaceholder: 'نقطة الانطلاق',
      fromHelperText: 'استخدم موقعك الحالي أو اختر نقطة انطلاق رئيسية.',
      autoDetectLabel: 'استخدم موقعي',
      toLabel: 'إلى',
      toPlaceholder: 'الوجهة',
      toHelperText: 'الاقتراحات تركز على المسارات المباشرة داخل الأردن.',
      rideTypeLabel: 'نوع الرحلة',
      rideTypeOptions: [
        { value: 'any', label: 'أي رحلة' },
        { value: 'economy', label: 'اقتصادية' },
        { value: 'comfort', label: 'مريحة' },
        { value: 'family', label: 'عائلية' },
      ],
      departureLabel: 'موعد الانطلاق',
      searchButton: 'ابحث عن رحلة',
      searchingButton: 'جارٍ البحث...',
    };

    const results: RideResultsCopy = {
      idleTitle: 'ابدأ بالمسار المناسب',
      idleDescription: 'اختر نقطة الانطلاق والوجهة لرؤية أفضل الرحلات المتاحة فوراً.',
      emptyTitle: 'لا توجد رحلات مباشرة الآن',
      emptyDescription: 'جرّب توسيع نوع الرحلة أو التبديل إلى الجدولة أو تعديل المسار.',
      sectionTitle: 'أفضل الرحلات المتاحة',
      sectionDescription: 'مرتبة حسب الثقة والسرعة وتوفر المقاعد ودقة المسار.',
      countSuffix: 'رحلة',
      loadMoreLabel: 'اعرض المزيد',
      card: {
        recommendedLabel: 'موصى بها',
        confirmedLabel: 'تم تأكيد السائق',
        matchingLabel: 'جارٍ العثور على سائق',
        priceEstimateLabel: 'تقدير بالدينار',
        requestButton: 'اطلب الرحلة',
        requestingButton: 'جارٍ الإرسال...',
        defaultReason: 'مطابقة موثوقة مع وضوح كامل في السعر والمسار.',
        etaLabel: 'الوقت',
        vehicleLabel: 'المركبة',
        ratingLabel: 'التقييم',
        seatsLabel: 'المقاعد',
        seatsOpenSuffix: 'متاح',
      },
    };

    return normalizeTextTree({
      hero: {
        eyebrow: 'نقطة الدخول الأساسية للتنقل',
        title: 'اعثر على رحلتك فوراً',
        description: 'تجربة نقل سريعة وموثوقة داخل Wasel تجمع الوضوح والثقة والاستجابة الفورية.',
        highlights: [
          {
            title: 'بحث فوري',
            detail: 'اقتراحات سريعة وترتيب ذكي للمسارات في أقل من 300 مللي ثانية.',
          },
          {
            title: 'مخزون موثوق',
            detail: 'تقييمات السائقين والتحقق والأسعار الواضحة في كل بطاقة.',
          },
          {
            title: 'مطابقة السائق',
            detail: 'يبدأ طابور المطابقة فور إرسال الطلب.',
          },
        ],
        stats: [
          { label: 'متوسط بدء المطابقة', value: '< 3 دقائق' },
          { label: 'وضوح السائقين', value: '100%' },
          { label: 'حالة الطابور', value: 'نشط' },
        ],
        ctaLabel: 'افتح تدفق طلب الرحلة',
      },
      searchForm,
      results,
      messages: {
        validation: {
          from: 'اختر نقطة الانطلاق.',
          to: 'اختر الوجهة.',
          distinctRoute: 'يجب أن تكون نقطة الانطلاق والوجهة مختلفتين.',
          date: 'اختر تاريخ الرحلة المجدولة.',
        },
        suggestions: {
          liveCorridor: (count: number) =>
            `${count} ${count === 1 ? 'رحلة مباشرة' : 'رحلات مباشرة'} على هذا المسار`,
          recentSearch: 'اختصار من بحثك الأخير',
          cityPickup: 'نقطة انطلاق داخل المدينة',
          regionalCorridor: 'مسار إقليمي',
        },
        searchError: 'تعذر البحث عن الرحلات الآن.',
        requestError: 'تعذر إرسال طلب الرحلة الآن.',
        requestSuccess: 'تم إرسال طلب الرحلة وبدأت مطابقة السائق.',
        requestPendingSync: 'تم حجز الرحلة، وسيظهر تأكيد السائق هنا عندما يحدّثه النظام.',
      },
    });
  }

  const searchForm: RideSearchFormCopy = {
    badge: 'Ride search',
    title: 'Book a ride',
    description:
      'Search live rides on real corridors with clear timing, seat count, and price.',
    searchModeLabel: 'Search mode',
    modeNowLabel: 'Now',
    modeScheduleLabel: 'Schedule',
    fromLabel: 'From',
    fromPlaceholder: 'Pickup point',
    fromHelperText: 'Auto-detect or choose a major pickup point.',
    autoDetectLabel: 'Use my location',
    toLabel: 'To',
    toPlaceholder: 'Destination',
    toHelperText: 'Suggestions stay focused on direct Jordan corridors.',
    rideTypeLabel: 'Ride type',
    rideTypeOptions: [
      { value: 'any', label: 'Any ride' },
      { value: 'economy', label: 'Economy' },
      { value: 'comfort', label: 'Comfort' },
      { value: 'family', label: 'Family' },
    ],
    departureLabel: 'Departure',
    searchButton: 'Search rides',
    searchingButton: 'Searching...',
  };

  const results: RideResultsCopy = {
    idleTitle: 'Search a corridor to find rides',
    idleDescription:
      'Start with pickup and destination to see live ride options.',
    emptyTitle: 'No direct rides yet',
    emptyDescription:
      'Try widening the ride type, switching to scheduled time, or adjusting the corridor.',
    sectionTitle: 'Available rides',
    sectionDescription: 'Sorted by route fit, timing, trust, and open seats.',
    countSuffix: 'rides found',
    loadMoreLabel: 'Load more rides',
    card: {
      recommendedLabel: 'Recommended',
      confirmedLabel: 'Driver confirmed',
      matchingLabel: 'Matching driver',
      priceEstimateLabel: 'JOD estimate',
      requestButton: 'Book seat',
      requestingButton: 'Booking...',
      detailsButton: 'Trip details',
      whatsappPrimaryLabel: 'WhatsApp is the main coordination lane',
      defaultReason:
        'Reliable corridor match with live fare visibility and WhatsApp-first updates.',
      etaLabel: 'ETA',
      vehicleLabel: 'Vehicle',
      ratingLabel: 'Rating',
      seatsLabel: 'Seats',
      seatsOpenSuffix: 'open',
    },
  };

  return {
    hero: {
      eyebrow: 'Book a ride',
      title: 'Book a ride',
      description:
        'Search live rides on real corridors with clear seats, timing, and price before you book.',
      highlights: [
        {
          title: 'Direct search',
          detail: 'Pick the corridor and see live ride options quickly.',
        },
        {
          title: 'Clear details',
          detail: 'Seat count, driver trust, and fare stay visible on every card.',
        },
        {
          title: 'Backend updates only',
          detail: 'Ride status changes appear only after the backend updates them.',
        },
      ],
      stats: [
        { label: 'Ride flow', value: 'Live' },
        { label: 'Driver status', value: 'Verified' },
        { label: 'Booking source', value: 'Backend' },
      ],
      ctaLabel: 'Book a ride',
    },
    searchForm,
    results,
    messages: {
      validation: {
        from: 'Choose a pickup location.',
        to: 'Choose a destination.',
        distinctRoute: 'Pickup and destination must be different.',
        date: 'Choose a scheduled date.',
      },
      suggestions: {
        liveCorridor: (count: number) =>
          `${count} live ride${count === 1 ? '' : 's'} on this corridor`,
        recentSearch: 'Recent search shortcut',
        cityPickup: 'City pickup point',
        regionalCorridor: 'Regional corridor',
      },
      searchError: 'Unable to search rides right now.',
      requestError: 'Unable to send the ride request right now.',
      requestSuccess: 'Ride booked. Driver matching has started.',
      requestPendingSync: 'Ride booked. Driver confirmation will appear here when the backend updates it.',
    },
  };
}

export function FindRidePage() {
  const location = useLocation();
  const initialParams = useMemo(() => parseFindRideParams(location.search), [location.search]);
  const navigate = useIframeSafeNavigate();
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const { notifyTripConfirmed, permission, requestPermission } = usePushNotifications();
  const copy = useMemo(() => buildRidePageCopy(language === 'ar' ? 'ar' : 'en'), [language]);

  // Wasel Presence profile for contact/business info
  const profile = useMemo(() => getWaselPresenceProfile(), []);
  const ar = language === 'ar';
  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  // Auth page paths
  const emailAuthPath = useMemo(() => buildAuthPagePath('signin'), []);
  const signupAuthPath = useMemo(() => buildAuthPagePath('signup'), []);

  // Static service paths
  const findRidePath = '/app/find-ride';
  const mobilityOsPath = '';
  const myTripsPath = '/app/my-trips';
  const packagesPath = '/app/packages';

  // Hero primary action cards
  const primaryActions = useMemo((): LandingActionCard[] => {
    const actions = [
      {
        icon: Search,
        title: ar ? 'ابحث عن رحلة' : 'Find a ride',
        detail: ar ? 'رحلات حية' : 'Live matches',
        path: findRidePath,
        color: LANDING_COLORS.cyan,
      },
      {
        icon: Package,
        title: ar ? 'أرسل طرداً' : 'Send a package',
        detail: ar ? 'طرد مع راكب' : 'Package with rider',
        path: packagesPath,
        color: LANDING_COLORS.gold,
      },
      {
        icon: Car,
        title: ar ? 'اعرض رحلة' : 'Offer a ride',
        detail: ar ? 'افتح المقاعد' : 'Share seats on your route',
        path: '/app/offer-ride',
        color: LANDING_COLORS.blue,
      },
    ];
    return ar ? normalizeTextTree(actions) : actions;
  }, [ar, findRidePath, packagesPath]);

  // Bullet points displayed under hero description
  const heroBullets = useMemo(
    () => copy.hero.highlights.map(h => h.detail),
    [copy.hero.highlights],
  );

  // Platform signal cards for the signals section
  const signalCards = useMemo((): LandingSignalCard[] => {
    if (ar) {
      return normalizeTextTree([
        {
          title: 'مطابقة السائق',
          detail: 'يبدأ طابور المطابقة فور إرسال الطلب.',
          accent: LANDING_COLORS.cyan,
          trendLabel: 'نشط',
          trendDirection: 'up',
          intensity: 'عالٍ',
          sparkline: [72, 68, 74, 80, 78, 85, 90],
        },
        {
          title: 'وضوح المسار',
          detail: 'مسارات مباشرة داخل المدن وبينها.',
          accent: LANDING_COLORS.gold,
          trendLabel: 'مستقر',
          trendDirection: 'up',
          intensity: 'متوسط',
          sparkline: [45, 48, 50, 49, 51, 52, 53],
        },
        {
          title: 'الرحلات المتاحة',
          detail: 'رحلات حية على المسارات الرئيسية.',
          accent: LANDING_COLORS.green,
          trendLabel: 'تزايد',
          trendDirection: 'up',
          intensity: 'مرتفع',
          sparkline: [55, 62, 70, 78, 85, 92, 100],
        },
      ]);
    }
    return [
      {
        title: 'Driver matching',
        detail: 'Queue-backed matching starts immediately.',
        accent: LANDING_COLORS.cyan,
        trendLabel: 'Active',
        trendDirection: 'up',
        intensity: 'High',
        sparkline: [72, 68, 74, 80, 78, 85, 90],
      },
      {
        title: 'Corridor clarity',
        detail: 'Direct routes across and between cities.',
        accent: LANDING_COLORS.gold,
        trendLabel: 'Stable',
        trendDirection: 'up',
        intensity: 'Medium',
        sparkline: [45, 48, 50, 49, 51, 52, 53],
      },
      {
        title: 'Available rides',
        detail: 'Live rides on core corridors.',
        accent: LANDING_COLORS.green,
        trendLabel: 'Growing',
        trendDirection: 'up',
        intensity: 'High',
        sparkline: [55, 62, 70, 78, 85, 92, 100],
      },
    ];
  }, [ar]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate],
  );

  const {
    state,
    visibleResults,
    hasMoreResults,
    minDate,
    setFromQuery,
    setToQuery,
    setFrom,
    setTo,
    setDate,
    setMode,
    setRideType,
    loadMoreResults,
    autoDetectOrigin,
    submitSearch,
    requestRide,
    clearFeedback,
  } = useRideSearch({
    from: initialParams.initialFrom,
    to: initialParams.initialTo,
    date: initialParams.initialDate,
    mode: initialParams.initialDate ? 'schedule' : 'now',
    searched: initialParams.initialSearched,
    passengerId: user?.id,
    messages: copy.messages,
  });

  useEffect(() => {
    if (!state.successMessage || !state.activeRequest) return;

    void notifyTripConfirmed(
      state.activeRequest.driverName,
      `${state.activeRequest.from} to ${state.activeRequest.to}`,
    );
    if (permission === 'default') {
      requestPermission().catch(() => {});
    }
  }, [
    notifyTripConfirmed,
    permission,
    requestPermission,
    state.activeRequest,
    state.successMessage,
  ]);

  const handleSearch = useCallback(async () => {
    clearFeedback();
    const didSearch = await submitSearch();
    if (!didSearch) return;

    void trackGrowthEvent({
      userId: user?.id,
      eventName: 'ride_search_executed',
      funnelStage: 'searched',
      serviceType: 'ride',
      from: state.draft.from,
      to: state.draft.to,
      metadata: {
        rideType: state.draft.rideType,
        mode: state.draft.mode,
      },
    });
  }, [
    clearFeedback,
    state.draft.from,
    state.draft.mode,
    state.draft.rideType,
    state.draft.to,
    submitSearch,
    user?.id,
  ]);

  const handleRequestRide = useCallback(
    async (ride: RideResult) => {
      if (!user) {
        navigate('/app/auth');
        return;
      }

      const didRequest = await requestRide({
        ride,
        passengerId: user.id,
        passengerName: user.name,
        passengerPhone: user.phone,
        passengerEmail: user.email,
      });

      if (!didRequest) return;

      void trackGrowthEvent({
        userId: user.id,
        eventName: 'ride_request_submitted',
        funnelStage: 'booked',
        serviceType: 'ride',
        from: ride.from,
        to: ride.to,
        valueJod: ride.pricePerSeat,
        metadata: {
          rideId: ride.id,
          vehicleType: ride.vehicleType,
        },
      });
    },
    [navigate, requestRide, user],
  );

  const handleOpenRide = useCallback(
    (ride: RideResult) => {
      const params = new URLSearchParams(location.search);
      params.set('from', ride.from);
      params.set('to', ride.to);
      if (ride.date) {
        params.set('date', ride.date);
      }

      navigate(`/app/find-ride/${encodeURIComponent(ride.id)}?${params.toString()}`, {
        state: { ride },
      });
    },
    [location.search, navigate],
  );

  return (
    <Protected>
      <LandingPageFrame>
        <div style={{ display: 'grid', gap: 28 }}>
          <LandingHeader
            ar={ar}
            signinPath={emailAuthPath}
            signupPath={signupAuthPath}
            showAuthActions={false}
            onNavigate={handleNavigate}
          />
          <LandingHeroSection
            ar={ar}
            emailAuthPath={emailAuthPath}
            signupAuthPath={signupAuthPath}
            findRidePath={findRidePath}
            mobilityOsPath={mobilityOsPath}
            myTripsPath={myTripsPath}
            supportLine={supportLine}
            businessAddress={businessAddress}
            heroBullets={heroBullets}
            primaryActions={primaryActions}
            stats={copy.hero.stats}
            ctaLabel={copy.hero.ctaLabel}
            onNavigate={handleNavigate}
          />
          <RideSearchForm
            state={state}
            minDate={minDate}
            copy={copy.searchForm}
            onFromQueryChange={setFromQuery}
            onToQueryChange={setToQuery}
            onFromCommit={setFrom}
            onToCommit={setTo}
            onAutoDetectOrigin={autoDetectOrigin}
            onModeChange={setMode}
            onDateChange={setDate}
            onRideTypeChange={setRideType}
            onSubmit={handleSearch}
          />
          {state.error ? (
            <div
              role="alert"
              style={{
                ...panelStyle(24),
                padding: '16px 20px',
                border: '1px solid color-mix(in srgb, var(--wasel-brand-hover) 30%, transparent)',
                color: 'var(--wasel-copy-primary)',
                fontFamily: LANDING_FONT,
                fontWeight: 700,
              }}
            >
              {state.error}
            </div>
          ) : null}
          {state.successMessage ? (
            <div
              role="status"
              style={{
                ...panelStyle(24),
                padding: '16px 20px',
                border: '1px solid color-mix(in srgb, var(--ds-accent-strong) 28%, transparent)',
                color: 'var(--wasel-copy-primary)',
                fontFamily: LANDING_FONT,
                fontWeight: 700,
              }}
            >
              {state.successMessage}
            </div>
          ) : null}
          <RideResults
            loading={state.phase === 'searching'}
            searched={state.searched}
            language={ar ? 'ar' : 'en'}
            results={visibleResults}
            totalResultsCount={state.results.length}
            recommendedRideId={state.recommendedRideId}
            requestsByRideId={state.requestsByRideId}
            requestingRideId={state.phase === 'submitting' ? state.selectedRideId : undefined}
            hasMore={hasMoreResults}
            copy={copy.results}
            onRequestRide={handleRequestRide}
            onOpenRide={handleOpenRide}
            onLoadMore={loadMoreResults}
          />
          <LandingMapSection
            ar={ar}
            onNavigate={handleNavigate}
            mobilityOsPath={mobilityOsPath}
            findRidePath={findRidePath}
            packagesPath={packagesPath}
          />
          <LandingSignalSection cards={signalCards} />
          <LandingTrustSection ar={ar} />
          <LandingFooterSlot ar={ar} />
        </div>
      </LandingPageFrame>
    </Protected>
  );
}

export default FindRidePage;
