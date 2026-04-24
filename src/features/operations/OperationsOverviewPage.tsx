import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Brain, Briefcase, GraduationCap, LineChart, Shield } from 'lucide-react';
import { useLocation } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  buildCorridorCommercialSnapshot,
  type CorridorCommercialSnapshot,
} from '../../services/corridorCommercial';
import {
  buildBusinessAccountSnapshot,
  buildSchoolTransportSnapshot,
  type BusinessAccountSnapshot,
  type SchoolTransportSnapshot,
} from '../../services/corridorOperations';
import { getGrowthDashboard, type GrowthDashboard } from '../../services/growthEngine';
import {
  buildMiddleEastCorridorProof,
  type MiddleEastCorridorProofSnapshot,
} from '../../services/middleEastCorridorProof';
import {
  buildServiceProviderWorkflowSnapshot,
  type ServiceProviderWorkflowSnapshot,
} from '../../services/serviceProviderWorkflows';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';

const BG = 'var(--wasel-service-bg)';
const CARD = 'var(--wasel-service-card)';
const BORD = 'var(--wasel-service-border)';
const CYAN = 'var(--wasel-app-blue)';
const GOLD = 'var(--wasel-app-sky)';
const GREEN = 'var(--wasel-app-teal)';
const BLUE = 'var(--wasel-app-blue-strong)';
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

type SurfaceConfig = {
  title: string;
  detail: string;
  accent: string;
  icon: JSX.Element;
};

const CONFIG: Record<string, SurfaceConfig> = {
  '/app/services/corporate': {
    title: 'Corporate Mobility',
    detail: 'Recurring employee movement, managed billing, service-provider dispatch, and return-lane logistics on one route graph.',
    accent: CYAN,
    icon: <Briefcase size={22} />,
  },
  '/app/services/school': {
    title: 'School Transport',
    detail: 'Guardian visibility, recurring seats, route safety, and predictable pickup windows for daily school operations.',
    accent: GREEN,
    icon: <GraduationCap size={22} />,
  },
  '/app/analytics': {
    title: 'Operations Analytics',
    detail: 'Live corridor ownership, route economics, and proof that Wasel wins key regional lanes better than generic alternatives.',
    accent: GOLD,
    icon: <LineChart size={22} />,
  },
  '/app/mobility-os': {
    title: 'Mobility OS',
    detail: 'A network control layer showing which corridors are building ownership, where the next wave is forming, and how route density compounds.',
    accent: BLUE,
    icon: <Activity size={22} />,
  },
  '/app/ai-intelligence': {
    title: 'AI Intelligence',
    detail: 'Demand prediction, route recommendations, recurring behavior signals, and credit-adjusted movement pricing.',
    accent: CYAN,
    icon: <Brain size={22} />,
  },
  '/app/moderation': {
    title: 'Moderation and Safety',
    detail: 'Trust oversight, route quality control, and operational visibility for high-confidence movement across the network.',
    accent: GREEN,
    icon: <Shield size={22} />,
  },
};

