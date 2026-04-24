import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CarFront,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  TimerReset,
  Users,
} from 'lucide-react';
import {
  ActionButton,
  DataPanel,
  InfoCard,
  PageHeader,
  PageShell,
  StatCard,
} from '../../services/pageComponents';
import { DesignSystem } from '../../services/designSystem';
import {
  useMobilityPipeline,
  type MobilityPipelineStageDrilldown,
  type MobilityPipelineStageTone,
  type MobilityStageId,
} from '../../services/mobilityPipeline';

type Accent = 'cyan' | 'green' | 'gold' | 'purple';
type UnitType = 'ride' | 'package';
type TabKey = 'signal' | 'math' | 'fleet' | 'recovery';

const NODES = [
  {
    id: 'amman',
    name: 'Amman',
    subtitle: 'Core hub',
    x: 46,
    y: 33,
    accent: 'cyan',
    resilience: 0.92,
  },
  {
    id: 'irbid',
    name: 'Irbid',
    subtitle: 'North demand',
    x: 59,
    y: 16,
    accent: 'gold',
    resilience: 0.85,
  },
  {
    id: 'zarqa',
    name: 'Zarqa',
    subtitle: 'Industrial flow',
    x: 70,
    y: 33,
    accent: 'green',
    resilience: 0.82,
  },
  {
    id: 'madaba',
    name: 'Madaba',
    subtitle: 'Connector lane',
    x: 50,
    y: 47,
    accent: 'cyan',
    resilience: 0.81,
  },
  {
    id: 'karak',
    name: 'Karak',
    subtitle: 'South midpoint',
    x: 52,
    y: 66,
    accent: 'gold',
    resilience: 0.79,
  },
  {
    id: 'aqaba',
    name: 'Aqaba',
    subtitle: 'Port sink',
    x: 44,
    y: 95,
    accent: 'green',
    resilience: 0.88,
  },
] as const;

const ROUTES = [
  {
    id: 'r1',
    from: 'amman',
    to: 'irbid',
    distance: 88,
    eta: 62,
    demand: 0.82,
    packageBias: 0.34,
    importance: 0.84,
    phase: 0.12,
    accent: 'cyan',
  },
  {
    id: 'r2',
    from: 'amman',
    to: 'zarqa',
    distance: 26,
    eta: 28,
    demand: 0.76,
    packageBias: 0.42,
    importance: 0.78,
    phase: 0.42,
    accent: 'green',
  },
  {
    id: 'r3',
    from: 'amman',
    to: 'madaba',
    distance: 31,
    eta: 34,
    demand: 0.58,
    packageBias: 0.29,
    importance: 0.6,
    phase: 0.68,
    accent: 'cyan',
  },
  {
    id: 'r4',
    from: 'madaba',
    to: 'karak',
    distance: 111,
    eta: 73,
    demand: 0.61,
    packageBias: 0.38,
    importance: 0.68,
    phase: 1.1,
    accent: 'gold',
  },
  {
    id: 'r5',
    from: 'karak',
    to: 'aqaba',
    distance: 203,
    eta: 112,
    demand: 0.72,
    packageBias: 0.48,
    importance: 0.74,
    phase: 1.56,
    accent: 'green',
  },
  {
    id: 'r6',
    from: 'amman',
    to: 'aqaba',
    distance: 332,
    eta: 235,
    demand: 0.93,
    packageBias: 0.57,
    importance: 0.95,
    phase: 2.04,
    accent: 'gold',
  },
  {
    id: 'r7',
    from: 'irbid',
    to: 'zarqa',
    distance: 79,
    eta: 67,
    demand: 0.53,
    packageBias: 0.31,
    importance: 0.55,
    phase: 2.48,
    accent: 'purple',
  },
] as const;

const UNITS: {
  id: string;
  routeId: string;
  type: UnitType;
  accent: Accent;
  phase: number;
  lane: number;
  speed: number;
  dir: 1 | -1;
}[] = [
  {
    id: 'u1',
    routeId: 'r1',
    type: 'ride',
    accent: 'cyan',
    phase: 0.08,
    lane: -4,
    speed: 0.017,
    dir: 1,
  },
  {
    id: 'u2',
    routeId: 'r1',
    type: 'package',
    accent: 'gold',
    phase: 0.66,
    lane: 4,
    speed: 0.013,
    dir: -1,
  },
  {
    id: 'u3',
    routeId: 'r2',
    type: 'ride',
    accent: 'green',
    phase: 0.22,
    lane: -5,
    speed: 0.021,
    dir: 1,
  },
  {
    id: 'u4',
    routeId: 'r3',
    type: 'ride',
    accent: 'cyan',
    phase: 0.34,
    lane: -4,
    speed: 0.018,
    dir: 1,
  },
  {
    id: 'u5',
    routeId: 'r4',
    type: 'package',
    accent: 'gold',
    phase: 0.58,
    lane: 5,
    speed: 0.011,
    dir: 1,
  },
  {
    id: 'u6',
    routeId: 'r5',
    type: 'ride',
    accent: 'green',
    phase: 0.17,
    lane: -6,
    speed: 0.015,
    dir: 1,
  },
  {
    id: 'u7',
    routeId: 'r6',
    type: 'ride',
    accent: 'cyan',
    phase: 0.52,
    lane: -8,
    speed: 0.014,
    dir: 1,
  },
  {
    id: 'u8',
    routeId: 'r6',
    type: 'package',
    accent: 'gold',
    phase: 0.78,
    lane: 8,
    speed: 0.009,
    dir: -1,
  },
  {
    id: 'u9',
    routeId: 'r7',
    type: 'ride',
    accent: 'purple',
    phase: 0.26,
    lane: -5,
    speed: 0.013,
    dir: 1,
  },
];

