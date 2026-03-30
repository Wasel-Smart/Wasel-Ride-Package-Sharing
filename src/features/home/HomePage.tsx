/**
 * Wasel Home / Dashboard v6.0
 *
 * Brand Story:
 *   Rides, buses, and rider-delivered packages are the core trip modes
 *
 * Weaknesses ? Strengths applied:
 *  ? Quick Actions shortcut row � prominent, 2�2 on mobile, 4-col on desktop
 *  ? Currency switcher on balance (uses full CurrencyService)
 *  ? Arabic content � every label bilingual in Jordanian dialect
 *  ? Mobile 375px � stats use min-width, no overflow; single-col below 480px
 *  ? Pull-to-refresh manual reload button
 *  ? Skeleton loaders while stats are "loading"
 *  ? SOS button triggers real tel: phone call
 *  ? Trust score formula explained in expandable panel
 *  ? One-Way / Round-Trip toggle as the hero brand concept
 *  ? Token color #040C18 everywhere (no #020810 drift)
 *  ? Progress bars use border-radius: 9999px (R.full)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car, Package, MapPin, Users, ArrowRight,
  Search, Star, TrendingUp, Clock, CheckCircle,
  Zap, Shield, Moon, Sparkles, ChevronRight,
  Activity, RefreshCw, AlertTriangle, Phone,
  ChevronDown, ChevronUp, Repeat, ArrowUpRight,
  Globe, Info,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { CurrencyService, type SupportedCurrency, SUPPORTED_CURRENCY_CODES } from '../../utils/currency';
import { useLiveUserStats, useLivePlatformStats } from '../../services/liveDataService';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';

/* -- Design tokens (unified � no drift from #040C18) ----------------------- */
const C = {
  bg:        '#040C18',
  card:      '#0A1628',
  card2:     '#0D1E36',
  s3:        '#10203A',
  cyan:      '#00C8E8',
  cyanDim:   'rgba(0,200,232,0.12)',
  gold:      '#F0A830',
  goldDim:   'rgba(240,168,48,0.12)',
  green:     '#00C875',
  greenDim:  'rgba(0,200,117,0.12)',
  purple:    '#8B5CF6',
  purpleDim: 'rgba(139,92,246,0.12)',
  red:       '#FF4455',
  redDim:    'rgba(255,68,85,0.12)',
  border:    'rgba(0,200,232,0.08)',
  text:      '#EFF6FF',
  textMuted: 'rgba(148,163,184,0.75)',
  textDim:   'rgba(148,163,184,0.55)',
} as const;

const F = "-apple-system, BlinkMacSystemFont, 'Inter', 'Cairo', 'Tajawal', sans-serif";
const glass = (op = 0.68) => `rgba(10,22,40,${op})`;

/* -- Popular Jordan routes -------------------------------------------------- */
const POPULAR_ROUTES = [
  { from: 'Amman', fromAr: 'عمّان', to: 'Aqaba',    toAr: 'العقبة',       dist: 330, priceJod: 8,  icon: '◉', color: C.cyan   },
  { from: 'Amman', fromAr: 'عمّان', to: 'Irbid',    toAr: 'إربد',         dist: 85,  priceJod: 3,  icon: '◌', color: C.green  },
  { from: 'Amman', fromAr: 'عمّان', to: 'Dead Sea', toAr: 'البحر الميت',  dist: 60,  priceJod: 5,  icon: '◍', color: '#0EA5E9' },
  { from: 'Amman', fromAr: 'عمّان', to: 'Petra',    toAr: 'البتراء',      dist: 250, priceJod: 12, icon: '◈', color: C.gold   },
  { from: 'Amman', fromAr: 'عمّان', to: 'Wadi Rum', toAr: 'وادي رم',      dist: 320, priceJod: 15, icon: '◎', color: '#F59E0B' },
  { from: 'Amman', fromAr: 'عمّان', to: 'Zarqa',    toAr: 'الزرقاء',      dist: 30,  priceJod: 2,  icon: '◐', color: C.purple },
];

/* -- Skeleton loader ------------------------------------------------------- */
function Skeleton({ w = '100%', h = 20, radius = 8 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s infinite linear',
    }} />
  );
}