function cardStyle() {
  return {
    background: CARD,
    border: `1px solid ${BORD}`,
    borderRadius: 22,
    padding: '18px 18px 16px',
    boxShadow: 'var(--wasel-shadow-card)',
    backdropFilter: 'blur(18px)',
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
  return (
    <div style={cardStyle()}>
      <div style={{ color, fontWeight: 900, fontSize: '1.3rem', marginBottom: 6 }}>{value}</div>
      <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.84rem' }}>{label}</div>
      <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.76rem', lineHeight: 1.55, marginTop: 6 }}>{detail}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ color: '#EFF6FF', fontWeight: 900, fontSize: '1rem', marginBottom: 10 }}>{title}</div>
      {children}
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
        detail: 'A shared operating surface for the route network, marketplace workflows, and corridor intelligence.',
        accent: CYAN,
        icon: <Activity size={22} />,
      },
    [pathname],
  );

  const [dashboard, setDashboard] = useState<GrowthDashboard | null>(null);
  const [businessSnapshot, setBusinessSnapshot] = useState<BusinessAccountSnapshot | null>(null);
  const [schoolSnapshot, setSchoolSnapshot] = useState<SchoolTransportSnapshot | null>(null);
  const [serviceSnapshot, setServiceSnapshot] = useState<ServiceProviderWorkflowSnapshot | null>(null);
  const [proofSnapshot, setProofSnapshot] = useState<MiddleEastCorridorProofSnapshot | null>(null);
  const [commercialSnapshot, setCommercialSnapshot] = useState<CorridorCommercialSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getGrowthDashboard()
      .then((value) => {
        if (!cancelled) setDashboard(value);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      });
    void buildCorridorCommercialSnapshot()
      .then((value) => {
        if (!cancelled) setCommercialSnapshot(value);
      })
      .catch(() => {
        if (!cancelled) setCommercialSnapshot(null);
      });

    if (pathname === '/app/services/corporate') {
      void buildBusinessAccountSnapshot()
        .then((value: BusinessAccountSnapshot) => {
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
        .then((value: SchoolTransportSnapshot) => {
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

  return (
    <div
      dir={ar ? 'rtl' : 'ltr'}
      style={{ background: BG, color: '#E2E8F0', fontFamily: FONT }}
    >
      <div style={{ display: 'grid', gap: 18 }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${config.accent}18, rgba(255,255,255,0.03))`,
            border: `1px solid ${config.accent}33`,
            borderRadius: 22,
            padding: '24px 22px',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
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
              <div style={{ color: '#EFF6FF', fontSize: '1.35rem', fontWeight: 900 }}>{config.title}</div>
              <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.84rem', lineHeight: 1.6, marginTop: 4 }}>
                {config.detail}
              </div>
            </div>
          </div>
          <div style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.7 }}>
            Wasel is no longer framed as a ride request app here. This surface is driven by live corridor signals, recurring workflow snapshots, and route-level proof.
          </div>
        </div>

        {pathname === '/app/services/corporate' && businessSnapshot && serviceSnapshot ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard label="Monthly invoice" value={`${businessSnapshot.monthlyInvoiceJOD.toFixed(0)} JOD`} detail={`${businessSnapshot.recurringDays} commuting days across one managed lane.`} color={CYAN} />
              <StatCard label="Enterprise savings" value={`${businessSnapshot.estimatedSavingsPercent}%`} detail="Shared-route pricing is replacing solo reimbursements and fragmented taxis." color={GREEN} />
              <StatCard label="Service route revenue" value={`${serviceSnapshot.monthlyRouteRevenueJod.toFixed(0)} JOD`} detail={`${serviceSnapshot.recurringVisitsPerWeek} recurring visits per week on the same corridor.`} color={GOLD} />
              <StatCard label="Live route ownership" value={`${serviceSnapshot.liveSignal?.routeOwnershipScore ?? businessSnapshot.liquidity.healthScore}/100`} detail={serviceSnapshot.liveSignal ? serviceSnapshot.liveSignal.productionSources.slice(0, 2).join(' | ') : 'Ownership rises as seats, packages, and service stops reinforce the same lane.'} color={BLUE} />
            </div>

            <Section title="Business Workflow">
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Managed account snapshot</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {businessSnapshot.policyHighlights.map((line: string) => (
                      <div key={line} style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
                    {businessSnapshot.employees.slice(0, 4).map((employee: BusinessAccountSnapshot['employees'][number]) => (
                      <div key={employee.id} style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>{employee.name}</div>
                        <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>
                          {employee.department} | {employee.monthlyTrips} trips | {employee.monthlySpendJOD.toFixed(0)} JOD
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Service-provider workflow</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {serviceSnapshot.workflowSteps.map((step) => (
                      <div key={step} style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        {step}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                    {serviceSnapshot.dispatchWindows.map((window) => (
                      <div key={window.label} style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>{window.label}</div>
                        <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', lineHeight: 1.55, marginTop: 4 }}>
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
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Seat yield and backhauls</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {businessSnapshot.seatYield.slice(0, 3).map((tier: BusinessAccountSnapshot['seatYield'][number]) => (
                      <div key={`${tier.seatIndex}-${tier.price}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#CBD5E1', fontSize: '0.8rem' }}>
                        <span>Seat {tier.seatIndex}</span>
                        <strong style={{ color: '#EFF6FF' }}>{tier.price.toFixed(2)} JOD</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: GOLD, fontWeight: 800, fontSize: '0.82rem', marginTop: 12 }}>
                    Backhaul attach rate: {serviceSnapshot.packageBackhaulPercent}%
                  </div>
                  <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.75rem', marginTop: 6 }}>
                    Invoice cadence: {serviceSnapshot.invoiceCadence}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Provider roster</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {serviceSnapshot.serviceProviders.map((provider) => (
                      <div key={provider.name} style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>{provider.name}</div>
                            <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>{provider.specialty}</div>
                          </div>
                          <div style={{ color: CYAN, fontWeight: 800, fontSize: '0.8rem' }}>{provider.utilizationPercent}% utilized</div>
                        </div>
                        <div style={{ color: '#CBD5E1', fontSize: '0.75rem', marginTop: 6 }}>
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
                  {proofSnapshot.rows.slice(0, 4).map((row) => (
                    <div key={row.id} style={{ ...cardStyle(), padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#EFF6FF', fontWeight: 800 }}>{row.corridor}</div>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>{row.regionName} | {row.sourceLine}</div>
                        </div>
                        <div style={{ color: row.proofMode === 'live-production' ? GREEN : GOLD, fontWeight: 800, fontSize: '0.8rem' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard label="Guardian coverage" value={`${schoolSnapshot.guardianCoveragePercent}%`} detail="Families are mapped into the route workflow, not kept outside of it." color={GREEN} />
              <StatCard label="Recommended vehicle" value={schoolSnapshot.recommendedVehicle} detail={`${schoolSnapshot.students.length} students on one managed route.`} color={CYAN} />
              <StatCard label="Morning window" value={schoolSnapshot.morningWindow} detail={`Afternoon return: ${schoolSnapshot.afternoonWindow}.`} color={GOLD} />
              <StatCard label="Recurring readiness" value={`${schoolSnapshot.liquidity.healthScore}/100`} detail="Daily seat allocation and pickup consistency improve network confidence." color={BLUE} />
            </div>

            <Section title="Recurring School Workflow">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={cardStyle()}>
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Guardian and student roster</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {schoolSnapshot.students.map((student: SchoolTransportSnapshot['students'][number]) => (
                      <div key={student.id} style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>{student.name}</div>
                        <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>
                          {student.grade} | {student.guardians.map((guardian: SchoolTransportSnapshot['students'][number]['guardians'][number]) => guardian.name).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={cardStyle()}>
                  <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Safety and route discipline</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {schoolSnapshot.safetyChecklist.map((line: string) => (
                      <div key={line} style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.6 }}>{line}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
                    {schoolSnapshot.operatingDays.map((day: string) => (
                      <div key={day} style={{ display: 'flex', justifyContent: 'space-between', color: '#CBD5E1', fontSize: '0.78rem' }}>
                        <span>{day}</span>
                        <strong style={{ color: '#EFF6FF' }}>Active</strong>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard label="Searches" value={String(dashboard?.funnel.searched ?? 0)} detail="Live rider demand flowing into route selection." color={CYAN} />
              <StatCard label="Bookings" value={String(dashboard?.funnel.booked ?? 0)} detail="Confirmed route conversions from the active movement graph." color={GREEN} />
              <StatCard label="Average savings" value={`${proofSnapshot?.averageSavingsPercent ?? 0}%`} detail="Shared-route price advantage versus generic on-demand alternatives." color={GOLD} />
              <StatCard label="Live-owned corridors" value={String(commercialSnapshot?.ownedCorridorContracts ?? proofSnapshot?.liveOwnedCorridors ?? 0)} detail="Jordan lanes backed by production signals and recurring contracts right now." color={BLUE} />
            </div>

            {commercialSnapshot ? (
              <Section title="Commercial Corridor Engine">
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                  <div style={cardStyle()}>
                    <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Recurring corridor contracts</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {commercialSnapshot.contracts.map((contract) => (
                        <div key={contract.id} style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>{contract.title}</div>
                              <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>{contract.corridorLabel} | {contract.operatingModel}</div>
                            </div>
                            <div style={{ color: CYAN, fontWeight: 800, fontSize: '0.8rem' }}>{contract.recurringRevenueJod.toFixed(0)} JOD</div>
                          </div>
                          <div style={{ color: '#CBD5E1', fontSize: '0.75rem', marginTop: 6 }}>
                            Ownership {contract.routeOwnershipScore}/100 | Renewal {new Date(contract.renewalDate).toLocaleDateString('en-US')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={cardStyle()}>
                    <div style={{ color: '#EFF6FF', fontWeight: 800, marginBottom: 10 }}>Commercial next action</div>
                    <div style={{ color: '#CBD5E1', fontSize: '0.8rem', lineHeight: 1.7 }}>
                      {commercialSnapshot.recommendedCommercialAction}
                    </div>
                    <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                      <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>Recurring revenue</div>
                        <div style={{ color: CYAN, fontSize: '0.82rem', marginTop: 6 }}>{commercialSnapshot.totalRecurringRevenueJod.toFixed(0)} JOD across active contract lanes</div>
                      </div>
                      <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>Stakeholder coverage</div>
                        <div style={{ color: GOLD, fontSize: '0.82rem', marginTop: 6 }}>{commercialSnapshot.activeStakeholders} active accounts, guardians, and operators tied to these corridors</div>
                      </div>
                      <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '12px 13px' }}>
                        <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.82rem' }}>Pass coverage</div>
                        <div style={{ color: BLUE, fontSize: '0.82rem', marginTop: 6 }}>{commercialSnapshot.corridorPassCoverage ?? 'No corridor pass pinned yet'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            ) : null}

            <Section title="Live Corridor Leaders">
              <div style={{ display: 'grid', gap: 10 }}>
                {liveCorridors.map((signal) => (
                  <div key={signal.id} style={cardStyle()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: '#EFF6FF', fontWeight: 800 }}>{signal.label}</div>
                        <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>
                          {signal.productionSources.slice(0, 3).join(' | ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: CYAN, fontWeight: 900 }}>{signal.priceQuote.finalPriceJod} JOD</div>
                        <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.72rem' }}>
                          Owns {signal.routeOwnershipScore}/100
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#CBD5E1', fontSize: '0.78rem', lineHeight: 1.6, marginTop: 10 }}>
                      {signal.recommendedReason}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {proofSnapshot ? (
              <Section title="Middle East Corridor Proof">
                <div style={{ display: 'grid', gap: 10 }}>
                  {proofSnapshot.rows.map((row) => (
                    <div key={row.id} style={cardStyle()}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#EFF6FF', fontWeight: 800 }}>{row.corridor}</div>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.74rem', marginTop: 4 }}>
                            {row.regionName} | {row.launchStatus} | {row.proofMode === 'live-production' ? 'Live production' : 'Launch model'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: GREEN, fontWeight: 900 }}>{row.savingsPercent}% cheaper</div>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.72rem' }}>
                            Match {row.predictedMatchMinutes} min vs {row.benchmarkMatchMinutes} min
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
                        <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '10px 11px' }}>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.68rem' }}>Wasel</div>
                          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.8rem', marginTop: 5 }}>{row.waselSharedPriceJod} JOD</div>
                        </div>
                        <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '10px 11px' }}>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.68rem' }}>Benchmark</div>
                          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.8rem', marginTop: 5 }}>{row.benchmarkPriceJod} JOD</div>
                        </div>
                        <div style={{ borderRadius: 14, border: `1px solid ${BORD}`, background: 'rgba(255,255,255,0.03)', padding: '10px 11px' }}>
                          <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.68rem' }}>Ownership</div>
                          <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.8rem', marginTop: 5 }}>{row.ownershipScore}/100</div>
                        </div>
                      </div>
                      <div style={{ color: '#CBD5E1', fontSize: '0.78rem', lineHeight: 1.6, marginTop: 12 }}>{row.evidenceLine}</div>
                      <div style={{ color: 'rgba(148,163,184,0.78)', fontSize: '0.73rem', lineHeight: 1.6, marginTop: 6 }}>{row.sourceLine}</div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="Service Mix">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <StatCard label="Rides" value={String(dashboard?.serviceMix.rides ?? 0)} detail="People movement reinforcing the route graph." color={CYAN} />
                <StatCard label="Packages" value={String(dashboard?.serviceMix.packages ?? 0)} detail="Goods moving on already-available supply." color={GOLD} />
                <StatCard label="Referrals" value={String(dashboard?.serviceMix.referrals ?? 0)} detail="Network effects that deepen recurring movement." color={GREEN} />
                <StatCard label="Revenue" value={`${(dashboard?.revenueJod ?? 0).toFixed(0)} JOD`} detail="Captured value from shared movement across services." color={BLUE} />
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </div>
  );
}
