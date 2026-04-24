import type { CSSProperties, ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  CircuitBoard,
  Globe2,
  Layers,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getLocalizedCopy, type LocalizedCopy } from '../../utils/localizedCopy';
import { C, F, GRAD_AURORA, SH } from '../../utils/wasel-ds';

const BORD = `1px solid ${C.border}`;
const CARD_BG = 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)';

type BilingualText = LocalizedCopy;

type Pillar = {
  icon: ReactNode;
  title: BilingualText;
  body: BilingualText;
  accent: string;
  tag: BilingualText;
};

type Metric = {
  label: BilingualText;
  value: string;
  sub: BilingualText;
  accent: string;
  icon: ReactNode;
};

type RoadmapItem = {
  phase: BilingualText;
  title: BilingualText;
  items: BilingualText[];
  status: 'live' | 'in-progress' | 'next';
  accent: string;
};

const COPY = {
  en: {
    eyebrow: 'Wasel · Innovation Hub',
    title: "Where Jordan's mobility future is being built.",
    subtitle:
      'The innovation layer sits underneath every ride, package, and bus seat on the Wasel network, turning corridor data into decisions and decisions into movement.',
    pillars: 'Core innovation pillars',
    metrics: 'Live intelligence metrics',
    roadmap: 'Roadmap signal',
    aiSection: 'AI and demand intelligence',
    aiBody:
      "Wasel's demand engine processes corridor signals in real time to predict where supply is needed before riders search. Price recommendations, seat allocation, and backhaul matching are all driven by this layer.",
    trustSection: 'Trust and safety layer',
    trustBody:
      'Every completed trip contributes to the trust graph. Identity verification, behaviour scoring, and guardian visibility for school routes are first-class features, not afterthoughts.',
    networkSection: 'Network compounding',
    networkBody:
      'Each new route added to the Wasel graph increases the value of every existing route. Packages find more carriers, riders find more seats, and the system gets cheaper and faster as it grows.',
    menaSection: 'MENA-first design',
    menaBody:
      'WhatsApp-native coordination, Arabic-first UI, JOD pricing, Jordan PDPL compliance, and offline-tolerant architecture for variable connectivity corridors.',
  },
  ar: {
    eyebrow: 'واصل · مركز الابتكار',
    title: 'هنا يُبنى مستقبل التنقل في الأردن.',
    subtitle:
      'طبقة الابتكار تعمل خلف كل رحلة وطرد ومقعد حافلة على شبكة واصل، وتحول بيانات الممرات إلى قرارات، والقرارات إلى حركة.',
    pillars: 'محاور الابتكار الأساسية',
    metrics: 'مقاييس الذكاء الحي',
    roadmap: 'إشارة الخارطة الزمنية',
    aiSection: 'الذكاء الاصطناعي وذكاء الطلب',
    aiBody:
      'تعالج محركة الطلب في واصل إشارات الممرات في الوقت الفعلي للتنبؤ بمكان الحاجة إلى العرض قبل أن يبحث الركاب. توصيات الأسعار وتخصيص المقاعد ومطابقة الشحن العائد كلها مدفوعة بهذه الطبقة.',
    trustSection: 'طبقة الثقة والسلامة',
    trustBody:
      'تساهم كل رحلة مكتملة في رسم الثقة. التحقق من الهوية وتسجيل السلوك ورؤية أولياء الأمور لمسارات المدارس كلها ميزات من الدرجة الأولى وليست أفكاراً لاحقة.',
    networkSection: 'تضاعف الشبكة',
    networkBody:
      'كل مسار جديد يضاف إلى رسم واصل يزيد من قيمة كل مسار موجود. تجد الطرود مزيداً من الناقلين، ويجد الركاب مزيداً من المقاعد، وتصبح المنظومة أرخص وأسرع مع نموها.',
    menaSection: 'تصميم يعطي الأولوية لمنطقة الشرق الأوسط',
    menaBody:
      'تنسيق عبر واتساب بشكل طبيعي، وواجهة تعطي الأولوية للعربية، وتسعير بالدينار الأردني، وامتثال لقانون PDPL الأردني، وبنية تحتية مقاومة للانقطاع.',
  },
} as const;

