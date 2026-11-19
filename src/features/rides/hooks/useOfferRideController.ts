/**
 * useOfferRideController
 *
 * Extracts all state, side-effects, and business logic from OfferRidePage
 * into a testable hook. The page component becomes a pure render shell.
 *
 * Responsibilities:
 *  - Multi-step form state + draft persistence
 *  - Trust / capability gate evaluation
 *  - Driver readiness summary
 *  - Route intelligence (demand signal, driver plan)
 *  - Realtime booking subscription
 *  - Post-ride submission with notifications + movement tracking
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../../hooks/useIframeSafeNavigate';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useLocale } from '../../../hooks/useLocale';
import { useLanguage } from '../../../contexts/LanguageContext';
import { createGenderMeta, OFFER_RIDE_DRAFT_KEY } from '../../../pages/waselCoreRideData';
import { DS } from '../../../pages/waselServiceShared';
import {
  createOfferRideDefaultForm,
  validateOfferRideStep,
} from '../../../pages/waselCorePageHelpers';
import { readStoredObject } from '../../../pages/waselCoreStorage';
import {
  createConnectedRide,
  getConnectedRides,
  getConnectedStats,
} from '../../../services/journeyLogistics';
import { getBookingsForDriver, type RideBookingRecord } from '../../../services/rideLifecycle';
import { notificationsAPI } from '../../../services/notifications.js';
import { subscribeToRideBookingRealtime } from '../../../services/rideRealtime';
import { getDriverReadinessSummary } from '../../../services/driverOnboarding';
import { evaluateTrustCapability } from '../../../services/trustRules';
import { recordMovementActivity } from '../../../services/movementMembership';
import { useLiveRouteIntelligence } from '../../../services/routeDemandIntelligence';
import { buildDriverRoutePlan, getMarketplaceNodes } from '../../../config/wasel-movement-network';
import { cityLabel, packageCapacityLabel } from '../offerRideContent';
import { tx } from '../../../locales/tx';

export const GENDER_META_OFFER = createGenderMeta(DS);

export function useOfferRideController() {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const defaultForm = createOfferRideDefaultForm();
  const { notifyTripConfirmed, requestPermission, permission } = usePushNotifications();
  const locale = useLocale();
  const { language } = useLanguage();
  const ar = language === 'ar';

  // ── Localisation helpers ───────────────────────────────────────────────────
  const city = (value: string) => cityLabel(value, language);
  const capacity = (value: string) => packageCapacityLabel(value, language);
  const departureWindow = (value: string) =>
    ar ? value.replace(/\band\b/g, 'و') : value;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => readStoredObject(OFFER_RIDE_DRAFT_KEY, defaultForm));
  const [submitted, setSubmitted] = useState(false);
  const [rideBookings, setRideBookings] = useState<RideBookingRecord[]>([]);
  const [networkStats, setNetworkStats] = useState(() => getConnectedStats());
  const [busyState, setBusyState] = useState<'idle' | 'posting'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);

  // ── Trust gates ────────────────────────────────────────────────────────────
  const offerGate = evaluateTrustCapability(user, 'offer_ride');
  const packageGate = evaluateTrustCapability(user, 'carry_packages');
  const driverReadiness = getDriverReadinessSummary(user);

  // ── Localised readiness copy (keeps page component clean) ─────────────────
  const readinessHeadline = ar
    ? ({
        not_started: 'ابدأ إعداد السائق',
        complete_profile: 'أكد معلومات الاتصال',
        complete_verification: 'أرسل مستندات السائق',
        pending_review: 'مستنداتك قيد المراجعة',
        ready: 'أنت جاهز لنشر الرحلة',
      } as const)[driverReadiness.status]
    : driverReadiness.headline;

  const readinessDetail = ar
    ? ({
        not_started: 'فعّل وضع السائق للبدء.',
        complete_profile: 'أكد رقم هاتفك وبريدك الإلكتروني للمتابعة.',
        complete_verification: 'أدخل رقم رخصة القيادة لإرسال مستنداتك للمراجعة.',
        pending_review: 'يمكنك تجهيز مسارك الآن؛ يتاح النشر بعد اعتماد المستندات.',
        ready: 'يمكنك نشر الرحلات بعد إكمال خطوات التحقق.',
      } as const)[driverReadiness.status]
    : driverReadiness.detail;

  const readinessStepLabels: Record<string, string> | null = ar
    ? {
        account_role: 'تفعيل وضع السائق',
        phone: 'تأكيد الهاتف',
        email: 'تأكيد البريد الإلكتروني',
        driver_documents: 'إرسال مستندات السائق',
        driver_clearance: 'اعتماد السائق',
      }
    : null;

  // ── Route intelligence ─────────────────────────────────────────────────────
  const driverPlan = useMemo(
    () => buildDriverRoutePlan(form.from, form.to, form.seats),
    [form.from, form.to, form.seats],
  );
  const routeIntelligence = useLiveRouteIntelligence({
    from: form.from,
    to: form.to,
    userId: user?.id,
  });
  const selectedSignal = routeIntelligence.selectedSignal;
  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(2, 5), []);

  const corridorCount = getConnectedRides().filter(
    ride => ride.from === form.from && ride.to === form.to,
  ).length;

  const recentPostedRides = getConnectedRides()
    .filter(ride => ride.from === form.from && ride.to === form.to)
    .slice(0, 3);

  const incomingRequests = user
    ? getBookingsForDriver(user.id, getConnectedRides())
        .filter(booking => {
          const liveBooking = rideBookings.find(item => item.id === booking.id);
          return (liveBooking ?? booking).status === 'pending_driver';
        })
        .slice(0, 4)
    : [];

  // ── Quick metrics for sidebar panel ──────────────────────────────────────
  const quickMetrics = [
    {
      label: ar ? 'المقعد' : 'Seat',
      value: driverPlan ? locale.formatCurrency(driverPlan.recommendedSeatPriceJod, 'JOD') : '--',
      color: DS.cyan,
    },
    {
      label: ar ? 'الرحلة الكاملة' : 'Full trip',
      value: driverPlan ? locale.formatCurrency(driverPlan.grossWhenFullJod, 'JOD') : '--',
      color: DS.green,
    },
    {
      label: ar ? 'الطرد' : 'Package',
      value: driverPlan ? locale.formatCurrency(driverPlan.packageBonusJod, 'JOD') : '--',
      color: DS.gold,
    },
    {
      label: ar ? 'الطلب' : 'Demand',
      value: selectedSignal
        ? `${selectedSignal.forecastDemandScore}/100`
        : driverPlan
          ? `${driverPlan.corridor.predictedDemandScore}/100`
          : `${networkStats.ridesPosted}`,
      color: DS.blue,
    },
  ];

  // ── Side-effects ───────────────────────────────────────────────────────────
  useEffect(() => {
    setNetworkStats(getConnectedStats());
  }, [submitted]);

  useEffect(() => {
    if (!user?.id) {return;}
    return subscribeToRideBookingRealtime({
      userId: user.id,
      rides: getConnectedRides(),
      onBookingsChange: setRideBookings,
    });
  }, [user?.id]);

  // Draft persistence — write on every form change, restore on mount.
  useEffect(() => {
    if (typeof window === 'undefined') {return;}
    const saved = window.localStorage.getItem(OFFER_RIDE_DRAFT_KEY);
    if (saved) {
      setDraftMessage(ar ? 'تمت استعادة المسودة من جلستك السابقة.' : 'Draft restored from your last session.');
    }
    window.localStorage.setItem(OFFER_RIDE_DRAFT_KEY, JSON.stringify(form));
  // form is intentionally in the deps — we write on every change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const updateForm = (key: string, value: string | number | boolean) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const moveToStep = (targetStep: number) => {
    const nextError = validateOfferRideStep(form, targetStep - 1, ar);
    if (nextError) {
      setFormError(nextError);
      return;
    }
    setFormError(null);
    setStep(targetStep);
  };

  const resetForm = () => {
    setSubmitted(false);
    setStep(1);
    setForm(defaultForm);
    setFormError(null);
    setDraftMessage(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handlePostRide = async () => {
    if (!user) {
      void nav('/app/auth');
      return;
    }
    if (!offerGate.allowed) {
      setFormError(offerGate.reason || 'Your account is not ready to offer a ride yet.');
      return;
    }
    if (form.acceptsPackages && !packageGate.allowed) {
      setFormError(packageGate.reason || 'Your account is not ready to carry packages yet.');
      return;
    }

    const nextError = validateOfferRideStep(form, 3, ar);
    if (nextError) {
      setFormError(nextError);
      return;
    }

    setBusyState('posting');
    setFormError(null);

    try {
      const createdRide = await createConnectedRide({
        ownerId: user.id,
        from: form.from,
        to: form.to,
        date: form.date,
        time: form.time,
        seats: form.seats,
        price: form.price,
        gender: form.gender,
        prayer: form.prayer,
        carModel: form.carModel,
        note: form.note,
        acceptsPackages: form.acceptsPackages,
        packageCapacity: form.packageCapacity as 'small' | 'medium' | 'large',
        packageNote: form.packageNote,
        status: 'active',
      });

      setSubmitted(true);
      setDraftMessage(ar ? 'تم نشر الرحلة وحذف المسودة.' : 'Ride posted. Draft cleared.');
      setNetworkStats(getConnectedStats());
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OFFER_RIDE_DRAFT_KEY);
      }

      notificationsAPI
        .createNotification({
          title: ar ? 'تم نشر عرض الرحلة' : 'Ride offer posted',
          message: form.acceptsPackages
            ? ar
              ? `أصبح مسارك من ${city(form.from)} إلى ${city(form.to)} متاحاً للركاب والطرود.`
              : `Your ${form.from} to ${form.to} route is live for riders and packages.`
            : ar
              ? `أصبح مسارك من ${city(form.from)} إلى ${city(form.to)} متاحاً الآن.`
              : `Your ${form.from} to ${form.to} route is now live.`,
          type: 'booking',
          priority: 'high',
          action_url: '/app/offer-ride',
        })
        .catch(() => {});

      if (permission === 'default') {
        requestPermission().catch(() => {});
      }
      notifyTripConfirmed('Wasel Network', `${createdRide.from} to ${createdRide.to}`);
      void recordMovementActivity('route_published', driverPlan?.corridor.id ?? null);
    } catch (error) {
      setFormError(
        ar
          ? 'تعذّر نشر الرحلة الآن. تحقّق من اتصالك وحاول مرة أخرى.'
          : error instanceof Error
            ? error.message
            : 'We could not post the route right now.',
      );
    } finally {
      setBusyState('idle');
    }
  };

  return {
    // navigation
    nav,
    // user
    user,
    ar,
    language,
    // form
    form,
    step,
    busyState,
    formError,
    draftMessage,
    submitted,
    // derived form helpers
    updateForm,
    moveToStep,
    resetForm,
    setDraftMessage,
    // trust
    offerGate,
    packageGate,
    driverReadiness,
    readinessHeadline,
    readinessDetail,
    readinessStepLabels,
    // route intelligence
    driverPlan,
    selectedSignal,
    routeIntelligence,
    corridorCount,
    recentPostedRides,
    incomingRequests,
    networkStats,
    marketplaceNodes,
    quickMetrics,
    // localisation
    city,
    capacity,
    departureWindow,
    locale,
    // actions
    handlePostRide,
    // push
    permission,
    // labels
    tx,
    GENDER_META: GENDER_META_OFFER,
    DS,
  };
}
