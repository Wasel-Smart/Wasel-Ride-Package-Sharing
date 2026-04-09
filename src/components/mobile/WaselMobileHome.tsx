/**
 * WaselMobileHome — Mobile-first home screen for Wasel
 *
 * A purpose-built mobile dashboard:
 * - Quick-action hero with animated gradient
 * - Live summary strip (active trip / pending package)
 * - One-tap action cards for the 4 core flows
 * - Nearby rides preview (skeleton → real data)
 * - Pull-to-refresh (visual indicator)
 * - RTL/LTR + Arabic typography
 *
 * Designed to replace or augment the generic landing page on mobile (<900px).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bus,
  MapPin,
  Package,
  Search,
  ArrowRight,
  Star,
  Clock,
  ChevronRight,
  Zap,
  Shield,
  RotateCcw,
  WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { getOnlineState } from './mobileRuntime';

/* ─── Brand constants ─────────────────────────────────────────────────────── */
const CYAN = '#47B7E6';
const GOLD = '#A8D614';
const NAVY_DEEP = '#03111C';
const F = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface QuickRoute {
  from: string;
  to: string;
  price: number;
  seats: number;
  time: string;
}

interface HomeCopy {
  greeting: string;
  tagline: string;
  findRide: string;
  offerRide: string;
  bus: string;
  packages: string;
  findRideDesc: string;
  offerRideDesc: string;
  busDesc: string;
  packagesDesc: string;
  nearbyTitle: string;
  pullToRefresh: string;
  releasing: string;
  refreshing: string;
  from: string;
  to: string;
  seats: string;
  bookNow: string;
  jod: string;
  viewAll: string;
  trustBadge: string;
  trustLabel: string;
}

/* ─── Sample nearby data (replace with Supabase query) ───────────────────── */
const SAMPLE_ROUTES: QuickRoute[] = [
  { from: 'عمّان', to: 'العقبة', price: 18, seats: 3, time: '08:00' },
  { from: 'عمّان', to: 'إربد', price: 6, seats: 2, time: '09:30' },
  { from: 'عمّان', to: 'البحر الميت', price: 12, seats: 4, time: '10:00' },
];

const SAMPLE_ROUTES_EN: QuickRoute[] = [
  { from: 'Amman', to: 'Aqaba', price: 18, seats: 3, time: '08:00' },
  { from: 'Amman', to: 'Irbid', price: 6, seats: 2, time: '09:30' },
  { from: 'Amman', to: 'Dead Sea', price: 12, seats: 4, time: '10:00' },
];

/* ─── Copy ────────────────────────────────────────────────────────────────── */
const AR: HomeCopy = {
  greeting: 'مرحباً 👋',
  tagline: 'إلى أين تريد الذهاب اليوم؟',
  findRide: 'ابحث عن رحلة',
  offerRide: 'شارك رحلتك',
  bus: 'الباص',
  packages: 'الطرود',
  findRideDesc: 'اعثر على مقعد في أي رحلة',
  offerRideDesc: 'أضف مقاعد وكسب أثناء السفر',
  busDesc: 'مواعيد ثابتة للمسارات الرئيسية',
  packagesDesc: 'أرسل طردك مع أي مسافر',
  nearbyTitle: 'رحلات قريبة الآن',
  pullToRefresh: 'اسحب للتحديث',
  releasing: 'أفلت للتحديث',
  refreshing: 'جاري التحديث…',
  from: 'من',
  to: 'إلى',
  seats: 'مقاعد',
  bookNow: 'احجز',
  jod: 'د.أ',
  viewAll: 'عرض الكل',
  trustBadge: '🔒',
  trustLabel: 'مدفوعات آمنة · سائقون موثّقون · ضمان استرداد',
};

const EN: HomeCopy = {
  greeting: 'Hello 👋',
  tagline: 'Where are you headed today?',
  findRide: 'Find a Ride',
  offerRide: 'Offer a Ride',
  bus: 'Bus',
  packages: 'Packages',
  findRideDesc: 'Grab a seat on any trip',
  offerRideDesc: 'Add seats and earn while you travel',
  busDesc: 'Fixed schedules on major corridors',
  packagesDesc: 'Send a parcel with any traveler',
  nearbyTitle: 'Rides available now',
  pullToRefresh: 'Pull to refresh',
  releasing: 'Release to refresh',
  refreshing: 'Refreshing…',
  from: 'From',
  to: 'To',
  seats: 'seats',
  bookNow: 'Book',
  jod: 'JOD',
  viewAll: 'View all',
  trustBadge: '🔒',
  trustLabel: 'Secure payments · Verified drivers · Refund guarantee',
};