const PILLARS: Pillar[] = [
  {
    icon: <Brain size={20} aria-hidden="true" />,
    accent: C.cyan,
    title: { en: 'Demand Prediction', ar: 'التنبؤ بالطلب' },
    body: {
      en: 'Route demand is modelled from search patterns, booking history, and time-of-day signals so supply can be positioned before riders ask.',
      ar: 'يتم نمذجة طلب المسار من أنماط البحث وسجل الحجز وإشارات الوقت لتحديد موضع العرض قبل أن يطلب الركاب.',
    },
    tag: { en: 'AI Layer', ar: 'طبقة الذكاء الاصطناعي' },
  },
  {
    icon: <TrendingUp size={20} aria-hidden="true" />,
    accent: C.gold,
    title: { en: 'Dynamic Pricing', ar: 'التسعير الديناميكي' },
    body: {
      en: 'Seat prices and parcel rates adjust in real time based on corridor load, backhaul availability, and competing demand signals.',
      ar: 'تتعدل أسعار المقاعد وأسعار الطرود في الوقت الفعلي بناءً على حمل الممر وتوافر الشحن العائد وإشارات الطلب.',
    },
    tag: { en: 'Pricing Intelligence', ar: 'ذكاء التسعير' },
  },
  {
    icon: <Route size={20} aria-hidden="true" />,
    accent: C.green,
    title: { en: 'Return-Lane Matching', ar: 'مطابقة الممر العائد' },
    body: {
      en: 'Every offered ride is checked for a return-lane signal. Drivers who commit to both directions unlock Raje3 bonuses and higher seat yields.',
      ar: 'يتم التحقق من كل رحلة مقدمة بحثاً عن إشارة المسار العائد. السائقون الملتزمون بالاتجاهين يفتحون مكافآت راجع وعائداً أعلى للمقاعد.',
    },
    tag: { en: 'Raje3 Engine', ar: 'محرك راجع' },
  },
  {
    icon: <Package size={20} aria-hidden="true" />,
    accent: C.cyan,
    title: { en: 'Backhaul Intelligence', ar: 'ذكاء الشحن العائد' },
    body: {
      en: 'Packages are matched to rides going the same direction. The system prioritises carriers with verified trust scores and available boot space.',
      ar: 'تتطابق الطرود مع الرحلات التي تسير في نفس الاتجاه. وتمنح المنظومة الأولوية للناقلين ذوي الثقة الموثقة والمساحة المتاحة.',
    },
    tag: { en: 'Package Network', ar: 'شبكة الطرود' },
  },
  {
    icon: <ShieldCheck size={20} aria-hidden="true" />,
    accent: C.green,
    title: { en: 'Trust Graph', ar: 'رسم الثقة' },
    body: {
      en: 'Each completed trip, verified identity, and resolved dispute updates the trust graph. High-trust profiles unlock better pricing and priority matching.',
      ar: 'كل رحلة مكتملة وهوية موثقة ونزاع محلول يحدث رسم الثقة. الملفات عالية الثقة تفتح تسعيراً أفضل وأولوية أعلى في المطابقة.',
    },
    tag: { en: 'Safety Layer', ar: 'طبقة الأمان' },
  },
  {
    icon: <Globe2 size={20} aria-hidden="true" />,
    accent: C.gold,
    title: { en: 'MENA Localisation', ar: 'التخصيص للمنطقة' },
    body: {
      en: 'WhatsApp-native messaging, RTL-first UI, Arabic voice prompts, JOD pricing, Jordan PDPL compliance, and offline queue architecture.',
      ar: 'مراسلة عبر واتساب بشكل طبيعي، وواجهة RTL أولاً، وموجهات صوتية عربية، وتسعير بالدينار، وامتثال لقانون PDPL، وبنية طوابير تتحمل الاتصال المتقطع.',
    },
    tag: { en: 'Regional First', ar: 'المنطقة أولاً' },
  },
  {
    icon: <Layers size={20} aria-hidden="true" />,
    accent: C.cyan,
    title: { en: 'Mobility OS', ar: 'نظام تشغيل التنقل' },
    body: {
      en: 'A network control layer exposing corridor ownership, route density, and demand compounding so operators can act on signals rather than hunches.',
      ar: 'طبقة تحكم في الشبكة تكشف عن ملكية الممر وكثافة المسار وتضاعف الطلب حتى يتصرف المشغلون على إشارات واضحة لا على الحدس.',
    },
    tag: { en: 'Control Layer', ar: 'طبقة التحكم' },
  },
  {
    icon: <Users size={20} aria-hidden="true" />,
    accent: C.green,
    title: { en: 'School & Corporate', ar: 'المدارس والشركات' },
    body: {
      en: 'Recurring seat allocation, guardian visibility, managed billing, and service-provider dispatch on the same route graph as the marketplace.',
      ar: 'تخصيص مقاعد متكرر، ورؤية أولياء الأمور، وفوترة مُدارة، وإرسال مزود الخدمة على نفس رسم المسارات الخاص بالسوق.',
    },
    tag: { en: 'Enterprise', ar: 'المؤسسات' },
  },
  {
    icon: <CircuitBoard size={20} aria-hidden="true" />,
    accent: C.gold,
    title: { en: 'Corridor Compounding', ar: 'تضاعف الممر' },
    body: {
      en: 'Every seat, package, and bus stop on a corridor increases the value of every other asset on it, creating a defensible flywheel effect over time.',
      ar: 'كل مقعد وطرد ومحطة حافلة على ممر يزيد من قيمة كل أصل آخر عليه، مما يصنع أثراً تراكمياً دفاعياً مع الوقت.',
    },
    tag: { en: 'Network Effect', ar: 'أثر الشبكة' },
  },
];

