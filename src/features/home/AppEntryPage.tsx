import * as motion from 'motion/react-m';
import {
  ArrowRight,
  Bus,
  Clock3,
  MapPinned,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import {
  getFeaturedCorridors,
  type CorridorOpportunity,
} from '../../config/wasel-movement-network';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import { C as DS, F, GRAD, GRAD_GOLD, SH } from '../../utils/wasel-ds';
import { AppCommandCenter } from './AppCommandCenter';
import { MobilityOSLandingMap } from './MobilityOSLandingMap';

const C = {
  bg: DS.bg,
  bgDeep: DS.bgDeep,
  border: DS.border,
  borderSoft: DS.borderFaint,
  text: DS.text,
  muted: DS.textSub,
  soft: DS.textMuted,
  cyan: DS.cyan,
  cyanSoft: DS.cyanDark,
  gold: DS.gold,
  green: DS.green,
} as const;

const FONT = F;

function tierLabel(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function corridorMeta(corridor?: CorridorOpportunity | null) {
  if (!corridor) {
    return {
      fare: '--',
      savings: '--',
      pickup: 'Closest active stop',
      grouping: 'Demand-based grouping',
    };
  }

  return {
    fare: `${corridor.sharedPriceJod} JOD`,
    savings: `${corridor.savingsPercent}%`,
    pickup: corridor.pickupPoints?.[0] ?? 'Closest active stop',
    grouping: corridor.autoGroupWindow,
  };
}

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const { language, dir } = useLanguage();
  const corridors = useMemo(() => getFeaturedCorridors(3), []);
  const membership = useMemo(() => getMovementMembershipSnapshot(), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevRootHeight = root?.style.height ?? '';
    const prevRootMinHeight = root?.style.minHeight ?? '';

    html.style.height = 'auto';
    body.style.height = 'auto';

    if (root) {
      root.style.height = 'auto';
      root.style.minHeight = 'var(--app-min-height)';
    }

    return () => {
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;

      if (root) {
        root.style.height = prevRootHeight;
        root.style.minHeight = prevRootMinHeight;
      }
    };
  }, []);

  const ar = language === 'ar';
  const primaryLabel = user
    ? ar
      ? 'افتح الرحلات الحية'
      : 'Book employee travel'
    : ar
      ? 'ابدأ الآن'
      : 'Start guided booking';
  const primaryPath = user
    ? membership.dailyRoute
      ? `/app/find-ride?from=${encodeURIComponent(membership.dailyRoute.from)}&to=${encodeURIComponent(
          membership.dailyRoute.to,
        )}&search=1`
      : '/app/find-ride'
    : '/app/auth?returnTo=/app';

  const spotlightCorridor = membership.dailyRoute ?? corridors[0];
  const corridorCards = spotlightCorridor
    ? [
        spotlightCorridor,
        ...corridors.filter(corridor => corridor.id !== spotlightCorridor.id),
      ].slice(0, 3)
    : corridors;

  const heroCopy = ar
    ? {
        topbarEyebrow: 'طبقة الحركة في الأردن',
        topbarBody: 'مسار واحد يربط الرحلات والطرود وخط الباص.',
        topbarPill: 'حركة مصممة للأردن',
        heroBadge: 'مسار واحد، حركات متعددة',
        heroTitleA: 'مسار واحد،',
        heroTitleB: 'لكل حركة.',
        heroBody:
          'افتح نفس الممر ثم قرر: احجز مقعداً، اعرض مقعداً، أرسل طرداً، أو انتقل إلى الباص بدون تبديل المنطق.',
        secondaryCta: 'اطلع على رحلات الباص',
        stats: [
          { value: `${membership.movementCredits}`, label: 'الرصيد', tone: C.cyanSoft },
          { value: `${membership.streakDays}d`, label: 'التتابع', tone: C.green },
          { value: tierLabel(membership.loyaltyTier), label: 'الفئة', tone: C.gold },
        ],
        mapEyebrow: 'خريطة Mobility OS',
        mapTitle: 'الذكاء يظهر على المسار نفسه',
        mapBody:
          'بدلاً من بطاقة شرح ثابتة، يرى المستخدم سطحاً حياً يوضح كيف تتحرك الرحلات والتسليمات عبر الأردن.',
        corridorLabel: 'ممر اليوم',
        fareLabel: 'السعر المشترك',
        savingsLabel: 'التوفير',
        pickupLabel: 'نقطة الالتقاط',
        groupingLabel: 'التجميع',
        servicesEyebrow: 'الخدمات الأساسية',
        servicesTitle: 'كل إجراء يجب أن يشعر أنه من نفس المنتج.',
        servicesBody:
          'الواجهة تبقى متمحورة حول المسار في كل وضع، لذلك يتنقل المستخدم بين الركوب والعرض والطرود والباص بدون فقدان السياق.',
        proofEyebrow: 'لماذا يهبط هذا بسرعة',
        proofTitle: 'الصفحة تشرح النظام في مرور واحد.',
        proofBody:
          'الشاشة الأولى تقود بالممر نفسه، ثم تأتي بقية البطاقات لتقوي الفهم بدلاً من منافسة البطل.',
        corridorsEyebrow: 'الممرات الحية',
        corridorsTitle: 'المسارات المحددة تجعل المنتج واقعياً.',
        corridorsBody:
          'بعد أن يفهم الزائر الفكرة من الخريطة، يرى كيف يتحول ذلك إلى ممرات فعلية قابلة للفتح مباشرة.',
        routeFocus: 'تركيز اليوم',
        routeFocusBody:
          'عندما يعود الناس إلى نفس الممر، تصبح الحركة المشتركة عادة لا تجربة معزولة.',
        finalEyebrow: 'الخطوة التالية',
        finalTitle: 'ابدأ من المسار ثم دع النمط يتبع.',
        finalBody: 'هذا هو الفرق بين صفحة تبدو جيدة وصفحة تشرح المنتج فوراً.',
        finalCta: 'افتح واصل',
        openService: 'افتح الخدمة',
        openCorridor: 'استكشف هذا الممر',
        belowSolo: 'أقل من الخيار الفردي',
        serviceCards: [
          {
            title: 'ابحث عن رحلة',
            detail: 'مقاعد مجمعة ونقاط التقاط أوضح وقرار أسرع قبل الحجز.',
            icon: Users,
            tone: DS.cyan,
            path: '/app/find-ride',
            signal: 'موجات المقاعد الحية',
          },
          {
            title: 'اعرض رحلة',
            detail: 'افتح العرض بسرعة واملأ المقاعد مع اقتصاد واضح للمسار.',
            icon: Truck,
            tone: DS.green,
            path: '/app/offer-ride',
            signal: 'وضوح السائق',
          },
          {
            title: 'أرسل طرداً',
            detail: 'حوّل نفس الممر إلى حركة طرود بدون منتج منفصل.',
            icon: Package,
            tone: DS.gold,
            path: '/app/packages',
            signal: 'طرود مرتبطة بالمسار',
          },
          {
            title: 'احجز باص',
            detail: 'مغادرات رسمية وخيار هادئ عندما تمتلئ المشاركة.',
            icon: Bus,
            tone: DS.cyanDark,
            path: '/app/bus',
            signal: 'مغادرات مجدولة',
          },
        ],
        proofCards: [
          {
            title: 'سطح واحد لا أربع أدوات منفصلة',
            detail:
              'واصل يبقي الركوب والباص والطرود داخل منطق مسار واحد، لذلك يشعر المنتج بالتماسك فوراً.',
            icon: Sparkles,
            tone: DS.cyan,
          },
          {
            title: 'القرار يبدأ من الممر',
            detail:
              'الإجابة المهمة تظهر أولاً: أين يتحرك الممر، ما تكلفته، ومدى ثقة المغادرة التالية.',
            icon: Route,
            tone: DS.green,
          },
          {
            title: 'الثقة عند نقطة الفعل',
            detail: 'السعر وسلوك المسار والخطوة التالية تبقى مرئية قبل الالتزام، وهذا يقلل التردد.',
            icon: ShieldCheck,
            tone: DS.gold,
          },
        ],
      }
    : {
        topbarEyebrow: 'Employee travel control',
        topbarBody: 'Lower commute cost with booking, approval, and live management in one flow.',
        topbarPill: 'Built for Jordan teams',
        heroBadge: 'Book, request, approve, manage',
        heroTitleA: 'Reduce transport cost.',
        heroTitleB: 'Automate employee travel.',
        heroBody:
          'Wasel guides employees and operators from the first route decision to approval, booking, and live trip management without manual coordination.',
        secondaryCta: '30-second guided flow',
        stats: [
          { value: `${membership.movementCredits}`, label: 'Credits', tone: C.cyanSoft },
          { value: `${membership.streakDays}d`, label: 'Streak', tone: C.green },
          { value: tierLabel(membership.loyaltyTier), label: 'Tier', tone: C.gold },
        ],
        mapEyebrow: 'Travel automation field',
        mapTitle: 'Cost, approval, and movement stay on the route itself',
        mapBody:
          'The live surface shows where employees are moving, what the shared fare saves, and which action should happen next.',
        corridorLabel: 'Daily corridor',
        fareLabel: 'Shared fare',
        savingsLabel: 'Savings',
        pickupLabel: 'Pickup anchor',
        groupingLabel: 'Auto-group',
        servicesEyebrow: 'Core services',
        servicesTitle: 'One primary action per screen, matched to the user job.',
        servicesBody:
          'Employees book or request. Approvers clear pending travel. Operators manage supply and live movement. Each flow has one dominant next step.',
        proofEyebrow: 'Why this lands fast',
        proofTitle: 'Onboarding should reach the first useful action in under 30 seconds.',
        proofBody:
          'The first screen now leads with the outcome, exposes the guided flow, and removes extra hero choices that slow the first decision.',
        corridorsEyebrow: 'Live corridors',
        corridorsTitle: 'Specific routes make the product feel real.',
        corridorsBody:
          'Once the map makes the operating model legible, these cards show how that turns into real corridors users can open immediately.',
        routeFocus: 'Daily route focus',
        routeFocusBody: 'Shared movement compounds when the same corridor stays easy to reopen.',
        finalEyebrow: 'Fast next step',
        finalTitle: 'Start with the corridor, then let the mode follow.',
        finalBody:
          'That is the difference between a landing page that only looks polished and one that explains the product at a glance.',
        finalCta: 'Start guided booking',
        openService: 'Open service',
        openCorridor: 'Explore this corridor',
        belowSolo: 'below solo reference',
        serviceCards: [
          {
            title: 'Book travel',
            detail:
              'Grouped seats, cleaner pickup decisions, and lower recurring commute cost before employees book.',
            icon: Users,
            tone: DS.cyan,
            path: '/app/find-ride',
            signal: 'Live seat waves',
          },
          {
            title: 'Request approval',
            detail:
              'Send route, fare, timing, and policy context forward without a separate coordination step.',
            icon: Truck,
            tone: DS.green,
            path: '/app/offer-ride',
            signal: 'Driver-side clarity',
          },
          {
            title: 'Approve travel',
            detail:
              'Clear pending employee movement with the cost and corridor context already visible.',
            icon: Package,
            tone: DS.gold,
            path: '/app/packages',
            signal: 'Route-linked parcels',
          },
          {
            title: 'Manage movement',
            detail:
              'Track live trips, supply, bus fallback, and operational exceptions from the same route graph.',
            icon: Bus,
            tone: DS.cyanDark,
            path: '/app/bus',
            signal: 'Scheduled departures',
          },
        ],
        proofCards: [
          {
            title: 'One surface, not four disconnected tools',
            detail:
              'Wasel keeps rides, bus departures, and parcels inside one corridor logic, so the product feels coherent immediately.',
            icon: Sparkles,
            tone: DS.cyan,
          },
          {
            title: 'Route-first decisions',
            detail:
              'The important answer shows up first: where the corridor is moving, what it costs, and how confident the next departure looks.',
            icon: Route,
            tone: DS.green,
          },
          {
            title: 'Trust at the point of action',
            detail:
              'Pricing, route behavior, and the next step stay visible before the user commits, which lowers hesitation everywhere.',
            icon: ShieldCheck,
            tone: DS.gold,
          },
        ],
      };

  const meta = corridorMeta(spotlightCorridor);

  return (
    <div
      dir={dir}
      style={{
        minHeight: 'var(--app-min-height)',
        background: C.bg,
        color: C.text,
        fontFamily: FONT,
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        :root { color-scheme: dark; }
        @media (max-width: 1140px) {
          .landing-hero-grid,
          .landing-proof-grid,
          .landing-corridor-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-service-grid,
          .landing-meta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .landing-service-grid,
          .landing-proof-grid,
          .landing-corridor-grid,
          .landing-stats-grid,
          .landing-meta-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-cta,
          .landing-topbar,
          .landing-section-head {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .landing-hero-copy,
          .landing-hero-map-shell,
          .landing-corridor-shell {
            padding: 22px !important;
            border-radius: 28px !important;
          }
          .landing-hero-title {
            font-size: clamp(2.7rem, 15vw, 4.1rem) !important;
          }
          .landing-hero-map-caption {
            max-width: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 12% 16%, rgba(88,221,255,0.2), transparent 25%),
            radial-gradient(circle at 84% 14%, rgba(255,190,92,0.18), transparent 22%),
            radial-gradient(circle at 72% 62%, rgba(71,214,158,0.14), transparent 22%),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))
          `,
          pointerEvents: 'none',
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 110,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 1180px)',
          height: 500,
          borderRadius: 52,
          background: 'radial-gradient(circle at center, rgba(88,221,255,0.08), rgba(4,11,18,0))',
          filter: 'blur(10px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 1240,
          margin: '0 auto',
          padding: '32px 24px 88px',
        }}
      >
        <motion.div
          className="landing-topbar"
          initial={false}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <WaselLogo size={44} theme="light" />
            <div>
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: C.cyan,
                }}
              >
                {heroCopy.topbarEyebrow}
              </div>
              <div style={{ color: C.soft, fontSize: '0.88rem', maxWidth: 420 }}>
                {heroCopy.topbarBody}
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              color: C.soft,
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
            }}
          >
            {heroCopy.topbarPill}
          </span>
        </motion.div>

        {user ? <AppCommandCenter /> : null}

        <div
          className="landing-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '0.94fr 1.06fr',
            gap: 28,
            alignItems: 'stretch',
            marginTop: 34,
          }}
        >
          <motion.div
            className="landing-hero-copy"
            initial={false}
            style={{
              borderRadius: 36,
              padding: '32px 32px 30px',
              border: `1px solid ${C.border}`,
              background: 'linear-gradient(180deg, rgba(11,29,45,0.9), rgba(8,22,35,0.88))',
              boxShadow: SH.xl,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(135deg, rgba(88,221,255,0.08), rgba(255,190,92,0.03) 50%, rgba(71,214,158,0.08))',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 9999,
                  background: 'rgba(88,221,255,0.1)',
                  border: `1px solid ${C.border}`,
                  color: C.cyanSoft,
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Sparkles size={14} />
                {heroCopy.heroBadge}
              </span>

              <h1
                className="landing-hero-title"
                style={{
                  margin: '22px 0 14px',
                  fontSize: 'clamp(3.35rem, 6.4vw, 5.8rem)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.075em',
                  fontWeight: 950,
                  maxWidth: 760,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    background:
                      'linear-gradient(135deg, #FFFFFF 0%, #D2F7FF 25%, #67E8FF 58%, #6BF0C8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {heroCopy.heroTitleA}
                </span>
                <span style={{ display: 'block', color: C.text, marginTop: 10 }}>
                  {heroCopy.heroTitleB}
                </span>
              </h1>

              <p
                style={{
                  maxWidth: 560,
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: C.muted,
                  margin: 0,
                }}
              >
                {heroCopy.heroBody}
              </p>

              <div
                className="landing-cta"
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  marginTop: 28,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  onClick={() => navigate(primaryPath)}
                  style={{
                    height: 56,
                    padding: '0 22px',
                    border: 'none',
                    borderRadius: 18,
                    background: GRAD,
                    color: C.bgDeep,
                    fontWeight: 900,
                    fontSize: '0.96rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    boxShadow: SH.cyanL,
                  }}
                >
                  {primaryLabel}
                  <ArrowRight size={17} />
                </button>

                <span
                  style={{
                    minHeight: 56,
                    padding: '0 18px',
                    borderRadius: 18,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.border}`,
                    color: C.soft,
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                >
                  {heroCopy.secondaryCta}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 10,
                  marginTop: 18,
                  maxWidth: 620,
                }}
              >
                {[
                  { label: 'Book', detail: 'Pick route and seats' },
                  { label: 'Request', detail: 'Send approval context' },
                  { label: 'Approve', detail: 'Clear pending travel' },
                  { label: 'Manage', detail: 'Track trips and supply' },
                ].map((step, index) => (
                  <div
                    key={step.label}
                    style={{
                      minHeight: 86,
                      borderRadius: 18,
                      padding: '12px 13px',
                      background: index === 0 ? 'rgba(88,221,255,0.1)' : 'rgba(255,255,255,0.035)',
                      border: `1px solid ${index === 0 ? 'rgba(88,221,255,0.26)' : C.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        color: index === 0 ? C.cyanSoft : C.text,
                        fontSize: '0.86rem',
                        fontWeight: 900,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{ marginTop: 6, color: C.soft, fontSize: '0.74rem', lineHeight: 1.45 }}
                    >
                      {step.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="landing-stats-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 22,
                }}
              >
                {heroCopy.stats.map(item => (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.035)',
                      border: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        color: C.soft,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: item.tone,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="landing-hero-map-shell"
            initial={false}
            style={{
              borderRadius: 36,
              padding: 24,
              background: 'linear-gradient(180deg, rgba(16,37,58,0.97), rgba(6,19,31,0.98))',
              border: `1px solid ${C.border}`,
              boxShadow: SH.xl,
              display: 'grid',
              gap: 16,
              alignContent: 'start',
            }}
          >
            <div
              className="landing-section-head"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: C.cyan,
                  }}
                >
                  {heroCopy.mapEyebrow}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    lineHeight: 1.06,
                    maxWidth: 520,
                  }}
                >
                  {heroCopy.mapTitle}
                </div>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 9999,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.borderSoft}`,
                  color: C.soft,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                }}
              >
                {spotlightCorridor?.label ?? 'Jordan corridor'}
              </span>
            </div>

            <div
              className="landing-hero-map-caption"
              style={{
                color: C.muted,
                lineHeight: 1.7,
                fontSize: '0.92rem',
                maxWidth: 600,
              }}
            >
              {heroCopy.mapBody}
            </div>

            <MobilityOSLandingMap />

            <div
              className="landing-meta-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
              }}
            >
              {[
                {
                  icon: Route,
                  label: heroCopy.corridorLabel,
                  value: spotlightCorridor?.label ?? 'Amman -> Irbid',
                  tone: C.cyanSoft,
                },
                {
                  icon: Sparkles,
                  label: heroCopy.fareLabel,
                  value: meta.fare,
                  tone: C.gold,
                },
                {
                  icon: Clock3,
                  label: heroCopy.groupingLabel,
                  value: meta.grouping,
                  tone: C.green,
                },
                {
                  icon: MapPinned,
                  label: heroCopy.pickupLabel,
                  value: meta.pickup,
                  tone: C.cyanSoft,
                },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: '12px 13px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: item.tone,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      <Icon size={13} />
                      {item.label}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 850,
                        lineHeight: 1.45,
                        fontSize: '0.86rem',
                        color: C.text,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div initial={false} style={{ marginTop: 34 }}>
          <div
            className="landing-section-head"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'end',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: C.gold,
                }}
              >
                {heroCopy.servicesEyebrow}
              </div>
              <h2
                style={{
                  margin: '10px 0 0',
                  fontSize: 'clamp(1.8rem, 3vw, 2.7rem)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.05em',
                }}
              >
                {heroCopy.servicesTitle}
              </h2>
            </div>
            <div
              style={{
                maxWidth: 430,
                color: C.muted,
                lineHeight: 1.75,
                fontSize: '0.94rem',
              }}
            >
              {heroCopy.servicesBody}
            </div>
          </div>

          <div
            className="landing-service-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 16,
              marginTop: 18,
            }}
          >
            {heroCopy.serviceCards.map(service => {
              const Icon = service.icon;
              return (
                <button
                  key={service.title}
                  onClick={() => navigate(service.path)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 28,
                    padding: '22px 20px 20px',
                    background: 'linear-gradient(180deg, rgba(16,37,58,0.78), rgba(8,22,35,0.92))',
                    border: `1px solid ${C.borderSoft}`,
                    backdropFilter: 'blur(14px)',
                    cursor: 'pointer',
                    boxShadow: SH.card,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      alignItems: 'start',
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        display: 'grid',
                        placeItems: 'center',
                        background: `${service.tone}14`,
                        border: `1px solid ${service.tone}28`,
                      }}
                    >
                      <Icon size={19} color={service.tone} />
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 9999,
                        background: 'rgba(255,255,255,0.04)',
                        color: C.soft,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {service.signal}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      fontWeight: 900,
                      fontSize: '1.06rem',
                      lineHeight: 1.18,
                    }}
                  >
                    {service.title}
                  </div>
                  <div
                    style={{
                      marginTop: 9,
                      color: C.muted,
                      fontSize: '0.88rem',
                      lineHeight: 1.74,
                    }}
                  >
                    {service.detail}
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: service.tone,
                      fontWeight: 800,
                      fontSize: '0.84rem',
                    }}
                  >
                    {heroCopy.openService}
                    <ArrowRight size={15} />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={false} style={{ marginTop: 28 }}>
          <div
            className="landing-section-head"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'end',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: C.cyan,
                }}
              >
                {heroCopy.proofEyebrow}
              </div>
              <h2
                style={{
                  margin: '10px 0 0',
                  fontSize: 'clamp(1.65rem, 2.8vw, 2.4rem)',
                  lineHeight: 1.04,
                  letterSpacing: '-0.045em',
                }}
              >
                {heroCopy.proofTitle}
              </h2>
            </div>
            <div
              style={{
                maxWidth: 430,
                color: C.muted,
                lineHeight: 1.7,
                fontSize: '0.92rem',
              }}
            >
              {heroCopy.proofBody}
            </div>
          </div>

          <div
            className="landing-proof-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 14,
              marginTop: 16,
            }}
          >
            {heroCopy.proofCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  style={{
                    borderRadius: 24,
                    padding: '18px 18px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${C.borderSoft}`,
                    boxShadow: SH.navy,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: 'grid',
                      placeItems: 'center',
                      background: `${card.tone}16`,
                      border: `1px solid ${card.tone}26`,
                      color: card.tone,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      fontWeight: 900,
                      fontSize: '1rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: C.muted,
                      fontSize: '0.86rem',
                      lineHeight: 1.72,
                    }}
                  >
                    {card.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={false} style={{ marginTop: 34 }}>
          <div
            className="landing-corridor-shell"
            style={{
              borderRadius: 34,
              padding: '24px 24px 26px',
              background: 'linear-gradient(180deg, rgba(9,24,38,0.96), rgba(4,11,18,0.98))',
              border: `1px solid ${C.border}`,
              boxShadow: SH.xl,
            }}
          >
            <div
              className="landing-section-head"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 18,
                alignItems: 'end',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: C.cyan,
                  }}
                >
                  {heroCopy.corridorsEyebrow}
                </div>
                <h2
                  style={{
                    margin: '10px 0 0',
                    fontSize: 'clamp(1.85rem, 3vw, 2.8rem)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.05em',
                  }}
                >
                  {heroCopy.corridorsTitle}
                </h2>
              </div>

              <div
                style={{
                  maxWidth: 430,
                  color: C.muted,
                  lineHeight: 1.7,
                  fontSize: '0.92rem',
                }}
              >
                {heroCopy.corridorsBody}
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                borderRadius: 22,
                padding: '14px 16px',
                minWidth: 220,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.borderSoft}`,
              }}
            >
              <div
                style={{
                  color: C.soft,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {heroCopy.routeFocus}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontWeight: 900,
                  fontSize: '1.02rem',
                }}
              >
                {spotlightCorridor?.label ?? 'Amman -> Irbid'}
              </div>
              <div style={{ marginTop: 4, color: C.muted, fontSize: '0.82rem' }}>
                {heroCopy.routeFocusBody}
              </div>
            </div>

            <div
              className="landing-corridor-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
                marginTop: 20,
              }}
            >
              {corridorCards.map((corridor, index) => (
                <button
                  key={corridor.id}
                  onClick={() =>
                    navigate(
                      `/app/find-ride?from=${encodeURIComponent(
                        corridor.from,
                      )}&to=${encodeURIComponent(corridor.to)}&search=1`,
                    )
                  }
                  style={{
                    textAlign: 'left',
                    borderRadius: 28,
                    padding: '20px 18px 18px',
                    background:
                      index === 0
                        ? 'linear-gradient(180deg, rgba(88,221,255,0.12), rgba(255,255,255,0.03))'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${index === 0 ? C.border : C.borderSoft}`,
                    cursor: 'pointer',
                    boxShadow: SH.navy,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: index === 0 ? C.cyanSoft : C.soft,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.09em',
                        }}
                      >
                        {index === 0 ? heroCopy.routeFocus : ar ? 'ممر مميز' : 'Featured corridor'}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: '1.12rem',
                          fontWeight: 900,
                          lineHeight: 1.14,
                        }}
                      >
                        {corridor.label}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: 9999,
                        background:
                          index === 0 ? 'rgba(255,190,92,0.12)' : 'rgba(255,255,255,0.05)',
                        color: index === 0 ? C.gold : C.soft,
                        fontSize: '0.76rem',
                        fontWeight: 800,
                      }}
                    >
                      {corridor.savingsPercent}% {ar ? 'توفير' : 'saved'}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        label: heroCopy.fareLabel,
                        value: `${corridor.sharedPriceJod} JOD`,
                      },
                      {
                        label: ar ? 'دعم السائق' : 'Driver boost',
                        value: `+${corridor.driverBoostJod} JOD`,
                      },
                      {
                        label: ar ? 'الثقة' : 'Confidence',
                        value: `${corridor.attachRatePercent}% ${ar ? 'ربط' : 'attach rate'}`,
                      },
                    ].map(row => (
                      <div
                        key={row.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          alignItems: 'center',
                          borderRadius: 16,
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${C.borderSoft}`,
                        }}
                      >
                        <span
                          style={{
                            color: C.soft,
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {row.label}
                        </span>
                        <span
                          style={{
                            color: C.text,
                            fontWeight: 850,
                            fontSize: '0.86rem',
                          }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      color: C.muted,
                      fontSize: '0.84rem',
                      lineHeight: 1.68,
                    }}
                  >
                    {corridor.autoGroupWindow}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: index === 0 ? C.gold : C.cyanSoft,
                      fontWeight: 800,
                      fontSize: '0.84rem',
                    }}
                  >
                    {heroCopy.openCorridor}
                    <ArrowRight size={15} />
                  </div>
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 18,
                borderRadius: 24,
                padding: '18px 18px 16px',
                background:
                  'linear-gradient(135deg, rgba(255,190,92,0.14), rgba(255,147,106,0.08))',
                border: `1px solid rgba(255,190,92,0.18)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    color: C.gold,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    letterSpacing: '0.11em',
                    textTransform: 'uppercase',
                  }}
                >
                  {heroCopy.finalEyebrow}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '1.1rem',
                    fontWeight: 900,
                  }}
                >
                  {heroCopy.finalTitle}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: C.muted,
                    lineHeight: 1.65,
                    fontSize: '0.88rem',
                    maxWidth: 620,
                  }}
                >
                  {heroCopy.finalBody}
                </div>
              </div>

              <button
                onClick={() => navigate(primaryPath)}
                style={{
                  height: 54,
                  padding: '0 22px',
                  border: 'none',
                  borderRadius: 18,
                  background: GRAD_GOLD,
                  color: C.bgDeep,
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: SH.gold,
                }}
              >
                {heroCopy.finalCta}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
