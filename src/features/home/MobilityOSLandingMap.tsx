import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Gauge, Package, Route, Sparkles } from 'lucide-react';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';

type PeriodId = 'morning' | 'midday' | 'evening' | 'night';
type City = { id: number; name: string; lat: number; lon: number; hub?: boolean };
type Corridor = { id: string; from: number; to: number; distanceKm: number; passengerBase: number; packageBase: number; importance: number };
type CorridorState = Corridor & { passengerFlow: number; packageFlow: number; totalFlow: number; congestion: number; speedKph: number; score: number };

const UI = { text: '#EFF6FF', muted: 'rgba(239,246,255,0.72)', soft: 'rgba(239,246,255,0.52)', border: 'rgba(255,255,255,0.08)', borderStrong: 'rgba(85,233,255,0.18)', cyan: '#55E9FF', blue: '#1EA1FF', gold: '#F5B11E', green: '#33E85F', coral: '#FF8A5B' } as const;
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";
const PERIODS = [
  { id: 'morning' as const, label: 'Morning rush', time: '07:30', detail: 'Commuters dominate the northern and capital corridors.', passengerBoost: 1.32, packageBoost: 0.86, congestionBias: 0.24, top: '#09182A', bottom: '#06111E', glow: 'rgba(255,186,104,0.16)' },
  { id: 'midday' as const, label: 'Midday flow', time: '13:00', detail: 'Package movement stays active while rider pressure softens.', passengerBoost: 0.94, packageBoost: 1.18, congestionBias: 0.12, top: '#07192A', bottom: '#061320', glow: 'rgba(85,233,255,0.14)' },
  { id: 'evening' as const, label: 'Evening rush', time: '18:15', detail: 'Return trips intensify around Amman and Zarqa.', passengerBoost: 1.26, packageBoost: 0.92, congestionBias: 0.22, top: '#121523', bottom: '#08111C', glow: 'rgba(255,138,91,0.16)' },
  { id: 'night' as const, label: 'Night calm', time: '22:30', detail: 'The network cools and calmer routes are easier to predict.', passengerBoost: 0.56, packageBoost: 0.72, congestionBias: -0.02, top: '#040D19', bottom: '#020814', glow: 'rgba(85,233,255,0.10)' },
] as const;
const CITIES: readonly City[] = [
  { id: 0, name: 'Amman', lat: 31.9454, lon: 35.9284, hub: true }, { id: 1, name: 'Aqaba', lat: 29.532, lon: 35.0063, hub: true }, { id: 2, name: 'Irbid', lat: 32.5556, lon: 35.85, hub: true }, { id: 3, name: 'Zarqa', lat: 32.0728, lon: 36.088, hub: true }, { id: 4, name: 'Mafraq', lat: 32.3406, lon: 36.208 }, { id: 5, name: 'Jerash', lat: 32.2803, lon: 35.8993 }, { id: 6, name: 'Ajloun', lat: 32.3326, lon: 35.7519 }, { id: 7, name: 'Madaba', lat: 31.7197, lon: 35.7936 }, { id: 8, name: 'Karak', lat: 31.1853, lon: 35.7048 }, { id: 9, name: 'Tafila', lat: 30.8375, lon: 35.6042 }, { id: 10, name: "Ma'an", lat: 30.1962, lon: 35.736 }, { id: 11, name: 'Salt', lat: 32.0392, lon: 35.7272 },
] as const;
const CORRIDORS: readonly Corridor[] = [
  { id: 'amman-zarqa', from: 0, to: 3, distanceKm: 25, passengerBase: 980, packageBase: 180, importance: 1.1 }, { id: 'amman-irbid', from: 0, to: 2, distanceKm: 85, passengerBase: 860, packageBase: 220, importance: 1.05 }, { id: 'amman-aqaba', from: 0, to: 1, distanceKm: 335, passengerBase: 620, packageBase: 310, importance: 1.02 }, { id: 'irbid-zarqa', from: 2, to: 3, distanceKm: 79, passengerBase: 690, packageBase: 170, importance: 0.94 }, { id: 'amman-jerash', from: 0, to: 5, distanceKm: 48, passengerBase: 520, packageBase: 110, importance: 0.76 }, { id: 'amman-madaba', from: 0, to: 7, distanceKm: 33, passengerBase: 470, packageBase: 120, importance: 0.72 }, { id: 'madaba-karak', from: 7, to: 8, distanceKm: 111, passengerBase: 340, packageBase: 160, importance: 0.74 }, { id: 'karak-tafila', from: 8, to: 9, distanceKm: 74, passengerBase: 220, packageBase: 120, importance: 0.58 }, { id: 'tafila-maan', from: 9, to: 10, distanceKm: 89, passengerBase: 190, packageBase: 110, importance: 0.52 }, { id: 'maan-aqaba', from: 10, to: 1, distanceKm: 114, passengerBase: 280, packageBase: 180, importance: 0.62 }, { id: 'zarqa-mafraq', from: 3, to: 4, distanceKm: 55, passengerBase: 410, packageBase: 150, importance: 0.7 }, { id: 'irbid-ajloun', from: 2, to: 6, distanceKm: 30, passengerBase: 310, packageBase: 90, importance: 0.56 },
] as const;
const BORDER = [{ lat: 33.37, lon: 35.55 }, { lat: 32.58, lon: 36.42 }, { lat: 31.24, lon: 37.12 }, { lat: 29.62, lon: 36.22 }, { lat: 29.2, lon: 35.03 }, { lat: 31.2, lon: 35.5 }, { lat: 32.56, lon: 35.55 }] as const;
const bounds = CITIES.reduce((acc, city) => ({ minLat: Math.min(acc.minLat, city.lat), maxLat: Math.max(acc.maxLat, city.lat), minLon: Math.min(acc.minLon, city.lon), maxLon: Math.max(acc.maxLon, city.lon) }), { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity });

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const pressureLabel = (congestion: number) => congestion >= 0.78 ? 'Rush' : congestion >= 0.58 ? 'Busy' : congestion >= 0.36 ? 'Steady' : 'Calm';
const corridorName = (corridor: CorridorState) => `${CITIES[corridor.from].name} -> ${CITIES[corridor.to].name}`;
const insightFor = (corridor: CorridorState, period: (typeof PERIODS)[number]) => corridor.congestion >= 0.74 ? `Peak ${period.label.toLowerCase()} pressure makes this lane strongest for dense ride matching.` : corridor.packageFlow > corridor.passengerFlow * 0.33 ? 'Package demand is attaching well here, so mixed movement stays efficient.' : corridor.speedKph >= 88 ? 'This corridor is moving cleanly, making it a strong low-friction option.' : 'Balanced demand and manageable pressure make this corridor reliable.';

