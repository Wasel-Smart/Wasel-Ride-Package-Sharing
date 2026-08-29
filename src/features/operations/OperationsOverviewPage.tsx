import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import { Activity, Briefcase, Brain, GraduationCap, LineChart, Shield } from 'lucide-react';
import {
  MetricCard,
  PageHero,
  PageShell,
  SectionCard,
  StatusBadge,
} from '../../components/wasel-ui/WaselPagePrimitives';
import { useLocation } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  buildBusinessAccountSnapshot,
  buildSchoolTransportSnapshot,
  type BusinessAccountSnapshot,
  type SchoolTransportSnapshot,
} from '../../services/corridorOperations';
import { getGrowthDashboard, type GrowthDashboard } from '../../services/growthEngine';
import {
  buildCorridorMarketSnapshot as buildMiddleEastCorridorProof,
  type CorridorMarketSnapshot as MiddleEastCorridorProofSnapshot,
} from '../../services/corridorMarketData';
import {
  buildServiceProviderWorkflowSnapshot,
  type ServiceProviderWorkflowSnapshot,
} from '../../services/serviceProviderWorkflows';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { C, F, GRAD_HERO, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';
const CYAN = C.cyan;
const GOLD = C.gold;
const GREEN = C.green;
const BLUE = C.blue;

type SurfaceConfig = {
  title: string;
  detail: string;
  accent: string;
  icon: JSX.Element;
};

const CONFIG: Record<string, SurfaceConfig> = {
  '/app/services/corporate': {
    title: 'Public Mobility',
    detail:
      'Recurring public movement, shared billing, service-provider dispatch, and return-lane logistics on one route graph.',
    accent: CYAN,
    icon: <Briefcase size={22} />,
  },
  '/app/services/school': {
    title: 'School Transport',
    detail:
      'Guardian visibility, recurring seats, route safety, and predictable pickup windows for daily school operations.',
    accent: GREEN,
    icon: <GraduationCap size={22} />,
  },
  '/app/innovation-hub': {
    title: 'Innovation Hub',
    detail:
      'New corridor logic, pricing experiments, and operational ideas that can graduate into production lanes.',
    accent: CYAN,
    icon: <Brain size={22} />,
  },
  '/app/analytics': {
    title: 'Operations Analytics',
    detail:
      'Live corridor ownership, route economics, and proof that Wasel wins key regional lanes better than generic alternatives.',
    accent: GOLD,
    icon: <LineChart size={22} />,
  },
  '/app/mobility-os': {
    title: 'Mobility OS',
    detail:
      'A network control layer showing which corridors are building ownership, where the next wave is forming, and how route density compounds.',
    accent: BLUE,
    icon: <Activity size={22} />,
  },
  '/app/ai-intelligence': {
    title: 'AI Intelligence',
    detail:
      'Demand prediction, route recommendations, recurring behavior signals, and credit-adjusted movement pricing.',
    accent: CYAN,
    icon: <Brain size={22} />,
  },
  '/app/moderation': {
    title: 'Moderation and Safety',
    detail:
      'Trust oversight, route quality control, and operational visibility for high-confidence movement across the network.',
    accent: GREEN,
    icon: <Shield size={22} />,
  },
};

function cardStyle() {
  return {
    background: GRAD_HERO,
    border: `1px solid ${C.border}`,
    borderRadius: R.xl,
    padding: '18px 18px 16px',
    boxShadow: SH.card,
  } as const;
}

function StatCard({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return <MetricCard label={label} value={value} detail={detail} accent={color} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SectionCard title={title} contentPadding={SPACE[4]}>
      {children}
    </SectionCard>
  );
}

function HeroMetric({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${accent}24`,
        background: `${accent}12`,
        padding: '12px 14px',
      }}
    >
      <div style={{ color: C.text, fontSize: TYPE.size.lg, fontWeight: 900 }}>{value}</div>
      <div
        style={{
          marginTop: 4,
          color: C.textMuted,
          fontSize: TYPE.size.xs,
          textTransform: 'uppercase',
          letterSpacing: TYPE.letterSpacing.wide,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          color: C.textSub,
          fontSize: TYPE.size.xs,
          lineHeight: TYPE.lineHeight.relaxed,
        }}
      >
        {detail}
      </div>
    </div>
  );
}

export default function OperationsOverviewPage() {
  const { pathname } = useLocation();
  const { language, t } = useLanguage();
  const ar = language === 'ar';
  const routeIntelligence = useLiveRouteIntelligence();
  const config = useMemo(
    () =>
      CONFIG[pathname] ?? {
        title: 'Wasel Operations',
        detail:
          'A shared operating surface for the route network, marketplace workflows, and corridor intelligence.',
        accent: CYAN,
        icon: <Activity size={22} />,
      },
    [pathname],
  );
  const displayConfig = useMemo(() => {
    if (!ar) return config;
    const copy: Record<string, Pick<SurfaceConfig, 'title' | 'detail'>> = {
      '/app/services/corporate': {
        title: 'النقل العام',
        detail:
          'حركة عامة متكررة، فوترة مشتركة، توزيع مزودي خدمة، ولوجستيات مسار العودة على خريطة مسارات واحدة.',
      },
      '/app/services/school': {
        title: 'نقل المدارس',
        detail: 'وضوح للأهل، مقاعد متكررة، سلامة مسار، ونوافذ استلام متوقعة لتشغيل المدارس اليومي.',
      },
      '/app/innovation-hub': {
        title: 'مركز الابتكار',
        detail: 'منطق مسارات جديد، تجارب تسعير، وأفكار تشغيلية ممكن تنتقل لمسارات إنتاج.',
      },
      '/app/analytics': {
        title: 'تحليلات التشغيل',
        detail:
          'ملكية مسارات حيّة، اقتصاديات route، وإثبات أن واصل يكسب الممرات الإقليمية المهمة أفضل من البدائل العامة.',
      },
      '/app/mobility-os': {
        title: 'نظام الحركة',
        detail:
          'طبقة تحكم بالشبكة توضّح أي ممرات تبني ملكية، وين بتتكون الموجة الجاية، وكيف تتراكم كثافة المسار.',
      },
      '/app/ai-intelligence': {
        title: 'ذكاء اصطناعي',
        detail: 'توقع طلب، توصيات مسارات، إشارات سلوك متكرر، وتسعير حركة معدل حسب الثقة.',
      },
      '/app/moderation': {
        title: 'الإشراف والسلامة',
        detail: 'رقابة ثقة، ضبط جودة المسارات، ووضوح تشغيلي لحركة عالية الثقة عبر الشبكة.',
      },
    };
    return {
      ...config,
      ...(copy[pathname] ?? {
        title: 'عمليات واصل',
        detail: 'سطح تشغيل موحد لشبكة المسارات، مسارات السوق، وذكاء الممرات.',
      }),
    };
  }, [ar, config, pathname]);

  const [dashboard, setDashboard] = useState<GrowthDashboard | null>(null);
  const [businessSnapshot, setBusinessSnapshot] = useState<BusinessAccountSnapshot | null>(null);
  const [schoolSnapshot, setSchoolSnapshot] = useState<SchoolTransportSnapshot | null>(null);
  const [serviceSnapshot, setServiceSnapshot] = useState<ServiceProviderWorkflowSnapshot | null>(
    null,
  );
  const [proofSnapshot, setProofSnapshot] = useState<MiddleEastCorridorProofSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getGrowthDashboard()
      .then(value => {
        if (!cancelled) setDashboard(value);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      });

    if (pathname === '/app/services/corporate') {
      void buildBusinessAccountSnapshot()
        .then(value => {
          if (!cancelled) setBusinessSnapshot(value);
        })
        .catch(() => {
          if (!cancelled) setBusinessSnapshot(null);
        });

      setServiceSnapshot(buildServiceProviderWorkflowSnapshot());
      setProofSnapshot(buildMiddleEastCorridorProof(8));
      setSchoolSnapshot(null);
      return () => {
        cancelled = true;
      };
    }

    if (pathname === '/app/services/school') {
      void buildSchoolTransportSnapshot()
        .then(value => {
          if (!cancelled) setSchoolSnapshot(value);
        })
        .catch(() => {
          if (!cancelled) setSchoolSnapshot(null);
        });

      setBusinessSnapshot(null);
      setServiceSnapshot(null);
      setProofSnapshot(null);
      return () => {
        cancelled = true;
      };
    }

    setProofSnapshot(buildMiddleEastCorridorProof(10));
    setBusinessSnapshot(null);
    setSchoolSnapshot(null);
    setServiceSnapshot(null);

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const liveCorridors = routeIntelligence.featuredSignals.slice(0, 5);
  const heroMetrics = useMemo(() => {
    if (pathname === '/app/services/corporate' && businessSnapshot && serviceSnapshot) {
      return [
        {
          label: ar ? 'حسابات عامة' : 'Public accounts',
          value: String(serviceSnapshot.activeAccounts),
          detail: ar ? 'مسارات عامة متكررة' : 'Recurring public lanes',
          accent: CYAN,
        },
        {
          label: ar ? 'إيراد المسار' : 'Lane revenue',
          value: `${serviceSnapshot.monthlyRouteRevenueJod.toFixed(0)} JOD`,
          detail: ar ? 'لكل شهر ممر نشط' : 'Per active corridor month',
          accent: GOLD,
        },
        {
          label: ar ? 'التوفير' : 'Savings',
          value: `${businessSnapshot.estimatedSavingsPercent}%`,
          detail: ar ? 'مقارنة بالتوزيع الفردي المتفرق' : 'Versus fragmented solo dispatch',
          accent: GREEN,
        },
        {
          label: ar ? 'الملكية' : 'Ownership',
          value: `${serviceSnapshot.liveSignal?.routeOwnershipScore ?? businessSnapshot.liquidity.healthScore}/100`,
          detail: ar ? 'ثقة حيّة على المسار' : 'Live confidence on the route',
          accent: BLUE,
        },
      ];
    }

    if (pathname === '/app/services/school' && schoolSnapshot) {
      return [
        {
          label: ar ? 'تغطية الأهل' : 'Guardian coverage',
          value: `${schoolSnapshot.guardianCoveragePercent}%`,
          detail: ar ? 'العائلات واضحة داخل المسار' : 'Families visible in the flow',
          accent: GREEN,
        },
        {
          label: ar ? 'طلاب' : 'Students',
          value: String(schoolSnapshot.students.length),
          detail: ar ? 'قائمة مقاعد متكررة' : 'Recurring seat roster',
          accent: CYAN,
        },
        {
          label: ar ? 'الجاهزية' : 'Readiness',
          value: `${schoolSnapshot.liquidity.healthScore}/100`,
          detail: ar ? 'ثبات انضباط المسار' : 'Consistency of route discipline',
          accent: BLUE,
        },
        {
          label: ar ? 'موجة الصباح' : 'Morning wave',
          value: schoolSnapshot.morningWindow,
          detail: ar ? 'نافذة الانطلاق الأساسية' : 'Primary departure window',
          accent: GOLD,
        },
      ];
    }

    return [
      {
        label: ar ? 'عمليات بحث' : 'Searches',
        value: String(dashboard?.funnel.searched ?? 0),
        detail: ar ? 'اكتشاف مسارات حي' : 'Live route discovery',
        accent: CYAN,
      },
      {
        label: ar ? 'حجوزات' : 'Bookings',
        value: String(dashboard?.funnel.booked ?? 0),
        detail: ar ? 'تحويلات مؤكدة' : 'Confirmed conversions',
        accent: GREEN,
      },
      {
        label: ar ? 'التوفير' : 'Savings',
        value: `${proofSnapshot?.averageSavingsPercent ?? 0}%`,
        detail: ar ? 'ميزة الحركة المشتركة' : 'Shared advantage',
        accent: GOLD,
      },
      {
        label: ar ? 'مسارات مملوكة' : 'Owned lanes',
        value: String(proofSnapshot?.liveOwnedCorridors ?? 0),
        detail: ar ? 'ممرات مدعومة بالإنتاج' : 'Production-backed corridors',
        accent: BLUE,
      },
    ];
  }, [ar, businessSnapshot, dashboard, pathname, proofSnapshot, schoolSnapshot, serviceSnapshot]);

  return (
    <PageShell maxWidth={1120} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow={ar ? 'عمليات واصل' : 'Wasel Operations'}
          icon={displayConfig.icon}
          title={displayConfig.title}
          description={displayConfig.detail}
          accent={displayConfig.accent}
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge
                label={
                  ar
                    ? pathname === '/app/services/corporate'
                      ? 'مسارات متكررة'
                      : 'خريطة ممرات حيّة'
                    : pathname === '/app/services/corporate'
                      ? 'Recurring lanes'
                      : 'Live corridor graph'
                }
                accent={displayConfig.accent}
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: SPACE[3],
                }}
              >
                {heroMetrics.map(item => (
                  <HeroMetric
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    accent={item.accent}
                  />
                ))}
              </div>
              <div
                style={{
                  color: C.textSub,
                  fontFamily: F,
                  fontSize: TYPE.size.sm,
                  lineHeight: TYPE.lineHeight.relaxed,
                }}
              >
                {ar
                  ? 'المسارات الحية، تحويلات الحجز، حركة الطرود، وأحداث النمو مدموجة في سطح تشغيل واحد عشان كل صفحة تشرح نفسها بسرعة.'
                  : 'Live routes, booking conversions, package flow, and growth events are merged into the same operating surface so each page explains itself faster.'}
              </div>
            </div>
          }
        />

        {pathname === '/app/services/corporate' && businessSnapshot && serviceSnapshot ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <StatCard
                label={ar ? 'الصرف الشهري' : 'Monthly spend'}
                value={`${businessSnapshot.monthlyInvoiceJOD.toFixed(0)} JOD`}
                detail={
                  ar
                    ? `${businessSnapshot.recurringDays} أيام تنقل على مسار واحد مُدار.`
                    : `${businessSnapshot.recurringDays} commuting days across one managed lane.`
                }
                color={CYAN}
              />
              <StatCard
                label={ar ? 'توفير عام' : 'Public savings'}
                value={`${businessSnapshot.estimatedSavingsPercent}%`}
                detail={
                  ar
                    ? 'تسعير المسار المشترك يستبدل التعويضات الفردية والتكاسي المتفرقة.'
                    : 'Shared-route pricing is replacing solo reimbursements and fragmented taxis.'
                }
                color={GREEN}
              />
              <StatCard
                label={ar ? 'إيراد مسار الخدمة' : 'Service route revenue'}
                value={`${serviceSnapshot.monthlyRouteRevenueJod.toFixed(0)} JOD`}
                detail={
                  ar
                    ? `${serviceSnapshot.recurringVisitsPerWeek} زيارات متكررة أسبوعياً على نفس الممر.`
                    : `${serviceSnapshot.recurringVisitsPerWeek} recurring visits per week on the same corridor.`
                }
                color={GOLD}
              />
              <StatCard
                label={ar ? 'ملكية المسار الحية' : 'Live route ownership'}
                value={`${serviceSnapshot.liveSignal?.routeOwnershipScore ?? businessSnapshot.liquidity.healthScore}/100`}
                detail={
                  serviceSnapshot.liveSignal
                    ? serviceSnapshot.liveSignal.productionSources.slice(0, 2).join(' | ')
                    : ar
                      ? 'الملكية ترتفع لما المقاعد والطرود وتوقفات الخدمة تقوي نفس المسار.'
                      : 'Ownership rises as seats, packages, and service stops reinforce the same lane.'
                }
                color={BLUE}
              />
            </div>

            <Section title={t('operationsOverviewPage.public_workflow')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.public_rider_snapshot')}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {businessSnapshot.policyHighlights.map(line => (
                      <div
                        key={line}
                        style={{ color: C.textSub, fontSize: '0.8rem', lineHeight: 1.6 }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    {businessSnapshot.employees.slice(0, 4).map(employee => (
                      <div
                        key={employee.id}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.borderFaint}`,
                          background: C.elevated,
                          padding: '12px 13px',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                          {employee.name}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.74rem',
                            marginTop: 4,
                          }}
                        >
                          {employee.department} | {employee.monthlyTrips}{' '}
                          {t('operationsOverviewPage.trips')} {employee.monthlySpendJOD.toFixed(0)}{' '}
                          JOD
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.service_provider_workflow')}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {serviceSnapshot.workflowSteps.map(step => (
                      <div
                        key={step}
                        style={{ color: C.textSub, fontSize: '0.8rem', lineHeight: 1.6 }}
                      >
                        {step}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    {serviceSnapshot.dispatchWindows.map(window => (
                      <div
                        key={window.label}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.borderFaint}`,
                          background: C.elevated,
                          padding: '12px 13px',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                          {window.label}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.74rem',
                            lineHeight: 1.55,
                            marginTop: 4,
                          }}
                        >
                          {window.serviceMix}
                        </div>
                        <div style={{ color: CYAN, fontSize: '0.74rem', marginTop: 6 }}>
                          {window.targetPriceJod} JOD | {window.recommendedPickupPoint}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title={t('operationsOverviewPage.lane_economics')}>
              <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.seat_yield_and_backhauls')}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {businessSnapshot.seatYield.slice(0, 3).map(tier => (
                      <div
                        key={`${tier.seatIndex}-${tier.price}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 10,
                          color: C.textSub,
                          fontSize: '0.8rem',
                        }}
                      >
                        <span>
                          {t('operationsOverviewPage.seat')}
                          {tier.seatIndex}
                        </span>
                        <strong style={{ color: C.text }}>{tier.price.toFixed(2)} JOD</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: GOLD, fontWeight: 800, fontSize: '0.82rem', marginTop: 12 }}>
                    {t('operationsOverviewPage.backhaul_attach_rate')}
                    {serviceSnapshot.packageBackhaulPercent}%
                  </div>
                  <div style={{ color: C.textMuted, fontSize: '0.75rem', marginTop: 6 }}>
                    {t('operationsOverviewPage.invoice_cadence')}
                    {serviceSnapshot.invoiceCadence}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.provider_roster')}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {serviceSnapshot.serviceProviders.map(provider => (
                      <div
                        key={provider.name}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.borderFaint}`,
                          background: C.elevated,
                          padding: '12px 13px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div>
                            <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                              {provider.name}
                            </div>
                            <div
                              style={{
                                color: C.textMuted,
                                fontSize: '0.74rem',
                                marginTop: 4,
                              }}
                            >
                              {provider.specialty}
                            </div>
                          </div>
                          <div style={{ color: CYAN, fontWeight: 800, fontSize: '0.8rem' }}>
                            {provider.utilizationPercent}
                            {t('operationsOverviewPage.utilized')}
                          </div>
                        </div>
                        <div style={{ color: C.textSub, fontSize: '0.75rem', marginTop: 6 }}>
                          {provider.weeklyStops} {t('operationsOverviewPage.weekly_stops')}
                          {provider.serviceLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {proofSnapshot ? (
              <Section title={t('operationsOverviewPage.regional_corridor_proof')}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {proofSnapshot.rows.slice(0, 4).map(row => (
                    <div key={row.id} style={{ ...cardStyle(), padding: '14px 16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ color: C.text, fontWeight: 800 }}>{row.corridor}</div>
                          <div
                            style={{
                              color: C.textMuted,
                              fontSize: '0.74rem',
                              marginTop: 4,
                            }}
                          >
                            {row.regionName} | {row.sourceLine}
                          </div>
                        </div>
                        <div
                          style={{
                            color: row.proofMode === 'live-production' ? GREEN : GOLD,
                            fontWeight: 800,
                            fontSize: '0.8rem',
                          }}
                        >
                          {row.proofMode === 'live-production' ? 'Live production' : 'Launch model'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </>
        ) : null}

        {pathname === '/app/services/school' && schoolSnapshot ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <StatCard
                label={ar ? 'تغطية الأهل' : 'Guardian coverage'}
                value={`${schoolSnapshot.guardianCoveragePercent}%`}
                detail={
                  ar
                    ? 'العائلات داخل مسار التشغيل، مش خارجه.'
                    : 'Families are mapped into the route workflow, not kept outside of it.'
                }
                color={GREEN}
              />
              <StatCard
                label={ar ? 'المركبة المقترحة' : 'Recommended vehicle'}
                value={schoolSnapshot.recommendedVehicle}
                detail={
                  ar
                    ? `${schoolSnapshot.students.length} طلاب على مسار واحد مُدار.`
                    : `${schoolSnapshot.students.length} students on one managed route.`
                }
                color={CYAN}
              />
              <StatCard
                label={ar ? 'نافذة الصباح' : 'Morning window'}
                value={schoolSnapshot.morningWindow}
                detail={
                  ar
                    ? `رجعة العصر: ${schoolSnapshot.afternoonWindow}.`
                    : `Afternoon return: ${schoolSnapshot.afternoonWindow}.`
                }
                color={GOLD}
              />
              <StatCard
                label={ar ? 'جاهزية متكررة' : 'Recurring readiness'}
                value={`${schoolSnapshot.liquidity.healthScore}/100`}
                detail={
                  ar
                    ? 'توزيع المقاعد اليومي وثبات نقاط الاستلام برفعوا ثقة الشبكة.'
                    : 'Daily seat allocation and pickup consistency improve network confidence.'
                }
                color={BLUE}
              />
            </div>

            <Section title={t('operationsOverviewPage.recurring_school_workflow')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.guardian_and_student_roster')}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {schoolSnapshot.students.map(student => (
                      <div
                        key={student.id}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.borderFaint}`,
                          background: C.elevated,
                          padding: '12px 13px',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                          {student.name}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.74rem',
                            marginTop: 4,
                          }}
                        >
                          {student.grade} |{' '}
                          {student.guardians.map(guardian => guardian.name).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    {t('operationsOverviewPage.safety_and_route_discipline')}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {schoolSnapshot.safetyChecklist.map(line => (
                      <div
                        key={line}
                        style={{ color: C.textSub, fontSize: '0.8rem', lineHeight: 1.6 }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    {schoolSnapshot.operatingDays.map(day => (
                      <div
                        key={day}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: C.textSub,
                          fontSize: '0.78rem',
                        }}
                      >
                        <span>{day}</span>
                        <strong style={{ color: C.text }}>{t('common.active')}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </>
        ) : null}

        {pathname !== '/app/services/corporate' && pathname !== '/app/services/school' ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}
            >
              <StatCard
                label={ar ? 'عمليات بحث' : 'Searches'}
                value={String(dashboard?.funnel.searched ?? 0)}
                detail={
                  ar
                    ? 'طلب ركاب حي داخل اختيار المسار.'
                    : 'Live rider demand flowing into route selection.'
                }
                color={CYAN}
              />
              <StatCard
                label={ar ? 'حجوزات' : 'Bookings'}
                value={String(dashboard?.funnel.booked ?? 0)}
                detail={
                  ar
                    ? 'تحويلات مسار مؤكدة من خريطة الحركة النشطة.'
                    : 'Confirmed route conversions from the active movement graph.'
                }
                color={GREEN}
              />
              <StatCard
                label={ar ? 'متوسط التوفير' : 'Average savings'}
                value={`${proofSnapshot?.averageSavingsPercent ?? 0}%`}
                detail={
                  ar
                    ? 'ميزة سعر المسار المشترك مقارنة ببدائل الطلب العامة.'
                    : 'Shared-route price advantage versus generic on-demand alternatives.'
                }
                color={GOLD}
              />
              <StatCard
                label={ar ? 'ممرات مملوكة حياً' : 'Live-owned corridors'}
                value={String(proofSnapshot?.liveOwnedCorridors ?? 0)}
                detail={
                  ar
                    ? 'مسارات أردنية مدعومة بإشارات إنتاج الآن.'
                    : 'Jordan lanes backed by production signals right now.'
                }
                color={BLUE}
              />
            </div>

            <Section title={t('operationsOverviewPage.live_corridor_leaders')}>
              <div style={{ display: 'grid', gap: 10 }}>
                {liveCorridors.map(signal => (
                  <div key={signal.id} style={cardStyle()}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ color: C.text, fontWeight: 800 }}>{signal.label}</div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.74rem',
                            marginTop: 4,
                          }}
                        >
                          {signal.productionSources.slice(0, 3).join(' | ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: CYAN, fontWeight: 900 }}>
                          {signal.priceQuote.finalPriceJod} JOD
                        </div>
                        <div style={{ color: C.textMuted, fontSize: '0.72rem' }}>
                          {t('operationsOverviewPage.owns')}
                          {signal.routeOwnershipScore}/100
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      {[
                        {
                          label: 'Demand score',
                          value: `${signal.forecastDemandScore}/100`,
                        },
                        {
                          label: 'Seat fill',
                          value: `${signal.seatUtilizationPercent}%`,
                        },
                        {
                          label: 'Price pressure',
                          value: signal.pricePressure,
                        },
                        {
                          label: 'Next wave',
                          value: signal.nextWaveWindow,
                        },
                      ].map(metric => (
                        <div
                          key={metric.label}
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.borderFaint}`,
                            background: C.elevated,
                            padding: '10px 11px',
                          }}
                        >
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>
                            {metric.label}
                          </div>
                          <div
                            style={{
                              color: C.text,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              marginTop: 5,
                            }}
                          >
                            {metric.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        color: C.textSub,
                        fontSize: '0.78rem',
                        lineHeight: 1.6,
                        marginTop: 10,
                      }}
                    >
                      {signal.recommendedReason}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {proofSnapshot ? (
              <Section title={t('operationsOverviewPage.middle_east_corridor_proof')}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {proofSnapshot.rows.map(row => (
                    <div key={row.id} style={cardStyle()}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ color: C.text, fontWeight: 800 }}>{row.corridor}</div>
                          <div
                            style={{
                              color: C.textMuted,
                              fontSize: '0.74rem',
                              marginTop: 4,
                            }}
                          >
                            {row.regionName} | {row.launchStatus} |{' '}
                            {row.proofMode === 'live-production'
                              ? 'Live production'
                              : 'Launch model'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: GREEN, fontWeight: 900 }}>
                            {row.savingsPercent}
                            {t('operationsOverviewPage.cheaper')}
                          </div>
                          <div style={{ color: C.textMuted, fontSize: '0.72rem' }}>
                            {t('operationsOverviewPage.match')}
                            {row.predictedMatchMinutes} {t('operationsOverviewPage.min_vs')}
                            {row.benchmarkMatchMinutes} {t('services.publicBus.minutes')}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.borderFaint}`,
                            background: C.elevated,
                            padding: '10px 11px',
                          }}
                        >
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>Wasel</div>
                          <div
                            style={{
                              color: C.text,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              marginTop: 5,
                            }}
                          >
                            {row.waselSharedPriceJod} JOD
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.borderFaint}`,
                            background: C.elevated,
                            padding: '10px 11px',
                          }}
                        >
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>
                            {t('operationsOverviewPage.benchmark')}
                          </div>
                          <div
                            style={{
                              color: C.text,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              marginTop: 5,
                            }}
                          >
                            {row.benchmarkPriceJod} JOD
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.borderFaint}`,
                            background: C.elevated,
                            padding: '10px 11px',
                          }}
                        >
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>
                            {t('operationsOverviewPage.ownership')}
                          </div>
                          <div
                            style={{
                              color: C.text,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              marginTop: 5,
                            }}
                          >
                            {row.ownershipScore}/100
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 14,
                            border: `1px solid ${C.borderFaint}`,
                            background: C.elevated,
                            padding: '10px 11px',
                          }}
                        >
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>
                            {t('operationsOverviewPage.mode')}
                          </div>
                          <div
                            style={{
                              color: row.proofMode === 'live-production' ? GREEN : GOLD,
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              marginTop: 5,
                            }}
                          >
                            {row.proofMode === 'live-production' ? 'Live' : 'Launch'}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          color: C.textSub,
                          fontSize: '0.78rem',
                          lineHeight: 1.6,
                          marginTop: 12,
                        }}
                      >
                        {row.evidenceLine}
                      </div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.73rem',
                          lineHeight: 1.6,
                          marginTop: 6,
                        }}
                      >
                        {row.sourceLine}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title={t('operationsOverviewPage.service_mix')}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <StatCard
                  label={ar ? 'رحلات' : 'Rides'}
                  value={String(dashboard?.serviceMix.rides ?? 0)}
                  detail={
                    ar
                      ? 'حركة الناس تقوي خريطة المسارات.'
                      : 'People movement reinforcing the route graph.'
                  }
                  color={CYAN}
                />
                <StatCard
                  label={ar ? 'طرود' : 'Packages'}
                  value={String(dashboard?.serviceMix.packages ?? 0)}
                  detail={
                    ar
                      ? 'بضائع تتحرك على عرض متاح أصلاً.'
                      : 'Goods moving on already-available supply.'
                  }
                  color={GOLD}
                />
                <StatCard
                  label={ar ? 'دعوات' : 'Referrals'}
                  value={String(dashboard?.serviceMix.referrals ?? 0)}
                  detail={
                    ar
                      ? 'أثر شبكة يعمّق الحركة المتكررة.'
                      : 'Network effects that deepen recurring movement.'
                  }
                  color={GREEN}
                />
                <StatCard
                  label={ar ? 'الإيراد' : 'Revenue'}
                  value={`${(dashboard?.revenueJod ?? 0).toFixed(0)} JOD`}
                  detail={
                    ar
                      ? 'قيمة محققة من الحركة المشتركة عبر الخدمات.'
                      : 'Captured value from shared movement across services.'
                  }
                  color={BLUE}
                />
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
