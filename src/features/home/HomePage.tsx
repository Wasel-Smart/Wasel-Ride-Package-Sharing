/**
 * Wasel Home / Dashboard v6.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Car, Package, Search, Star, TrendingUp, CheckCircle,
  Shield, Moon, ChevronRight, RefreshCw, Repeat,
  ArrowUpRight, Bus, ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { CurrencyService } from '../../utils/currency';
import { useLiveUserStats, useLivePlatformStats } from '../../services/liveDataService';
import { applyReferralCode, getCorridorDemandLeaders, getGrowthDashboard, getReferralSnapshot, type GrowthDashboard, type ReferralSnapshot } from '../../services/growthEngine';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import {
  C,
  F,
  POPULAR_ROUTES,
  SectionHeader,
  Skeleton,
  SOSButton,
  TrustScoreCard,
  InlineCurrencySwitcher,
  glass,
} from './HomePageShared';

export function HomePage() {
  const { language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useIframeSafeNavigate();
  const starsRef = useRef<{ x: number; y: number; opacity: number; size: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tripMode, setTripMode] = useState<'one-way' | 'round'>('one-way');
  const [referral, setReferral] = useState<ReferralSnapshot | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [growthDashboard, setGrowthDashboard] = useState<GrowthDashboard | null>(null);

  const { stats: liveStats, loading } = useLiveUserStats();
  const platformStats = useLivePlatformStats();

  const ar = language === 'ar';
  const svc = CurrencyService.getInstance();

  if (starsRef.current.length === 0) {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.1,
      size: Math.random() < 0.15 ? 2 : 1,
    }));
  }

  useEffect(() => {
    const handleStorage = () => {
      // Trigger a render when currency changes elsewhere.
      setRefreshing((prev) => prev);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setReferral(null);
      setGrowthDashboard(null);
      return;
    }
    void getReferralSnapshot({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0],
    }).then(setReferral).catch(() => setReferral(null));
    void getGrowthDashboard(user.id).then(setGrowthDashboard).catch(() => setGrowthDashboard(null));
  }, [user?.email, user?.id, user?.user_metadata]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const firstName = user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  const quickActions = [
    {
      icon: Search,
      badge: 'R',
      title: ar ? 'ابحث عن رحلة' : 'Find a Ride',
      desc: ar ? 'اكتشف المطابقات اليومية على المسارات الحيوية' : 'Live matches on daily corridors',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(0,200,232,0.25)',
      path: '/find-ride',
    },
    {
      icon: Car,
      badge: 'O',
      title: ar ? 'اعرض رحلتك' : 'Offer a Ride',
      desc: ar ? 'شارك المقاعد وخفف تكلفة الرحلة' : 'Share seats and lower your trip cost',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(240,168,48,0.25)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      badge: 'P',
      title: ar ? 'أرسل طرداً مع رحلة' : 'Send Package with Ride',
      desc: ar ? 'حرّك الطرود مع راكب موثوق على نفس المسار' : 'Move parcels with a trusted rider on the same route',
      color: '#D9965B',
      dim: 'rgba(217,149,91,0.12)',
      border: 'rgba(217,149,91,0.25)',
      path: '/packages',
    },
    {
      icon: Bus,
      badge: 'B',
      title: ar ? 'احجز باص' : 'Book a Bus',
      desc: ar ? 'مغادرات بين المدن بجداول واضحة' : 'Fixed intercity departures with clear schedules',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(0,200,117,0.25)',
      path: '/bus',
    },
  ];

  const statsData = [
    { icon: Car, label: ar ? 'إجمالي الرحلات' : 'Total Trips', value: liveStats?.totalTrips?.toString() ?? '...', color: C.cyan },
    { icon: TrendingUp, label: ar ? 'إجمالي التوفير' : 'Total Savings', value: liveStats ? svc.formatFromJOD(liveStats.totalSaved) : '...', color: C.green },
    { icon: Star, label: ar ? 'التقييم' : 'Rating', value: liveStats ? String(liveStats.rating) : '...', color: C.gold },
    { icon: Package, label: ar ? 'الطرود المسلّمة' : 'Pkgs Delivered', value: liveStats?.pkgsDelivered?.toString() ?? '...', color: C.purple },
  ];

  const features = [
    { icon: CheckCircle, title: ar ? 'مستخدمون موثقون' : 'Verified Users', desc: ar ? 'كل مستخدم يمر بإشارات ثقة قبل الحجز' : 'All users verified via Sanad', color: C.cyan },
    { icon: Moon, title: ar ? 'مراعاة أوقات الصلاة' : 'Prayer Stops', desc: ar ? 'خطط الرحلة بمحطات توقف مناسبة ثقافياً' : 'Plan trips around prayer times', color: C.gold },
    { icon: TrendingUp, title: ar ? 'وفّر حتى 70%' : 'Save 70%', desc: ar ? 'مقارنة بخيارات النقل الفردي التقليدية' : 'Vs traditional taxis', color: C.green },
    { icon: Shield, title: ar ? 'آمن وموثوق' : 'Safe & Secure', desc: ar ? 'زر طوارئ حقيقي ودعم مستمر وإشارات أمان واضحة' : 'Real SOS + 24/7 support + insurance', color: C.purple },
  ];

  const corridorLeaders = getCorridorDemandLeaders();

  return (
    <div className="min-h-screen relative" dir={dir} style={{ background: C.bg, color: C.text, fontFamily: F }}>
      <style>{`
        :root { color-scheme: dark; scroll-behavior: smooth; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
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

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {starsRef.current.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,200,232,0.05) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,200,117,0.04) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 mx-auto px-4 py-8" style={{ maxWidth: 1120 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={handleRefresh} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 9999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,200,232,0.15)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: refreshing ? C.textDim : C.cyan, fontFamily: F, transition: 'all 0.14s' }}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {ar ? (refreshing ? 'جارٍ التحديث...' : 'تحديث') : (refreshing ? 'Refreshing...' : 'Refresh')}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} style={{ flexShrink: 0 }}>
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
              <h1 className="hero-title" style={{ fontWeight: 950, margin: 0, lineHeight: 1.14, fontSize: 'clamp(1.55rem, 3.5vw, 2.8rem)', background: `linear-gradient(135deg, #fff 0%, ${C.cyan} 55%, ${C.green} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.04em' }}>
                {ar ? `أهلاً بعودتك${firstName ? `، ${firstName}` : ''}` : `Welcome back${firstName ? `, ${firstName}` : ''}`}
              </h1>
              <p style={{ color: C.textMuted, fontSize: '0.95rem', marginTop: 4, fontFamily: F }}>
                {ar ? 'ما الذي تريد القيام به اليوم؟' : 'What would you like to do today?'}
              </p>
            </div>
          </div>

          <div style={{ borderRadius: 22, padding: '16px 18px', background: `linear-gradient(135deg, rgba(0,200,232,0.06), rgba(0,200,117,0.04))`, border: '1px solid rgba(0,200,232,0.14)', boxShadow: '0 12px 30px rgba(0,0,0,0.16)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textDim, fontFamily: F, marginBottom: 10 }}>
              {ar ? 'نوع الرحلة' : 'TRIP TYPE'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => { setTripMode('one-way'); navigate('/find-ride'); }} style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 16, background: tripMode === 'one-way' ? 'rgba(0,200,232,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${tripMode === 'one-way' ? C.cyan : 'rgba(255,255,255,0.10)'}`, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <ArrowRight size={18} color={tripMode === 'one-way' ? C.cyan : C.textDim} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: tripMode === 'one-way' ? C.cyan : C.text, fontFamily: F }}>{ar ? 'ذهاب فقط' : 'One Way'}</div>
                  <div style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>{ar ? 'رحلة باتجاه واحد' : 'One-way trip'}</div>
                </div>
                {tripMode === 'one-way' && <CheckCircle size={14} color={C.cyan} style={{ marginLeft: 'auto' }} />}
              </button>

              <button onClick={() => { setTripMode('round'); navigate('/find-ride?mode=round'); }} style={{ flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 16, background: tripMode === 'round' ? 'rgba(0,200,117,0.15)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${tripMode === 'round' ? C.green : 'rgba(255,255,255,0.10)'}`, cursor: 'pointer', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Repeat size={18} color={tripMode === 'round' ? C.green : C.textDim} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: tripMode === 'round' ? C.green : C.text, fontFamily: F }}>{ar ? 'ذهاب وعودة' : 'Round Trip'}</div>
                  <div style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>{ar ? 'رحلة مكتملة الاتجاهين' : 'Round trip'}</div>
                </div>
                {tripMode === 'round' && <CheckCircle size={14} color={C.green} style={{ marginLeft: 'auto' }} />}
              </button>
            </div>
          </div>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} style={{ marginTop: 32 }}>
          <SectionHeader title={ar ? 'إجراءات سريعة' : 'Quick Actions'} icon="+" />
          <div className="quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {quickActions.map((a, i) => (
              <motion.button key={i} onClick={() => navigate(a.path)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px 16px 15px', borderRadius: 20, textAlign: 'left', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${a.border}`, backdropFilter: 'blur(20px)', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'transform 0.14s, background 0.14s, border-color 0.14s', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, borderRadius: '50%', background: `radial-gradient(circle, ${a.color}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, background: a.dim, border: `1px solid ${a.border}`, fontSize: '1rem', fontWeight: 800 }}>{a.badge}</div>
                <span style={{ fontWeight: 900, fontSize: '0.84rem', color: C.text, fontFamily: F, marginBottom: 3, letterSpacing: '-0.02em' }}>{a.title}</span>
                <span style={{ fontSize: '0.7rem', color: C.textDim, fontFamily: F, lineHeight: 1.5 }}>{a.desc}</span>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 3, color: a.color }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, fontFamily: F }}>{ar ? 'ابدأ' : 'Start'}</span>
                  <ChevronRight size={10} />
                </div>
              </motion.button>
            ))}
            <div style={{ borderRadius: 20, padding: '18px 18px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${C.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: '0.95rem', fontFamily: F, marginBottom: 12 }}>
                {ar ? 'نبض القمع' : 'Funnel pulse'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                {[
                  { label: ar ? 'بحث' : 'Search', value: growthDashboard?.funnel.searched ?? 0, color: C.cyan },
                  { label: ar ? 'اختيار' : 'Select', value: growthDashboard?.funnel.selected ?? 0, color: C.gold },
                  { label: ar ? 'حجز' : 'Booked', value: growthDashboard?.funnel.booked ?? 0, color: C.green },
                  { label: ar ? 'اكتمل' : 'Complete', value: growthDashboard?.funnel.completed ?? 0, color: '#D9965B' },
                ].map((item) => (
                  <div key={item.label} style={{ borderRadius: 14, padding: '12px 13px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.textDim, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F }}>{item.label}</div>
                    <div style={{ color: item.color, fontWeight: 900, fontSize: '1.05rem', marginTop: 6, fontFamily: F }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, color: C.textDim, fontFamily: F, fontSize: '0.74rem' }}>
                <span>{ar ? 'إيراد تقديري' : 'Estimated revenue'}: <strong style={{ color: C.text }}>{svc.formatFromJOD(growthDashboard?.revenueJod ?? 0)}</strong></span>
                <span>{ar ? 'طلب نشط' : 'Active demand'}: <strong style={{ color: C.text }}>{growthDashboard?.activeDemand ?? 0}</strong></span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }} style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>L</span>
              <h2 style={{ fontWeight: 800, color: C.text, fontSize: '1rem', margin: 0 }}>{ar ? 'إحصاءات مباشرة' : 'Live stats'}</h2>
            </div>
            <InlineCurrencySwitcher ar={ar} />
          </div>

          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 16, padding: '16px 14px', background: glass(0.5), border: `1px solid ${C.border}` }}>
                  <Skeleton w="50%" h={14} radius={6} />
                  <div style={{ marginTop: 10 }}><Skeleton w="70%" h={28} radius={6} /></div>
                </div>
              ))
            ) : (
              statsData.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 + 0.2 }} style={{ borderRadius: 18, padding: '16px 14px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${C.border}`, backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 48, height: 48, borderRadius: '50%', background: `radial-gradient(circle, ${s.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <s.icon size={13} color={s.color} />
                    <span style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F }}>{s.label}</span>
                  </div>
                  <p className="stat-value" style={{ fontSize: '1.25rem', fontWeight: 900, color: C.text, fontFamily: F, margin: 0, wordBreak: 'break-word' }}>{user ? s.value : '-'}</p>
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }} style={{ marginTop: 32 }}>
          <SectionHeader title={ar ? 'النمو والطلب' : 'Growth & demand'} icon="G" />
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 14 }}>
            <div style={{ borderRadius: 20, padding: '18px 18px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${C.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 900, fontSize: '0.95rem', fontFamily: F }}>{ar ? 'دعوة الأصدقاء' : 'Invite riders'}</div>
                  <div style={{ color: C.textDim, fontSize: '0.74rem', marginTop: 4, fontFamily: F }}>
                    {ar ? 'شارك كود واصل لتحويل الأصدقاء إلى أول رحلة.' : 'Share your Wasel code and convert invites into first trips.'}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: C.cyan, fontFamily: F }}>
                  {referral?.code ?? 'WASEL-MOVE'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
                {[
                  { label: ar ? 'دعوات' : 'Invites', value: String(referral?.invited ?? 0), color: C.cyan },
                  { label: ar ? 'تحويلات' : 'Converted', value: String(referral?.converted ?? 0), color: C.green },
                  { label: ar ? 'أرباح' : 'Earned', value: `${referral?.earnedCredit ?? 0} JOD`, color: C.gold },
                ].map((item) => (
                  <div key={item.label} style={{ borderRadius: 14, padding: '12px 13px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.textDim, fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F }}>{item.label}</div>
                    <div style={{ color: item.color, fontWeight: 900, fontSize: '0.92rem', marginTop: 6, fontFamily: F }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    if (!referral?.shareUrl) return;
                    await navigator.clipboard?.writeText(referral.shareUrl).catch(() => {});
                  }}
                  style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(0,200,232,0.12)', border: '1px solid rgba(0,200,232,0.24)', color: C.text, fontWeight: 800, fontFamily: F, cursor: 'pointer' }}
                >
                  {ar ? 'انسخ رابط الدعوة' : 'Copy invite link'}
                </button>
                <button
                  onClick={() => navigate('/find-ride')}
                  style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}
                >
                  {ar ? 'افتح الرحلات' : 'Open rides'}
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.22)', color: C.text, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}
                >
                  {ar ? 'افتح التحليلات' : 'Open analytics'}
                </button>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <div style={{ color: C.textDim, fontSize: '0.72rem', fontFamily: F }}>
                  {ar ? 'أدخل رمز إحالة لربط أول حجز مؤكد بالدعوة.' : 'Enter a referral code to link your first completed booking to an invite.'}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    value={referralCode}
                    onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                    placeholder={ar ? 'رمز الإحالة' : 'Referral code'}
                    style={{ flex: '1 1 180px', minWidth: 180, borderRadius: 12, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, padding: '11px 14px', fontFamily: F, outline: 'none' }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const snapshot = await applyReferralCode(
                          user
                            ? {
                                id: user.id,
                                name: user.user_metadata?.name || user.email?.split('@')[0],
                              }
                            : null,
                          referralCode,
                        );
                        setReferral(snapshot);
                        setReferralMessage(ar ? 'تم ربط الرمز. سيصل رصيد الإحالة عند اكتمال أول رحلة.' : 'Referral linked. Credit will be issued when the first trip completes.');
                        setReferralCode('');
                        if (user?.id) {
                          void getGrowthDashboard(user.id).then(setGrowthDashboard).catch(() => {});
                        }
                      } catch (error) {
                        setReferralMessage(error instanceof Error ? error.message : 'Referral could not be redeemed.');
                      }
                    }}
                    style={{ padding: '11px 16px', borderRadius: 12, background: 'rgba(0,200,232,0.12)', border: '1px solid rgba(0,200,232,0.24)', color: C.text, fontWeight: 800, fontFamily: F, cursor: 'pointer' }}
                  >
                    {ar ? 'تفعيل الرمز' : 'Redeem code'}
                  </button>
                </div>
                {referralMessage && (
                  <div style={{ color: C.text, fontSize: '0.74rem', lineHeight: 1.6, fontFamily: F }}>{referralMessage}</div>
                )}
              </div>
            </div>

            <div style={{ borderRadius: 20, padding: '18px 18px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', border: `1px solid ${C.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: '0.95rem', fontFamily: F, marginBottom: 12 }}>
                {ar ? 'الممرات المطلوبة الآن' : 'Corridors in demand'}
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {corridorLeaders.length > 0 ? corridorLeaders.map((item) => (
                  <button
                    key={item.corridor}
                    onClick={() => {
                      const [from, to] = item.corridor.split(' to ');
                      navigate(`/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&search=1`);
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 14, padding: '12px 13px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem', fontFamily: F }}>{item.corridor}</div>
                      <div style={{ color: C.textDim, fontSize: '0.7rem', marginTop: 4, fontFamily: F }}>{item.serviceLabel}</div>
                    </div>
                    <span style={{ color: C.cyan, fontWeight: 900, fontSize: '0.8rem', fontFamily: F }}>{item.active}</span>
                  </button>
                )) : (
                  <div style={{ color: C.textDim, fontSize: '0.78rem', lineHeight: 1.6, fontFamily: F }}>
                    {ar ? 'سيظهر الطلب الحي على الممرات هنا عندما يبدأ المستخدمون بحفظ تنبيهات الرحلات.' : 'Live corridor demand will appear here as riders save route alerts.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {user && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }} style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', borderRadius: 18, padding: '16px 20px', background: `linear-gradient(135deg, rgba(0,200,232,0.10), rgba(0,200,117,0.06))`, border: '1px solid rgba(0,200,232,0.18)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>{ar ? 'رصيد المحفظة' : 'Wallet Balance'}</div>
              <div style={{ marginTop: 6, fontSize: '1.5rem', fontWeight: 900, color: C.cyan, fontFamily: F }}>{loading ? <Skeleton w={100} h={28} radius={6} /> : svc.formatFromJOD(liveStats?.walletBalance ?? 47.5)}</div>
              <div style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F, marginTop: 2 }}>{liveStats ? `JOD ${liveStats.walletBalance.toFixed(3)} base` : ''}</div>
            </div>

            {platformStats && (
              <div style={{ flex: '1 1 200px', borderRadius: 16, padding: '16px 20px', background: 'rgba(0,200,232,0.04)', border: '1px solid rgba(0,200,232,0.12)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>{ar ? 'نبض المنصة المباشر' : 'Live Platform'}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    { val: platformStats.activeDrivers, label: ar ? 'السائقون' : 'Drivers', color: C.cyan },
                    { val: `${platformStats.avgWaitMinutes} min`, label: ar ? 'متوسط الانتظار' : 'Avg Wait', color: C.gold },
                    { val: platformStats.passengersMatchedToday.toLocaleString(), label: ar ? 'المطابقات' : 'Matched', color: C.green },
                  ].map((s) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}`, display: 'inline-block' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: s.color, fontFamily: F }}>{s.val}</span>
                      <span style={{ fontSize: '0.62rem', color: C.textDim, fontFamily: F }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ flex: '0 1 180px', borderRadius: 18, padding: '16px 20px', background: 'rgba(255,68,85,0.05)', border: '1px solid rgba(255,68,85,0.15)', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F }}>{ar ? 'طوارئ SOS' : 'Emergency SOS'}</div>
              <SOSButton ar={ar} />
            </div>
          </motion.section>
        )}

        {user && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }} style={{ marginTop: 24 }}>
            <SectionHeader title={ar ? 'لقطة الثقة' : 'Trust snapshot'} icon="T" />
            {loading ? <Skeleton h={80} radius={16} /> : <TrustScoreCard score={87} ar={ar} />}
          </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} style={{ marginTop: 36 }}>
          <motion.button onClick={() => navigate('/mobility-os')} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }} style={{ width: '100%', borderRadius: 24, padding: '24px 28px', textAlign: ar ? 'right' : 'left', background: `linear-gradient(135deg, ${glass(0.6)} 0%, ${glass(0.8)} 100%)`, border: '1px solid rgba(0,200,232,0.20)', backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,200,232,0.10)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.cyan} 1px, transparent 1px), linear-gradient(90deg, ${C.cyan} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.2rem' }}>OS</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', color: C.cyan, textTransform: 'uppercase', fontFamily: F }}>{ar ? 'واصل لحركة ذكية' : 'MOBILITY OS | LAYER 8'}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'rgba(0,200,232,0.15)', color: C.cyan, fontSize: '0.6rem', fontWeight: 800, border: '1px solid rgba(0,200,232,0.3)', fontFamily: F }}>LIVE</span>
                </div>
                <div style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 900, color: C.text, fontFamily: F }}>{ar ? 'شبكة تنقل الأردن المباشرة' : 'Jordan mobility network | live'}</div>
                <div style={{ marginTop: 4, fontSize: '0.78rem', color: C.textMuted, fontFamily: F }}>{ar ? 'الطلب المباشر | السائقون | المسارات | التسعير الديناميكي' : 'Live demand | drivers | routes | pricing'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.cyan }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: F }}>{ar ? 'افتح' : 'Open'}</span>
                <ArrowUpRight size={18} />
              </div>
            </div>
          </motion.button>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.36 }} style={{ marginTop: 36 }}>
          <SectionHeader title={ar ? 'المسارات الشائعة' : 'Popular routes'} icon="R" action={ar ? 'عرض الكل' : 'View all routes'} onAction={() => navigate('/find-ride')} />
          <div className="routes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 14, padding: '12px 14px', background: glass(0.4), border: `1px solid ${C.border}` }}>
                    <Skeleton w="60%" h={14} radius={6} />
                    <div style={{ marginTop: 8 }}><Skeleton w="40%" h={18} radius={6} /></div>
                  </div>
                ))
              : POPULAR_ROUTES.map((r, i) => (
                  <motion.button key={i} onClick={() => navigate(`/find-ride?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`)} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 14, textAlign: ar ? 'right' : 'left', background: glass(0.45), border: '1px solid rgba(0,200,232,0.08)', backdropFilter: 'blur(16px)', cursor: 'pointer', transition: 'all 0.14s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '1.1rem' }}>{r.icon}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.text, fontFamily: F }}>{ar ? `${r.fromAr} ← ${r.toAr}` : `${r.from} → ${r.to}`}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', color: C.textDim, fontFamily: F }}>{r.dist} {ar ? 'كم' : 'km'}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: r.color, fontFamily: F }}>
                        {svc.formatFromJOD(r.priceJod)}
                        <span style={{ fontSize: '0.6rem', fontWeight: 400, color: C.textDim }}>{ar ? '/للمقعد' : '/seat'}</span>
                      </span>
                    </div>
                  </motion.button>
                ))}
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.42 }} style={{ marginTop: 36 }}>
          <SectionHeader title={ar ? 'لماذا يتميز واصل؟' : 'Why Wasel stands out'} icon="W" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 + 0.45 }} style={{ borderRadius: 14, padding: '14px 16px', background: glass(0.4), border: `1px solid ${C.border}`, backdropFilter: 'blur(16px)' }}>
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

        {!user && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} style={{ marginTop: 40, marginBottom: 40 }}>
            <div style={{ borderRadius: 24, padding: '32px 28px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,200,232,0.08), rgba(0,200,117,0.05))', border: '1px solid rgba(0,200,232,0.18)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>W</div>
              <h2 style={{ fontWeight: 900, color: C.text, fontSize: '1.3rem', marginBottom: 8, fontFamily: F }}>{ar ? 'انضم إلى واصل' : 'Join Wasel'}</h2>
              <p style={{ color: C.textMuted, fontSize: '0.875rem', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', fontFamily: F }}>
                {ar ? 'ابدأ مع الرحلات والباصات والطرود المحمولة مع المسافر. وفر حتى 70% مقارنة بخيارات التنقل الفردية.' : 'Start with rides, buses, and rider-delivered packages. Save up to 70% versus taxis.'}
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button onClick={() => navigate('/auth?tab=register')} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#00C8E8,#0095B8)', border: 'none', color: '#040C18', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 20px rgba(0,200,232,0.3)' }}>
                  {ar ? 'ابدأ مجاناً' : 'Get started free'}
                </motion.button>
                <motion.button onClick={() => navigate('/find-ride')} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }} style={{ padding: '12px 28px', borderRadius: 12, background: 'transparent', border: '1.5px solid rgba(255,255,255,0.2)', color: C.text, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: F }}>
                  {ar ? 'تصفح الرحلات' : 'Browse rides'}
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
