import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
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
  Users,
} from 'lucide-react';
import { WaselButton, WaselLogo } from '../../components/wasel-ui';
import { C, F, GRAD_AURORA } from '../../utils/wasel-ds';
import { tx } from '../../locales/tx';
import { fetchMobilityPublicSnapshot, type MobilityCorridorSnapshot } from '../../services/mobilityLiveData';
import styles from './MobilityOSPage.module.css';

type Accent = 'cyan' | 'green' | 'gold' | 'purple';
type UnitType = 'ride' | 'package' | 'bus';
type TabKey = 'signal' | 'math' | 'fleet' | 'recovery';

const NODES = [
  { id: 'amman',  name: 'Amman',  subtitle: 'Core hub',        x: 46, y: 33,  accent: 'cyan'  as Accent, resilience: 0.92 },
  { id: 'irbid',  name: 'Irbid',  subtitle: 'North demand',    x: 59, y: 16,  accent: 'gold'  as Accent, resilience: 0.85 },
  { id: 'zarqa',  name: 'Zarqa',  subtitle: 'Industrial flow',  x: 70, y: 33,  accent: 'green' as Accent, resilience: 0.82 },
  { id: 'madaba', name: 'Madaba', subtitle: 'Connector lane',   x: 50, y: 47,  accent: 'cyan'  as Accent, resilience: 0.81 },
  { id: 'karak',  name: 'Karak',  subtitle: 'South midpoint',   x: 52, y: 66,  accent: 'gold'  as Accent, resilience: 0.79 },
  { id: 'aqaba',  name: 'Aqaba',  subtitle: 'Port sink',        x: 44, y: 95,  accent: 'green' as Accent, resilience: 0.88 },
] as const;

type NodeDef = (typeof NODES)[number];
type NodeId  = NodeDef['id'];

const ROUTES = [
  { id: 'r1', from: 'amman',  to: 'irbid',  distance: 88,  eta: 62,  demand: 0.82, packageBias: 0.34, importance: 0.84, phase: 0.12,  accent: 'cyan'   as Accent },
  { id: 'r2', from: 'amman',  to: 'zarqa',  distance: 26,  eta: 28,  demand: 0.76, packageBias: 0.42, importance: 0.78, phase: 0.42,  accent: 'green'  as Accent },
  { id: 'r3', from: 'amman',  to: 'madaba', distance: 31,  eta: 34,  demand: 0.58, packageBias: 0.29, importance: 0.6,  phase: 0.68,  accent: 'cyan'   as Accent },
  { id: 'r4', from: 'madaba', to: 'karak',  distance: 111, eta: 73,  demand: 0.61, packageBias: 0.38, importance: 0.68, phase: 1.1,   accent: 'gold'   as Accent },
  { id: 'r5', from: 'karak',  to: 'aqaba',  distance: 203, eta: 112, demand: 0.72, packageBias: 0.48, importance: 0.74, phase: 1.56,  accent: 'green'  as Accent },
  { id: 'r6', from: 'amman',  to: 'aqaba',  distance: 332, eta: 235, demand: 0.93, packageBias: 0.57, importance: 0.95, phase: 2.04,  accent: 'gold'   as Accent },
  { id: 'r7', from: 'irbid',  to: 'zarqa',  distance: 79,  eta: 67,  demand: 0.53, packageBias: 0.31, importance: 0.55, phase: 2.48,  accent: 'purple' as Accent },
] as const;

type RouteStat = (typeof ROUTES)[number] & {
  fromNode: NodeDef; toNode: NodeDef;
  load: number; reliability: number; speedIndex: number;
  packageSync: number; etaLive: number; score: number;
};

const UNITS: { id: string; routeId: string; type: UnitType; accent: Accent; phase: number; lane: number; speed: number; dir: 1 | -1; }[] = [
  { id: 'u1',  routeId: 'r1', type: 'ride',    accent: 'cyan', phase: 0.08, lane: -4, speed: 0.017, dir:  1 },
  { id: 'u2',  routeId: 'r1', type: 'package', accent: 'gold', phase: 0.66, lane:  4, speed: 0.013, dir:  1 },
  { id: 'u10', routeId: 'r6', type: 'bus',     accent: 'gold', phase: 0.12, lane:  0, speed: 0.008, dir:  1 },
  { id: 'u11', routeId: 'r4', type: 'bus',     accent: 'gold', phase: 0.55, lane:  0, speed: 0.01,  dir:  1 },
  { id: 'u12', routeId: 'r1', type: 'bus',     accent: 'cyan', phase: 0.80, lane:  0, speed: 0.009, dir: -1 },
];

