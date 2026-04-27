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
  Sparkles,
  TimerReset,
  Users,
} from 'lucide-react';
import { WaselLogo } from '../../components/wasel-ds/WaselLogo';
import { C, F, FM, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import { QuantumMobilityMap } from './QuantumMobilityMap';

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
  { id: 'r3', from: 'amman', to: 'madaba', distance: 31, eta: 34, demand: 0.58, packageBias: 0.29, importance: 0.6, phase: 0.68, accent: 'cyan' },
  { id: 'r4', from: 'madaba', to: 'karak', distance: 111, eta: 73, demand: 0.61, packageBias: 0.38, importance: 0.68, phase: 1.1, accent: 'gold' },
  { id: 'r5', from: 'karak', to: 'aqaba', distance: 203, eta: 112, demand: 0.72, packageBias: 0.48, importance: 0.74, phase: 1.56, accent: 'green' },
  { id: 'r6', from: 'amman', to: 'aqaba', distance: 332, eta: 235, demand: 0.93, packageBias: 0.57, importance: 0.95, phase: 2.04, accent: 'gold' },
  { id: 'r7', from: 'irbid', to: 'zarqa', distance: 79, eta: 67, demand: 0.53, packageBias: 0.31, importance: 0.55, phase: 2.48, accent: 'purple' },
] as const;

