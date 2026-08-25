import React from 'react';
import { Brain, CheckCircle2, Clock, Package, Star, Users } from 'lucide-react';
import { DS, pill, r } from '../../../pages/waselServiceShared';
import { C } from '../../../utils/wasel-ds';
import { getCorridorOpportunity } from '../../../config/wasel-movement-network';
import { getMovementPriceQuote } from '../../../services/movementPricing';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import { createGenderMeta, type Ride } from '../../../pages/waselCoreRideData';
import { getCurrentLang, tx } from '../../../locales/tx';
import '../../../styles/animations.css';

const GENDER_META = createGenderMeta(DS);
const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان',
  Aqaba: 'العقبة',
  Irbid: 'إربد',
  Zarqa: 'الزرقاء',
  Salt: import.meta.env.VITE_FIND_RIDE_SALT_LABEL || 'السلط',
  Madaba: 'مادبا',
  Jerash: 'جرش',
  Karak: 'الكرك',
  Mafraq: 'المفرق',
  Tafilah: 'الطفيلة',
  "Ma'an": 'معان',
  Ajloun: 'عجلون',
  'Dead Sea': 'البحر الميت',
  Petra: 'البتراء',
  'Wadi Rum': 'وادي رم',
};
const PICKUP_LABELS_AR: Record<string, string> = {
  '7th Circle launch point': 'نقطة الانطلاق عند الدوار السابع',
  'Abdali transfer gate': 'بوابة تبديل العبدلي',
  'Airport road merge': 'مدخل طريق المطار',
  'Aqaba logistics zone': 'منطقة العقبة اللوجستية',
  'North Amman ring': 'حلقة شمال عمّان',
  'Jerash gate': 'بوابة جرش',
  'festival shuttle node': 'نقطة نقل المهرجان',
  'South Amman edge': 'طرف جنوب عمّان',
  'Mujib connector': 'وصلة الموجب',
  'Karak city gate': 'بوابة مدينة الكرك',
};

function cityLabel(city: string) {
  return getCurrentLang() === 'ar' ? CITY_LABELS_AR[city] ?? city : city;
}

function packageCapacityLabel(capacity: Ride['pkgCapacity']) {
  if (getCurrentLang() !== 'ar') return capacity;
  if (capacity === 'small') return 'طرد صغير';
  if (capacity === 'medium') return 'طرد متوسط';
  if (capacity === 'large') return 'طرد كبير';
  return capacity;
}

function localizeSignalText(value: string) {
  if (getCurrentLang() !== 'ar') return value;
  return value
    .replace(/\band\b/g, 'و')
    .replace(/live searches/g, 'عمليات بحث مباشرة')
    .replace(/live bookings/g, 'حجوزات مباشرة')
    .replace(/package moves/g, 'حركة طرود')
    .replace(/ownership/g, 'ملكية المسار')
    .replace(/pickup/g, 'نقطة الانطلاق');
}

function pickupLabel(value: string) {
  return getCurrentLang() === 'ar' ? PICKUP_LABELS_AR[value] ?? localizeSignalText(value) : value;
}

function durationLabel(value: string) {
  if (getCurrentLang() !== 'ar') return value;
  return value.replace(/h\b/g, 'س').replace(/min\b/g, 'د');
}

function genderLabel(pref: Ride['genderPref'], fallback: string) {
  if (getCurrentLang() !== 'ar') return fallback;
  if (pref === 'family_only') return 'للعائلات فقط';
  if (pref === 'women_only') return 'للنساء فقط';
  return 'مختلط';
}

type FindRideCardProps = {
  ride: Ride;
  idx: number;
  bookingStatus?: 'pending_driver' | 'confirmed' | null;
  signal?: LiveCorridorSignal | null;
  onOpen: () => void;
  onOpenBooking: () => void;
};