const TABS: Record<TabKey, string> = {
  signal:   'Signal Field',
  math:     'Corridor Math',
  fleet:    'Fleet Logic',
  recovery: 'Recovery Mode',
};

const clamp    = (v: number, mn: number, mx: number) => Math.min(mx, Math.max(mn, v));
const avg      = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / Math.max(arr.length, 1);
const variance = (arr: number[]) => { const m = avg(arr); return avg(arr.map(v => (v - m) ** 2)); };

function accentColor(accent: Accent): string {
  return accent === 'green' ? C.green : accent === 'gold' ? C.gold : accent === 'purple' ? C.purple : 'var(--primary)';
}
export default function MobilityOSPage() {
  const [tick,         setTick]         = useState(0);
  const [paused,       setPaused]       = useState(false);
  const [tab,          setTab]          = useState<TabKey>('signal');
  const [liveCorridors, setLiveCorridors] = useState<MobilityCorridorSnapshot[] | null>(null);
  const rafRef = useRef<number | null>(null);

  // Poll live corridor data every 30 s
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const snap = await fetchMobilityPublicSnapshot();
      if (!cancelled && snap) setLiveCorridors(snap.corridors);
    };
    void load();
    const id = setInterval(() => { void load(); }, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Delta-time animation loop (frame-rate independent)
  useEffect(() => {
    if (paused) return undefined;
    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      setTick(prev => (prev + dt * 0.21) % 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [paused]);

  const routeStats = useMemo((): RouteStat[] => {
    const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n])) as Record<NodeId, NodeDef>;
    return ROUTES.map(route => {
      const fromNode = nodeMap[route.from as NodeId];
      const toNode   = nodeMap[route.to   as NodeId];
      const wave = 0.5 + 0.5 * Math.sin((tick + route.phase) * Math.PI * 2.2);
      const liveRow = liveCorridors?.find(c =>
        (c.from.toLowerCase() === fromNode.name.toLowerCase() && c.to.toLowerCase() === toNode.name.toLowerCase()) ||
        (c.from.toLowerCase() === toNode.name.toLowerCase()   && c.to.toLowerCase() === fromNode.name.toLowerCase())
      );
      const simLoad   = clamp(route.demand * 0.66 + route.importance * 0.22 + route.packageBias * 0.12 + (wave - 0.5) * 0.22, 0.12, 0.98);
      const load      = liveRow ? clamp(liveRow.demand_index * 0.6 + simLoad * 0.4, 0.12, 0.98) : simLoad;
      const simPkg    = clamp(route.packageBias * 0.58 + wave * 0.22, 0.12, 0.98);
      const cargoFill = liveRow && liveRow.cargo_capacity_kg > 0 ? liveRow.cargo_booked_kg / liveRow.cargo_capacity_kg : null;
      const packageSync  = cargoFill !== null ? clamp(cargoFill * 0.6 + simPkg * 0.4, 0.12, 0.98) : simPkg;
      const reliability  = clamp(((fromNode.resilience + toNode.resilience) / 2) * 0.76 + (1 - load) * 0.24, 0.56, 0.99);
      const speedIndex   = clamp(1.24 - load * 0.48 + reliability * 0.15, 0.58, 1.28);
      const score        = Math.round(clamp(load * 0.38 + reliability * 0.34 + (speedIndex / 1.28) * 0.28, 0, 1) * 100);
      return { ...route, fromNode, toNode, load, reliability, speedIndex, packageSync, etaLive: Math.round(route.eta / speedIndex), score };
    }).sort((a, b) => b.score - a.score);
  }, [tick, liveCorridors]);

  const network = useMemo(() => {
    const loads         = routeStats.map(r => r.load);
    const reliabilities = routeStats.map(r => r.reliability);
    const speeds        = routeStats.map(r => r.speedIndex / 1.28);
    return {
      dispatchIQ:  Math.round(clamp(avg(routeStats.map(r => r.score)) * 0.44 + (100 - Math.sqrt(variance(loads)) * 170) * 0.24 + avg(speeds) * 100 * 0.32, 72, 99)),
      balance:     Math.round(clamp(100 - Math.sqrt(variance(loads)) * 170, 58, 99)),
      resilience:  Math.round(avg(reliabilities) * 100),
      throughput:  Math.round(routeStats.reduce((s, r) => s + r.distance * r.speedIndex * (0.62 + r.load * 0.54), 0)),
      agentSync:   Math.round(clamp(72 + avg(routeStats.map(r => r.packageSync)) * 16 + (1 - Math.sqrt(variance(reliabilities))) * 9, 75, 98)),
      carbonGain:  Math.round(routeStats.reduce((s, r) => s + r.distance * r.packageSync * r.load * 0.09, 0)),
    };
  }, [routeStats]);

  const hottest        = routeStats[0];
  const weakest        = [...routeStats].sort((a, b) => a.reliability - b.reliability)[0];
  const benchmarkRoute = routeStats[0] ?? null;
  if (!hottest || !weakest || !benchmarkRoute) return null;

  const pageStyle: CSSProperties = {
    background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, transparent 22%), var(--background)`,
    fontFamily: F,
  };

  return (
    <div className={styles.page} style={pageStyle}>
      <div className={styles.inner}>

        {/* ── Header ───────────────────────────────────────────── */}
        <section className={styles.headerPanel}>
          <div className={styles.headerBody}>
            <div className={styles.headerText}>
              <div className={styles.logoWrap}>
                <WaselLogo size={44} theme="light" variant="full" />
              </div>
              <div className={styles.eyebrow}>
                {tx('mobilityOSPage.mobility_os_neural_corridor_engine')}
              </div>
              <h1 className={styles.headline}>
                {tx('mobilityOSPage.a_living_operations_surface_driven_by_corridor_math_visible_trust_and_jordan_first_network_logic')}
              </h1>
              <p className={styles.subhead}>
                {tx('mobilityOSPage.instead_of_generic_dashboard_cards_this_screen_simulates_route_pressure_reliability_package_synchrony_and_recovery_posture_so_users_feel_the_system_is_intelligently_coordinating_movement')}
              </p>
            </div>
            <div className={styles.headerActions}>
              <WaselButton
                onClick={() => setPaused(v => !v)}
                variant={paused ? 'outline' : 'primary'}
                size="md"
                icon={paused ? <Play size={16} /> : <Pause size={16} />}
              >
                {paused ? 'Resume Field' : 'Pause Field'}
              </WaselButton>
              <WaselButton onClick={() => setTick(0)} variant="outline" size="md" icon={<RotateCcw size={16} />}>
                {tx('mobilityOSPage.reset_simulation')}
              </WaselButton>
            </div>
          </div>
        </section>

        {/* ── KPI strip ────────────────────────────────────────── */}
        <section className={styles.kpiStrip}>
          {([
            { label: 'Dispatch IQ',   value: String(network.dispatchIQ),          detail: 'Weighted intelligence score for trust, speed, and balance.', accent: 'cyan'   as Accent },
            { label: 'Throughput',    value: network.throughput + ' km',           detail: 'Predicted movement capacity across live corridors.',          accent: 'green'  as Accent },
            { label: 'Balance Index', value: network.balance + '%',                detail: 'Lower route variance means a calmer system feel.',            accent: 'gold'   as Accent },
            { label: 'Carbon Gain',   value: network.carbonGain + ' kg',           detail: 'Shared ride and parcel efficiency made visible.',             accent: 'purple' as Accent },
          ] as const).map(card => (
            <div
              key={card.label}
              className={styles.kpiCard + ' wasel-creative-stat-card'}
              style={{ borderColor: accentColor(card.accent) + '30', boxShadow: '0 18px 42px ' + accentColor(card.accent) + '18' }}
            >
              <div className={styles.kpiLabel}>{card.label}</div>
              <div className={styles.kpiValue} style={{ color: accentColor(card.accent) }}>{card.value}</div>
              <div className={styles.kpiDetail}>{card.detail}</div>
            </div>
          ))}
        </section>

        {/* ── Map + sidebar ────────────────────────────────────── */}
        <section className={styles.mapSection}>

          {/* Map panel */}
          <div className={styles.mapPanel}>
            <div className={styles.mapHeader}>
              <div className={styles.mapMeta}>
                <div className={styles.mapLens}>{TABS[tab]}</div>
                <h2 className={styles.mapTitle}>{tx('mobilityOSPage.jordan_corridor_constellation')}</h2>
                <p className={styles.mapDesc}>
                  {tx('mobilityOSPage.signal_view_exposes_route_health_as_a_legible_motion_field_while_math_fleet_and_recovery_modes_shift_the_explanation_layer_without_hiding_the_network')}
                </p>
              </div>
              <div className={styles.tabRow}>
                {(Object.keys(TABS) as TabKey[]).map(key => (
                  <WaselButton
                    key={key}
                    onClick={() => setTab(key)}
                    variant={tab === key ? 'primary' : 'outline'}
                    size="sm"
                    style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}
                  >
                    {TABS[key]}
                  </WaselButton>
                ))}
              </div>
            </div>

            <div className={styles.svgWrap}>
              {/* Overlay badges */}
              <div className={styles.mapOverlay}>
                <div className={styles.overlayChip}>
                  <Activity size={14} color="var(--primary)" />
                  {tx('mobilityOSPage.live_phase')}
                  {(tick * 100).toFixed(1)}%
                </div>
                <div
                  className={styles.liveChip}
                  style={{
                    background:   liveCorridors ? C.green + '18' : C.overlay,
                    border:       '1px solid ' + (liveCorridors ? C.green + '40' : 'var(--border)'),
                    color:        liveCorridors ? C.green : C.textMuted,
                  }}
                >
                  <span
                    className={styles.liveDot}
                    style={{
                      background: liveCorridors ? C.green : C.textDim,
                      boxShadow:  liveCorridors ? '0 0 6px ' + C.green : 'none',
                    }}
                  />
                  {liveCorridors ? 'Live \u2014 ' + String(liveCorridors.length) + ' corridors' : 'Simulation mode'}
                </div>
              </div>

              <svg
                viewBox="0 0 100 110"
                role="img"
                aria-label="Jordan mobility network \u2014 live corridor simulation"
                className={styles.svg}
              >
                {/* Route paths */}
                {routeStats.map(route => {
                  const from = route.fromNode;
                  const to   = route.toNode;
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const c1x = from.x + dx * 0.26; const c1y = from.y + dy * 0.08;
                  const c2x = from.x + dx * 0.76; const c2y = from.y + dy * 0.92;
                  const active = tab === 'signal'
                    || (tab === 'math'     && (route.id === hottest.id || route.id === weakest.id))
                    || (tab === 'fleet'    && route.packageSync > 0.35)
                    || tab === 'recovery';
                  const d = 'M ' + from.x + ' ' + from.y + ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + to.x + ' ' + to.y;
                  return (
                    <g key={route.id}>
                      <path d={d} fill="none" stroke="var(--border)" strokeWidth={0.85} strokeLinecap="round" />
                      <path
                        d={d}
                        fill="none"
                        stroke={accentColor(route.accent)}
                        strokeWidth={active ? 1.8 : 1.1}
                        strokeLinecap="round"
                        strokeOpacity={active ? 0.44 + route.load * 0.3 : 0.14}
                        className="wasel-creative-route-flow"
                      />
                      {(tab === 'math' || tab === 'recovery') && (
                        <g>
                          <rect
                            x={(from.x + to.x) / 2 - 4.3} y={(from.y + to.y) / 2 - 10}
                            width={8.6} height={4.2} rx={1.8}
                            fill={C.overlay} stroke={accentColor(route.accent) + '30'}
                          />
                          <text
                            x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7.1}
                            textAnchor="middle" fill="var(--foreground)" fontSize="1.7"
                          >{route.score}</text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* City nodes */}
                {NODES.map(node => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r={7}   fill={accentColor(node.accent) + '18'} className="wasel-creative-node-glow" />
                    <circle cx={node.x} cy={node.y} r={3.2} fill={accentColor(node.accent)} />
                    <circle cx={node.x} cy={node.y} r={1.1} fill="var(--foreground)" />
                    <text x={node.x} y={node.y - 8.4}  textAnchor="middle" fill="var(--foreground)"      fontSize="2.5">{node.name}</text>
                    <text x={node.x} y={node.y + 10.2} textAnchor="middle" fill="var(--muted-foreground)" fontSize="1.45">{node.subtitle}</text>
                  </g>
                ))}
