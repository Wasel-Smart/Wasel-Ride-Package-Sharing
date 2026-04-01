import { useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, Brain, GraduationCap, LineChart, Rocket, Shield } from 'lucide-react';
import { useLocation } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGrowthDashboard, type GrowthDashboard } from '../../services/growthEngine';

const BG = '#040C18';
const CARD = 'rgba(255,255,255,0.04)';
const BORD = 'rgba(255,255,255,0.09)';
const CYAN = '#00C8E8';
const GOLD = '#F59E0B';
const GREEN = '#22C55E';
const PURPLE = '#8B5CF6';
const FONT = "-apple-system,'Inter',sans-serif";

type OverviewConfig = {
  title: string;
  titleAr: string;
  detail: string;
  detailAr: string;
  accent: string;
  icon: JSX.Element;
  points: [string, string][];
};

const CONFIG: Record<string, OverviewConfig> = {
  '/app/services/corporate': {
    title: 'Corporate Mobility',
    titleAr: 'تنقل الشركات',
    detail: 'A dedicated overview for business transport operations, recurring commutes, and managed employee travel.',
    detailAr: 'نظرة تشغيلية مخصصة لتنقل الشركات والرحلات المتكررة وإدارة تنقل الموظفين.',
    accent: CYAN,
    icon: <Briefcase size={22} />,
    points: [
      ['Recurring staff shuttles', 'رحلات موظفين متكررة'],
      ['Managed billing and reconciliation', 'فواتير وتسويات مُدارة'],
      ['Centralized trust and route oversight', 'إشراف مركزي على الثقة والمسارات'],
    ],
  },
  '/app/services/school': {
    title: 'School Transport',
    titleAr: 'النقل المدرسي',
    detail: 'A safe transport overview for guardian visibility, recurring pickup windows, and student route readiness.',
    detailAr: 'عرض آمن للنقل المدرسي مع رؤية أولياء الأمور ومواعيد الالتقاط المتكررة وجاهزية المسارات.',
    accent: GREEN,
    icon: <GraduationCap size={22} />,
    points: [
      ['Guardian-friendly trip visibility', 'رؤية مناسبة لأولياء الأمور'],
      ['Stable route scheduling', 'جدولة مستقرة للمسارات'],
      ['Readiness for recurring daily operations', 'جاهزية للعمليات اليومية المتكررة'],
    ],
  },
  '/app/innovation-hub': {
    title: 'Innovation Hub',
    titleAr: 'مركز الابتكار',
    detail: 'A roadmap-facing space for new Wasel pilots, corridor experiments, and future operating models.',
    detailAr: 'مساحة موجّهة للخطط والتجارب الجديدة ونماذج التشغيل المستقبلية في واصل.',
    accent: PURPLE,
    icon: <Rocket size={22} />,
    points: [
      ['Pilot programs and launch tracks', 'برامج تجريبية ومسارات إطلاق'],
      ['Cross-network experiments', 'تجارب عبر الشبكة'],
      ['New service incubation', 'احتضان خدمات جديدة'],
    ],
  },
  '/app/analytics': {
    title: 'Operations Analytics',
    titleAr: 'تحليلات التشغيل',
    detail: 'A route-level analytics overview for product, corridor performance, and service utilization signals.',
    detailAr: 'لوحة نظرة عامة لتحليلات المنتج وأداء المسارات ومؤشرات استخدام الخدمات.',
    accent: GOLD,
    icon: <LineChart size={22} />,
    points: [
      ['Corridor demand trends', 'اتجاهات الطلب على المسارات'],
      ['Utilization and completion signals', 'مؤشرات الاستخدام والإكمال'],
      ['Operational learning surface', 'واجهة للتعلّم التشغيلي'],
    ],
  },
  '/app/mobility-os': {
    title: 'Mobility OS',
    titleAr: 'نظام الحركة',
    detail: 'A control-layer overview for network state, service orchestration, and corridor-level operating visibility.',
    detailAr: 'طبقة تحكم لعرض حالة الشبكة وتنسيق الخدمات والرؤية التشغيلية على مستوى المسارات.',
    accent: CYAN,
    icon: <Activity size={22} />,
    points: [
      ['Network-wide control view', 'عرض تحكم على مستوى الشبكة'],
      ['Corridor operations readiness', 'جاهزية تشغيل المسارات'],
      ['Operational signal consolidation', 'تجميع الإشارات التشغيلية'],
    ],
  },
  '/app/ai-intelligence': {
    title: 'AI Intelligence',
    titleAr: 'الذكاء الاصطناعي',
    detail: 'An overview space for route intelligence, matching guidance, and AI-assisted operating recommendations.',
    detailAr: 'مساحة لذكاء المسارات وتوجيهات المطابقة والتوصيات التشغيلية المدعومة بالذكاء الاصطناعي.',
    accent: PURPLE,
    icon: <Brain size={22} />,
    points: [
      ['Route intelligence summaries', 'ملخصات ذكاء المسارات'],
      ['Matching and planning guidance', 'إرشادات المطابقة والتخطيط'],
      ['Decision support for operations', 'دعم القرار للعمليات'],
    ],
  },
  '/app/moderation': {
    title: 'Moderation & Safety',
    titleAr: 'الإشراف والسلامة',
    detail: 'An overview for trust reviews, safety escalation, and account quality control across the platform.',
    detailAr: 'نظرة عامة على مراجعات الثقة والتصعيد الأمني وضبط جودة الحسابات عبر المنصة.',
    accent: GREEN,
    icon: <Shield size={22} />,
    points: [
      ['Trust review visibility', 'رؤية لمراجعات الثقة'],
      ['Safety escalation support', 'دعم التصعيد الأمني'],
      ['Account quality controls', 'ضوابط جودة الحسابات'],
    ],
  },
};

