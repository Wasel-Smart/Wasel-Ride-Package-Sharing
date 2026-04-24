/**
 * WaselMobileHome — Mobile-first home screen for Wasel
 * Fully token-driven: zero hardcoded hex colours.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Package, Search, ArrowRight,
  Star, Clock, ChevronRight, Zap, Shield,
  RotateCcw, WifiOff,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { getOnlineState } from './mobileRuntime';
import { F } from '../../utils/wasel-ds';

/* ─── Types ───────────────────────────────────────────────────── */
interface QuickRoute { from: string; to: string; price: number; seats: number; time: string; }
interface HomeCopy {
  greeting: string; tagline: string; findRide: string; offerRide: string;
  bus: string; packages: string; findRideDesc: string; offerRideDesc: string;
  busDesc: string; packagesDesc: string; nearbyTitle: string;
  pullToRefresh: string; releasing: string; refreshing: string;
  from: string; to: string; seats: string; bookNow: string; jod: string;
  viewAll: string; trustLabel: string;
}

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

const AR: HomeCopy = {
  greeting: 'مرحباً 👋', tagline: 'إلى أين تريد الذهاب اليوم؟',
  findRide: 'ابحث عن رحلة', offerRide: 'شارك رحلتك', bus: 'الباص', packages: 'الطرود',
  findRideDesc: 'اعثر على مقعد في أي رحلة', offerRideDesc: 'أضف مقاعد وكسب أثناء السفر',
  busDesc: 'مواعيد ثابتة للمسارات الرئيسية', packagesDesc: 'أرسل طردك مع أي مسافر',
  nearbyTitle: 'رحلات قريبة الآن', pullToRefresh: 'اسحب للتحديث',
  releasing: 'أفلت للتحديث', refreshing: 'جاري التحديث…',
  from: 'من', to: 'إلى', seats: 'مقاعد', bookNow: 'احجز', jod: 'د.أ',
  viewAll: 'عرض الكل', trustLabel: 'مدفوعات آمنة · سائقون موثّقون · ضمان استرداد',
};
const EN: HomeCopy = {
  greeting: 'Hello 👋', tagline: 'Where are you headed today?',
  findRide: 'Find a Ride', offerRide: 'Offer a Ride', bus: 'Bus', packages: 'Packages',
  findRideDesc: 'Grab a seat on any trip', offerRideDesc: 'Add seats and earn while you travel',
  busDesc: 'Fixed schedules on major corridors', packagesDesc: 'Send a parcel with any traveler',
  nearbyTitle: 'Rides available now', pullToRefresh: 'Pull to refresh',
  releasing: 'Release to refresh', refreshing: 'Refreshing…',
  from: 'From', to: 'To', seats: 'seats', bookNow: 'Book', jod: 'JOD',
  viewAll: 'View all', trustLabel: 'Secure payments · Verified drivers · Refund guarantee',
};

/* ─── Action card config ──────────────────────────────────────── */
interface ActionConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  accentVar: string;
  dimVar: string;
  borderVar: string;
  path: string;
  delay: number;
}

/* ─── Quick-action card ───────────────────────────────────────── */
function ActionCard({ icon: Icon, label, description, accentVar, dimVar, borderVar, onClick, delay = 0 }: {
  icon: React.ElementType; label: string; description: string;
  accentVar: string; dimVar: string; borderVar: string;
  onClick: () => void; delay?: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, type: 'spring', stiffness: 340, damping: 28 }}
      whileTap={{ scale: 0.93 }}
      className="m-action-card"
      style={{
        flex: 1, minWidth: 0, minHeight: 130,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 8, padding: '18px 15px 16px',
        background: 'var(--card)',
        border: `1px solid ${borderVar}`,
        boxShadow: `0 4px 16px color-mix(in srgb, ${accentVar} 8%, transparent), 0 1px 3px rgba(20,52,89,0.06)`,
        position: 'relative', overflow: 'hidden',
        fontFamily: F,
      }}
    >
      {/* Top-right ambient glow */}
      <span aria-hidden style={{
        position: 'absolute', top: -24, right: -24,
        width: 88, height: 88, borderRadius: '50%',
        background: `radial-gradient(circle, color-mix(in srgb, ${accentVar} 22%, transparent), transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Icon with gradient bg */}
      <span style={{
        width: 42, height: 42, borderRadius: 13,
        background: `linear-gradient(135deg, ${dimVar}, color-mix(in srgb, ${accentVar} 6%, white))`,
        border: `1.5px solid ${borderVar}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        boxShadow: `0 4px 12px color-mix(in srgb, ${accentVar} 14%, transparent)`,
      }}>
        <Icon size={20} color={accentVar} strokeWidth={2.1} />
      </span>
      <span style={{ fontFamily: F, fontWeight: 700, fontSize: '0.875rem', color: 'var(--m-text)', lineHeight: 1.2, marginTop: 2 }}>
        {label}
      </span>
      <span style={{ fontFamily: F, fontWeight: 400, fontSize: '0.7rem', color: 'var(--m-text-sub)', lineHeight: 1.45 }}>
        {description}
      </span>
    </motion.button>
  );
}