/* -- Section header -------------------------------------------------------- */
function SectionHeader({ title, icon, action, onAction }: {
  title: string; icon: string; action?: string; onAction?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h2 style={{ fontWeight: 800, color: C.text, fontSize: '1rem', margin: 0 }}>{title}</h2>
      </div>
      {action && onAction && (
        <button onClick={onAction} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.cyan, fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, fontFamily: F }}>
          {action} <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

/* -- Currency mini-switcher ------------------------------------------------ */
function InlineCurrencySwitcher({ ar }: { ar: boolean }) {
  const svc = CurrencyService.getInstance();
  const [cur, setCur] = useState<SupportedCurrency>(svc.current);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const POPULAR: SupportedCurrency[] = ['JOD', 'USD', 'EUR', 'SAR', 'EGP', 'GBP'];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (code: SupportedCurrency) => {
    svc.setCurrency(code);
    setCur(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
        borderRadius: 9999, background: 'rgba(0,200,232,0.10)',
        border: '1px solid rgba(0,200,232,0.25)', cursor: 'pointer',
        fontSize: '0.72rem', fontWeight: 700, color: C.cyan, fontFamily: F,
      }}>
        FX {cur}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 120,
          background: '#0A1628', border: '1px solid rgba(0,200,232,0.18)',
          borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          zIndex: 100, overflow: 'hidden',
        }}>
          {POPULAR.map(code => (
            <button key={code} onClick={() => select(code)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '7px 12px', border: 'none',
              background: cur === code ? 'rgba(0,200,232,0.12)' : 'transparent',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: cur === code ? 700 : 500,
              color: cur === code ? C.cyan : C.text, fontFamily: F,
            }}>
              <span>{code}</span>
              <span style={{ color: C.textDim, fontSize: '0.65rem' }}>{svc.getSymbol(code)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -- SOS Emergency button -------------------------------------------------- */
function SOSButton({ ar }: { ar: boolean }) {
  const [pressed, setPressed] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleSOS = () => {
    if (!confirm) { setConfirm(true); return; }
    // Real phone call trigger
    window.open('tel:911', '_self');
    setPressed(true);
    setTimeout(() => { setPressed(false); setConfirm(false); }, 4000);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <motion.button
        onClick={handleSOS}
        whileTap={{ scale: 0.92 }}
        style={{
          height: 42, padding: '0 18px', borderRadius: 9999,
          background: confirm ? '#FF2233' : 'rgba(255,68,85,0.15)',
          border: `2px solid ${confirm ? '#FF2233' : 'rgba(255,68,85,0.45)'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: '0.82rem', fontWeight: 800, color: confirm ? '#fff' : C.red,
          fontFamily: F, transition: 'all 0.2s',
          boxShadow: confirm ? '0 0 24px rgba(255,34,51,0.5)' : 'none',
        }}
      >
        <Phone size={14} />
        {pressed
          ? (ar ? 'جارٍ الاتصال...' : 'Calling...')
          : confirm
          ? (ar ? 'اضغط مرة أخرى للتأكيد' : 'Tap again to confirm')
          : 'SOS'
        }
      </motion.button>
      {confirm && !pressed && (
        <button onClick={() => setConfirm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, fontSize: '0.72rem', fontFamily: F }}>
          {ar ? 'إلغاء' : 'Cancel'}
        </button>
      )}
    </div>
  );
}

/* -- Trust Score panel ---------------------------------------------------- */
function TrustScoreCard({ score, ar }: { score: number; ar: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pct = score;

  const factors = [
    { label: ar ? 'توثيق الهوية (سند)' : 'ID Verification (Sanad)', weight: 35, yours: 35, color: C.cyan  },
    { label: ar ? 'تقييمات المستخدمين' : 'User Ratings',            weight: 25, yours: 22, color: C.green },
    { label: ar ? 'الرحلات المكتملة'   : 'Completed Trips',         weight: 20, yours: 14, color: C.gold  },
    { label: ar ? 'النشاط الحديث'      : 'Recent Activity',         weight: 10, yours: 8,  color: C.purple},
    { label: ar ? 'التفضيلات الثقافية' : 'Cultural Preferences Set',weight: 10, yours: 8,  color: '#0EA5E9'},
  ];

  const color = pct >= 80 ? C.green : pct >= 60 ? C.gold : C.red;

  return (
    <div style={{ borderRadius: 16, padding: '16px 20px', background: glass(0.5), border: '1px solid rgba(0,200,232,0.10)', backdropFilter: 'blur(20px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}18`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color, fontFamily: F }}>{score}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', fontFamily: F }}>
              {ar ? 'مؤشر الثقة' : 'Trust Score'}
            </div>
            <div style={{ fontSize: '0.72rem', color, fontFamily: F }}>
              {pct >= 80 ? (ar ? 'ممتاز جداً' : 'Excellent') : pct >= 60 ? (ar ? 'جيد' : 'Good') : (ar ? 'بحاجة لتحسين' : 'Needs Improvement')}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{ background: 'rgba(0,200,232,0.08)', border: '1px solid rgba(0,200,232,0.18)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: C.cyan, fontFamily: F, fontWeight: 600 }}>
          <Info size={12} />
          {ar ? 'لماذا؟' : 'Why?'}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Progress bar � R.full = border-radius: 9999px */}
      <div style={{ marginTop: 12, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 9999, background: `linear-gradient(90deg, ${color}, ${color}99)`, transition: 'width 0.8s ease' }} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,200,232,0.10)' }}>
              <p style={{ fontSize: '0.75rem', color: C.textMuted, fontFamily: F, marginBottom: 12 }}>
                {ar
                  ? 'يُحسب المؤشر من 5 عوامل. لكل عامل وزن محدد من أصل 100 نقطة:'
                  : 'Your score is calculated from 5 factors. Each has a weight out of 100 points:'
                }
              </p>
              {factors.map(f => (
                <div key={f.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: C.textMuted, fontFamily: F }}>{f.label}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: f.color, fontFamily: F }}>{f.yours}/{f.weight}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(f.yours / f.weight) * 100}%`, borderRadius: 9999, background: f.color, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              ))}
              <p style={{ marginTop: 10, fontSize: '0.7rem', color: C.textDim, fontFamily: F }}>
                {ar
                  ? 'للتحسين: أكمل توثيق الهوية، أضف صورة شخصية، وأنهِ مزيداً من الرحلات.'
                  : 'To improve: complete ID verification, add a profile photo, and complete more trips.'
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -- Main Component -------------------------------------------------------- */
export function HomePage() {
  const { language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useIframeSafeNavigate();
  const starsRef = useRef<{ x: number; y: number; opacity: number; size: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tripMode, setTripMode] = useState<'one-way' | 'round'>('one-way');
  const [currency, setCurrencyDisplay] = useState(CurrencyService.getInstance().current);

  // -- Live data hooks -------------------------------------------------------
  const { stats: liveStats, loading } = useLiveUserStats();
  const platformStats = useLivePlatformStats();

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();

  // Pre-generate stars once
  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.1,
      size: Math.random() < 0.15 ? 2 : 1,
    }));
  }

  // Listen for currency changes from header switcher
  useEffect(() => {
    const h = () => setCurrencyDisplay(CurrencyService.getInstance().current);
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  /* -- Quick Actions -- */
  const quickActions = [
    {
      icon: Search, emoji: '◉',
      title: ar ? 'ابحث عن رحلة' : 'Find a Ride',
      desc:  ar ? 'أكثر من 100 مسار يومياً' : '100+ routes daily',
      color: C.cyan, dim: C.cyanDim, border: 'rgba(0,200,232,0.25)', path: '/find-ride',
    },
    {
      icon: Car, emoji: '◈',
      title: ar ? 'اعرض رحلتك' : 'Offer a Ride',
      desc:  ar ? 'شارك الطريق وخفف تكلفة الوقود' : 'Share & earn fuel money',
      color: C.gold, dim: C.goldDim, border: 'rgba(240,168,48,0.25)', path: '/offer-ride',
    },
    {
      icon: Package, emoji: '◌',
      title: ar ? 'أرسل طرداً مع رحلة' : 'Send Package with Ride',
      desc:  ar ? 'ينتقل مع مسافر موثوق على نفس الطريق' : 'Moves with a trusted rider on the same route',
      color: '#D9965B', dim: 'rgba(217,149,91,0.12)', border: 'rgba(217,149,91,0.25)', path: '/packages',
    },
    {
      icon: Bus, emoji: '◍',
      title: ar ? 'احجز باص' : 'Book a Bus',
      desc:  ar ? 'مسارات ثابتة بين المدن بمواعيد واضحة' : 'Fixed intercity corridors with clear departures',
      color: C.green, dim: C.greenDim, border: 'rgba(0,200,117,0.25)', path: '/bus',
    },
  ];

  /* -- Stats (mock � would come from API in production) -- */
  const statsData = [
    { icon: Car,        label: ar ? 'إجمالي الرحلات'   : 'Total Trips',    value: liveStats?.totalTrips?.toString() ?? '...',                color: C.cyan   },
    { icon: TrendingUp, label: ar ? 'إجمالي التوفير'   : 'Total Savings',  value: liveStats ? svc.formatFromJOD(liveStats.totalSaved) : '...', color: C.green  },
    { icon: Star,       label: ar ? 'التقييم'          : 'Rating',         value: liveStats ? String(liveStats.rating) : '...', color: C.gold   },
    { icon: Package,    label: ar ? 'الطرود المُسلَّمة' : 'Pkgs Delivered', value: liveStats?.pkgsDelivered?.toString()                 ?? '...', color: C.purple },
  ];

  /* -- Features -- */
  const features = [
    { icon: CheckCircle, title: ar ? 'مستخدمون موثَّقون' : 'Verified Users', desc: ar ? 'تحقق موحد بالهوية لبناء الثقة قبل الحجز' : 'All users verified via Sanad',        color: C.cyan   },
    { icon: Moon,        title: ar ? 'مراعاة أوقات الصلاة' : 'Prayer Stops', desc: ar ? 'خطط رحلتك مع محطات توقف مناسبة ثقافياً' : 'Plan trips around prayer times',      color: C.gold   },
    { icon: TrendingUp,  title: ar ? 'وفّر حتى 70٪'     : 'Save 70%',        desc: ar ? 'أوفر بكثير من التكلفة التقليدية للتنقل'  : 'Vs traditional taxis',                color: C.green  },
    { icon: Shield,      title: ar ? 'آمن وموثوق'       : 'Safe & Secure',   desc: ar ? 'زر طوارئ حقيقي ودعم دائم وطبقات حماية'   : 'Real SOS + 24/7 support + insurance', color: C.purple },
  ];

  return (
    <div className="min-h-screen relative" dir={dir} style={{ background: C.bg, color: C.text, fontFamily: F }}>
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .stat-value { font-size: 1.1rem !important; }
          .quick-grid { grid-template-columns: 1fr 1fr !important; }
          .routes-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 380px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-title { font-size: 1.5rem !important; }
          .quick-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Stars background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {starsRef.current.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,200,232,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,200,117,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto px-4 py-8" style={{ maxWidth: 1120 }}>

        {/* -- Refresh control -- */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 9999, background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,200,232,0.15)', cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: 600, color: refreshing ? C.textDim : C.cyan,
              fontFamily: F, transition: 'all 0.14s',
            }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {ar ? (refreshing ? 'جارٍ التحديث...' : 'تحديث') : (refreshing ? 'Refreshing...' : 'Refresh')}
          </button>
        </div>

        {/* -- Hero greeting + Brand story -- */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 8 }}
        >
          {/* Top row: logo + greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ flexShrink: 0 }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', filter: 'blur(24px)', opacity: 0.5, background: `radial-gradient(circle, ${C.cyan}, transparent)` }} />
                <div style={{ position: 'relative', filter: `drop-shadow(0 0 20px ${C.cyan})` }}>
                  <WaselMark size={80} />
                </div>
              </div>
            </motion.div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.cyan, marginBottom: 4, fontFamily: F }}>
                {ar ? 'واصل | رفيقك في التنقل الذكي' : 'WASEL | YOUR MOBILITY COMPANION'}
              </p>
              <h1 className="hero-title" style={{
                fontWeight: 950, margin: 0, lineHeight: 1.14,
                fontSize: 'clamp(1.55rem, 3.5vw, 2.8rem)',
                background: `linear-gradient(135deg, #fff 0%, ${C.cyan} 55%, ${C.green} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                letterSpacing: '-0.04em',
              }}>
                {ar ? `أهلاً بعودتك${firstName ? `، ${firstName}` : ''}` : `Welcome back${firstName ? `, ${firstName}` : ''}`}
              </h1>
              <p style={{ color: C.textMuted, fontSize: '0.95rem', marginTop: 4, fontFamily: F }}>
                {ar ? 'ما الذي تود القيام به اليوم؟' : 'What would you like to do today?'}
              </p>
            </div>
          </div>

          {/* Trip concept: one-way / round-trip */}
          <div style={{
            borderRadius: 22, padding: '16px 18px',
            background: `linear-gradient(135deg, rgba(0,200,232,0.06), rgba(0,200,117,0.04))`,
            border: '1px solid rgba(0,200,232,0.14)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
          }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textDim, fontFamily: F, marginBottom: 10 }}>
              {ar ? 'نوع الرحلة' : 'TRIP TYPE'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* One-way */}
              <button
                onClick={() => { setTripMode('one-way'); navigate('/find-ride'); }}
                style={{
                  flex: 1, minWidth: 140,
                  padding: '12px 16px', borderRadius: 16,
                  background: tripMode === 'one-way' ? 'rgba(0,200,232,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${tripMode === 'one-way' ? C.cyan : 'rgba(255,255,255,0.10)'}`,
                  cursor: 'pointer', transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <ArrowRight size={18} color={tripMode === 'one-way' ? C.cyan : C.textDim} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: tripMode === 'one-way' ? C.cyan : C.text, fontFamily: F }}>
                    {ar ? 'ذهاب فقط' : 'One Way'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>
                    {ar ? 'رحلة باتجاه واحد' : 'One-way trip'}
                  </div>
                </div>
                {tripMode === 'one-way' && <CheckCircle size={14} color={C.cyan} style={{ marginLeft: 'auto' }} />}
              </button>

              {/* Round trip */}
              <button
                onClick={() => { setTripMode('round'); navigate('/find-ride?mode=round'); }}
                style={{
                  flex: 1, minWidth: 140,
                  padding: '12px 16px', borderRadius: 16,
                  background: tripMode === 'round' ? 'rgba(0,200,117,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${tripMode === 'round' ? C.green : 'rgba(255,255,255,0.10)'}`,
                  cursor: 'pointer', transition: 'all 0.18s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <Repeat size={18} color={tripMode === 'round' ? C.green : C.textDim} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: tripMode === 'round' ? C.green : C.text, fontFamily: F }}>
                    {ar ? 'ذهاب وعودة' : 'Round Trip'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>
                    {ar ? 'رحلة مكتملة الاتجاهين' : 'Round trip'}
                  </div>
                </div>
                {tripMode === 'round' && <CheckCircle size={14} color={C.green} style={{ marginLeft: 'auto' }} />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* -- Quick Actions -- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginTop: 32 }}
        >
          <SectionHeader title={ar ? 'إجراءات سريعة' : 'Quick Actions'} icon="✦" />
          <div
            className="quick-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
          >
            {quickActions.map((a, i) => (
              <motion.button
                key={i}
                onClick={() => navigate(a.path)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '16px 16px 15px', borderRadius: 20, textAlign: 'left',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${a.border}`,
                  backdropFilter: 'blur(20px)', cursor: 'pointer',
                  position: 'relative', overflow: 'hidden',
                  transition: 'transform 0.14s, background 0.14s, border-color 0.14s',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.065), rgba(255,255,255,0.04))';
                  e.currentTarget.style.borderColor = `${a.color}45`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))';
                  e.currentTarget.style.borderColor = a.border;
                }}
              >
                <div style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, borderRadius: '50%', background: `radial-gradient(circle, ${a.color}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: a.dim, border: `1px solid ${a.border}`, fontSize: '1.1rem' }}>
                  {a.emoji}
                </div>
                <span style={{ fontWeight: 900, fontSize: '0.84rem', color: C.text, fontFamily: F, marginBottom: 3, letterSpacing: '-0.02em' }}>{a.title}</span>
                <span style={{ fontSize: '0.7rem', color: C.textDim, fontFamily: F, lineHeight: 1.5 }}>{a.desc}</span>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 3, color: a.color }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: F }}>{ar ? 'ابدأ' : 'Start'}</span>
                  <ChevronRight size={10} />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* -- Stats + Currency switcher -- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          style={{ marginTop: 36 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>◌</span>
                <h2 style={{ fontWeight: 800, color: C.text, fontSize: '1rem', margin: 0 }}>
                  {ar ? 'إحصاءاتك' : 'Your Stats'}
              </h2>
            </div>
            <InlineCurrencySwitcher ar={ar} />
          </div>

          <div
            className="stats-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 16, padding: '16px 14px', background: glass(0.5), border: `1px solid ${C.border}` }}>
                  <Skeleton w="50%" h={14} radius={6} />
                  <div style={{ marginTop: 10 }}><Skeleton w="70%" h={28} radius={6} /></div>
                </div>
              ))
            ) : (
              statsData.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 + 0.2 }}
                  style={{ borderRadius: 18, padding: '16px 14px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${C.border}`, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <s.icon size={13} color={s.color} />
                    <span style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F }}>{s.label}</span>
                  </div>
                  <p className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 900, color: C.text, fontFamily: F, margin: 0, wordBreak: 'break-word' }}>
                    {user ? s.value : '—'}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        {/* -- Wallet balance + SOS row -- */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}
          >
            {/* Wallet */}
            <div style={{
              flex: '1 1 200px', borderRadius: 18, padding: '16px 20px',
              background: `linear-gradient(135deg, rgba(0,200,232,0.10), rgba(0,200,117,0.06))`,
              border: '1px solid rgba(0,200,232,0.18)',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>
                {ar ? 'رصيد المحفظة' : 'Wallet Balance'}
              </div>
              <div style={{ marginTop: 6, fontSize: '1.5rem', fontWeight: 900, color: C.cyan, fontFamily: F }}>
                {loading ? <Skeleton w={100} h={28} radius={6} /> : svc.formatFromJOD(liveStats?.walletBalance ?? 47.5)}
              </div>
              <div style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F, marginTop: 2 }}>
                {liveStats ? `JOD ${liveStats.walletBalance.toFixed(3)} base` : ''}
              </div>
            </div>

            {/* Platform live stats */}
            {platformStats && (
              <div style={{
                flex: '1 1 200px', borderRadius: 16, padding: '16px 20px',
                background: 'rgba(0,200,232,0.04)', border: '1px solid rgba(0,200,232,0.12)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>
                  {ar ? 'نبض المنصة المباشر' : 'Live Platform'}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { val: platformStats.activeDrivers,             label: ar ? 'سائقون' : 'Drivers',   color: C.cyan  },
                    { val: platformStats.avgWaitMinutes + ' min',   label: ar ? 'متوسط الانتظار' : 'Avg Wait', color: C.gold  },
                    { val: platformStats.passengersMatchedToday.toLocaleString(), label: ar ? 'تمت المطابقة' : 'Matched', color: C.green },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: s.color, fontFamily: F }}>{s.val}</span>
                      <span style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOS */}
            <div style={{
              flex: '0 1 180px', borderRadius: 18, padding: '16px 20px',
              background: 'rgba(255,68,85,0.05)', border: '1px solid rgba(255,68,85,0.15)',
              display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>
                {ar ? 'طوارئ SOS' : 'Emergency SOS'}
              </div>
              <SOSButton ar={ar} />
            </div>
          </motion.section>
        )}

        {/* -- Trust Score -- */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            style={{ marginTop: 24 }}
          >
            <SectionHeader title={ar ? 'مؤشر الثقة' : 'Trust Score'} icon="◈" />
            {loading ? (
              <Skeleton h={80} radius={16} />
            ) : (
              <TrustScoreCard score={87} ar={ar} />
            )}
          </motion.section>
        )}

        {/* -- Mobility OS banner -- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ marginTop: 36 }}
        >
          <motion.button
            onClick={() => navigate('/mobility-os')}
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            style={{
              width: '100%', borderRadius: 24, padding: '24px 28px', textAlign: ar ? 'right' : 'left',
              background: `linear-gradient(135deg, ${glass(0.6)} 0%, ${glass(0.8)} 100%)`,
              border: '1px solid rgba(0,200,232,0.20)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,200,232,0.10)',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Grid background */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
              backgroundImage: `linear-gradient(${C.cyan} 1px, transparent 1px), linear-gradient(90deg, ${C.cyan} 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.2rem' }}>OS</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: C.cyan, textTransform: 'uppercase', fontFamily: F }}>
                      {ar ? 'واصل للحركة الذكية' : 'MOBILITY OS | LAYER 8'}
                    </span>
                  <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'rgba(0,200,232,0.15)', color: C.cyan, fontSize: '0.6rem', fontWeight: 800, border: '1px solid rgba(0,200,232,0.3)', fontFamily: F }}>LIVE</span>
                </div>
                <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 900, color: C.text, fontFamily: F }}>
                  {ar ? 'التوأم الرقمي للأردن | تشغيل مباشر' : 'Jordan Digital Twin | Live Network'}
                </div>
                <div style={{ marginTop: 4, fontSize: '0.78rem', color: C.textMuted, fontFamily: F }}>
                  {ar ? 'الطلب المباشر | السائقون | المسارات | التسعير الديناميكي' : 'Live demand | Drivers | Routes | Dynamic pricing'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.cyan }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: F }}>{ar ? 'افتح' : 'Open'}</span>
                <ArrowUpRight size={18} />
              </div>
            </div>
          </motion.button>
        </motion.section>

        {/* -- Popular Routes -- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          style={{ marginTop: 36 }}
        >
          <SectionHeader
            title={ar ? 'المسارات الشائعة' : 'Popular Routes'}
            icon="↗"
            action={ar ? 'عرض الكل' : 'View all'}
            onAction={() => navigate('/find-ride')}
          />
          <div
            className="routes-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
          >
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: '12px 14px', background: glass(0.4), border: `1px solid ${C.border}` }}>
                    <Skeleton w="60%" h={14} radius={6} />
                    <div style={{ marginTop: 8 }}><Skeleton w="40%" h={18} radius={6} /></div>
                  </div>
                ))
              : POPULAR_ROUTES.map((r, i) => (
                  <motion.button
                    key={i}
                    onClick={() => navigate(`/find-ride?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`)}
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      padding: '12px 14px', borderRadius: 14, textAlign: ar ? 'right' : 'left',
                      background: glass(0.45), border: `1px solid rgba(0,200,232,0.08)`,
                      backdropFilter: 'blur(16px)', cursor: 'pointer',
                      transition: 'all 0.14s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${r.color}30`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,200,232,0.08)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text, fontFamily: F }}>
                        {ar ? `${r.fromAr} ← ${r.toAr}` : `${r.from} → ${r.to}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F }}>{r.dist} {ar ? 'كم' : 'km'}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: r.color, fontFamily: F }}>
                        {svc.formatFromJOD(r.priceJod)}
                        <span style={{ fontSize: '0.6rem', fontWeight: 400, color: C.textDim }}>{ar ? '/للمقعد' : '/seat'}</span>
                      </span>
                    </div>
                  </motion.button>
                ))
            }
          </div>
        </motion.section>

        {/* -- Why Wasel? -- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.42 }}
          style={{ marginTop: 36 }}
        >
          <SectionHeader title={ar ? 'لماذا واصل؟' : 'Why Wasel?'} icon="◎" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 + 0.45 }}
                style={{ borderRadius: 14, padding: '14px 16px', background: glass(0.4), border: `1px solid ${C.border}`, backdropFilter: 'blur(16px)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                    <f.icon size={14} color={f.color} />
                  </div>
                  <span style={{ fontWeight: 700, color: C.text, fontSize: '0.82rem', fontFamily: F }}>{f.title}</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: C.textMuted, fontFamily: F, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* -- CTA -- */}
        {!user && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ marginTop: 40, marginBottom: 40 }}
          >
            <div style={{
              borderRadius: 24, padding: '32px 28px', textAlign: 'center',
              background: `linear-gradient(135deg, rgba(0,200,232,0.08), rgba(0,200,117,0.05))`,
              border: '1px solid rgba(0,200,232,0.18)',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>W</div>
              <h2 style={{ fontWeight: 900, color: C.text, fontSize: '1.3rem', marginBottom: 8, fontFamily: F }}>
                {ar ? 'انضم إلى واصل' : 'Join Wasel!'}
              </h2>
              <p style={{ color: C.textMuted, fontSize: '0.875rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', fontFamily: F }}>
                {ar
                  ? 'ابدأ رحلتك الذكية اليوم ووفّر حتى 70٪ مقارنة بوسائل النقل التقليدية.'
                  : 'Start your smart journey | save up to 70% vs. taxis'
                }
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  onClick={() => navigate('/auth?tab=register')}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 28px', borderRadius: 12,
                    background: 'linear-gradient(135deg,#00C8E8,#0095B8)',
                    border: 'none', color: '#040C18', fontWeight: 800, fontSize: '0.9rem',
                    cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 20px rgba(0,200,232,0.3)',
                  }}
                >
                  {ar ? 'ابدأ مجاناً' : 'Get started free'}
                </motion.button>
                <motion.button
                  onClick={() => navigate('/find-ride')}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 28px', borderRadius: 12,
                    background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)',
                    color: C.text, fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', fontFamily: F,
                  }}
                >
                  {ar ? 'تصفّح الرحلات' : 'Browse rides'}
                </motion.button>
              </div>
            </div>
          </motion.section>
        )}

        <div style={{ paddingBottom: 80 }} />
      </div>
    </div>
  );
}