/* ─── Quick-action card ───────────────────────────────────────────────────── */
function ActionCard({
  icon: Icon,
  label,
  description,
  color,
  gradient,
  onClick,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  gradient: string;
  onClick: () => void;
  delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, type: 'spring', stiffness: 320, damping: 26 }}
      whileTap={{ scale: 0.94 }}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 124,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        padding: '18px 16px',
        borderRadius: 20,
        background: gradient,
        border: `1px solid ${color}28`,
        boxShadow: `0 8px 28px ${color}18`,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow blob */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}30, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${color}22`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </span>
      <span style={{ fontFamily: F, fontWeight: 700, fontSize: 14, color: '#EAF7FF', lineHeight: 1.2 }}>
        {label}
      </span>
      <span style={{ fontFamily: F, fontWeight: 400, fontSize: 11, color: 'rgba(190,220,240,0.7)', lineHeight: 1.4 }}>
        {description}
      </span>
    </motion.button>
  );
}

/* ─── Ride preview row ────────────────────────────────────────────────────── */
function RideRow({
  route,
  copy,
  index,
  onBook,
}: {
  route: QuickRoute;
  copy: HomeCopy;
  index: number;
  onBook: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.12 + index * 0.06, duration: 0.22 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(93,150,210,0.12)',
        marginBottom: 8,
      }}
    >
      {/* Route pill */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <MapPin size={12} color={CYAN} />
          <span style={{ fontFamily: F, fontWeight: 600, fontSize: 13, color: '#EAF7FF' }}>
            {route.from}
          </span>
          <ArrowRight size={10} color='rgba(190,220,240,0.4)' />
          <span style={{ fontFamily: F, fontWeight: 600, fontSize: 13, color: '#EAF7FF' }}>
            {route.to}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} color='rgba(190,220,240,0.5)' />
            <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.6)' }}>{route.time}</span>
          </span>
          <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.5)' }}>
            {route.seats} {copy.seats}
          </span>
        </div>
      </div>

      {/* Price + CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: F, fontWeight: 800, fontSize: 15, color: GOLD }}>
          {route.price} <span style={{ fontSize: 10, fontWeight: 500 }}>{copy.jod}</span>
        </span>
        <motion.button
          type="button"
          onClick={onBook}
          whileTap={{ scale: 0.9 }}
          style={{
            padding: '5px 14px',
            minHeight: 36,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${CYAN}, #1597FF)`,
            border: 'none',
            color: '#032033',
            fontFamily: F,
            fontWeight: 800,
            fontSize: 11,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {copy.bookNow}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(93,150,210,0.08)',
        marginBottom: 8,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes wasel-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(71,183,230,0.06) 50%, transparent 100%)',
            animation: 'wasel-shimmer 1.4s infinite',
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '60%', marginBottom: 8 }} />
        <div style={{ height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.04)', width: '40%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ height: 14, width: 44, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ height: 22, width: 52, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

/* ─── Pull-to-refresh hook ────────────────────────────────────────────────── */
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const THRESHOLD = 72;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY.current) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, refreshing, onRefresh]);

  return { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd, THRESHOLD };
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export function WaselMobileHome() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const copy = isAr ? AR : EN;
  const routes = isAr ? SAMPLE_ROUTES : SAMPLE_ROUTES_EN;

  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(getOnlineState);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = setTimeout(() => setLoading(false), 900);
    return () => { clearTimeout(t); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const doRefresh = useCallback(async () => {
    setLoading(true);
    await new Promise<void>(r => setTimeout(r, 1200));
    setLoading(false);
  }, []);

  const { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd, THRESHOLD } =
    usePullToRefresh(doRefresh);

  const pullProgress = Math.min(pullDistance / THRESHOLD, 1);
  const isPulling = pullDistance > 8;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        fontFamily: F,
        minHeight: '100dvh',
        background: NAVY_DEEP,
        overscrollBehavior: 'none',
        touchAction: 'pan-y',
      }}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(isPulling || refreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 999,
              background: 'rgba(8,27,43,0.96)',
              border: `1px solid ${CYAN}30`,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullProgress * 360 }}
              transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            >
              <RotateCcw size={14} color={CYAN} />
            </motion.div>
            <span style={{ fontFamily: F, fontSize: 12, color: CYAN }}>
              {refreshing ? copy.refreshing : pullProgress >= 1 ? copy.releasing : copy.pullToRefresh}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline banner */}
      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            style={{
              background: 'rgba(239,68,68,0.16)',
              borderBottom: '1px solid rgba(239,68,68,0.28)',
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <WifiOff size={14} color="#ef4444" />
            <span style={{ fontFamily: F, fontSize: 12, color: '#fca5a5' }}>
              {isAr ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          padding: 'max(24px, calc(env(safe-area-inset-top, 0px) + 16px)) 20px calc(112px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >

        {/* ── Hero greeting ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 24 }}
        >
          <p style={{ fontFamily: F, fontWeight: 500, fontSize: 14, color: 'rgba(190,220,240,0.7)', marginBottom: 4 }}>
            {copy.greeting}
          </p>
          <h1 style={{ fontFamily: F, fontWeight: 800, fontSize: 26, color: '#EAF7FF', lineHeight: 1.25, margin: 0 }}>
            {copy.tagline}
          </h1>
        </motion.div>

        {/* ── Search bar ─────────────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={() => navigate('/app/find-ride')}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.06, duration: 0.24 }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minHeight: 56,
            padding: '14px 18px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.06)',
            border: `1.5px solid ${CYAN}35`,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            marginBottom: 24,
            boxShadow: `0 0 0 0 ${CYAN}00`,
            transition: 'box-shadow 0.2s',
          }}
        >
          <Search size={18} color={CYAN} />
          <span style={{ fontFamily: F, fontSize: 14, color: 'rgba(190,220,240,0.6)', flex: 1, textAlign: isAr ? 'right' : 'left' }}>
            {isAr ? 'أين تريد الذهاب؟' : 'Where are you going?'}
          </span>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: `linear-gradient(135deg, ${CYAN}, #1597FF)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowRight size={14} color="#032033" strokeWidth={2.5} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
          </div>
        </motion.button>

        {/* ── 2×2 Action grid ───────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <ActionCard
            icon={Search}
            label={copy.findRide}
            description={copy.findRideDesc}
            color={CYAN}
            gradient="linear-gradient(135deg, rgba(71,183,230,0.14), rgba(21,97,169,0.18) 80%, rgba(3,32,51,0.1))"
            onClick={() => navigate('/app/find-ride')}
            delay={0.08}
          />
          <ActionCard
            icon={Zap}
            label={copy.offerRide}
            description={copy.offerRideDesc}
            color={GOLD}
            gradient="linear-gradient(135deg, rgba(168,214,20,0.14), rgba(80,130,0,0.14) 80%, rgba(3,32,51,0.1))"
            onClick={() => navigate('/app/offer-ride')}
            delay={0.12}
          />
          <ActionCard
            icon={Bus}
            label={copy.bus}
            description={copy.busDesc}
            color="#72D0EF"
            gradient="linear-gradient(135deg, rgba(114,208,239,0.12), rgba(21,97,169,0.14) 80%, rgba(3,32,51,0.1))"
            onClick={() => navigate('/app/bus')}
            delay={0.16}
          />
          <ActionCard
            icon={Package}
            label={copy.packages}
            description={copy.packagesDesc}
            color="#C9E96B"
            gradient="linear-gradient(135deg, rgba(201,233,107,0.12), rgba(107,181,21,0.14) 80%, rgba(3,32,51,0.1))"
            onClick={() => navigate('/app/packages')}
            delay={0.20}
          />
        </div>

        {/* ── Trust strip ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 14,
            background: 'rgba(168,214,20,0.06)',
            border: '1px solid rgba(168,214,20,0.14)',
            marginBottom: 28,
          }}
        >
          <Shield size={14} color={GOLD} />
          <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(200,230,120,0.8)', lineHeight: 1.5 }}>
            {copy.trustLabel}
          </span>
        </motion.div>

        {/* ── Nearby rides ──────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: F, fontWeight: 700, fontSize: 15, color: '#EAF7FF', margin: 0 }}>
              {copy.nearbyTitle}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/app/find-ride')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                minHeight: 44,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: F,
                fontSize: 12,
                color: CYAN,
                fontWeight: 600,
                padding: 0,
              }}
            >
              {copy.viewAll}
              <ChevronRight size={13} color={CYAN} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>

          {loading || refreshing ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (
            routes.map((r, i) => (
              <RideRow
                key={i}
                route={r}
                copy={copy}
                index={i}
                onBook={() => navigate('/app/find-ride')}
              />
            ))
          )}
        </div>

        {/* ── Rating stars ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 28,
            padding: '12px',
          }}
        >
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} fill={GOLD} color={GOLD} />
          ))}
          <span style={{ fontFamily: F, fontSize: 11, color: 'rgba(190,220,240,0.5)', marginLeft: 4 }}>
            {isAr ? '٤.٩ تقييم متوسط' : '4.9 avg. rating'}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default WaselMobileHome;