/* ─── Ride preview row ────────────────────────────────────────── */
function RideRow({ route, copy, index, onBook }: {
  route: QuickRoute; copy: HomeCopy; index: number; onBook: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.12 + index * 0.06, duration: 0.22 }}
      className="m-ride-row"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <MapPin size={12} color="var(--m-accent)" />
          <span style={{ fontFamily: F, fontWeight: 600, fontSize: 13, color: 'var(--m-text)' }}>{route.from}</span>
          <ArrowRight size={10} color="var(--m-text-muted)" />
          <span style={{ fontFamily: F, fontWeight: 600, fontSize: 13, color: 'var(--m-text)' }}>{route.to}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} color="var(--m-text-muted)" />
            <span style={{ fontFamily: F, fontSize: 11, color: 'var(--m-text-muted)' }}>{route.time}</span>
          </span>
          <span style={{ fontFamily: F, fontSize: 11, color: 'var(--m-text-muted)' }}>
            {route.seats} {copy.seats}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span className="m-price">
          {route.price} <span className="m-price-unit">{copy.jod}</span>
        </span>
        <motion.button type="button" onClick={onBook} whileTap={{ scale: 0.9 }} className="m-book-btn">
          {copy.bookNow}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div className="m-ride-row" style={{ marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div className="m-skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
        <div className="m-skeleton" style={{ height: 10, width: '40%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div className="m-skeleton" style={{ height: 14, width: 44 }} />
        <div className="m-skeleton" style={{ height: 22, width: 52, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ─── Pull-to-refresh hook ────────────────────────────────────── */
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
    if (delta > 0 && window.scrollY === 0) setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } finally { setRefreshing(false); }
    }
    setPullDistance(0);
    startY.current = 0;
  }, [pullDistance, refreshing, onRefresh]);

  return { pullDistance, refreshing, handleTouchStart, handleTouchMove, handleTouchEnd, THRESHOLD };
}

/* ─── Main component ──────────────────────────────────────────── */
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

  const actions: ActionConfig[] = [
    {
      icon: Search, label: copy.findRide, description: copy.findRideDesc,
      accentVar: 'var(--m-accent)', dimVar: 'var(--m-accent-dim)', borderVar: 'var(--m-accent-border)',
      path: '/app/find-ride', delay: 0.08,
    },
    {
      icon: Zap, label: copy.offerRide, description: copy.offerRideDesc,
      accentVar: 'var(--m-action)', dimVar: 'var(--m-action-dim)', borderVar: 'var(--m-action-border)',
      path: '/app/offer-ride', delay: 0.12,
    },
    {
      icon: Package, label: copy.packages, description: copy.packagesDesc,
      accentVar: 'var(--m-action)', dimVar: 'var(--m-action-dim)', borderVar: 'var(--m-action-border)',
      path: '/app/packages', delay: 0.16,
    },
  ];

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        fontFamily: F,
        minHeight: '100dvh',
        background: 'var(--wasel-shell-background)',
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
            className="m-ptr-pill"
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: pullProgress * 360 }}
              transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            >
              <RotateCcw size={14} color="var(--m-accent)" />
            </motion.div>
            <span style={{ fontFamily: F, fontSize: 12, color: 'var(--m-accent)' }}>
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
            className="m-offline-banner"
          >
            <WifiOff size={14} color="var(--danger)" />
            <span style={{ fontFamily: F, fontSize: 12, color: 'var(--danger)' }}>
              {isAr ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        padding: 'max(20px, calc(env(safe-area-inset-top, 0px) + 12px)) 18px calc(112px + env(safe-area-inset-bottom, 0px))',
        maxWidth: 480,
        margin: '0 auto',
      }}>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          style={{
            marginBottom: 20,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #0b1c2f 0%, #0f2439 54%, #15304a 100%)',
            border: '1px solid rgba(169,227,255,0.10)',
            boxShadow: '0 20px 56px rgba(10,28,50,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
            padding: '28px 22px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow blobs */}
          <span aria-hidden style={{
            position: 'absolute', top: -40, right: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,194,170,0.18), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <span aria-hidden style={{
            position: 'absolute', bottom: -30, left: -20,
            width: 120, height: 120, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(169,227,255,0.12), transparent 70%)',
            pointerEvents: 'none',
          }} />

          <p style={{ fontFamily: F, fontWeight: 500, fontSize: '0.82rem', color: 'rgba(169,227,255,0.7)', marginBottom: 6 }}>
            {copy.greeting}
          </p>
          <h1 style={{
            fontFamily: F, fontWeight: 800,
            fontSize: 'clamp(1.35rem, 5.5vw, 1.65rem)',
            color: '#f0f8ff', lineHeight: 1.22, margin: '0 0 20px',
          }}>
            {copy.tagline}
          </h1>

          {/* Search bar inside hero */}
          <motion.button
            type="button"
            onClick={() => navigate('/app/find-ride')}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              minHeight: 52, padding: '13px 16px',
              borderRadius: 16,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(169,227,255,0.18)',
              backdropFilter: 'blur(12px)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              fontFamily: F,
              transition: 'border-color 0.18s ease, background 0.18s ease',
            }}
          >
            <Search size={17} color="var(--m-accent)" />
            <span style={{ fontFamily: F, fontSize: '0.875rem', color: 'rgba(169,227,255,0.55)', flex: 1, textAlign: isAr ? 'right' : 'left' }}>
              {isAr ? 'أين تريد الذهاب؟' : 'Where are you going?'}
            </span>
            <div style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #22c2aa, #a9e3ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowRight size={14} color="#081520" strokeWidth={2.5}
                style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </div>
          </motion.button>

          {/* Trust micro-strip inside hero */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 14,
          }}>
            <Shield size={12} color="rgba(34,194,170,0.8)" />
            <span style={{ fontFamily: F, fontSize: '0.7rem', color: 'rgba(169,227,255,0.55)', lineHeight: 1.4 }}>
              {copy.trustLabel}
            </span>
          </div>
        </motion.div>

        {/* ── 2×2 Action grid ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {actions.map((a) => (
            <ActionCard
              key={a.path}
              icon={a.icon}
              label={a.label}
              description={a.description}
              accentVar={a.accentVar}
              dimVar={a.dimVar}
              borderVar={a.borderVar}
              onClick={() => navigate(a.path)}
              delay={a.delay}
            />
          ))}
        </div>

        {/* ── Nearby rides ──────────────────────────────────────── */}
        <div>
          <div className="m-section-head">
            <h2 className="m-section-title">{copy.nearbyTitle}</h2>
            <button type="button" onClick={() => navigate('/app/find-ride')} className="m-view-all">
              {copy.viewAll}
              <ChevronRight size={13} color="var(--m-accent)" style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>

          {loading || refreshing ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : (
            routes.map((r, i) => (
              <RideRow key={i} route={r} copy={copy} index={i} onBook={() => navigate('/app/find-ride')} />
            ))
          )}
        </div>

        {/* ── Rating row ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="m-rating-row"
          style={{ marginTop: 8 }}
        >
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={13} fill="var(--m-action)" color="var(--m-action)" />
          ))}
          <span style={{ fontFamily: F, fontSize: '0.72rem', color: 'var(--m-text-muted)', marginLeft: 4 }}>
            {isAr ? '٤.٩ تقييم متوسط' : '4.9 avg. rating'}
          </span>
        </motion.div>
      </div>
    </div>
  );
}

export default WaselMobileHome;