const METRICS: Metric[] = [
  {
    icon: <BarChart3 size={16} aria-hidden="true" />,
    accent: C.cyan,
    value: '18',
    label: { en: 'Active corridors', ar: 'ممرات نشطة' },
    sub: { en: 'Modelled Jordan-first lanes', ar: 'ممرات أردنية أولى مُنمذجة' },
  },
  {
    icon: <Zap size={16} aria-hidden="true" />,
    accent: C.gold,
    value: '<3 min',
    label: { en: 'Avg match time', ar: 'متوسط وقت المطابقة' },
    sub: { en: 'Demand-to-supply signal latency', ar: 'زمن استجابة إشارة الطلب إلى العرض' },
  },
  {
    icon: <Activity size={16} aria-hidden="true" />,
    accent: C.green,
    value: '94%',
    label: { en: 'Backhaul attach rate', ar: 'معدل إرفاق الشحن العائد' },
    sub: { en: 'Packages matched to live rides', ar: 'طرود مطابقة لرحلات حية' },
  },
  {
    icon: <Sparkles size={16} aria-hidden="true" />,
    accent: C.cyan,
    value: '3.5x',
    label: { en: 'WhatsApp conversion lift', ar: 'رفع تحويل واتساب' },
    sub: { en: 'vs standard in-app CTA', ar: 'مقارنة بالدعوة القياسية داخل التطبيق' },
  },
  {
    icon: <TrendingUp size={16} aria-hidden="true" />,
    accent: C.gold,
    value: '28%',
    label: { en: 'Avg corridor savings', ar: 'متوسط توفير الممر' },
    sub: { en: 'vs solo on-demand alternatives', ar: 'مقارنة ببدائل الطلب الفردي' },
  },
  {
    icon: <ShieldCheck size={16} aria-hidden="true" />,
    accent: C.green,
    value: '99.4%',
    label: { en: 'Trust graph accuracy', ar: 'دقة رسم الثقة' },
    sub: { en: 'Verified identity resolution rate', ar: 'معدل دقة التحقق من الهوية' },
  },
];