export const FindRideCard = React.memo(function FindRideCard({
  ride,
  idx,
  bookingStatus = null,
  signal = null,
  onOpen,
  onOpenBooking,
}: FindRideCardProps) {
  const genderMeta = GENDER_META[ride.genderPref];
  const soldOut = ride.seatsAvailable <= 0;
  const hasBooking = bookingStatus === 'pending_driver' || bookingStatus === 'confirmed';
  const ar = getCurrentLang() === 'ar';
  const corridorPlan = getCorridorOpportunity(ride.from, ride.to);
  const priceQuote = getMovementPriceQuote({
    basePriceJod: ride.pricePerSeat,
    corridorId: signal?.id,
    forecastDemandScore: signal?.forecastDemandScore,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="sp-ride-card animate-optimized"
      style={{
        animationDelay: `${idx * 0.06}s`,
        background: DS.card,
        borderRadius: r(20),
        border: `1px solid ${DS.border}`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(event: React.MouseEvent<HTMLDivElement>) => {
        event.currentTarget.style.borderColor = DS.borderH;
        event.currentTarget.style.transform = 'translateY(-3px)';
        event.currentTarget.style.boxShadow = `0 12px 40px ${C.cyanDim}`;
      }}
      onMouseLeave={(event: React.MouseEvent<HTMLDivElement>) => {
        event.currentTarget.style.borderColor = DS.border;
        event.currentTarget.style.transform = '';
        event.currentTarget.style.boxShadow = '';
      }}
      onClick={onOpen}
    >
      <div style={{ height: 2, background: DS.gradC }} />
      <div className="sp-ride-card-body" style={{ padding: '20px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: r(12),
                  background: DS.gradC,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  color: C.text,
                  fontSize: '0.95rem',
                }}
              >
                {ride.driver.avatar}
              </div>
              {ride.driver.verified && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: DS.cyan,
                    border: `2px solid ${DS.card}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={9} color={C.text} />
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: C.text, fontSize: '0.92rem' }}>
                  {ride.driver.name}
                </span>
                {ride.driver.verified && (
                  <span style={{ ...pill(DS.green), fontSize: '0.58rem' }}>{tx('verification.verified')}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Star size={11} fill={C.gold} color={C.gold} />
                <span style={{ color: C.gold, fontWeight: 700, fontSize: '0.75rem' }}>
                  {ride.driver.rating}
                </span>
                <span style={{ color: DS.muted, fontSize: '0.72rem' }}>
                  | {ride.driver.trips} {tx('findRideCard.trips')}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: DS.cyan, fontWeight: 900, fontSize: '1.7rem', lineHeight: 1 }}>
              {priceQuote.finalPriceJod}
            </div>
            <div style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600, marginTop: 2 }}>
              {tx('findRideCard.jod_seat')}</div>
            {priceQuote.discountJod > 0 ? (
              <div style={{ color: DS.green, fontSize: '0.68rem', fontWeight: 700, marginTop: 5 }}>
                {tx('common.save')}{priceQuote.discountJod} {tx('findRideCard.jod_from')}{priceQuote.basePriceJod}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            background: C.overlay,
            borderRadius: r(14),
            padding: '14px 18px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: '0.92rem' }}>{cityLabel(ride.from)}</div>
            <div style={{ color: DS.muted, fontSize: '0.7rem', marginTop: 1 }}>
              <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
              {ride.time}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: DS.green,
                boxShadow: `0 0 8px ${DS.green}60`,
              }}
            />
            <div
              style={{
                width: 1,
                height: 22,
                background: `linear-gradient(180deg,${DS.green},${DS.cyan})`,
              }}
            />
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: DS.cyan,
                boxShadow: `0 0 8px ${DS.cyan}60`,
              }}
            />
            <span style={{ color: DS.muted, fontSize: '0.62rem', fontWeight: 600, marginTop: 2 }}>
              {durationLabel(ride.duration)}
            </span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: C.text, fontSize: '0.92rem' }}>{cityLabel(ride.to)}</div>
            <div style={{ color: DS.muted, fontSize: '0.7rem', marginTop: 1 }}>
              {ride.distance} {tx('findRideCard.km')}</div>
          </div>
        </div>

        {corridorPlan && (
          <div
            style={{
              marginBottom: 14,
              borderRadius: r(14),
              padding: '12px 14px',
              background: `linear-gradient(135deg, ${C.cyanDim}, ${C.elevated})`,
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Brain size={14} color={DS.cyan} />
              <span style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem' }}>
                {tx('findRideCard.wasel_brain')}</span>
            </div>
            <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.6 }}>
              {signal
                  ? ar
                  ? `ملكية المسار الحالية ${signal.routeOwnershipScore}/100 ونقطة الانطلاق ${pickupLabel(signal.recommendedPickupPoint)}.`
                  : `${signal.recommendedReason} Current route ownership is ${signal.routeOwnershipScore}/100 and pickup is ${signal.recommendedPickupPoint}.`
                : ar
                  ? `أوفر ${corridorPlan.savingsPercent}% من المشوار الفردي على مسار ${cityLabel(ride.from)} إلى ${cityLabel(ride.to)}. أفضل نقطة انطلاق: ${pickupLabel(corridorPlan.pickupPoints[0] ?? '')}.`
                  : `${corridorPlan.savingsPercent}% cheaper than solo movement on ${corridorPlan.label}. Best pickup: ${corridorPlan.pickupPoints[0]}.`}
            </div>
            {signal ? (
              <div style={{ color: DS.muted, fontSize: '0.7rem', lineHeight: 1.55, marginTop: 8 }}>
                {localizeSignalText(signal.productionSources.slice(0, 3).join(' | '))}
              </div>
            ) : null}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={pill(soldOut ? DS.gold : DS.cyan)}>
              <Users size={9} /> {soldOut ? (ar ? 'ممتلئ' : 'Sold out') : ar ? `${ride.seatsAvailable} مقاعد` : `${ride.seatsAvailable} seats`}
            </span>
            <span style={pill(genderMeta.color)}>
              {genderMeta.emoji} {genderLabel(ride.genderPref, genderMeta.label)}
            </span>
            {ride.prayerStops && <span style={pill(DS.gold)}>{tx('findRideCard.prayer')}</span>}
            {ride.pkgCapacity !== 'none' && (
              <span style={pill(DS.gold)}>
                <Package size={9} /> {packageCapacityLabel(ride.pkgCapacity)}
              </span>
            )}
            {signal && <span style={pill(DS.green)}>{tx('findRideCard.demand')}{signal.forecastDemandScore}</span>}
            {signal && <span style={pill(DS.cyan)}>{tx('findRideCard.owns')}{signal.routeOwnershipScore}</span>}
            {!signal && corridorPlan && (
              <span style={pill(DS.green)}>{tx('findRideCard.demand_2')}{corridorPlan.predictedDemandScore}</span>
            )}
            {hasBooking && (
              <span style={pill(bookingStatus === 'pending_driver' ? DS.gold : DS.green)}>
                <CheckCircle2 size={9} /> {tx('findRideCard.booked')}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <span
              style={{
                color: hasBooking
                  ? bookingStatus === 'pending_driver'
                    ? DS.gold
                    : DS.green
                  : soldOut
                    ? DS.gold
                    : DS.muted,
                fontSize: '0.75rem',
              }}
            >
              {hasBooking
                ? bookingStatus === 'pending_driver'
                  ? ar ? 'تم إرسال الطلب' : 'Request sent'
                  : ar ? 'تم تأكيد المقعد' : 'Seat confirmed'
                : soldOut
                  ? ar ? 'بديل الباص متاح' : 'Bus fallback available'
                  : signal
                    ? ar ? `${localizeSignalText(signal.nextWaveWindow)} التالي` : `${signal.nextWaveWindow} next`
                    : ar ? 'جاهز للحجز' : 'Ready to reserve'}
            </span>
            <button
              onClick={(event: React.MouseEvent) => {
                event.stopPropagation();
                if (hasBooking) {
                  onOpenBooking();
                  return;
                }

                onOpen();
              }}
              className="sp-book-btn"
              disabled={soldOut}
              style={{
                height: 44,
                padding: '0 18px',
                borderRadius: '99px',
                border: 'none',
                background: hasBooking
                  ? bookingStatus === 'pending_driver'
                    ? DS.gradGold
                    : DS.gradG
                  : soldOut
                    ? C.elevated
                    : DS.gradC,
                color: C.text,
                fontWeight: 800,
                fontSize: '0.82rem',
                boxShadow: `0 4px 16px ${
                  hasBooking
                    ? bookingStatus === 'pending_driver'
                      ? DS.gold
                      : DS.green
                    : soldOut
                      ? C.elevated
                      : DS.cyan
                }30`,
                cursor: soldOut ? 'not-allowed' : 'pointer',
                opacity: soldOut ? 0.88 : 1,
              }}
            >
               {hasBooking
                 ? ar ? 'افتح في رحلاتي' : 'Open in My Trips'
                 : soldOut
                   ? ar ? 'ممتلئ' : 'Sold out'
                   : ar ? 'عرض التفاصيل' : 'View details'}
             </button>
           </div>
         </div>
       </div>
     </div>
   );
});
