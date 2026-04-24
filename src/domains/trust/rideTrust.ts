import type { RideResult } from '../../modules/rides/ride.types';
import { hasWhatsAppContact } from '../../utils/whatsapp';

export type RideTrustLanguage = 'en' | 'ar';

export interface RideTrustSignal {
  id: string;
  label: string;
  tone: 'cyan' | 'green' | 'gold';
  value: string;
}

export interface RideTrustSummary {
  score: number;
  scoreLabel: string;
  tierLabel: string;
  headline: string;
  detail: string;
  signals: RideTrustSignal[];
}

interface RideTrustOptions {
  directWhatsApp?: boolean;
  supportLine?: string;
}

function localize(language: RideTrustLanguage, en: string, ar: string) {
  return language === 'ar' ? ar : en;
}

function formatTripCount(trips: number | undefined, language: RideTrustLanguage) {
  const safeTrips = Math.max(0, trips ?? 0);

  return language === 'ar'
    ? `${safeTrips} رحلة`
    : `${safeTrips} trip${safeTrips === 1 ? '' : 's'}`;
}

function formatUpdatedLabel(value: string | undefined, language: RideTrustLanguage) {
  if (!value) {
    return localize(language, 'Fresh route sync', 'مزامنة مسار حديثة');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return localize(language, 'Fresh route sync', 'مزامنة مسار حديثة');
  }

  const timeLabel = parsed.toLocaleTimeString(language === 'ar' ? 'ar-JO' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return localize(language, `Updated ${timeLabel}`, `آخر تحديث ${timeLabel}`);
}

export function buildRideConfidenceScore(
  ride: RideResult,
  options: RideTrustOptions = {},
): number {
  const directWhatsApp = options.directWhatsApp ?? hasWhatsAppContact(ride.driver.phone);
  const verificationBonus = ride.driver.verified ? 14 : 0;
  const ratingBonus = Math.max(0, Math.round((ride.driver.rating - 4.1) * 12));
  const tripHistoryBonus = Math.min(12, Math.floor((ride.driver.trips ?? 0) / 90));
  const coordinationBonus = directWhatsApp ? 8 : 4;
  const routeVisibilityBonus = ride.lastUpdatedAt ? 7 : 4;
  const liveRouteBonus = ride.routeMode === 'live_post' ? 7 : 5;
  const serviceFitBonus = ride.supportsPackages || ride.prayerStops ? 4 : 1;

  return Math.max(
    48,
    Math.min(
      99,
      42 +
        verificationBonus +
        ratingBonus +
        tripHistoryBonus +
        coordinationBonus +
        routeVisibilityBonus +
        liveRouteBonus +
        serviceFitBonus,
    ),
  );
}

function getTierLabel(score: number, language: RideTrustLanguage) {
  if (score >= 92) {
    return localize(language, 'High confidence', 'ثقة عالية');
  }

  if (score >= 80) {
    return localize(language, 'Trusted', 'موثوق');
  }

  return localize(language, 'Review details', 'راجع التفاصيل');
}

function getHeadline(score: number, language: RideTrustLanguage) {
  if (score >= 92) {
    return localize(language, 'High-confidence ride', 'رحلة عالية الثقة');
  }

  if (score >= 80) {
    return localize(language, 'Trusted ride match', 'مطابقة رحلة موثوقة');
  }

  return localize(language, 'Operational ride match', 'مطابقة رحلة تشغيلية');
}

function getDetail(
  ride: RideResult,
  score: number,
  language: RideTrustLanguage,
  options: RideTrustOptions,
) {
  const directWhatsApp = options.directWhatsApp ?? hasWhatsAppContact(ride.driver.phone);

  if (score >= 92) {
    return localize(
      language,
      directWhatsApp
        ? 'Verified driver, clear route state, and direct WhatsApp coordination before booking.'
        : 'Verified driver, clear route state, and Wasel-backed coordination before booking.',
      directWhatsApp
        ? 'سائق موثق، وحالة مسار واضحة، وتنسيق مباشر عبر واتساب قبل الحجز.'
        : 'سائق موثق، وحالة مسار واضحة، وتنسيق مدعوم من واصل قبل الحجز.',
    );
  }

  return localize(
    language,
    'Route clarity, driver proof, and coordination details are visible before you commit.',
    'وضوح المسار، وإثبات السائق، وتفاصيل التنسيق ظاهرة قبل أن تؤكد الحجز.',
  );
}

export function getRideTrustSummary(
  ride: RideResult,
  language: RideTrustLanguage,
  options: RideTrustOptions = {},
): RideTrustSummary {
  const directWhatsApp = options.directWhatsApp ?? hasWhatsAppContact(ride.driver.phone);
  const score = buildRideConfidenceScore(ride, {
    ...options,
    directWhatsApp,
  });
  const routeStateLabel =
    ride.routeMode === 'live_post'
      ? localize(language, 'Live route', 'مسار حي')
      : localize(language, 'Network route', 'مسار شبكي');
  const supportLine = options.supportLine?.trim();

  const signals: RideTrustSignal[] = [
    {
      id: 'driver-proof',
      label: localize(language, 'Driver proof', 'إثبات السائق'),
      tone: 'green',
      value: ride.driver.verified
        ? localize(
            language,
            `Verified · ${ride.driver.rating.toFixed(1)}★ · ${formatTripCount(ride.driver.trips, language)}`,
            `موثق · ${ride.driver.rating.toFixed(1)}★ · ${formatTripCount(ride.driver.trips, language)}`,
          )
        : localize(
            language,
            `${ride.driver.rating.toFixed(1)}★ · ${formatTripCount(ride.driver.trips, language)}`,
            `${ride.driver.rating.toFixed(1)}★ · ${formatTripCount(ride.driver.trips, language)}`,
          ),
    },
    {
      id: 'coordination',
      label: localize(language, 'Coordination lane', 'قناة التنسيق'),
      tone: 'cyan',
      value: directWhatsApp
        ? localize(language, 'Direct WhatsApp with driver', 'واتساب مباشر مع السائق')
        : supportLine
          ? localize(language, `Wasel support via ${supportLine}`, `دعم واصل عبر ${supportLine}`)
          : localize(language, 'Wasel support lane', 'قناة دعم واصل'),
    },
    {
      id: 'route-state',
      label: localize(language, 'Route state', 'حالة المسار'),
      tone: 'cyan',
      value: `${routeStateLabel} · ${formatUpdatedLabel(ride.lastUpdatedAt, language)}`,
    },
    {
      id: 'service-fit',
      label: localize(language, 'Service fit', 'جاهزية الخدمة'),
      tone: 'gold',
      value: ride.supportsPackages
        ? localize(language, 'Package-ready corridor', 'مسار جاهز للطرود')
        : ride.prayerStops
          ? localize(language, 'Prayer-stop ready', 'جاهز لتوقفات الصلاة')
          : ride.intermediateStops?.length
            ? localize(language, 'Planned stop included', 'يتضمن توقفًا مخططًا')
            : localize(language, 'Direct corridor flow', 'تدفق مباشر على المسار'),
    },
  ];

  return {
    score,
    scoreLabel: localize(language, 'Ride confidence', 'ثقة الرحلة'),
    tierLabel: getTierLabel(score, language),
    headline: getHeadline(score, language),
    detail: getDetail(ride, score, language, options),
    signals,
  };
}
