/**
 * WaselSwipeableRideCard — Gesture-driven ride card for mobile
 *
 * Features:
 * - Swipe LEFT  → Quick WhatsApp contact (cyan reveal)
 * - Swipe RIGHT → Save / Bookmark (gold reveal)
 * - Tap         → Expand details
 * - Spring physics via Framer Motion
 * - RTL-aware: swipe directions mirror in Arabic
 * - Haptic feedback (navigator.vibrate where supported)
 * - Verified driver badge, occupancy bar, prayer-stops tag
 */

import { useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from 'motion/react';
import {
  Star,
  MessageCircle,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Clock,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
  Moon,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { omitUndefined } from '../../utils/object';

/* ─── Brand ───────────────────────────────────────────────────────────────── */
const CYAN   = '#47B7E6';
const GOLD   = '#A8D614';
const F      = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";
const SWIPE_THRESHOLD = 72;

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface RideCardData {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  currency?: string;
  availableSeats: number;
  totalSeats: number;
  driver: {
    name: string;
    nameAr?: string;
    phone: string;
    rating: number;
    tripsCount: number;
    verified: boolean;
    responseMinutes?: number;
    avatarUrl?: string;
  };
  features?: {
    prayerStops?: boolean;
    instantBooking?: boolean;
    acAvailable?: boolean;
    femaleOnly?: boolean;
  };
}

interface WaselSwipeableRideCardProps {
  ride: RideCardData;
  onBook?: (id: string) => void;
  onWhatsApp?: (id: string, phone: string) => void;
  onSave?: (id: string) => void;
}

/* ─── Haptic utility ──────────────────────────────────────────────────────── */
function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}

/* ─── Occupancy bar ───────────────────────────────────────────────────────── */
function OccupancyBar({ available, total }: { available: number; total: number }) {
  const taken = total - available;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: i < taken
              ? 'rgba(71,183,230,0.35)'
              : `${CYAN}`,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Avatar ──────────────────────────────────────────────────────────────── */
function DriverAvatar({ name, avatarUrl, size = 40 }: { name: string; avatarUrl?: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: size / 2.5, objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.5, flexShrink: 0,
      background: `linear-gradient(135deg, ${CYAN}40, #1597FF40)`,
      border: `1.5px solid ${CYAN}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: F, fontWeight: 700, fontSize: size * 0.35, color: CYAN,
    }}>
      {initials}
    </div>
  );
}

/* ─── Main card ───────────────────────────────────────────────────────────── */
export function WaselSwipeableRideCard({
  ride,
  onBook,
  onWhatsApp,
  onSave,
}: WaselSwipeableRideCardProps) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);

  const x = useMotionValue(0);

  // Reveal backgrounds
  const leftRevealOpacity  = useTransform(x, [-SWIPE_THRESHOLD, -20, 0], [1, 0.5, 0]);
  const rightRevealOpacity = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0, 0.5, 1]);
  const cardScale          = useTransform(x, [-SWIPE_THRESHOLD * 1.2, 0, SWIPE_THRESHOLD * 1.2], [0.96, 1, 0.96]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset } = info;
    // RTL: mirror direction
    const effectiveX = isAr ? -offset.x : offset.x;

    if (effectiveX < -SWIPE_THRESHOLD) {
      // Swipe left → WhatsApp
      vibrate([30, 10, 30]);
      setSwiped('left');
      animate(x, isAr ? SWIPE_THRESHOLD * 1.8 : -SWIPE_THRESHOLD * 1.8, { type: 'spring', stiffness: 300 });
      setTimeout(() => {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
        setSwiped(null);
        onWhatsApp?.(ride.id, ride.driver.phone);
      }, 500);
    } else if (effectiveX > SWIPE_THRESHOLD) {
      // Swipe right → Save
      vibrate(20);
      setSaved(s => !s);
      setSwiped('right');
      animate(x, isAr ? -SWIPE_THRESHOLD * 1.2 : SWIPE_THRESHOLD * 1.2, { type: 'spring', stiffness: 300 });
      setTimeout(() => {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
        setSwiped(null);
        onSave?.(ride.id);
      }, 400);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  const occupancyPercent = Math.round(((ride.totalSeats - ride.availableSeats) / ride.totalSeats) * 100);
  const driverName = isAr && ride.driver.nameAr ? ride.driver.nameAr : ride.driver.name;
  const currency = ride.currency ?? (isAr ? 'د.أ' : 'JOD');

  return (
    <div style={{ position: 'relative', marginBottom: 12, userSelect: 'none' }}>

      {/* ── Swipe reveals ──────────────────────────────────────────── */}
      {/* Left reveal (WhatsApp) */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          opacity: isAr ? rightRevealOpacity : leftRevealOpacity,
          display: 'flex', alignItems: 'center',
          justifyContent: isAr ? 'flex-end' : 'flex-start',
          padding: '0 24px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <MessageCircle size={24} color="#fff" />
          <span style={{ fontFamily: F, fontSize: 10, color: '#fff', fontWeight: 700 }}>
            {isAr ? 'واتساب' : 'WhatsApp'}
          </span>
        </div>
      </motion.div>

      {/* Right reveal (Save) */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          background: `linear-gradient(135deg, ${GOLD}cc, #5a7a00cc)`,
          opacity: isAr ? leftRevealOpacity : rightRevealOpacity,
          display: 'flex', alignItems: 'center',
          justifyContent: isAr ? 'flex-start' : 'flex-end',
          padding: '0 24px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {saved ? <BookmarkCheck size={24} color="#fff" /> : <Bookmark size={24} color="#fff" />}
          <span style={{ fontFamily: F, fontSize: 10, color: '#fff', fontWeight: 700 }}>
            {saved ? (isAr ? 'محفوظة' : 'Saved') : (isAr ? 'احفظ' : 'Save')}
          </span>
        </div>
      </motion.div>

      {/* ── Card ───────────────────────────────────────────────────── */}
      <motion.div
        dir={isAr ? 'rtl' : 'ltr'}
        drag="x"
        dragConstraints={{ left: -SWIPE_THRESHOLD * 1.8, right: SWIPE_THRESHOLD * 1.8 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        style={{
          x,
          scale: cardScale,
          borderRadius: 20,
          background: 'linear-gradient(160deg, rgba(10,26,42,0.98), rgba(6,18,32,0.97))',
          border: swiped === 'left'
            ? '1px solid rgba(37,211,102,0.4)'
            : swiped === 'right'
              ? `1px solid ${GOLD}50`
              : '1px solid rgba(93,150,210,0.15)',
          boxShadow: '0 6px 28px rgba(0,10,20,0.35)',
          overflow: 'hidden',
          cursor: 'grab',
          WebkitTapHighlightColor: 'transparent',
          transition: 'border-color 0.2s',
        }}
      >
        {/* ─ Main row ─ */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{ padding: '16px 18px', cursor: 'pointer' }}
        >
          {/* Top: route + price */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MapPin size={12} color={CYAN} />
                <span style={{ fontFamily: F, fontWeight: 700, fontSize: 15, color: '#EAF7FF' }}>{ride.from}</span>
                <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(190,220,240,0.4)' }}>→</span>
                <span style={{ fontFamily: F, fontWeight: 700, fontSize: 15, color: '#EAF7FF' }}>{ride.to}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={11} color="rgba(190,220,240,0.5)" />
                  <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(190,220,240,0.6)' }}>{ride.time}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Users size={11} color="rgba(190,220,240,0.5)" />
                  <span style={{ fontFamily: F, fontSize: 12, color: 'rgba(190,220,240,0.6)' }}>
                    {ride.availableSeats} {isAr ? 'مقاعد' : 'seats'}
                  </span>
                </span>
              </div>
            </div>
            <div style={{ textAlign: isAr ? 'left' : 'right' }}>
              <div style={{ fontFamily: F, fontWeight: 800, fontSize: 22, color: GOLD, lineHeight: 1 }}>
                {ride.price}
              </div>
              <div style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.5)' }}>{currency}</div>
            </div>
          </div>

          {/* Occupancy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <OccupancyBar available={ride.availableSeats} total={ride.totalSeats} />
            <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.5)' }}>
              {occupancyPercent}% {isAr ? 'محجوز' : 'booked'}
            </span>
          </div>

          {/* Driver row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <DriverAvatar
                {...omitUndefined({
                  name: driverName,
                  avatarUrl: ride.driver.avatarUrl,
                })}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: F, fontWeight: 600, fontSize: 13, color: '#EAF7FF' }}>{driverName}</span>
                  {ride.driver.verified && (
                    <Shield size={12} color={CYAN} />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={10} fill={GOLD} color={GOLD} />
                  <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.7)' }}>
                    {ride.driver.rating.toFixed(1)} · {ride.driver.tripsCount} {isAr ? 'رحلة' : 'trips'}
                  </span>
                </div>
              </div>
            </div>
            {/* Expand toggle */}
            <div style={{ color: 'rgba(190,220,240,0.4)' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* ─ Feature tags ─ */}
        {(ride.features?.prayerStops || ride.features?.instantBooking || ride.features?.acAvailable || ride.features?.femaleOnly) && (
          <div style={{ display: 'flex', gap: 6, padding: '0 18px 14px', flexWrap: 'wrap' }}>
            {ride.features?.prayerStops && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(168,214,20,0.1)', border: '1px solid rgba(168,214,20,0.2)', fontFamily: F, fontSize: 10, color: GOLD, fontWeight: 600 }}>
                <Moon size={10} color={GOLD} />
                {isAr ? 'وقفات صلاة' : 'Prayer stops'}
              </span>
            )}
            {ride.features?.instantBooking && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(71,183,230,0.1)', border: '1px solid rgba(71,183,230,0.2)', fontFamily: F, fontSize: 10, color: CYAN, fontWeight: 600 }}>
                ⚡ {isAr ? 'حجز فوري' : 'Instant book'}
              </span>
            )}
            {ride.features?.acAvailable && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(114,208,239,0.1)', border: '1px solid rgba(114,208,239,0.2)', fontFamily: F, fontSize: 10, color: '#72D0EF', fontWeight: 600 }}>
                ❄️ {isAr ? 'تكييف' : 'A/C'}
              </span>
            )}
            {ride.features?.femaleOnly && (
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)', fontFamily: F, fontSize: 10, color: '#ec4899', fontWeight: 600 }}>
                {isAr ? 'نساء فقط' : 'Female only'}
              </span>
            )}
          </div>
        )}

        {/* ─ Expanded detail + CTA ─ */}
        <motion.div
          initial={false}
          animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(93,150,210,0.1)', paddingTop: 14 }}>
            {ride.driver.responseMinutes !== undefined && (
              <p style={{ fontFamily: F, fontSize: 12, color: 'rgba(190,220,240,0.6)', marginBottom: 14 }}>
                ⚡ {isAr
                  ? `يرد عادةً خلال ${ride.driver.responseMinutes} دقائق`
                  : `Usually responds in ${ride.driver.responseMinutes} min`
                }
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => { vibrate(20); onBook?.(ride.id); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${CYAN}, #1597FF)`,
                  border: 'none',
                  fontFamily: F,
                  fontWeight: 800,
                  fontSize: 14,
                  color: '#032033',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {isAr ? 'احجز الآن' : 'Book Now'}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => { vibrate([15, 10, 15]); onWhatsApp?.(ride.id, ride.driver.phone); }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'rgba(37,211,102,0.12)',
                  border: '1px solid rgba(37,211,102,0.25)',
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#25D366',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <MessageCircle size={16} />
                {isAr ? 'واتساب' : 'WhatsApp'}
              </motion.button>
            </div>
            <p style={{ fontFamily: F, fontSize: 10, color: 'rgba(190,220,240,0.35)', textAlign: 'center', marginTop: 10 }}>
              {isAr
                ? '← اسحب يساراً للتواصل · يميناً للحفظ →'
                : '← Swipe left to contact · right to save →'
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default WaselSwipeableRideCard;
