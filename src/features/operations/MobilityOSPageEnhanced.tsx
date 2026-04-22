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
  type MobilityStageId,
} from '../../services/mobilityPipeline';

type Accent = 'cyan' | 'green' | 'gold' | 'purple';
type UnitType = 'ride' | 'package';
type TabKey = 'signal' | 'math' | 'fleet' | 'recovery';

const NODES = [
  { id: 'amman', name: 'Amman', subtitle: 'Core hub', x: 46, y: 33, accent: 'cyan', resilience: 0.92 },
  { id: 'irbid', name: 'Irbid', subtitle: 'North demand', x: 59, y: 16, accent: 'gold', resilience: 0.85 },
  { id: 'zarqa', name: 'Zarqa', subtitle: 'Industrial flow', x: 70, y: 33, accent: 'green', resilience: 0.82 },
  { id: 'madaba', name: 'Madaba', subtitle: 'Connector lane', x: 50, y: 47, accent: 'cyan', resilience: 0.81 },
  { id: 'karak', name: 'Karak', subtitle: 'South midpoint', x: 52, y: 66, accent: 'gold', resilience: 0.79 },
  { id: 'aqaba', name: 'Aqaba', subtitle: 'Port sink', x: 44, y: 95, accent: 'green', resilience: 0.88 },
] as const;

const ROUTES = [
  { id: 'r1', from: 'amman', to: 'irbid', distance: 88, eta: 62, demand: 0.82, packageBias: 0.34, importance: 0.84, phase: 0.12, accent: 'cyan' },
  { id: 'r2', from: 'amman', to: 'zarqa', distance: 26, eta: 28, demand: 0.76, packageBias: 0.42, importance: 0.78, phase: 0.42, accent: 'green' },
  { id: 'r3', from: 'amman', to: 'madaba', distance: 31, eta: 34, demand: 0.58, packageBias: 0.29, importance: 0.60, phase: 0.68, accent: 'cyan' },
  { id: 'r4', from: 'madaba', to: 'karak', distance: 111, eta: 73, demand: 0.61, packageBias: 0.38, importance: 0.68, phase: 1.10, accent: 'gold' },
  { id: 'r5', from: 'karak', to: 'aqaba', distance: 203, eta: 112, demand: 0.72, packageBias: 0.48, importance: 0.74, phase: 1.56, accent: 'green' },
  { id: 'r6', from: 'amman', to: 'aqaba', distance: 332, eta: 235, demand: 0.93, packageBias: 0.57, importance: 0.95, phase: 2.04, accent: 'gold' },
  { id: 'r7', from: 'irbid', to: 'zarqa', distance: 79, eta: 67, demand: 0.53, packageBias: 0.31, importance: 0.55, phase: 2.48, accent: 'purple' },
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
  { id: 'u1', routeId: 'r1', type: 'ride', accent: 'cyan', phase: 0.08, lane: -4, speed: 0.017, dir: 1 },
  { id: 'u2', routeId: 'r1', type: 'package', accent: 'gold', phase: 0.66, lane: 4, speed: 0.013, dir: -1 },
  { id: 'u3', routeId: 'r2', type: 'ride', accent: 'green', phase: 0.22, lane: -5, speed: 0.021, dir: 1 },
  { id: 'u4', routeId: 'r3', type: 'ride', accent: 'cyan', phase: 0.34, lane: -4, speed: 0.018, dir: 1 },
  { id: 'u5', routeId: 'r4', type: 'package', accent: 'gold', phase: 0.58, lane: 5, speed: 0.011, dir: 1 },
  { id: 'u6', routeId: 'r5', type: 'ride', accent: 'green', phase: 0.17, lane: -6, speed: 0.015, dir: 1 },
  { id: 'u7', routeId: 'r6', type: 'ride', accent: 'cyan', phase: 0.52, lane: -8, speed: 0.014, dir: 1 },
  { id: 'u8', routeId: 'r6', type: 'package', accent: 'gold', phase: 0.78, lane: 8, speed: 0.009, dir: -1 },
  { id: 'u9', routeId: 'r7', type: 'ride', accent: 'purple', phase: 0.26, lane: -5, speed: 0.013, dir: 1 },
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
  return avg(values.map((value) => (value - mean) ** 2));
}

function accentColor(accent: Accent) {
  if (accent === 'green') {return DesignSystem.colors.green.base;}
  if (accent === 'gold') {return DesignSystem.colors.gold.base;}
  if (accent === 'purple') {return DesignSystem.colors.purple.base;}
  return DesignSystem.colors.cyan.base;
}

