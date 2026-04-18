import { useCallback, useEffect, useMemo } from 'react';
import { ShieldCheck, TimerReset, Zap } from 'lucide-react';
import { Protected } from '../../pages/waselServiceShared';
import { parseFindRideParams } from '../../pages/waselCorePageHelpers';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { trackGrowthEvent } from '../../services/growthEngine';
import { LandingPageFrame } from '../home/landing/LandingPageFrame';
import { landingPanel } from '../home/landing/landingTypes';
import { LANDING_FONT } from '../home/landingConstants';
import { LandingServiceHero } from '../home/landing/LandingServiceHero';
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

    return {
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
        requestPendingSync: 'تم حفظ الطلب وسيتم مزامنة الحالة المباشرة حال توفرها.',
      },
    };
  }

  const searchForm: RideSearchFormCopy = {
    badge: 'Ride match',
    title: 'Find Your Ride Instantly',
    description:
      'Fast pickup discovery, trusted drivers, and driver matching queued the moment you request a seat.',
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
    idleTitle: 'Search a corridor to unlock live ride matches',
    idleDescription:
      'Start with pickup and destination to surface the fastest, clearest ride options.',
    emptyTitle: 'No direct rides yet',
    emptyDescription:
      'Try widening the ride type, switching to scheduled time, or adjusting the corridor.',
    sectionTitle: 'Premium ride matches',
    sectionDescription: 'Ranked for trust, speed, seat availability, and corridor fit.',
    countSuffix: 'rides found',
    loadMoreLabel: 'Load more rides',
    card: {
      recommendedLabel: 'Recommended',
      confirmedLabel: 'Driver confirmed',
      matchingLabel: 'Matching driver',
      priceEstimateLabel: 'JOD estimate',
      requestButton: 'Request ride',
      requestingButton: 'Sending...',
      defaultReason: 'Reliable corridor match with live fare visibility.',
      etaLabel: 'ETA',
      vehicleLabel: 'Vehicle',
      ratingLabel: 'Rating',
      seatsLabel: 'Seats',
      seatsOpenSuffix: 'open',
    },
  };

  return {
    hero: {
      eyebrow: 'Core mobility entry point',
      title: 'Find Your Ride Instantly',
      description:
        'Premium ride search for Wasel: faster than route browsing, clearer than listing feeds, and trusted the second you land.',
      highlights: [
        {
          title: 'Instant search',
          detail: 'Debounced suggestions and corridor ranking in under 300ms.',
        },
        {
          title: 'Trusted inventory',
          detail: 'Driver verification, ratings, and clear fare signals on every card.',
        },
        {
          title: 'Driver matching',
          detail: 'Queue-backed matching starts as soon as a request is submitted.',
        },
      ],
      stats: [
        { label: 'Median pickup match', value: '< 3 min' },
        { label: 'Trusted driver visibility', value: '100%' },
        { label: 'Queue-backed requests', value: 'Active' },
      ],
      ctaLabel: 'Open ride request flow',
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
      requestSuccess: 'Ride request sent. Driver matching is running now.',
      requestPendingSync: 'Ride request saved. Live status will sync as soon as it is available.',
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

  const heroHighlights = useMemo(
    () => [
      {
        icon: <Zap size={18} color="#20D8FF" />,
        title: copy.hero.highlights[0].title,
        detail: copy.hero.highlights[0].detail,
      },
      {
        icon: <ShieldCheck size={18} color="#20D8FF" />,
        title: copy.hero.highlights[1].title,
        detail: copy.hero.highlights[1].detail,
      },
      {
        icon: <TimerReset size={18} color="#20D8FF" />,
        title: copy.hero.highlights[2].title,
        detail: copy.hero.highlights[2].detail,
      },
    ],
    [copy.hero.highlights],
  );

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

  return (
    <Protected>
      <LandingPageFrame>
        <div style={{ display: 'grid', gap: 28 }}>
          <LandingServiceHero
            eyebrow={copy.hero.eyebrow}
            title={copy.hero.title}
            description={copy.hero.description}
            highlights={heroHighlights}
            stats={copy.hero.stats}
            ctaLabel={copy.hero.ctaLabel}
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
                ...landingPanel(24),
                padding: '16px 20px',
                border: '1px solid rgba(255,143,143,0.28)',
                color: '#ffd7d7',
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
                ...landingPanel(24),
                padding: '16px 20px',
                border: '1px solid rgba(114,255,71,0.24)',
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
            results={visibleResults}
            totalResultsCount={state.results.length}
            recommendedRideId={state.recommendedRideId}
            requestsByRideId={state.requestsByRideId}
            requestingRideId={state.phase === 'submitting' ? state.selectedRideId : undefined}
            hasMore={hasMoreResults}
            copy={copy.results}
            onRequestRide={handleRequestRide}
            onLoadMore={loadMoreResults}
          />
        </div>
      </LandingPageFrame>
    </Protected>
  );
}

export default FindRidePage;
