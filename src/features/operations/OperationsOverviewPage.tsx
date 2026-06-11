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
  const { language } = useLanguage();
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
          label: 'Public accounts',
          value: String(serviceSnapshot.activeAccounts),
          detail: 'Recurring public lanes',
          accent: CYAN,
        },
        {
          label: 'Lane revenue',
          value: `${serviceSnapshot.monthlyRouteRevenueJod.toFixed(0)} JOD`,
          detail: 'Per active corridor month',
          accent: GOLD,
        },
        {
          label: 'Savings',
          value: `${businessSnapshot.estimatedSavingsPercent}%`,
          detail: 'Versus fragmented solo dispatch',
          accent: GREEN,
        },
        {
          label: 'Ownership',
          value: `${serviceSnapshot.liveSignal?.routeOwnershipScore ?? businessSnapshot.liquidity.healthScore}/100`,
          detail: 'Live confidence on the route',
          accent: BLUE,
        },
      ];
    }

    if (pathname === '/app/services/school' && schoolSnapshot) {
      return [
        {
          label: 'Guardian coverage',
          value: `${schoolSnapshot.guardianCoveragePercent}%`,
          detail: 'Families visible in the flow',
          accent: GREEN,
        },
        {
          label: 'Students',
          value: String(schoolSnapshot.students.length),
          detail: 'Recurring seat roster',
          accent: CYAN,
        },
        {
          label: 'Readiness',
          value: `${schoolSnapshot.liquidity.healthScore}/100`,
          detail: 'Consistency of route discipline',
          accent: BLUE,
        },
        {
          label: 'Morning wave',
          value: schoolSnapshot.morningWindow,
          detail: 'Primary departure window',
          accent: GOLD,
        },
      ];
    }

    return [
      {
        label: 'Searches',
        value: String(dashboard?.funnel.searched ?? 0),
        detail: 'Live route discovery',
        accent: CYAN,
      },
      {
        label: 'Bookings',
        value: String(dashboard?.funnel.booked ?? 0),
        detail: 'Confirmed conversions',
        accent: GREEN,
      },
      {
        label: 'Savings',
        value: `${proofSnapshot?.averageSavingsPercent ?? 0}%`,
        detail: 'Shared advantage',
        accent: GOLD,
      },
      {
        label: 'Owned lanes',
        value: String(proofSnapshot?.liveOwnedCorridors ?? 0),
        detail: 'Production-backed corridors',
        accent: BLUE,
      },
    ];
  }, [businessSnapshot, dashboard, pathname, proofSnapshot, schoolSnapshot, serviceSnapshot]);

  return (
    <PageShell maxWidth={1120} dir={ar ? 'rtl' : 'ltr'}>
      <div style={{ paddingInline: SPACE[4] }}>
        <PageHero
          eyebrow="Wasel Operations"
          icon={config.icon}
          title={config.title}
          description={config.detail}
          accent={config.accent}
          aside={
            <div style={{ display: 'grid', gap: SPACE[3] }}>
              <StatusBadge
                label={
                  pathname === '/app/services/corporate' ? 'Recurring lanes' : 'Live corridor graph'
                }
                accent={config.accent}
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
                Live routes, booking conversions, package flow, and growth events are merged into
                the same operating surface so each page explains itself faster.
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
                label="Monthly spend"
                value={`${businessSnapshot.monthlyInvoiceJOD.toFixed(0)} JOD`}
                detail={`${businessSnapshot.recurringDays} commuting days across one managed lane.`}
                color={CYAN}
              />
              <StatCard
                label="Public savings"
                value={`${businessSnapshot.estimatedSavingsPercent}%`}
                detail="Shared-route pricing is replacing solo reimbursements and fragmented taxis."
                color={GREEN}
              />
              <StatCard
                label="Service route revenue"
                value={`${serviceSnapshot.monthlyRouteRevenueJod.toFixed(0)} JOD`}
                detail={`${serviceSnapshot.recurringVisitsPerWeek} recurring visits per week on the same corridor.`}
                color={GOLD}
              />
              <StatCard
                label="Live route ownership"
                value={`${serviceSnapshot.liveSignal?.routeOwnershipScore ?? businessSnapshot.liquidity.healthScore}/100`}
                detail={
                  serviceSnapshot.liveSignal
                    ? serviceSnapshot.liveSignal.productionSources.slice(0, 2).join(' | ')
                    : 'Ownership rises as seats, packages, and service stops reinforce the same lane.'
                }
                color={BLUE}
              />
            </div>

            <Section title="Public Workflow">
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    Public rider snapshot
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
                    {businessSnapshot.publicRiders.slice(0, 4).map(rider => (
                      <div
                        key={rider.id}
                        style={{
                          borderRadius: 14,
                          border: `1px solid ${C.borderFaint}`,
                          background: C.elevated,
                          padding: '12px 13px',
                        }}
                      >
                        <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                          {rider.name}
                        </div>
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.74rem',
                            marginTop: 4,
                          }}
                        >
                          {rider.segment} | {rider.monthlyTrips} trips |{' '}
                          {rider.monthlySpendJOD.toFixed(0)} JOD
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    Service-provider workflow
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

            <Section title="Lane Economics">
              <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    Seat yield and backhauls
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
                        <span>Seat {tier.seatIndex}</span>
                        <strong style={{ color: C.text }}>{tier.price.toFixed(2)} JOD</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: GOLD, fontWeight: 800, fontSize: '0.82rem', marginTop: 12 }}>
                    Backhaul attach rate: {serviceSnapshot.packageBackhaulPercent}%
                  </div>
                  <div style={{ color: C.textMuted, fontSize: '0.75rem', marginTop: 6 }}>
                    Invoice cadence: {serviceSnapshot.invoiceCadence}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    Provider roster
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
                            {provider.utilizationPercent}% utilized
                          </div>
                        </div>
                        <div style={{ color: C.textSub, fontSize: '0.75rem', marginTop: 6 }}>
                          {provider.weeklyStops} weekly stops | {provider.serviceLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {proofSnapshot ? (
              <Section title="Regional Corridor Proof">
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
                label="Guardian coverage"
                value={`${schoolSnapshot.guardianCoveragePercent}%`}
                detail="Families are mapped into the route workflow, not kept outside of it."
                color={GREEN}
              />
              <StatCard
                label="Recommended vehicle"
                value={schoolSnapshot.recommendedVehicle}
                detail={`${schoolSnapshot.students.length} students on one managed route.`}
                color={CYAN}
              />
              <StatCard
                label="Morning window"
                value={schoolSnapshot.morningWindow}
                detail={`Afternoon return: ${schoolSnapshot.afternoonWindow}.`}
                color={GOLD}
              />
              <StatCard
                label="Recurring readiness"
                value={`${schoolSnapshot.liquidity.healthScore}/100`}
                detail="Daily seat allocation and pickup consistency improve network confidence."
                color={BLUE}
              />
            </div>

            <Section title="Recurring School Workflow">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
                    Guardian and student roster
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
                    Safety and route discipline
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
                        <strong style={{ color: C.text }}>Active</strong>
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
                label="Searches"
                value={String(dashboard?.funnel.searched ?? 0)}
                detail="Live rider demand flowing into route selection."
                color={CYAN}
              />
              <StatCard
                label="Bookings"
                value={String(dashboard?.funnel.booked ?? 0)}
                detail="Confirmed route conversions from the active movement graph."
                color={GREEN}
              />
              <StatCard
                label="Average savings"
                value={`${proofSnapshot?.averageSavingsPercent ?? 0}%`}
                detail="Shared-route price advantage versus generic on-demand alternatives."
                color={GOLD}
              />
              <StatCard
                label="Live-owned corridors"
                value={String(proofSnapshot?.liveOwnedCorridors ?? 0)}
                detail="Jordan lanes backed by production signals right now."
                color={BLUE}
              />
            </div>

            <Section title="Live Corridor Leaders">
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
                          Owns {signal.routeOwnershipScore}/100
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
              <Section title="Middle East Corridor Proof">
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
                            {row.savingsPercent}% cheaper
                          </div>
                          <div style={{ color: C.textMuted, fontSize: '0.72rem' }}>
                            Match {row.predictedMatchMinutes} min vs {row.benchmarkMatchMinutes} min
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
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>Benchmark</div>
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
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>Ownership</div>
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
                          <div style={{ color: C.textMuted, fontSize: '0.68rem' }}>Mode</div>
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

            <Section title="Service Mix">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                <StatCard
                  label="Rides"
                  value={String(dashboard?.serviceMix.rides ?? 0)}
                  detail="People movement reinforcing the route graph."
                  color={CYAN}
                />
                <StatCard
                  label="Packages"
                  value={String(dashboard?.serviceMix.packages ?? 0)}
                  detail="Goods moving on already-available supply."
                  color={GOLD}
                />
                <StatCard
                  label="Referrals"
                  value={String(dashboard?.serviceMix.referrals ?? 0)}
                  detail="Network effects that deepen recurring movement."
                  color={GREEN}
                />
                <StatCard
                  label="Revenue"
                  value={`${(dashboard?.revenueJod ?? 0).toFixed(0)} JOD`}
                  detail="Captured value from shared movement across services."
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