const ROADMAP: RoadmapItem[] = [
  {
    status: 'live',
    accent: C.green,
    phase: { en: 'Phase 1 - Live', ar: 'المرحلة 1 - مباشر' },
    title: { en: 'Foundation layer', ar: 'طبقة التأسيس' },
    items: [
      { en: 'Ride marketplace with seat-level pricing', ar: 'سوق الرحلات مع تسعير على مستوى المقعد' },
      { en: 'Package handoff via ride network', ar: 'تسليم الطرود عبر شبكة الرحلات' },
      { en: 'Bus corridor scheduling', ar: 'جدولة ممر الحافلات' },
      { en: 'Wallet and JOD payments', ar: 'المحفظة والمدفوعات بالدينار الأردني' },
      { en: 'Trust and identity verification', ar: 'الثقة والتحقق من الهوية' },
      { en: 'Bilingual AR/EN and Jordan PDPL readiness', ar: 'جاهزية عربية وإنجليزية وامتثال لقانون PDPL الأردني' },
    ],
  },
  {
    status: 'in-progress',
    accent: C.gold,
    phase: { en: 'Phase 2 - In Progress', ar: 'المرحلة 2 - قيد التنفيذ' },
    title: { en: 'Intelligence layer', ar: 'طبقة الذكاء' },
    items: [
      { en: 'Real-time demand prediction engine', ar: 'محرك التنبؤ بالطلب في الوقت الفعلي' },
      { en: 'Raje3 return-lane matching', ar: 'مطابقة راجع للمسار العائد' },
      { en: 'Dynamic corridor pricing', ar: 'تسعير ممر ديناميكي' },
      { en: 'WhatsApp-native booking confirmation', ar: 'تأكيد الحجز عبر واتساب بشكل أصلي' },
      { en: 'Corporate managed-mobility accounts', ar: 'حسابات تنقل مُدار للشركات' },
      { en: 'School transport with guardian visibility', ar: 'نقل مدرسي مع رؤية أولياء الأمور' },
    ],
  },
  {
    status: 'next',
    accent: C.cyan,
    phase: { en: 'Phase 3 - Next', ar: 'المرحلة 3 - التالي' },
    title: { en: 'Network compounding layer', ar: 'طبقة تضاعف الشبكة' },
    items: [
      { en: 'Cross-border MENA corridors', ar: 'ممرات عابرة للحدود في المنطقة' },
      { en: 'AI-driven credit-adjusted movement pricing', ar: 'تسعير الحركة المعدل بالائتمان بالذكاء الاصطناعي' },
      { en: 'Autonomous dispatch for corporate fleets', ar: 'إرسال تلقائي لأساطيل الشركات' },
      { en: 'Open API for third-party corridor integration', ar: 'واجهة مفتوحة لتكامل الممرات مع الأطراف الأخرى' },
      { en: 'Carbon accounting per corridor per trip', ar: 'محاسبة الكربون لكل ممر ولكل رحلة' },
    ],
  },
];

function panel(extra: CSSProperties = {}): CSSProperties {
  return {
    position: 'relative',
    background: CARD_BG,
    border: BORD,
    borderRadius: 24,
    boxShadow: SH.md,
    overflow: 'hidden',
    ...extra,
  };
}

function glassChip(accent: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 999,
    border: `1px solid ${accent}33`,
    background: `${accent}14`,
    color: accent,
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  };
}