const UNITS: { id: string; routeId: string; type: UnitType; accent: Accent; phase: number; lane: number; speed: number; dir: 1 | -1 }[] = [
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
const variance = (values: number[]) => {
  const mean = avg(values);
  return avg(values.map((value) => (value - mean) ** 2));
};

function accentColor(accent: Accent) {
  return accent === 'green' ? C.green : accent === 'gold' ? '#f59a2c' : accent === 'purple' ? C.purple : '#f59a2c';
}

function panelStyle(extra: CSSProperties = {}) {
  return {
    position: 'relative',
    background: 'linear-gradient(180deg, rgba(9,20,36,0.92), rgba(6,14,28,0.96))',
    border: `1px solid ${C.border}`,
    borderRadius: 24,
    boxShadow: SH.lg,
    overflow: 'hidden',
    ...extra,
  } as CSSProperties;
}

export default function MobilityOSPage() {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<TabKey>('signal');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return undefined;
    const loop = () => {
      setTick((prev) => (prev + 0.0035) % 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paused]);

  const routeStats = useMemo(() => {
    const nodeMap = Object.fromEntries(NODES.map((node) => [node.id, node]));
    return ROUTES.map((route) => {
      const fromNode = nodeMap[route.from];
      const toNode = nodeMap[route.to];
      const wave = 0.5 + 0.5 * Math.sin((tick + route.phase) * Math.PI * 2.2);
      const load = clamp(route.demand * 0.66 + route.importance * 0.22 + route.packageBias * 0.12 + (wave - 0.5) * 0.22, 0.12, 0.98);
      const reliability = clamp(((fromNode.resilience + toNode.resilience) / 2) * 0.76 + (1 - load) * 0.24, 0.56, 0.99);
      const speedIndex = clamp(1.24 - load * 0.48 + reliability * 0.15, 0.58, 1.28);
      const packageSync = clamp(route.packageBias * 0.58 + wave * 0.22 + reliability * 0.2, 0.12, 0.98);
      const score = Math.round(clamp(load * 0.38 + reliability * 0.34 + (speedIndex / 1.28) * 0.28, 0, 1) * 100);
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
      dispatchIQ: Math.round(clamp(avg(routeStats.map((route) => route.score)) * 0.44 + (100 - Math.sqrt(variance(loads)) * 170) * 0.24 + avg(speeds) * 100 * 0.32, 72, 99)),
      balance: Math.round(clamp(100 - Math.sqrt(variance(loads)) * 170, 58, 99)),
      resilience: Math.round(avg(reliabilities) * 100),
      throughput: Math.round(routeStats.reduce((sum, route) => sum + route.distance * route.speedIndex * (0.62 + route.load * 0.54), 0)),
      agentSync: Math.round(clamp(72 + avg(routeStats.map((route) => route.packageSync)) * 16 + (1 - Math.sqrt(variance(reliabilities))) * 9, 75, 98)),
      carbonGain: Math.round(routeStats.reduce((sum, route) => sum + route.distance * route.packageSync * route.load * 0.09, 0)),
    };
  }, [routeStats]);

  const hottest = routeStats[0];
  const weakest = [...routeStats].sort((a, b) => a.reliability - b.reliability)[0];

  return (
    <div style={{ minHeight: '100vh', background: `${GRAD_AURORA}, radial-gradient(circle at 82% 18%, rgba(168,214,20,0.16), transparent 22%), ${C.bg}`, color: C.text, fontFamily: F, padding: '24px 16px 44px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={panelStyle({ padding: 26, borderRadius: 32 })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 840, display: 'grid', gap: 12 }}>
              <div style={{ display: 'inline-flex', padding: '10px 14px', borderRadius: R.full, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', width: 'fit-content' }}>
            <WaselLogo size={44} theme="light" variant="full" showWordmark={false} />
              </div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59a2c' }}>Mobility OS / Neural Corridor Engine</div>
              <h1 style={{ margin: 0, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 0.98, letterSpacing: '-0.04em' }}>
                A living operations surface driven by corridor math, visible trust, and Jordan-first network logic.
              </h1>
              <p style={{ margin: 0, color: C.textSub, lineHeight: 1.75, fontSize: '1.02rem', maxWidth: 760 }}>
                Instead of generic dashboard cards, this screen simulates route pressure, reliability, package synchrony, and recovery posture so users feel the system is intelligently coordinating movement.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['I(t)=0.44S+0.24B+0.32V', 'B(t)=100-sqrt(variance(load))', 'ETA=f(speed,reliability,drift)'].map((formula) => (
                  <div key={formula} style={{ padding: '10px 14px', borderRadius: 16, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', fontFamily: FM, fontSize: '0.84rem' }}>
                    {formula}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <button onClick={() => setPaused((value) => !value)} style={{ height: 44, padding: '0 18px', borderRadius: R.full, border: `1px solid ${paused ? C.border : 'rgba(245,154,44,0.4)'}`, background: paused ? 'rgba(255,255,255,0.04)' : 'rgba(245,154,44,0.15)', color: paused ? C.text : '#f59a2c', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, cursor: 'pointer' }}>
                {paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume Field' : 'Pause Field'}
              </button>
              <button onClick={() => setTick(0)} style={{ height: 44, padding: '0 18px', borderRadius: R.full, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)', color: C.text, display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                <RotateCcw size={16} />Reset Simulation
              </button>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { label: 'Dispatch IQ', value: `${network.dispatchIQ}`, detail: 'Weighted intelligence score for trust, speed, and balance.', accent: 'gold' as Accent },
            { label: 'Throughput', value: `${network.throughput} km`, detail: 'Predicted movement capacity across live corridors.', accent: 'green' as Accent },
            { label: 'Balance Index', value: `${network.balance}%`, detail: 'Lower route variance means a calmer system feel.', accent: 'gold' as Accent },
            { label: 'Carbon Gain', value: `${network.carbonGain} kg`, detail: 'Shared ride + parcel efficiency made visible.', accent: 'green' as Accent },
          ].map((card) => (
            <div key={card.label} style={panelStyle({ padding: 18, borderRadius: 22, border: `1px solid ${accentColor(card.accent)}30`, boxShadow: `0 18px 42px ${accentColor(card.accent)}18`, background: 'linear-gradient(180deg, rgba(9,20,36,0.95), rgba(6,14,28,0.96))' })}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: C.textMuted }}>{card.label}</div>
              <div style={{ marginTop: 12, fontSize: '2rem', lineHeight: 1, fontWeight: 900, color: accentColor(card.accent) }}>{card.value}</div>
              <div style={{ marginTop: 10, color: C.textSub, lineHeight: 1.5, fontSize: '0.9rem' }}>{card.detail}</div>
            </div>
          ))}
        </section>

        <section style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)' }}>
          <div style={panelStyle({ padding: 18, borderRadius: 28, minHeight: 620 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.16em', color: C.textMuted, textTransform: 'uppercase' }}>{TABS[tab]}</div>
                <h2 style={{ margin: '10px 0 6px', fontSize: '1.4rem' }}>Jordan corridor constellation</h2>
                <p style={{ margin: 0, color: C.textSub, maxWidth: 620, lineHeight: 1.65 }}>
                  Signal view exposes route health as a legible motion field, while math, fleet, and recovery modes shift the explanation layer without hiding the network.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.keys(TABS) as TabKey[]).map((key) => (
                  <button key={key} onClick={() => setTab(key)} style={{ height: 38, padding: '0 14px', borderRadius: R.full, border: `1px solid ${tab === key ? '#f59a2c' : C.border}`, background: tab === key ? 'rgba(245,154,44,0.15)' : 'rgba(255,255,255,0.03)', color: tab === key ? '#f59a2c' : C.textMuted, cursor: 'pointer', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                    {TABS[key]}
                  </button>
                ))}
              </div>
            </div>

            <div style={panelStyle({ minHeight: 520, padding: 0, borderRadius: 24, border: `1px solid ${C.borderFaint}`, position: 'relative' })}>
              <QuantumMobilityMap />
              <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 2, display: 'grid', gap: 8, pointerEvents: 'none' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 14, background: 'rgba(4,12,24,0.74)', border: `1px solid ${C.border}`, fontSize: '0.78rem' }}>
                  <Activity size={14} color="#f59a2c" />Live phase {(tick * 100).toFixed(1)}%
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.72)', border: `1px solid ${C.borderFaint}`, fontFamily: FM, color: C.textSub, fontSize: '0.78rem' }}>
                  score = 0.38 demand + 0.34 reliability + 0.28 velocity
                </div>
              </div>

              <svg viewBox="0 0 100 110" style={{ width: '100%', height: '100%', display: 'none' }}>
                {routeStats.map((route) => {
                  const from = route.fromNode;
                  const to = route.toNode;
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const c1x = from.x + dx * 0.26;
                  const c1y = from.y + dy * 0.08;
                  const c2x = from.x + dx * 0.76;
                  const c2y = from.y + dy * 0.92;
                  const active = tab === 'signal' || (tab === 'math' && (route.id === hottest.id || route.id === weakest.id)) || (tab === 'fleet' && route.packageSync > 0.35) || tab === 'recovery';
                  return (
                    <g key={route.id}>
                      <path d={`M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.85} strokeLinecap="round" />
                      <path d={`M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`} fill="none" stroke={accentColor(route.accent)} strokeWidth={active ? 1.8 : 1.1} strokeLinecap="round" strokeOpacity={active ? 0.44 + route.load * 0.3 : 0.14} />
                      {(tab === 'math' || tab === 'recovery') && (
                        <g>
                          <rect x={(from.x + to.x) / 2 - 4.3} y={(from.y + to.y) / 2 - 10} width={8.6} height={4.2} rx={1.8} fill="rgba(4,12,24,0.78)" stroke={`${accentColor(route.accent)}30`} />
                          <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 7.1} textAnchor="middle" fill={C.text} fontSize="1.7">{route.score}</text>
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
                    <text x={node.x} y={node.y - 8.4} textAnchor="middle" fill={C.text} fontSize="2.5">{node.name}</text>
                    <text x={node.x} y={node.y + 10.2} textAnchor="middle" fill={C.textMuted} fontSize="1.45">{node.subtitle}</text>
                  </g>
                ))}
                {UNITS
                  .filter((unit) => tab === 'signal' || (tab === 'fleet' && unit.type === 'ride') || (tab === 'recovery' && unit.type === 'package') || tab === 'math')
                  .map((unit, index) => {
                    const route = routeStats.find((entry) => entry.id === unit.routeId);
                    if (!route) return null;
                    const from = route.fromNode;
                    const to = route.toNode;
                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const c1 = { x: from.x + dx * 0.26, y: from.y + dy * 0.08 };
                    const c2 = { x: from.x + dx * 0.76, y: from.y + dy * 0.92 };
                    const t = (unit.phase + tick * unit.speed * 100 * unit.dir + 1) % 1;
                    const mt = 1 - t;
                    const x = mt ** 3 * from.x + 3 * mt ** 2 * t * c1.x + 3 * mt * t ** 2 * c2.x + t ** 3 * to.x;
                    const y = mt ** 3 * from.y + 3 * mt ** 2 * t * c1.y + 3 * mt * t ** 2 * c2.y + t ** 3 * to.y;
                    const tx = 3 * mt ** 2 * (c1.x - from.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t ** 2 * (to.x - c2.x);
                    const ty = 3 * mt ** 2 * (c1.y - from.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t ** 2 * (to.y - c2.y);
                    const length = Math.max(0.001, Math.hypot(tx, ty));
                    const nx = (-ty / length) * unit.lane;
                    const ny = (tx / length) * unit.lane;
                    const rotation = Math.atan2(ty, tx) * (180 / Math.PI);
                    return (
                      <g key={unit.id} transform={`translate(${x + nx} ${y + ny}) rotate(${rotation})`} opacity={clamp(0.52 + Math.sin(tick * 14 + index) * 0.22, 0.36, 0.98)}>
                        {unit.type === 'ride'
                          ? <rect x={-2.8} y={-1.6} width={5.6} height={3.2} rx={1.2} fill={accentColor(unit.accent)} />
                          : <rect x={-2} y={-2} width={4} height={4} rx={1.1} fill={C.gold} />}
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div style={panelStyle({ padding: 18, borderRadius: 24 })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Gauge size={18} color="#f59a2c" /><h3 style={{ margin: 0, fontSize: '1.02rem' }}>Corridor leaderboard</h3></div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {routeStats.map((route) => (
                  <div key={route.id} style={{ padding: '12px 14px', borderRadius: 18, border: `1px solid ${accentColor(route.accent)}2a`, background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{route.fromNode.name} {'->'} {route.toNode.name}</div>
                        <div style={{ marginTop: 4, color: C.textMuted, fontSize: '0.82rem' }}>{route.distance} km / ETA {route.etaLive} min</div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: accentColor(route.accent) }}>{route.score}</div>
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {[{ label: 'Load', value: route.load, color: '#f59a2c' }, { label: 'Reliability', value: route.reliability, color: C.green }, { label: 'Package sync', value: route.packageSync, color: '#f59a2c' }].map((metric) => (
                        <div key={metric.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: C.textMuted }}><span>{metric.label}</span><span>{Math.round(metric.value * 100)}%</span></div>
                          <div style={{ marginTop: 6, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                            <div style={{ width: `${metric.value * 100}%`, height: '100%', borderRadius: 999, background: metric.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={panelStyle({ padding: 18, borderRadius: 24 })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Brain size={18} color={C.purple} /><h3 style={{ margin: 0, fontSize: '1.02rem' }}>Decision engine</h3></div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {[
                  `${hottest.fromNode.name} -> ${hottest.toNode.name} is carrying the hottest demand wave at ${Math.round(hottest.load * 100)}% load.`,
                  `${weakest.fromNode.name} -> ${weakest.toNode.name} is the first corridor to protect if reliability slips further.`,
                  `${routeStats[0].fromNode.name} -> ${routeStats[0].toNode.name} sets the current corridor benchmark with a score of ${routeStats[0].score}.`,
                ].map((line, index) => (
                  <article key={line} style={{ padding: '14px 16px', borderRadius: 18, border: `1px solid ${index === 1 ? C.purpleDim : C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSub, lineHeight: 1.65 }}>
                    {line}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { icon: TimerReset, title: 'Scenario tuning', value: TABS[tab], body: 'The UI changes by operational lens without hiding the network.', accent: C.cyan },
            { icon: Users, title: 'Agent synchrony', value: `${network.agentSync}%`, body: 'Ride and package layers are paced to feel orchestrated, not random.', accent: C.green },
            { icon: ShieldCheck, title: 'Recovery posture', value: `${network.resilience}%`, body: 'Risk is framed as control logic instead of generic warning noise.', accent: C.gold },
            { icon: AlertTriangle, title: 'ETA drift', value: `${Math.max(0, weakest.etaLive - weakest.eta)} min`, body: `${weakest.fromNode.name} -> ${weakest.toNode.name} is the main watch corridor.`, accent: C.purple },
            { icon: CarFront, title: 'Fleet pressure', value: `${Math.round(hottest.load * 100)}%`, body: `${hottest.fromNode.name} -> ${hottest.toNode.name} is carrying the highest live demand.`, accent: accentColor(hottest.accent) },
            { icon: Activity, title: 'Math core', value: `${network.dispatchIQ}`, body: 'Intelligence score blended from route score, balance, and velocity.', accent: '#f59a2c' },
          ].map((card) => (
            <article key={card.title} style={panelStyle({ padding: 18, borderRadius: 22 })}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: `${card.accent}18`, border: `1px solid ${card.accent}28`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <card.icon size={18} color={card.accent} />
                </div>
                <div style={{ fontSize: '1.24rem', fontWeight: 900, color: card.accent }}>{card.value}</div>
              </div>
              <h3 style={{ margin: '14px 0 8px', fontSize: '1rem' }}>{card.title}</h3>
              <p style={{ margin: 0, color: C.textSub, lineHeight: 1.62, fontSize: '0.92rem' }}>{card.body}</p>
            </article>
          ))}
        </section>

        <section style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {[
            { title: 'Signal equation', formula: 'dispatchIQ = 0.44 * score + 0.24 * balance + 0.32 * velocity', accent: '#f59a2c' },
            { title: 'Balance equation', formula: 'balance = 100 - sqrt(variance(load[1..n])) * 170', accent: '#f59a2c' },
            { title: 'Recovery equation', formula: 'resilience = nodeStability * 0.76 + (1 - load) * 0.24', accent: C.green },
          ].map((item) => (
            <article key={item.title} style={panelStyle({ padding: 18, borderRadius: 22 })}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: item.accent, fontWeight: 800 }}><Sparkles size={15} />{item.title}</div>
              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 16, border: `1px solid ${item.accent}2c`, background: `${item.accent}14`, fontFamily: FM, fontSize: '0.9rem' }}>{item.formula}</div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