const TABS: Record<TabKey, string> = {
  signal: 'Signal Field',
  math: 'Corridor Math',
  fleet: 'Fleet Logic',
  recovery: 'Recovery Mode',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function avg(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function variance(values: number[]) {
  const mean = avg(values);
  return avg(values.map(value => (value - mean) ** 2));
}

function accentColor(accent: Accent) {
  if (accent === 'green') {
    return DesignSystem.colors.green.base;
  }
  if (accent === 'gold') {
    return DesignSystem.colors.gold.base;
  }
  if (accent === 'purple') {
    return DesignSystem.colors.purple.base;
  }
  return DesignSystem.colors.cyan.base;
}

function pipelineAccent(stageId: MobilityStageId) {
  if (stageId === 'demand') {
    return DesignSystem.colors.gold.base;
  }
  if (stageId === 'candidate-vehicles') {
    return DesignSystem.colors.green.base;
  }
  if (stageId === 'scoring') {
    return DesignSystem.colors.purple.base;
  }
  if (stageId === 'matching') {
    return DesignSystem.colors.cyan.base;
  }
  if (stageId === 'assignment') {
    return DesignSystem.colors.accent.strong;
  }
  return DesignSystem.colors.text.muted;
}

function pipelineToneColor(tone: MobilityPipelineStageTone, accent: string) {
  if (tone === 'positive') {
    return accent;
  }
  if (tone === 'attention') {
    return DesignSystem.colors.gold.base;
  }
  return DesignSystem.colors.text.secondary;
}

function formatUpdatedAt(updatedAt: string) {
  const timestamp = new Date(updatedAt);
  if (!Number.isFinite(timestamp.getTime())) {
    return 'unknown';
  }

  return new Intl.DateTimeFormat('en-JO', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp);
}

function buildRouteCurve(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = clamp(dx * 0.22 - dy * 0.08, -12, 12);
  const c1 = {
    x: from.x + dx * 0.24 + bend * 0.18,
    y: from.y + dy * 0.08 - bend * 0.34,
  };
  const c2 = {
    x: from.x + dx * 0.76 - bend * 0.1,
    y: from.y + dy * 0.92 + bend * 0.28,
  };

  return {
    c1,
    c2,
    path: `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`,
  };
}

function bezierPoint(
  from: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;

  return {
    x: mt ** 3 * from.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * to.x,
    y: mt ** 3 * from.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * to.y,
  };
}

function bezierTangent(
  from: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;

  return {
    x:
      3 * mt ** 2 * (c1.x - from.x) +
      6 * mt * t * (c2.x - c1.x) +
      3 * t ** 2 * (to.x - c2.x),
    y:
      3 * mt ** 2 * (c1.y - from.y) +
      6 * mt * t * (c2.y - c1.y) +
      3 * t ** 2 * (to.y - c2.y),
  };
}

export default function MobilityOSPageEnhanced() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<TabKey>('signal');
  const rafRef = useRef<number | null>(null);
  const pipeline = useMobilityPipeline();

  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const loop = () => {
      setTick(prev => (prev + 0.0035) % 1);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [paused]);

  const routeStats = useMemo(() => {
    const nodeMap = Object.fromEntries(NODES.map(node => [node.id, node]));

    return ROUTES.map(route => {
      const fromNode = nodeMap[route.from];
      const toNode = nodeMap[route.to];
      const wave = 0.5 + 0.5 * Math.sin((tick + route.phase) * Math.PI * 2.2);
      const load = clamp(
        route.demand * 0.66 +
          route.importance * 0.22 +
          route.packageBias * 0.12 +
          (wave - 0.5) * 0.22,
        0.12,
        0.98,
      );
      const reliability = clamp(
        ((fromNode.resilience + toNode.resilience) / 2) * 0.76 + (1 - load) * 0.24,
        0.56,
        0.99,
      );
      const speedIndex = clamp(1.24 - load * 0.48 + reliability * 0.15, 0.58, 1.28);
      const packageSync = clamp(
        route.packageBias * 0.58 + wave * 0.22 + reliability * 0.2,
        0.12,
        0.98,
      );
      const score = Math.round(
        clamp(load * 0.38 + reliability * 0.34 + (speedIndex / 1.28) * 0.28, 0, 1) * 100,
      );

      return {
        ...route,
        fromNode,
        toNode,
        load,
        reliability,
        speedIndex,
        packageSync,
        etaLive: Math.round(route.eta / speedIndex),
        score,
      };
    }).sort((a, b) => b.score - a.score);
  }, [tick]);

  const network = useMemo(() => {
    const loads = routeStats.map(route => route.load);
    const reliabilities = routeStats.map(route => route.reliability);
    const speeds = routeStats.map(route => route.speedIndex / 1.28);

    return {
      dispatchIQ: Math.round(
        clamp(
          avg(routeStats.map(route => route.score)) * 0.44 +
            (100 - Math.sqrt(variance(loads)) * 170) * 0.24 +
            avg(speeds) * 100 * 0.32,
          72,
          99,
        ),
      ),
      balance: Math.round(clamp(100 - Math.sqrt(variance(loads)) * 170, 58, 99)),
      resilience: Math.round(avg(reliabilities) * 100),
      throughput: Math.round(
        routeStats.reduce(
          (sum, route) => sum + route.distance * route.speedIndex * (0.62 + route.load * 0.54),
          0,
        ),
      ),
      agentSync: Math.round(
        clamp(
          72 +
            avg(routeStats.map(route => route.packageSync)) * 16 +
            (1 - Math.sqrt(variance(reliabilities))) * 9,
          75,
          98,
        ),
      ),
    };
  }, [routeStats]);

  const hottest = routeStats[0];
  const weakest = [...routeStats].sort((a, b) => a.reliability - b.reliability)[0];
  const updatedAtLabel = useMemo(() => formatUpdatedAt(pipeline.updatedAt), [pipeline.updatedAt]);
  const operatingModelColumns = useMemo(() => {
    const stageById = new Map(
      pipeline.stageDrilldowns.map(
        stage => [stage.id, stage] satisfies [MobilityStageId, MobilityPipelineStageDrilldown],
      ),
    );

    return [
      {
        id: 'intake',
        title: 'Demand Intake',
        description:
          'Open ride and package demand is translated into a real candidate supply pool.',
        icon: <CarFront size={18} color={DesignSystem.colors.green.base} />,
        accent: DesignSystem.colors.green.base,
        stages: [stageById.get('demand'), stageById.get('candidate-vehicles')].filter(
          Boolean,
        ) as MobilityPipelineStageDrilldown[],
      },
      {
        id: 'dispatch',
        title: 'Dispatch Logic',
        description:
          'Scoring and matching determine whether a request is actually dispatchable this cycle.',
        icon: <Brain size={18} color={DesignSystem.colors.cyan.base} />,
        accent: DesignSystem.colors.cyan.base,
        stages: [stageById.get('scoring'), stageById.get('matching')].filter(
          Boolean,
        ) as MobilityPipelineStageDrilldown[],
      },
      {
        id: 'execution',
        title: 'Execution Loop',
        description: 'Assignments and rebalancing convert decisions into live operational moves.',
        icon: <Gauge size={18} color={DesignSystem.colors.purple.base} />,
        accent: DesignSystem.colors.purple.base,
        stages: [stageById.get('assignment'), stageById.get('rebalancing')].filter(
          Boolean,
        ) as MobilityPipelineStageDrilldown[],
      },
    ];
  }, [pipeline.stageDrilldowns]);

  const stats = [
    {
      label: 'Pending demand',
      value: `${pipeline.metrics.pendingDemand}`,
      detail: 'Ride and package requests that still need supply or a better corridor fit.',
      accent: DesignSystem.colors.gold.base,
    },
    {
      label: 'Dispatchable vehicles',
      value: `${pipeline.metrics.dispatchableVehicles}`,
      detail: 'Vehicles with spare seat or parcel capacity that can still take work.',
      accent: DesignSystem.colors.green.base,
    },
    {
      label: 'Match rate',
      value: `${pipeline.metrics.matchRatePercent}%`,
      detail: 'Share of pending demand clearing the dispatch threshold in the current cycle.',
      accent: DesignSystem.colors.cyan.base,
    },
    {
      label: 'Rebalance moves',
      value: `${pipeline.metrics.rebalancingCount}`,
      detail: 'Idle vehicles that should shift before the next corridor demand wave lands.',
      accent: DesignSystem.colors.purple.base,
    },
  ];

  const modeMeta: Record<
    TabKey,
    { eyebrow: string; title: string; description: string; accent: string }
  > = {
    signal: {
      eyebrow: 'Live signal field',
      title: 'One map that reads like a command theater, not a generic widget.',
      description:
        'Demand, moving supply, and corridor pressure all stay readable at once so operators can trust the live field at first glance.',
      accent: DesignSystem.colors.cyan.base,
    },
    math: {
      eyebrow: 'Corridor math',
      title: 'Scoring and reliability now sit directly on the routes they influence.',
      description:
        'High-value lanes stay bright, weak links stay obvious, and dispatch quality remains visible without leaving the live field.',
      accent: DesignSystem.colors.accent.strong,
    },
    fleet: {
      eyebrow: 'Fleet logic',
      title: 'Ride supply is staged as an active circulation system instead of static dots.',
      description:
        'Vehicles, package sync, and seat availability all read from the same movement language, so rebalancing decisions feel immediate.',
      accent: DesignSystem.colors.green.base,
    },
    recovery: {
      eyebrow: 'Recovery mode',
      title: 'Risk is elevated without turning the whole map into alarm noise.',
      description:
        'The weakest corridors, queued rebalances, and recovery posture are surfaced in one consistent operating layer.',
      accent: DesignSystem.colors.purple.base,
    },
  };

  const currentMode = modeMeta[tab];
  const packageLeader = [...routeStats].sort((a, b) => b.packageSync - a.packageSync)[0];
  const featuredRouteIds = [hottest.id, weakest.id, routeStats[1]?.id, packageLeader?.id];
  const visibleUnits = UNITS.filter(
    unit =>
      tab === 'signal' ||
      (tab === 'fleet' && unit.type === 'ride') ||
      (tab === 'recovery' && unit.type === 'package') ||
      tab === 'math',
  );
  const corridorCards = routeStats.slice(0, 4).map((route, index) => {
    const emphasis =
      route.id === hottest.id
        ? 'Peak load corridor'
        : route.id === weakest.id
          ? 'Recovery watch'
          : route.id === packageLeader?.id
            ? 'Package sync lead'
            : index === 0
              ? 'Top dispatch lane'
              : 'Live corridor';

    return {
      ...route,
      emphasis,
      accent:
        route.id === weakest.id
          ? DesignSystem.colors.purple.base
          : route.id === packageLeader?.id
            ? DesignSystem.colors.gold.base
            : accentColor(route.accent),
    };
  });

  return (
    <PageShell>
      <PageHeader
        badge="Mobility OS / Dispatch Pipeline"
        title="Demand, candidate vehicles, scoring, matching, assignment, and rebalancing on one control surface."
        description={`This baseline now reads Mobility OS as an operating model instead of a generic dashboard. Demand alerts, ride bookings, packages, posted rides, and corridor signals all feed the same dispatch mental model. Source blend: ${pipeline.source}. Updated ${updatedAtLabel}.`}
        formulas={[
          'Demand -> Candidate Vehicles -> Scoring -> Matching -> Assignment -> Rebalancing',
          'score = 0.40 route + 0.22 capacity + 0.16 service + 0.14 proximity + 0.08 demand - congestion',
          `dispatch >= ${pipeline.thresholds.dispatchMatchScore} / viable >= ${pipeline.thresholds.viableCandidateScore}`,
        ]}
        actions={
          <>
            <ActionButton
              label={paused ? 'Resume Field' : 'Pause Field'}
              onClick={() => setPaused(value => !value)}
              variant={paused ? 'outline' : 'primary'}
              icon={paused ? <Play size={16} /> : <Pause size={16} />}
            />
            <ActionButton
              label="Reset Simulation"
              onClick={() => setTick(0)}
              variant="ghost"
              icon={<RotateCcw size={16} />}
            />
          </>
        }
      />

      <section style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(Object.keys(TABS) as TabKey[]).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: DesignSystem.radius.full,
              border: `1px solid ${tab === key ? 'var(--wasel-button-primary-border-strong)' : DesignSystem.colors.border.base}`,
              background:
                tab === key
                  ? 'var(--wasel-button-primary-soft-strong)'
                  : 'var(--wasel-panel-muted)',
              color:
                tab === key ? DesignSystem.colors.accent.strong : DesignSystem.colors.text.muted,
              cursor: 'pointer',
              fontWeight: DesignSystem.typography.fontWeight.black,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: DesignSystem.typography.fontSize.xs,
              transition: 'all 0.2s ease',
            }}
          >
            {TABS[key]}
          </button>
        ))}
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}
      >
        {pipeline.stages.map(stage => {
          const accent = pipelineAccent(stage.id);
          return (
            <article
              key={stage.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '16px 16px 14px',
                borderRadius: 20,
                border: `1px solid ${accent}28`,
                background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 9%, rgb(255 255 255 / 0.03)), rgb(255 255 255 / 0.02)), var(--wasel-service-card)`,
                boxShadow: `0 16px 34px ${accent}12`,
              }}
            >
              <div
                style={{
                  fontSize: DesignSystem.typography.fontSize.xs,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: accent,
                  fontWeight: DesignSystem.typography.fontWeight.black,
                }}
              >
                {stage.label}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: DesignSystem.typography.fontSize['3xl'],
                  lineHeight: 1,
                  fontWeight: DesignSystem.typography.fontWeight.black,
                }}
              >
                {stage.count}
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: DesignSystem.colors.text.secondary,
                  lineHeight: 1.58,
                  fontSize: DesignSystem.typography.fontSize.sm,
                }}
              >
                {stage.summary}
              </div>
            </article>
          );
        })}
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        {operatingModelColumns.map(column => (
          <DataPanel key={column.id} title={column.title} icon={column.icon} accent={column.accent}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div
                style={{
                  color: DesignSystem.colors.text.secondary,
                  lineHeight: 1.7,
                  fontSize: DesignSystem.typography.fontSize.sm,
                }}
              >
                {column.description}
              </div>

              {column.stages.map(stage => {
                const accent = pipelineAccent(stage.id);
                return (
                  <article
                    key={stage.id}
                    style={{
                      padding: '14px 14px 12px',
                      borderRadius: 18,
                      border: `1px solid ${accent}24`,
                      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, rgb(255 255 255 / 0.03)), rgb(255 255 255 / 0.02))`,
                      display: 'grid',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div
                        style={{
                          fontSize: DesignSystem.typography.fontSize.xs,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: accent,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        {stage.label}
                      </div>
                      <div
                        style={{
                          fontWeight: DesignSystem.typography.fontWeight.bold,
                          color: DesignSystem.colors.text.primary,
                        }}
                      >
                        {stage.headline}
                      </div>
                      <div
                        style={{
                          color: DesignSystem.colors.text.secondary,
                          lineHeight: 1.6,
                          fontSize: DesignSystem.typography.fontSize.sm,
                        }}
                      >
                        {stage.explanation}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                      {stage.items.length > 0 ? (
                        stage.items.map(item => {
                          const metricColor = pipelineToneColor(item.tone, accent);
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 12,
                                padding: '10px 12px',
                                borderRadius: 14,
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${metricColor}22`,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: DesignSystem.typography.fontWeight.bold,
                                    color: DesignSystem.colors.text.primary,
                                  }}
                                >
                                  {item.title}
                                </div>
                                <div
                                  style={{
                                    marginTop: 4,
                                    color: DesignSystem.colors.text.muted,
                                    lineHeight: 1.55,
                                    fontSize: DesignSystem.typography.fontSize.xs,
                                  }}
                                >
                                  {item.detail}
                                </div>
                              </div>
                              <div
                                style={{
                                  flexShrink: 0,
                                  minWidth: 64,
                                  textAlign: 'right',
                                  fontWeight: DesignSystem.typography.fontWeight.black,
                                  color: metricColor,
                                }}
                              >
                                {item.metric}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 14,
                            border: `1px solid ${DesignSystem.colors.border.base}`,
                            background: 'rgba(255,255,255,0.03)',
                            color: DesignSystem.colors.text.muted,
                            fontSize: DesignSystem.typography.fontSize.xs,
                            lineHeight: 1.6,
                          }}
                        >
                          No stage items are active in this cycle.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </DataPanel>
        ))}
      </section>

      <section>
        <DataPanel
          title="Mobility OS live command theater"
          icon={<Activity size={18} color={currentMode.accent} />}
          accent={currentMode.accent}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 28,
              border: `1px solid ${DesignSystem.colors.border.strong}`,
              background: `
                radial-gradient(circle at 12% 18%, color-mix(in srgb, ${currentMode.accent} 22%, transparent), transparent 26%),
                radial-gradient(circle at 84% 14%, color-mix(in srgb, ${DesignSystem.colors.accent.strong} 18%, transparent), transparent 30%),
                radial-gradient(circle at 74% 86%, color-mix(in srgb, ${DesignSystem.colors.purple.base} 16%, transparent), transparent 24%),
                linear-gradient(155deg, rgba(8,16,27,0.98) 0%, rgba(10,19,31,0.98) 46%, rgba(13,22,34,0.96) 100%)
              `,
              boxShadow: `0 24px 70px ${currentMode.accent}18`,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.14,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gap: 20,
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                padding: 24,
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    {[
                      {
                        label: currentMode.eyebrow,
                        color: currentMode.accent,
                      },
                      {
                        label: `${pipeline.metrics.pendingDemand} open requests`,
                        color: DesignSystem.colors.gold.base,
                      },
                      {
                        label: `${pipeline.metrics.dispatchableVehicles} dispatchable vehicles`,
                        color: DesignSystem.colors.green.base,
                      },
                      {
                        label: `${pipeline.metrics.rebalancingCount} rebalances queued`,
                        color: DesignSystem.colors.purple.base,
                      },
                    ].map(item => (
                      <div
                        key={item.label}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 34,
                          padding: '0 14px',
                          borderRadius: 999,
                          border: `1px solid ${item.color}30`,
                          background: 'rgba(255,255,255,0.05)',
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          fontWeight: DesignSystem.typography.fontWeight.bold,
                          backdropFilter: 'blur(16px)',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: item.color,
                            boxShadow: `0 0 18px ${item.color}80`,
                          }}
                        />
                        {item.label}
                      </div>
                    ))}
                  </div>

                  <div style={{ maxWidth: 720 }}>
                    <div
                      style={{
                        color: currentMode.accent,
                        fontSize: DesignSystem.typography.fontSize.xs,
                        fontWeight: DesignSystem.typography.fontWeight.black,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Jordan Corridor Live Map
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        fontFamily: DesignSystem.typography.fontFamily.display,
                        fontSize: DesignSystem.typography.fontSize['4xl'],
                        lineHeight: 0.98,
                        letterSpacing: '-0.04em',
                        color: DesignSystem.colors.text.primary,
                      }}
                    >
                      {currentMode.title}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        color: DesignSystem.colors.text.secondary,
                        lineHeight: 1.72,
                        fontSize: DesignSystem.typography.fontSize.base,
                        maxWidth: 660,
                      }}
                    >
                      {currentMode.description} Source blend: {pipeline.source}. Updated{' '}
                      {updatedAtLabel}. Dispatch threshold stays at{' '}
                      {pipeline.thresholds.dispatchMatchScore}+ with{' '}
                      {pipeline.metrics.viableCandidatePairs} viable candidate pairs live.
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
                    }}
                  >
                    {[
                      {
                        label: 'Dispatch IQ',
                        value: `${network.dispatchIQ}`,
                        detail: 'Operator confidence',
                        accent: DesignSystem.colors.cyan.base,
                      },
                      {
                        label: 'Corridor balance',
                        value: `${network.balance}%`,
                        detail: 'Demand spread stability',
                        accent: DesignSystem.colors.green.base,
                      },
                      {
                        label: 'Recovery posture',
                        value: `${network.resilience}%`,
                        detail: 'Reliability protection',
                        accent: DesignSystem.colors.gold.base,
                      },
                      {
                        label: 'Throughput',
                        value: `${network.throughput}`,
                        detail: 'Weighted corridor km',
                        accent: DesignSystem.colors.purple.base,
                      },
                    ].map(metric => (
                      <article
                        key={metric.label}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 20,
                          border: `1px solid ${metric.accent}28`,
                          background:
                            'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                          boxShadow: `0 16px 36px ${metric.accent}16`,
                        }}
                      >
                        <div
                          style={{
                            color: DesignSystem.colors.text.muted,
                            fontSize: DesignSystem.typography.fontSize.xs,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            fontWeight: DesignSystem.typography.fontWeight.black,
                          }}
                        >
                          {metric.label}
                        </div>
                        <div
                          style={{
                            marginTop: 10,
                            color: DesignSystem.colors.text.primary,
                            fontSize: DesignSystem.typography.fontSize['3xl'],
                            lineHeight: 1,
                            fontWeight: DesignSystem.typography.fontWeight.black,
                          }}
                        >
                          {metric.value}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            color: DesignSystem.colors.text.secondary,
                            fontSize: DesignSystem.typography.fontSize.sm,
                          }}
                        >
                          {metric.detail}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    position: 'relative',
                    minHeight: 620,
                    borderRadius: 28,
                    overflow: 'hidden',
                    border: `1px solid ${DesignSystem.colors.border.strong}`,
                    background:
                      'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.06), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      right: 16,
                      zIndex: 2,
                      display: 'flex',
                      gap: 10,
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gap: 8,
                        padding: '14px 16px',
                        borderRadius: 20,
                        border: `1px solid ${currentMode.accent}28`,
                        background: 'rgba(6,13,22,0.66)',
                        backdropFilter: 'blur(18px)',
                        minWidth: 240,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: currentMode.accent,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <Activity size={14} color={currentMode.accent} />
                        Live mode / {TABS[tab]}
                      </div>
                      <div
                        style={{
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.xl,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                          lineHeight: 1.1,
                        }}
                      >
                        {hottest.fromNode.name} {'->'} {hottest.toNode.name} is leading the field.
                      </div>
                      <div
                        style={{
                          color: DesignSystem.colors.text.secondary,
                          fontSize: DesignSystem.typography.fontSize.sm,
                          lineHeight: 1.6,
                        }}
                      >
                        Load {Math.round(hottest.load * 100)}% / live ETA {hottest.etaLive} min /
                        score {hottest.score}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gap: 8,
                        minWidth: 240,
                        padding: '14px 16px',
                        borderRadius: 20,
                        border: `1px solid ${DesignSystem.colors.border.base}`,
                        background: 'rgba(6,13,22,0.66)',
                        backdropFilter: 'blur(18px)',
                      }}
                    >
                      {[
                        {
                          label: 'Live phase',
                          value: `${(tick * 100).toFixed(1)}%`,
                          accent: DesignSystem.colors.cyan.base,
                        },
                        {
                          label: 'Agent sync',
                          value: `${network.agentSync}%`,
                          accent: DesignSystem.colors.gold.base,
                        },
                        {
                          label: 'Watch corridor',
                          value: `${weakest.fromNode.name} -> ${weakest.toNode.name}`,
                          accent: DesignSystem.colors.purple.base,
                        },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 12,
                            alignItems: 'center',
                            color: DesignSystem.colors.text.secondary,
                            fontSize: DesignSystem.typography.fontSize.xs,
                          }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span
                              aria-hidden="true"
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 999,
                                background: item.accent,
                                boxShadow: `0 0 14px ${item.accent}88`,
                              }}
                            />
                            {item.label}
                          </div>
                          <div
                            style={{
                              color: DesignSystem.colors.text.primary,
                              fontWeight: DesignSystem.typography.fontWeight.bold,
                              textAlign: 'right',
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <svg viewBox="0 0 100 110" style={{ width: '100%', height: '100%', display: 'block' }}>
                    <defs>
                      <linearGradient id="mobility-map-base" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
                      </linearGradient>
                      <linearGradient id="mobility-map-land" x1="38%" y1="0%" x2="62%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.11)" />
                        <stop offset="52%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                      </linearGradient>
                      <radialGradient id="mobility-map-core" cx="50%" cy="30%" r="62%">
                        <stop offset="0%" stopColor="rgba(107,185,223,0.16)" />
                        <stop offset="60%" stopColor="rgba(107,185,223,0.03)" />
                        <stop offset="100%" stopColor="rgba(107,185,223,0)" />
                      </radialGradient>
                      <filter id="mobility-map-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="1.6" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <rect x="0" y="0" width="100" height="110" fill="url(#mobility-map-base)" />
                    <rect x="0" y="0" width="100" height="110" fill="url(#mobility-map-core)" />

                    {[14, 26, 38, 50, 62, 74, 86].map(x => (
                      <line
                        key={`v-${x}`}
                        x1={x}
                        y1="0"
                        x2={x}
                        y2="110"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="0.18"
                      />
                    ))}
                    {[12, 24, 36, 48, 60, 72, 84, 96].map(y => (
                      <line
                        key={`h-${y}`}
                        x1="0"
                        y1={y}
                        x2="100"
                        y2={y}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="0.18"
                      />
                    ))}

                    <path
                      d="M 36 7 C 47 5, 59 7, 66 16 C 73 25, 73 36, 69 47 C 65 58, 66 71, 61 84 C 57 95, 54 102, 48 105 C 42 108, 36 104, 34 95 C 32 86, 36 74, 35 61 C 34 47, 39 36, 39 25 C 39 18, 36 12, 36 7 Z"
                      fill="url(#mobility-map-land)"
                      stroke="rgba(255,255,255,0.09)"
                      strokeWidth="0.45"
                    />
                    <path
                      d="M 48 12 C 52 22, 54 31, 52 40 C 50 50, 53 59, 51 70 C 49 82, 46 94, 46 101"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="0.5"
                      strokeDasharray="1.4 3.4"
                      strokeLinecap="round"
                    />

                    {routeStats.map(route => {
                      const from = route.fromNode;
                      const to = route.toNode;
                      const curve = buildRouteCurve(from, to);
                      const labelPoint = bezierPoint(from, curve.c1, curve.c2, to, 0.52);
                      const routeColor = accentColor(route.accent);
                      const active =
                        tab === 'signal' ||
                        (tab === 'math' && (route.id === hottest.id || route.id === weakest.id)) ||
                        (tab === 'fleet' && route.packageSync > 0.35) ||
                        tab === 'recovery';
                      const highlighted = active || featuredRouteIds.includes(route.id);
                      const labelVisible = highlighted || route.score >= 82;

                      return (
                        <g key={route.id}>
                          <path
                            d={curve.path}
                            fill="none"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth={route.id === hottest.id ? 3.3 : 2.4}
                            strokeLinecap="round"
                          />
                          <path
                            d={curve.path}
                            fill="none"
                            stroke={routeColor}
                            strokeWidth={route.id === hottest.id ? 2.3 : highlighted ? 1.9 : 1.35}
                            strokeLinecap="round"
                            strokeOpacity={highlighted ? 0.68 + route.load * 0.22 : 0.22}
                            filter={highlighted ? 'url(#mobility-map-glow)' : undefined}
                          />
                          <path
                            d={curve.path}
                            fill="none"
                            stroke={routeColor}
                            strokeWidth={highlighted ? 1.1 : 0.7}
                            strokeLinecap="round"
                            strokeOpacity={0.8}
                            strokeDasharray={highlighted ? '1.8 4.4' : '1.2 5.4'}
                            strokeDashoffset={-(tick * 140 + route.phase * 22)}
                          />
                          {labelVisible && (
                            <g transform={`translate(${labelPoint.x - 5.4} ${labelPoint.y - 8})`}>
                              <rect
                                width="10.8"
                                height="4.6"
                                rx="1.8"
                                fill="rgba(5,12,21,0.82)"
                                stroke={`${routeColor}40`}
                              />
                              <text
                                x="5.4"
                                y="2.95"
                                textAnchor="middle"
                                fill={DesignSystem.colors.text.primary}
                                fontSize="1.55"
                                fontWeight="700"
                              >
                                {route.score}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {NODES.map(node => {
                      const pulse = clamp(
                        5.6 + node.resilience * 3.2 + Math.sin(tick * 16 + node.x * 0.22) * 1.1,
                        4.8,
                        10.4,
                      );
                      const color = accentColor(node.accent);

                      return (
                        <g key={node.id}>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={pulse}
                            fill={`${color}16`}
                            filter="url(#mobility-map-glow)"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={3.9}
                            fill={color}
                            stroke="rgba(255,255,255,0.72)"
                            strokeWidth="0.55"
                          />
                          <circle cx={node.x} cy={node.y} r={1.15} fill="#fff" />
                          <text
                            x={node.x}
                            y={node.y - 9.2}
                            textAnchor="middle"
                            fill={DesignSystem.colors.text.primary}
                            fontSize="2.25"
                            fontWeight="700"
                          >
                            {node.name}
                          </text>
                          <text
                            x={node.x}
                            y={node.y + 10.7}
                            textAnchor="middle"
                            fill={DesignSystem.colors.text.muted}
                            fontSize="1.45"
                          >
                            {node.subtitle}
                          </text>
                        </g>
                      );
                    })}

                    {visibleUnits.map((unit, index) => {
                      const route = routeStats.find(entry => entry.id === unit.routeId);
                      if (!route) {
                        return null;
                      }

                      const from = route.fromNode;
                      const to = route.toNode;
                      const curve = buildRouteCurve(from, to);
                      const t = (unit.phase + tick * unit.speed * 100 * unit.dir + 1) % 1;
                      const point = bezierPoint(from, curve.c1, curve.c2, to, t);
                      const tangent = bezierTangent(from, curve.c1, curve.c2, to, t);
                      const length = Math.max(0.001, Math.hypot(tangent.x, tangent.y));
                      const nx = (-tangent.y / length) * unit.lane;
                      const ny = (tangent.x / length) * unit.lane;
                      const rotation = Math.atan2(tangent.y, tangent.x) * (180 / Math.PI);
                      const color =
                        unit.type === 'package'
                          ? DesignSystem.colors.gold.base
                          : accentColor(unit.accent);
                      const opacity = clamp(
                        0.58 + Math.sin(tick * 14 + index * 0.8) * 0.24,
                        0.42,
                        0.98,
                      );

                      return (
                        <g
                          key={unit.id}
                          transform={`translate(${point.x + nx} ${point.y + ny}) rotate(${rotation})`}
                          opacity={opacity}
                        >
                          <circle r={3.5} fill={`${color}22`} filter="url(#mobility-map-glow)" />
                          <line
                            x1={unit.type === 'ride' ? -6 : -4.6}
                            y1="0"
                            x2="1"
                            y2="0"
                            stroke={color}
                            strokeOpacity={0.46}
                            strokeWidth={0.95}
                            strokeLinecap="round"
                          />
                          {unit.type === 'ride' ? (
                            <rect
                              x={-2.9}
                              y={-1.7}
                              width={5.8}
                              height={3.4}
                              rx={1.35}
                              fill={color}
                              stroke="rgba(255,255,255,0.56)"
                              strokeWidth="0.22"
                            />
                          ) : (
                            <rect
                              x={-2.2}
                              y={-2.2}
                              width={4.4}
                              height={4.4}
                              rx={1.2}
                              fill={color}
                              stroke="rgba(255,255,255,0.52)"
                              strokeWidth="0.22"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  <div
                    style={{
                      position: 'absolute',
                      right: 16,
                      bottom: 16,
                      zIndex: 2,
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {[
                      { label: 'Ride circulation', color: DesignSystem.colors.cyan.base },
                      { label: 'Package circulation', color: DesignSystem.colors.gold.base },
                      { label: 'Recovery guardrails', color: DesignSystem.colors.purple.base },
                    ].map(item => (
                      <div
                        key={item.label}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 34,
                          padding: '0 12px',
                          borderRadius: 999,
                          background: 'rgba(6,13,22,0.68)',
                          border: `1px solid ${item.color}30`,
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          fontWeight: DesignSystem.typography.fontWeight.bold,
                          backdropFilter: 'blur(16px)',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: item.color,
                            boxShadow: `0 0 18px ${item.color}72`,
                          }}
                        />
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  }}
                >
                  {corridorCards.map(route => (
                    <article
                      key={route.id}
                      style={{
                        padding: '16px 16px 14px',
                        borderRadius: 22,
                        border: `1px solid ${route.accent}2a`,
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                        boxShadow: `0 14px 32px ${route.accent}14`,
                      }}
                    >
                      <div
                        style={{
                          color: route.accent,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        {route.emphasis}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.lg,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                          lineHeight: 1.2,
                        }}
                      >
                        {route.fromNode.name} {'->'} {route.toNode.name}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: 'grid',
                          gap: 6,
                          color: DesignSystem.colors.text.secondary,
                          fontSize: DesignSystem.typography.fontSize.sm,
                        }}
                      >
                        <div>Score {route.score} / reliability {Math.round(route.reliability * 100)}%</div>
                        <div>Load {Math.round(route.load * 100)}% / ETA {route.etaLive} min</div>
                        <div>Package sync {Math.round(route.packageSync * 100)}%</div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    padding: '18px',
                    borderRadius: 24,
                    border: `1px solid ${DesignSystem.colors.cyan.base}28`,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                    boxShadow: `0 18px 40px ${DesignSystem.colors.cyan.base}12`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: DesignSystem.colors.cyan.base,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        Matching board
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.xl,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        Best demand-to-supply pairs this cycle
                      </div>
                    </div>
                    <Brain size={20} color={DesignSystem.colors.cyan.base} />
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {pipeline.matches.length > 0 ? (
                      pipeline.matches.slice(0, 3).map(match => {
                        const demand = pipeline.demand.find(item => item.id === match.demandId);
                        const vehicle = pipeline.vehicles.find(item => item.id === match.vehicleId);

                        return (
                          <article
                            key={`${match.demandId}-${match.vehicleId}`}
                            style={{
                              padding: '14px 15px',
                              borderRadius: 18,
                              border: `1px solid ${DesignSystem.colors.cyan.base}20`,
                              background: 'rgba(255,255,255,0.03)',
                              display: 'grid',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 12,
                                alignItems: 'flex-start',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    color: DesignSystem.colors.text.primary,
                                    fontWeight: DesignSystem.typography.fontWeight.bold,
                                  }}
                                >
                                  {demand?.from.label ?? 'Origin'} {'->'} {demand?.to.label ?? 'Destination'}
                                </div>
                                <div
                                  style={{
                                    marginTop: 4,
                                    color: DesignSystem.colors.text.secondary,
                                    fontSize: DesignSystem.typography.fontSize.sm,
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {demand?.kind === 'package' ? 'Package wave' : 'Passenger wave'} matched to{' '}
                                  {vehicle?.from.label ?? 'route'} {'->'} {vehicle?.to.label ?? 'route'}
                                </div>
                              </div>
                              <div
                                style={{
                                  minWidth: 62,
                                  textAlign: 'right',
                                  color: DesignSystem.colors.cyan.base,
                                  fontSize: DesignSystem.typography.fontSize['2xl'],
                                  fontWeight: DesignSystem.typography.fontWeight.black,
                                  lineHeight: 1,
                                }}
                              >
                                {match.score}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <article
                        style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          border: `1px solid ${DesignSystem.colors.border.base}`,
                          background: 'rgba(255,255,255,0.03)',
                          color: DesignSystem.colors.text.secondary,
                          lineHeight: 1.65,
                          fontSize: DesignSystem.typography.fontSize.sm,
                        }}
                      >
                        No demand is clearing the {pipeline.thresholds.dispatchMatchScore}+ dispatch
                        threshold right now. Mobility OS is waiting for stronger route fit or a
                        lower-pressure corridor.
                      </article>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    padding: '18px',
                    borderRadius: 24,
                    border: `1px solid ${DesignSystem.colors.purple.base}28`,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                    boxShadow: `0 18px 40px ${DesignSystem.colors.purple.base}12`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: DesignSystem.colors.purple.base,
                          fontSize: DesignSystem.typography.fontSize.xs,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        Rebalancing plan
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: DesignSystem.colors.text.primary,
                          fontSize: DesignSystem.typography.fontSize.xl,
                          fontWeight: DesignSystem.typography.fontWeight.black,
                        }}
                      >
                        Moves queued before the next demand wave lands
                      </div>
                    </div>
                    <Gauge size={20} color={DesignSystem.colors.purple.base} />
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {pipeline.rebalancing.length > 0 ? (
                      pipeline.rebalancing.slice(0, 3).map(action => (
                        <article
                          key={`${action.vehicleId}-${action.corridorId}`}
                          style={{
                            padding: '14px 15px',
                            borderRadius: 18,
                            border: `1px solid ${DesignSystem.colors.purple.base}20`,
                            background: 'rgba(255,255,255,0.03)',
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              color: DesignSystem.colors.text.primary,
                              fontWeight: DesignSystem.typography.fontWeight.bold,
                            }}
                          >
                            {action.from} {'->'} {action.to}
                          </div>
                          <div
                            style={{
                              color: DesignSystem.colors.text.secondary,
                              fontSize: DesignSystem.typography.fontSize.sm,
                              lineHeight: 1.62,
                            }}
                          >
                            {action.reason}
                          </div>
                          <div
                            style={{
                              color: DesignSystem.colors.purple.base,
                              fontWeight: DesignSystem.typography.fontWeight.bold,
                            }}
                          >
                            Rebalance score {action.score}
                          </div>
                        </article>
                      ))
                    ) : (
                      <article
                        style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          border: `1px solid ${DesignSystem.colors.border.base}`,
                          background: 'rgba(255,255,255,0.03)',
                          color: DesignSystem.colors.text.secondary,
                          lineHeight: 1.65,
                          fontSize: DesignSystem.typography.fontSize.sm,
                        }}
                      >
                        Idle supply is already close enough to current demand, so no explicit
                        repositioning move is required yet.
                      </article>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    padding: '18px',
                    borderRadius: 24,
                    border: `1px solid ${DesignSystem.colors.gold.base}28`,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                    boxShadow: `0 18px 40px ${DesignSystem.colors.gold.base}10`,
                  }}
                >
                  <div
                    style={{
                      color: DesignSystem.colors.gold.base,
                      fontSize: DesignSystem.typography.fontSize.xs,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight: DesignSystem.typography.fontWeight.black,
                    }}
                  >
                    Corridor watchlist
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    {routeStats.slice(0, 4).map(route => {
                      const accent =
                        route.id === weakest.id
                          ? DesignSystem.colors.purple.base
                          : accentColor(route.accent);

                      return (
                        <div
                          key={route.id}
                          style={{
                            display: 'grid',
                            gap: 8,
                            padding: '12px 14px',
                            borderRadius: 18,
                            border: `1px solid ${accent}22`,
                            background: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'center',
                            }}
                          >
                            <div
                              style={{
                                color: DesignSystem.colors.text.primary,
                                fontWeight: DesignSystem.typography.fontWeight.bold,
                              }}
                            >
                              {route.fromNode.name} {'->'} {route.toNode.name}
                            </div>
                            <div
                              style={{
                                color: accent,
                                fontWeight: DesignSystem.typography.fontWeight.black,
                              }}
                            >
                              {route.score}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              color: DesignSystem.colors.text.secondary,
                              fontSize: DesignSystem.typography.fontSize.xs,
                            }}
                          >
                            <span>ETA {route.etaLive} min</span>
                            <span>Load {Math.round(route.load * 100)}%</span>
                            <span>Reliability {Math.round(route.reliability * 100)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DataPanel>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {stats.map(stat => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {[
          {
            icon: TimerReset,
            title: 'Scenario tuning',
            value: TABS[tab],
            body: 'The UI changes by operational lens without hiding the network.',
            accent: DesignSystem.colors.cyan.base,
          },
          {
            icon: Users,
            title: 'Active assignments',
            value: `${pipeline.metrics.activeAssignments}`,
            body: 'Live assignments and planned matches now sit in the same operating stack.',
            accent: DesignSystem.colors.green.base,
          },
          {
            icon: ShieldCheck,
            title: 'Recovery posture',
            value: `${network.resilience}%`,
            body: 'Risk stays visible as corridor resilience instead of generic dashboard noise.',
            accent: DesignSystem.colors.gold.base,
          },
          {
            icon: AlertTriangle,
            title: 'Corridor watch',
            value: `${Math.max(0, weakest.etaLive - weakest.eta)} min`,
            body: `${weakest.fromNode.name} -> ${weakest.toNode.name} is the first route to protect if reliability drops further.`,
            accent: DesignSystem.colors.purple.base,
          },
          {
            icon: CarFront,
            title: 'Fleet pressure',
            value: `${Math.round(hottest.load * 100)}%`,
            body: `${hottest.fromNode.name} -> ${hottest.toNode.name} is carrying the highest live corridor load.`,
            accent: accentColor(hottest.accent),
          },
          {
            icon: Activity,
            title: 'Dispatch IQ',
            value: `${network.dispatchIQ}`,
            body: 'Corridor score, balance, and velocity still frame the wider routing field.',
            accent: DesignSystem.colors.cyan.base,
          },
        ].map(({ icon: Icon, ...card }) => (
          <InfoCard key={card.title} {...card} icon={<Icon size={18} color={card.accent} />} />
        ))}
      </section>
    </PageShell>
  );
}