function project(lat: number, lon: number, width: number, height: number) {
  const px = width * 0.08;
  const py = height * 0.08;
  const x = px + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width - px * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = py + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (height - py * 2);
  return { x, y };
}

function controlPoint(from: { x: number; y: number }, to: { x: number; y: number }, seed: number, weight: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const midpointX = (from.x + to.x) / 2;
  const midpointY = (from.y + to.y) / 2;
  const offset = (16 + weight * 15 + (seed % 4) * 3) * (seed % 2 === 0 ? 1 : -1);
  return { x: midpointX - (dy / length) * offset, y: midpointY + (dx / length) * offset };
}

function pointOnCurve(start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  return { x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x, y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y };
}

export function MobilityOSLandingMap() {
  const navigate = useIframeSafeNavigate();
  const [periodId, setPeriodId] = useState<PeriodId>('morning');
  const [selectedId, setSelectedId] = useState('amman-zarqa');
  const [size, setSize] = useState({ width: 920, height: 620 });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const period = useMemo(() => PERIODS.find((item) => item.id === periodId) ?? PERIODS[0], [periodId]);
  const corridors = useMemo<readonly CorridorState[]>(() => CORRIDORS.map((corridor) => {
    const passengerFlow = Math.round(corridor.passengerBase * period.passengerBoost * (0.92 + corridor.importance * 0.18));
    const packageFlow = Math.round(corridor.packageBase * period.packageBoost * (0.94 + corridor.importance * 0.16));
    const totalFlow = passengerFlow + packageFlow;
    const congestion = clamp(0.12 + period.congestionBias + passengerFlow / 1500 + corridor.importance * 0.08 + corridor.distanceKm / 2200, 0.1, 0.94);
    const speedKph = Math.round(clamp(118 - congestion * 62 - corridor.distanceKm * 0.035, 34, 118));
    const score = Math.round(clamp((1 - congestion) * 44 + clamp(totalFlow / 1100, 0, 1.25) * 24 + corridor.importance * 22 + (packageFlow / Math.max(totalFlow, 1)) * 12, 18, 99));
    return { ...corridor, passengerFlow, packageFlow, totalFlow, congestion, speedKph, score };
  }), [period]);
  const byScore = useMemo(() => [...corridors].sort((a, b) => b.score - a.score), [corridors]);
  const byVolume = useMemo(() => [...corridors].sort((a, b) => b.totalFlow - a.totalFlow), [corridors]);
  const byCalm = useMemo(() => [...corridors].sort((a, b) => a.congestion - b.congestion), [corridors]);
  const best = byScore[0];
  const busiest = byVolume[0];
  const calmest = byCalm[0];
  const selected = corridors.find((item) => item.id === selectedId) ?? best;
  const totalPassengers = corridors.reduce((sum, corridor) => sum + corridor.passengerFlow, 0);
  const totalPackages = corridors.reduce((sum, corridor) => sum + corridor.packageFlow, 0);
  const selectedRoutePath = selected
    ? `/app/find-ride?from=${encodeURIComponent(CITIES[selected.from].name)}&to=${encodeURIComponent(CITIES[selected.to].name)}&search=1`
    : '/app/find-ride';

  useEffect(() => {
    if (!corridors.some((item) => item.id === selectedId) && best) setSelectedId(best.id);
  }, [best, corridors, selectedId]);

  useEffect(() => {
    const update = () => {
      const node = wrapRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(320, rect.width), height: Math.max(420, rect.height) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(size.width * dpr) || canvas.height !== Math.round(size.height * dpr)) {
        canvas.width = Math.round(size.width * dpr);
        canvas.height = Math.round(size.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      const background = ctx.createLinearGradient(0, 0, 0, size.height);
      background.addColorStop(0, period.top);
      background.addColorStop(1, period.bottom);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);
      const glow = ctx.createRadialGradient(size.width * 0.24, size.height * 0.16, 0, size.width * 0.24, size.height * 0.16, size.width * 0.5);
      glow.addColorStop(0, period.glow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.beginPath();
      BORDER.forEach((point, index) => {
        const projected = project(point.lat, point.lon, size.width, size.height);
        if (index === 0) ctx.moveTo(projected.x, projected.y); else ctx.lineTo(projected.x, projected.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.024)';
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
      corridors.forEach((corridor, index) => {
        const from = project(CITIES[corridor.from].lat, CITIES[corridor.from].lon, size.width, size.height);
        const to = project(CITIES[corridor.to].lat, CITIES[corridor.to].lon, size.width, size.height);
        const control = controlPoint(from, to, index, corridor.importance + corridor.totalFlow / 1500);
        const active = corridor.id === selected.id;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = `rgba(85,233,255,${active ? 0.96 : 0.34 + corridor.passengerFlow / 2200})`;
        ctx.lineWidth = (active ? 2.8 : 1.5) + corridor.passengerFlow / 420;
        ctx.shadowBlur = active ? 22 : 14;
        ctx.shadowColor = active ? 'rgba(85,233,255,0.62)' : 'rgba(85,233,255,0.24)';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.setLineDash([6, 9]);
        ctx.strokeStyle = `rgba(245,177,30,${active ? 0.88 : 0.26 + corridor.packageFlow / 1200})`;
        ctx.lineWidth = (active ? 2.4 : 1.1) + corridor.packageFlow / 280;
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < clamp(Math.round(corridor.passengerFlow / 260), 1, 5); i += 1) {
          const t = (time * 0.000045 * (1 + i * 0.12) + i / 4 + index * 0.07) % 1;
          const point = pointOnCurve(from, control, to, t);
          ctx.beginPath();
          ctx.arc(point.x, point.y, active ? 3 : 2.3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(228,253,255,0.94)';
          ctx.shadowBlur = active ? 18 : 10;
          ctx.shadowColor = 'rgba(85,233,255,0.56)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        for (let i = 0; i < clamp(Math.round(corridor.packageFlow / 120), 1, 4); i += 1) {
          const t = 1 - ((time * 0.000032 * (1 + i * 0.08) + i / 3 + index * 0.05) % 1);
          const point = pointOnCurve(from, control, to, t);
          ctx.fillStyle = 'rgba(255,219,134,0.95)';
          ctx.fillRect(point.x - 2.5, point.y - 2.5, 5, 5);
        }
      });
      CITIES.forEach((city) => {
        const point = project(city.lat, city.lon, size.width, size.height);
        const endpoint = city.id === selected.from || city.id === selected.to;
        const label = city.hub || endpoint;
        const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, endpoint ? 22 : city.hub ? 16 : 11);
        halo.addColorStop(0, endpoint ? 'rgba(85,233,255,0.24)' : 'rgba(255,255,255,0.16)');
        halo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(point.x, point.y, endpoint ? 22 : city.hub ? 16 : 11, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(point.x, point.y, endpoint ? 5.4 : city.hub ? 4.7 : 3.6, 0, Math.PI * 2);
        ctx.fillStyle = endpoint ? '#FFFFFF' : city.hub ? 'rgba(239,246,255,0.94)' : 'rgba(239,246,255,0.78)';
        ctx.fill();
        if (label) {
          ctx.font = `${endpoint ? 700 : 600} 12px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillStyle = endpoint ? '#FFFFFF' : 'rgba(239,246,255,0.72)';
          ctx.fillText(city.name, point.x, point.y - (endpoint ? 16 : 14));
        }
      });
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, [corridors, period, selected, size]);

  return (
    <section style={{ display: 'grid', gap: 16, fontFamily: FONT }}>
      <style>{`@media (max-width:1080px){.landing-map-layout{grid-template-columns:1fr!important}}@media (max-width:760px){.landing-map-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.landing-map-toolbar{flex-direction:column!important;align-items:stretch!important}.landing-map-periods{grid-template-columns:1fr 1fr!important}}@media (max-width:560px){.landing-map-summary,.landing-map-periods{grid-template-columns:1fr!important}}`}</style>
      <div className="landing-map-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {[{ label: 'Current window', value: `${period.label} / ${period.time}`, accent: UI.cyan }, { label: 'Best corridor', value: best ? corridorName(best) : '-', accent: UI.green }, { label: 'Most trafficked', value: busiest ? corridorName(busiest) : '-', accent: UI.gold }, { label: 'Calmest corridor', value: calmest ? corridorName(calmest) : '-', accent: UI.blue }].map((item) => (
          <div key={item.label} style={{ borderRadius: 22, padding: '16px 18px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))', border: `1px solid ${UI.border}`, boxShadow: '0 16px 36px rgba(0,0,0,0.18)' }}>
            <div style={{ color: UI.soft, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>{item.label}</div>
            <div style={{ marginTop: 8, color: item.accent, fontSize: '1rem', lineHeight: 1.4, fontWeight: 900, letterSpacing: '-0.03em' }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div className="landing-map-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(300px,0.75fr)', gap: 16 }}>
        <div style={{ borderRadius: 34, padding: 18, background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))', border: `1px solid ${UI.border}`, boxShadow: '0 30px 80px rgba(0,0,0,0.26)' }}>
          <div className="landing-map-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 16 }}>
            <div style={{ maxWidth: 460 }}>
              <div style={{ color: UI.cyan, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 900 }}>Mobility OS map</div>
              <h2 style={{ margin: '8px 0', color: UI.text, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', lineHeight: 1.05, letterSpacing: '-0.05em', fontWeight: 950 }}>Watch how city-to-city corridors move people and packages together.</h2>
              <p style={{ margin: 0, color: UI.muted, fontSize: '0.96rem', lineHeight: 1.7 }}>Switch the time window to compare rush periods and calmer hours, then read the strongest lanes directly from the map.</p>
            </div>
            <div className="landing-map-periods" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, minWidth: 'min(100%, 360px)' }}>
              {PERIODS.map((item) => {
                const active = item.id === period.id;
                return <button key={item.id} type="button" onClick={() => setPeriodId(item.id)} style={{ padding: '12px 14px', borderRadius: 18, border: `1px solid ${active ? UI.borderStrong : UI.border}`, background: active ? 'linear-gradient(135deg, rgba(85,233,255,0.12), rgba(30,161,255,0.08))' : 'rgba(255,255,255,0.03)', color: active ? UI.text : UI.muted, textAlign: 'left', cursor: 'pointer', boxShadow: active ? '0 12px 30px rgba(30,161,255,0.12)' : 'none' }}><div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{item.label}</div><div style={{ marginTop: 4, fontSize: '0.72rem', color: active ? UI.cyan : UI.soft }}>{item.time}</div></button>;
              })}
            </div>
          </div>
          <div ref={wrapRef} style={{ position: 'relative', minHeight: 'clamp(420px, 54vw, 680px)', borderRadius: 28, overflow: 'hidden', border: `1px solid ${UI.border}`, background: '#040C18' }}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', minHeight: 'clamp(420px, 54vw, 680px)', filter: 'saturate(1.15) contrast(1.06) brightness(1.04)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            {[{ label: 'People moving', value: totalPassengers.toLocaleString('en-US'), color: UI.cyan, icon: Route }, { label: 'Packages moving', value: totalPackages.toLocaleString('en-US'), color: UI.gold, icon: Package }].map((item) => {
              const Icon = item.icon;
              return <div key={item.label} style={{ borderRadius: 20, padding: '14px 15px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${UI.border}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={15} color={item.color} /><span style={{ color: UI.soft, fontSize: '0.74rem', fontWeight: 700 }}>{item.label}</span></div><div style={{ marginTop: 8, color: item.color, fontSize: '1.04rem', fontWeight: 900 }}>{item.value}</div></div>;
            })}
          </div>
        </div>
        <aside style={{ display: 'grid', gap: 16 }}>
          <div style={{ borderRadius: 30, padding: '18px 18px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))', border: `1px solid ${UI.border}`, boxShadow: '0 28px 70px rgba(0,0,0,0.2)' }}>
            <div style={{ color: UI.cyan, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>Selected corridor</div>
            <div style={{ marginTop: 8, color: UI.text, fontSize: '1.45rem', fontWeight: 950, letterSpacing: '-0.04em' }}>{selected ? corridorName(selected) : '-'}</div>
            <p style={{ margin: '10px 0 0', color: UI.muted, fontSize: '0.88rem', lineHeight: 1.7 }}>{selected ? insightFor(selected, period) : ''}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 16 }}>
              {selected && [{ label: 'Route score', value: `${selected.score}/100`, accent: UI.green, icon: Sparkles }, { label: 'Travel speed', value: `${selected.speedKph} km/h`, accent: UI.cyan, icon: Gauge }, { label: 'Pressure', value: pressureLabel(selected.congestion), accent: UI.coral, icon: Clock3 }, { label: 'Distance', value: `${selected.distanceKm} km`, accent: UI.gold, icon: Route }].map((metric) => {
                const Icon = metric.icon;
                return <div key={metric.label} style={{ borderRadius: 18, padding: '13px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${UI.border}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon size={15} color={metric.accent} /><span style={{ color: UI.soft, fontSize: '0.74rem', fontWeight: 700 }}>{metric.label}</span></div><div style={{ marginTop: 9, color: metric.accent, fontSize: '1rem', fontWeight: 900 }}>{metric.value}</div></div>;
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => navigate(selectedRoutePath)}
                style={{
                  height: 44,
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, rgba(85,233,255,0.22), rgba(30,161,255,0.16))',
                  color: UI.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Search this route
              </button>
              <button
                type="button"
                onClick={() => navigate('/app/mobility-os')}
                style={{
                  height: 44,
                  borderRadius: 16,
                  border: `1px solid ${UI.borderStrong}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: UI.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Open full map
              </button>
            </div>
          </div>
          <div style={{ borderRadius: 30, padding: '18px 18px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))', border: `1px solid ${UI.border}`, boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ color: UI.gold, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>Corridor ranking</div>
            <div style={{ marginTop: 8, color: UI.text, fontSize: '1.18rem', fontWeight: 900 }}>Top routes for this window</div>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {byScore.slice(0, 5).map((corridor, index) => {
                const active = corridor.id === selected?.id;
                return <button key={corridor.id} type="button" onClick={() => setSelectedId(corridor.id)} style={{ width: '100%', borderRadius: 20, padding: '14px 15px', background: active ? 'linear-gradient(135deg, rgba(85,233,255,0.12), rgba(30,161,255,0.08))' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? UI.borderStrong : UI.border}`, color: UI.text, textAlign: 'left', cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}><div><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 26, height: 26, borderRadius: 10, display: 'grid', placeItems: 'center', background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', fontSize: '0.74rem', fontWeight: 900, color: active ? UI.cyan : UI.soft }}>{index + 1}</span><span style={{ fontSize: '0.92rem', fontWeight: 800 }}>{corridorName(corridor)}</span></div><div style={{ marginTop: 8, color: UI.soft, fontSize: '0.78rem' }}>{corridor.speedKph} km/h · {corridor.totalFlow.toLocaleString('en-US')} total flow</div></div><div style={{ textAlign: 'right' }}><div style={{ color: active ? UI.cyan : UI.green, fontSize: '0.96rem', fontWeight: 900 }}>{corridor.score}</div><div style={{ marginTop: 4, color: UI.soft, fontSize: '0.72rem' }}>{pressureLabel(corridor.congestion)}</div></div></div></button>;
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