function pipelineAccent(stageId: MobilityStageId) {
  if (stageId === 'demand') {return DesignSystem.colors.gold.base;}
  if (stageId === 'candidate-vehicles') {return DesignSystem.colors.green.base;}
  if (stageId === 'scoring') {return DesignSystem.colors.purple.base;}
  if (stageId === 'matching') {return DesignSystem.colors.cyan.base;}
  if (stageId === 'assignment') {return DesignSystem.colors.accent.strong;}
  return DesignSystem.colors.text.muted;
}

export default function MobilityOSPageEnhanced() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<TabKey>('signal');
  const rafRef = useRef<number | null>(null);
  const pipeline = useMobilityPipeline();

  useEffect(() => {
    if (paused) {return undefined;}

    const loop = () => {
      setTick((prev) => (prev + 0.0035) % 1);
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
    const nodeMap = Object.fromEntries(NODES.map((node) => [node.id, node]));

    return ROUTES.map((route) => {
      const fromNode = nodeMap[route.from];
      const toNode = nodeMap[route.to];
      const wave = 0.5 + (0.5 * Math.sin((tick + route.phase) * Math.PI * 2.2));
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
      const packageSync = clamp(route.packageBias * 0.58 + wave * 0.22 + reliability * 0.2, 0.12, 0.98);
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
    const loads = routeStats.map((route) => route.load);
    const reliabilities = routeStats.map((route) => route.reliability);
    const speeds = routeStats.map((route) => route.speedIndex / 1.28);

    return {
      dispatchIQ: Math.round(
        clamp(
          avg(routeStats.map((route) => route.score)) * 0.44 +
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
            avg(routeStats.map((route) => route.packageSync)) * 16 +
            (1 - Math.sqrt(variance(reliabilities))) * 9,
          75,
          98,
        ),
      ),
    };
  }, [routeStats]);

  const hottest = routeStats[0];
  const weakest = [...routeStats].sort((a, b) => a.reliability - b.reliability)[0];

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

  return (
    <PageShell>
      <PageHeader
        badge="Mobility OS / Dispatch Pipeline"
        title="Demand, candidate vehicles, scoring, matching, assignment, and rebalancing on one control surface."
        description={`This baseline now reads Mobility OS as an operating model instead of a generic dashboard. Demand alerts, ride bookings, packages, posted rides, and corridor signals all feed the same dispatch mental model. Source blend: ${pipeline.source}.`}
        formulas={[
          'Demand -> Candidate Vehicles -> Scoring -> Matching -> Assignment -> Rebalancing',
          'score = 0.40 route + 0.22 capacity + 0.16 service + 0.14 proximity + 0.08 demand - congestion',
          'rebalance = unmet corridor pressure - idle capacity drag',
        ]}
        actions={
          <>
            <ActionButton
              label={paused ? 'Resume Field' : 'Pause Field'}
              onClick={() => setPaused((value) => !value)}
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
        {(Object.keys(TABS) as TabKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: DesignSystem.radius.full,
              border: `1px solid ${tab === key ? 'var(--wasel-button-primary-border-strong)' : DesignSystem.colors.border.base}`,
              background: tab === key ? 'var(--wasel-button-primary-soft-strong)' : 'var(--wasel-panel-muted)',
              color: tab === key ? DesignSystem.colors.accent.strong : DesignSystem.colors.text.muted,
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
        {pipeline.stages.map((stage) => {
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
                background:
                  `linear-gradient(180deg, color-mix(in srgb, ${accent} 9%, rgb(255 255 255 / 0.03)), rgb(255 255 255 / 0.02)), var(--wasel-service-card)`,
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
          gap: 18,
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)',
        }}
      >
        <DataPanel
          title="Jordan live corridor field"
          icon={<Activity size={18} color={DesignSystem.colors.cyan.base} />}
        >
          <div
            style={{
              position: 'relative',
              minHeight: 560,
              borderRadius: 24,
              overflow: 'hidden',
              background:
                'linear-gradient(180deg, rgb(255 255 255 / 0.03), rgb(255 255 255 / 0.01)), var(--wasel-network-panel)',
              border: `1px solid ${DesignSystem.colors.border.strong}`,
              boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.06)',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.22,
                backgroundImage: 'var(--wasel-network-grid)',
                backgroundSize: '56px 56px',
                maskImage:
                  'radial-gradient(circle at center, black 0%, black 62%, transparent 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                zIndex: 2,
                display: 'grid',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--ds-surface-overlay) 92%, transparent)',
                  border: `1px solid ${DesignSystem.colors.border.base}`,
                  fontSize: DesignSystem.typography.fontSize.xs,
                }}
              >
                <CarFront size={14} color={DesignSystem.colors.green.base} />
                {pipeline.metrics.pendingDemand} open requests / {pipeline.metrics.dispatchableVehicles} dispatchable vehicles
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 14,
                  background: 'color-mix(in srgb, var(--ds-surface-overlay) 92%, transparent)',
                  border: `1px solid ${DesignSystem.colors.border.base}`,
                  fontSize: DesignSystem.typography.fontSize.xs,
                }}
              >
                <Activity size={14} color={DesignSystem.colors.cyan.base} />
                Live phase {(tick * 100).toFixed(1)}% / {pipeline.source} pipeline
              </div>
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 16,
                  background: 'color-mix(in srgb, var(--ds-surface-overlay) 92%, transparent)',
                  border: `1px solid ${DesignSystem.colors.border.faint}`,
                  fontFamily: DesignSystem.typography.fontFamily.mono,
                  color: DesignSystem.colors.text.secondary,
                  fontSize: DesignSystem.typography.fontSize.xs,
                }}
              >
                {pipeline.metrics.viableCandidatePairs} viable pairs / avg match score {pipeline.metrics.averageMatchScore}
              </div>
            </div>

            <svg viewBox="0 0 100 110" style={{ width: '100%', height: '100%', display: 'block' }}>
              {routeStats.map((route) => {
                const from = route.fromNode;
                const to = route.toNode;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const c1x = from.x + (dx * 0.26);
                const c1y = from.y + (dy * 0.08);
                const c2x = from.x + (dx * 0.76);
                const c2y = from.y + (dy * 0.92);
                const active =
                  tab === 'signal' ||
                  (tab === 'math' && (route.id === hottest.id || route.id === weakest.id)) ||
                  (tab === 'fleet' && route.packageSync > 0.35) ||
                  tab === 'recovery';

                return (
                  <g key={route.id}>
                    <path
                      d={`M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`}
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={0.85}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`}
                      fill="none"
                      stroke={accentColor(route.accent)}
                      strokeWidth={active ? 1.8 : 1.1}
                      strokeLinecap="round"
                      strokeOpacity={active ? 0.44 + route.load * 0.3 : 0.14}
                    />
                    {(tab === 'math' || tab === 'recovery') && (
                      <g>
                        <rect
                          x={(from.x + to.x) / 2 - 4.3}
                          y={(from.y + to.y) / 2 - 10}
                          width={8.6}
                          height={4.2}
                          rx={1.8}
                          fill="rgba(4,12,24,0.78)"
                          stroke={`${accentColor(route.accent)}30`}
                        />
                        <text
                          x={(from.x + to.x) / 2}
                          y={(from.y + to.y) / 2 - 7.1}
                          textAnchor="middle"
                          fill={DesignSystem.colors.text.primary}
                          fontSize="1.7"
                        >
                          {route.score}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {NODES.map((node) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={7} fill={`${accentColor(node.accent)}18`} />
                  <circle cx={node.x} cy={node.y} r={3.2} fill={accentColor(node.accent)} />
                  <circle cx={node.x} cy={node.y} r={1.1} fill="#fff" />
                  <text
                    x={node.x}
                    y={node.y - 8.4}
                    textAnchor="middle"
                    fill={DesignSystem.colors.text.primary}
                    fontSize="2.5"
                  >
                    {node.name}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 10.2}
                    textAnchor="middle"
                    fill={DesignSystem.colors.text.muted}
                    fontSize="1.45"
                  >
                    {node.subtitle}
                  </text>
                </g>
              ))}

              {UNITS
                .filter(
                  (unit) =>
                    tab === 'signal' ||
                    (tab === 'fleet' && unit.type === 'ride') ||
                    (tab === 'recovery' && unit.type === 'package') ||
                    tab === 'math',
                )
                .map((unit, index) => {
                  const route = routeStats.find((entry) => entry.id === unit.routeId);
                  if (!route) {return null;}

                  const from = route.fromNode;
                  const to = route.toNode;
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const c1 = { x: from.x + (dx * 0.26), y: from.y + (dy * 0.08) };
                  const c2 = { x: from.x + (dx * 0.76), y: from.y + (dy * 0.92) };
                  const t = (unit.phase + (tick * unit.speed * 100 * unit.dir) + 1) % 1;
                  const mt = 1 - t;
                  const x =
                    (mt ** 3 * from.x) +
                    (3 * mt ** 2 * t * c1.x) +
                    (3 * mt * t ** 2 * c2.x) +
                    (t ** 3 * to.x);
                  const y =
                    (mt ** 3 * from.y) +
                    (3 * mt ** 2 * t * c1.y) +
                    (3 * mt * t ** 2 * c2.y) +
                    (t ** 3 * to.y);
                  const tx =
                    (3 * mt ** 2 * (c1.x - from.x)) +
                    (6 * mt * t * (c2.x - c1.x)) +
                    (3 * t ** 2 * (to.x - c2.x));
                  const ty =
                    (3 * mt ** 2 * (c1.y - from.y)) +
                    (6 * mt * t * (c2.y - c1.y)) +
                    (3 * t ** 2 * (to.y - c2.y));
                  const length = Math.max(0.001, Math.hypot(tx, ty));
                  const nx = (-ty / length) * unit.lane;
                  const ny = (tx / length) * unit.lane;
                  const rotation = Math.atan2(ty, tx) * (180 / Math.PI);

                  return (
                    <g
                      key={unit.id}
                      transform={`translate(${x + nx} ${y + ny}) rotate(${rotation})`}
                      opacity={clamp(0.52 + Math.sin(tick * 14 + index) * 0.22, 0.36, 0.98)}
                    >
                      {unit.type === 'ride' ? (
                        <rect
                          x={-2.8}
                          y={-1.6}
                          width={5.6}
                          height={3.2}
                          rx={1.2}
                          fill={accentColor(unit.accent)}
                        />
                      ) : (
                        <rect
                          x={-2}
                          y={-2}
                          width={4}
                          height={4}
                          rx={1.1}
                          fill={DesignSystem.colors.gold.base}
                        />
                      )}
                    </g>
                  );
                })}
            </svg>

            <div
              style={{
                position: 'absolute',
                right: 14,
                bottom: 14,
                zIndex: 2,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {[
                { label: 'Ride flow live', color: DesignSystem.colors.cyan.base },
                { label: 'Package flow live', color: DesignSystem.colors.gold.base },
                { label: `${pipeline.metrics.rebalancingCount} rebalance moves queued`, color: DesignSystem.colors.purple.base },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 34,
                    padding: '0 12px',
                    borderRadius: 999,
                    background: 'color-mix(in srgb, var(--ds-surface-overlay) 94%, transparent)',
                    border: `1px solid ${item.color}28`,
                    color: DesignSystem.colors.text.primary,
                    fontSize: DesignSystem.typography.fontSize.xs,
                    fontWeight: DesignSystem.typography.fontWeight.bold,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: item.color,
                      boxShadow: `0 0 18px ${item.color}66`,
                    }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </DataPanel>

        <div style={{ display: 'grid', gap: 14 }}>
          <DataPanel
            title="Pipeline decisions"
            icon={<Brain size={18} color={DesignSystem.colors.cyan.base} />}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {pipeline.matches.length > 0 ? (
                pipeline.matches.slice(0, 3).map((match) => {
                  const demand = pipeline.demand.find((item) => item.id === match.demandId);
                  const vehicle = pipeline.vehicles.find((item) => item.id === match.vehicleId);

                  return (
                    <div
                      key={`${match.demandId}-${match.vehicleId}`}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 18,
                        border: `1px solid ${DesignSystem.colors.cyan.base}2a`,
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          alignItems: 'baseline',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: DesignSystem.typography.fontWeight.bold }}>
                            {demand?.from.label ?? 'Origin'} {'->'} {demand?.to.label ?? 'Destination'}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: DesignSystem.colors.text.muted,
                              fontSize: DesignSystem.typography.fontSize.xs,
                            }}
                          >
                            {demand?.kind === 'package' ? 'Package wave' : 'Passenger wave'} on{' '}
                            {vehicle?.from.label ?? 'route'} {'->'} {vehicle?.to.label ?? 'route'}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: DesignSystem.typography.fontSize.xl,
                            fontWeight: DesignSystem.typography.fontWeight.black,
                            color: DesignSystem.colors.cyan.base,
                          }}
                        >
                          {match.score}
                        </div>
                      </div>
                    </div>
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
                  No demand is clearing the dispatch threshold right now. Mobility OS is waiting
                  for more supply, stronger route fit, or a lower-pressure corridor.
                </article>
              )}
            </div>
          </DataPanel>

          <DataPanel
            title="Rebalancing plan"
            icon={<Gauge size={18} color={DesignSystem.colors.purple.base} />}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {pipeline.rebalancing.length > 0 ? (
                pipeline.rebalancing.slice(0, 3).map((action) => (
                  <article
                    key={`${action.vehicleId}-${action.corridorId}`}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 18,
                      border: `1px solid ${DesignSystem.colors.purple.base}24`,
                      background: 'rgba(255,255,255,0.03)',
                      color: DesignSystem.colors.text.secondary,
                      lineHeight: 1.65,
                      fontSize: DesignSystem.typography.fontSize.sm,
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
                    <div style={{ marginTop: 6 }}>{action.reason}</div>
                    <div
                      style={{
                        marginTop: 8,
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
          </DataPanel>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {stats.map((stat) => (
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
          <InfoCard
            key={card.title}
            {...card}
            icon={<Icon size={18} color={card.accent} />}
          />
        ))}
      </section>
    </PageShell>
  );
}