export default function InnovationHubPage() {
  const { language, dir } = useLanguage();
  const copy = COPY[language];
  const selectText = (value: BilingualText) => getLocalizedCopy(language, value);
  const isArabic = language === 'ar';

  return (
    <div
      dir={dir}
      style={{
        minHeight: '100vh',
        background: `${GRAD_AURORA}, radial-gradient(circle at 80% 12%, rgba(168,214,20,0.12), transparent 22%), ${C.bg}`,
        color: C.text,
        fontFamily: F,
        padding: '28px 16px 88px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 20 }}>
        <section
          style={panel({
            padding: '32px 28px',
            borderRadius: 32,
            background: `linear-gradient(135deg, ${C.cyanDim}, rgba(255,255,255,0.025))`,
            border: `1px solid ${C.cyanGlow}`,
          })}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(circle at 82% 20%, rgba(168,214,20,0.14), transparent 30%)',
            }}
          />
          <div style={{ position: 'relative', display: 'grid', gap: 14, maxWidth: 880 }}>
            <div
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: C.cyan,
                fontWeight: 800,
              }}
            >
              {copy.eyebrow}
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontWeight: 900,
              }}
            >
              {copy.title}
            </h1>
            <p
              style={{
                margin: 0,
                color: C.textSub,
                lineHeight: 1.78,
                fontSize: '1.02rem',
                maxWidth: 760,
              }}
            >
              {copy.subtitle}
            </p>
          </div>
        </section>

        <section
          aria-label={copy.metrics}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {METRICS.map(metric => (
            <div
              key={`${metric.value}-${selectText(metric.label)}`}
              style={panel({
                padding: '16px 18px',
                borderRadius: 22,
                border: `1px solid ${metric.accent}26`,
                boxShadow: `0 10px 28px ${metric.accent}12`,
              })}
            >
              <div style={glassChip(metric.accent)}>
                {metric.icon}
                {selectText(metric.label)}
              </div>
              <div
                style={{
                  fontSize: '1.95rem',
                  fontWeight: 900,
                  color: metric.accent,
                  lineHeight: 1,
                  margin: '10px 0 6px',
                  textShadow: `0 0 18px ${metric.accent}30`,
                }}
              >
                {metric.value}
              </div>
              <div style={{ color: C.textMuted, fontSize: '0.78rem', lineHeight: 1.55 }}>
                {selectText(metric.sub)}
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="innovation-pillars-heading">
          <div
            id="innovation-pillars-heading"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.textMuted,
              marginBottom: 14,
              fontWeight: 800,
            }}
          >
            {copy.pillars}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 14,
            }}
          >
            {PILLARS.map(pillar => (
              <article
                key={selectText(pillar.title)}
                style={panel({
                  padding: '20px 20px 18px',
                  borderRadius: 22,
                  border: `1px solid ${pillar.accent}22`,
                })}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: `${pillar.accent}14`,
                      border: `1px solid ${pillar.accent}28`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: pillar.accent,
                      flexShrink: 0,
                    }}
                  >
                    {pillar.icon}
                  </div>
                  <div style={glassChip(pillar.accent)}>{selectText(pillar.tag)}</div>
                </div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {selectText(pillar.title)}
                </h3>
                <p style={{ margin: 0, color: C.textSub, fontSize: '0.86rem', lineHeight: 1.7 }}>
                  {selectText(pillar.body)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {[
          { title: copy.aiSection, body: copy.aiBody, accent: C.cyan, icon: <Brain size={18} aria-hidden="true" /> },
          {
            title: copy.trustSection,
            body: copy.trustBody,
            accent: C.green,
            icon: <ShieldCheck size={18} aria-hidden="true" />,
          },
          {
            title: copy.networkSection,
            body: copy.networkBody,
            accent: C.gold,
            icon: <Activity size={18} aria-hidden="true" />,
          },
          {
            title: copy.menaSection,
            body: copy.menaBody,
            accent: C.cyan,
            icon: <Globe2 size={18} aria-hidden="true" />,
          },
        ].map(section => (
          <section
            key={section.title}
            style={panel({
              padding: '22px 22px 20px',
              borderRadius: 24,
              border: `1px solid ${section.accent}22`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 18,
            })}
          >
            <div
              aria-hidden="true"
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                background: `${section.accent}14`,
                border: `1px solid ${section.accent}28`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: section.accent,
                flexShrink: 0,
              }}
            >
              {section.icon}
            </div>
            <div>
              <h2
                style={{
                  margin: '0 0 8px',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: C.textSub,
                  lineHeight: 1.75,
                  fontSize: '0.92rem',
                  maxWidth: 820,
                }}
              >
                {section.body}
              </p>
            </div>
          </section>
        ))}

        <section aria-labelledby="innovation-roadmap-heading">
          <div
            id="innovation-roadmap-heading"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: C.textMuted,
              marginBottom: 14,
              fontWeight: 800,
            }}
          >
            {copy.roadmap}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: 14,
            }}
          >
            {ROADMAP.map(phase => (
              <article
                key={selectText(phase.phase)}
                style={panel({
                  padding: '20px 20px 18px',
                  borderRadius: 24,
                  border: `1px solid ${phase.accent}28`,
                  boxShadow:
                    phase.status === 'live'
                      ? `0 14px 36px ${phase.accent}14`
                      : '0 8px 22px rgba(0,0,0,0.18)',
                })}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.68rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: phase.accent,
                      fontWeight: 800,
                    }}
                  >
                    {selectText(phase.phase)}
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: phase.accent,
                      boxShadow: `0 0 12px ${phase.accent}`,
                      opacity: phase.status === 'next' ? 0.45 : 1,
                    }}
                  />
                </div>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 900 }}>
                  {selectText(phase.title)}
                </h3>
                <ul
                  style={{
                    margin: 0,
                    padding: isArabic ? '0 18px 0 0' : '0 0 0 18px',
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  {phase.items.map(item => (
                    <li
                      key={selectText(item)}
                      style={{ color: C.textSub, fontSize: '0.84rem', lineHeight: 1.6 }}
                    >
                      {selectText(item)}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