export default function OperationsOverviewPage() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [dashboard, setDashboard] = useState<GrowthDashboard | null>(null);

  useEffect(() => {
    if (pathname !== '/app/analytics') {
      setDashboard(null);
      return;
    }
    void getGrowthDashboard().then(setDashboard).catch(() => setDashboard(null));
  }, [pathname]);

  const config = useMemo(
    () =>
      CONFIG[pathname] ?? {
        title: 'Wasel Operations',
        titleAr: 'عمليات واصل',
        detail: 'A shared operational overview for sections that are being consolidated into the main Wasel application.',
        detailAr: 'نظرة تشغيلية مشتركة للأقسام التي يجري دمجها داخل تطبيق واصل الأساسي.',
        accent: CYAN,
        icon: <Activity size={22} />,
        points: [
          ['Shared operational surface', 'واجهة تشغيلية مشتركة'],
          ['Clear product ownership', 'ملكية منتج واضحة'],
          ['No more silent redirects', 'لا مزيد من التحويلات الصامتة'],
        ],
      },
    [pathname],
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 0' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${config.accent}18, rgba(255,255,255,0.03))`,
            border: `1px solid ${config.accent}33`,
            borderRadius: 20,
            padding: '24px 22px',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 16,
                background: `${config.accent}18`,
                border: `1px solid ${config.accent}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: config.accent,
                flexShrink: 0,
              }}
            >
              {config.icon}
            </div>
            <div>
              <div style={{ color: '#EFF6FF', fontSize: '1.3rem', fontWeight: 900 }}>{ar ? config.titleAr : config.title}</div>
              <div style={{ color: 'rgba(148,163,184,0.76)', fontSize: '0.82rem', marginTop: 4 }}>
                {ar ? config.detailAr : config.detail}
              </div>
            </div>
          </div>
          <div style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.7 }}>
            {ar
              ? 'هذه الصفحة تحل محل التحويل الصامت السابق وتقدّم نقطة وصول واضحة لهذا القسم داخل التطبيق.'
              : 'This page replaces the previous silent redirect and gives this section a clear home inside the app.'}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {config.points.map(([en, arText]) => (
            <div key={en} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: '#EFF6FF', fontWeight: 700, fontSize: '0.92rem' }}>{ar ? arText : en}</div>
            </div>
          ))}
        </div>

        {pathname === '/app/analytics' && dashboard && (
          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { label: ar ? 'بحث' : 'Searches', value: dashboard.funnel.searched, color: CYAN },
                { label: ar ? 'اختيارات' : 'Selections', value: dashboard.funnel.selected, color: GOLD },
                { label: ar ? 'حجوزات' : 'Bookings', value: dashboard.funnel.booked, color: GREEN },
                { label: ar ? 'مكتملة' : 'Completed', value: dashboard.funnel.completed, color: PURPLE },
              ].map((item) => (
                <div key={item.label} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ color: 'rgba(148,163,184,0.76)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ color: item.color, fontWeight: 900, fontSize: '1.35rem', marginTop: 8 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ color: '#EFF6FF', fontWeight: 700, marginBottom: 10 }}>{ar ? 'مزيج الخدمات' : 'Service mix'}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {[
                    { label: ar ? 'رحلات' : 'Rides', value: dashboard.serviceMix.rides },
                    { label: ar ? 'باصات' : 'Buses', value: dashboard.serviceMix.buses },
                    { label: ar ? 'طرود' : 'Packages', value: dashboard.serviceMix.packages },
                    { label: ar ? 'إحالات' : 'Referrals', value: dashboard.serviceMix.referrals },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#CBD5E1', fontSize: '0.88rem' }}>
                      <span>{item.label}</span>
                      <strong style={{ color: '#EFF6FF' }}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ color: '#EFF6FF', fontWeight: 700, marginBottom: 10 }}>{ar ? 'الإيراد والطلب' : 'Revenue and demand'}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '0.88rem' }}>
                    <span>{ar ? 'إيراد تقديري' : 'Estimated revenue'}</span>
                    <strong style={{ color: CYAN }}>{dashboard.revenueJod.toFixed(2)} JOD</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '0.88rem' }}>
                    <span>{ar ? 'الطلب النشط' : 'Active demand'}</span>
                    <strong style={{ color: GREEN }}>{dashboard.activeDemand}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: '#EFF6FF', fontWeight: 700, marginBottom: 10 }}>{ar ? 'أهم الممرات' : 'Top corridors'}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {dashboard.topCorridors.length > 0 ? dashboard.topCorridors.map((corridor) => (
                  <div key={corridor.corridor} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORD}` }}>
                    <div>
                      <div style={{ color: '#EFF6FF', fontWeight: 700 }}>{corridor.corridor}</div>
                      <div style={{ color: 'rgba(148,163,184,0.76)', fontSize: '0.76rem', marginTop: 4 }}>
                        {(ar ? 'طلب' : 'Demand') + ` ${corridor.demand} · ` + (ar ? 'تحويل' : 'Conversions') + ` ${corridor.conversions}`}
                      </div>
                    </div>
                    <div style={{ color: GOLD, fontWeight: 800, alignSelf: 'center' }}>{corridor.demand + corridor.conversions}</div>
                  </div>
                )) : (
                  <div style={{ color: 'rgba(148,163,184,0.76)', fontSize: '0.82rem' }}>
                    {ar ? 'ستظهر الممرات الأعلى أداء هنا عندما تبدأ إشارات النمو بالتراكم.' : 'Top-performing corridors will appear here as growth signals accumulate.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
