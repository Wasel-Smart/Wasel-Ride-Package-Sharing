import { useEffect, useMemo, useRef, useState } from 'react';

type City = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  hub?: boolean;
  labelDx?: number;
  labelDy?: number;
  labelAlign?: CanvasTextAlign;
};

type Corridor = {
  id: string;
  from: number;
  to: number;
  distanceKm: number;
};

const FLOW = '#62f5ef';
const GHOST = '#d7feff';
const PULSE = '#b2fff7';

const BASE_ROUTES: readonly Corridor[] = [
  { id: 'amman-aqaba', from: 0, to: 1, distanceKm: 335 },
  { id: 'amman-irbid', from: 0, to: 2, distanceKm: 85 },
  { id: 'amman-zarqa', from: 0, to: 3, distanceKm: 25 },
  { id: 'zarqa-mafraq', from: 3, to: 4, distanceKm: 55 },
  { id: 'amman-jerash', from: 0, to: 5, distanceKm: 48 },
  { id: 'jerash-irbid', from: 5, to: 2, distanceKm: 42 },
  { id: 'irbid-ajloun', from: 2, to: 6, distanceKm: 30 },
  { id: 'amman-madaba', from: 0, to: 7, distanceKm: 33 },
  { id: 'madaba-karak', from: 7, to: 8, distanceKm: 111 },
  { id: 'karak-tafila', from: 8, to: 9, distanceKm: 74 },
  { id: 'tafila-maan', from: 9, to: 10, distanceKm: 89 },
  { id: 'maan-aqaba', from: 10, to: 1, distanceKm: 114 },
  { id: 'amman-maan', from: 0, to: 10, distanceKm: 218 },
  { id: 'irbid-zarqa', from: 2, to: 3, distanceKm: 79 },
];

const CITIES: readonly City[] = [
  { id: 0, name: 'Amman', lat: 31.9454, lon: 35.9284, hub: true, labelDx: 10, labelDy: -18 },
  { id: 1, name: 'Aqaba', lat: 29.532, lon: 35.0063, hub: true, labelDx: -4, labelDy: -18 },
  { id: 2, name: 'Irbid', lat: 32.5556, lon: 35.85, hub: true, labelDx: -2, labelDy: -18 },
  { id: 3, name: 'Zarqa', lat: 32.0728, lon: 36.088, hub: true, labelDx: 12, labelDy: -14 },
  { id: 4, name: 'Mafraq', lat: 32.3406, lon: 36.208, labelDx: 14, labelDy: -14 },
  { id: 5, name: 'Jerash', lat: 32.2803, lon: 35.8993, hub: true, labelDx: 10, labelDy: -14 },
  { id: 6, name: 'Ajloun', lat: 32.3326, lon: 35.7519 },
  { id: 7, name: 'Madaba', lat: 31.7197, lon: 35.7936 },
  { id: 8, name: 'Karak', lat: 31.1853, lon: 35.7048, labelDx: -6, labelDy: -14 },
  { id: 9, name: 'Tafila', lat: 30.8375, lon: 35.6042 },
  { id: 10, name: "Ma'an", lat: 30.1962, lon: 35.736 },
];

const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2, lon: 35.03 },
  { lat: 31.2, lon: 35.5 },
  { lat: 32.56, lon: 35.55 },
] as const;

const TOPO_LINES = [0.18, 0.25, 0.33, 0.42, 0.52, 0.64, 0.78];

const bounds = CITIES.reduce(
  (acc, city) => ({
    minLat: Math.min(acc.minLat, city.lat),
    maxLat: Math.max(acc.maxLat, city.lat),
    minLon: Math.min(acc.minLon, city.lon),
    maxLon: Math.max(acc.maxLon, city.lon),
  }),
  { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
);

function mercator(lat: number) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

function project(lat: number, lon: number, width: number, height: number) {
  const px = width * 0.12;
  const py = height * 0.1;
  const x = px + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width - px * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = py + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (height - py * 2);
  return { x, y };
}

function pointOnCurve(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function getCurve(
  from: { x: number; y: number },
  to: { x: number; y: number },
  seed: number,
  weight: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const offset = (16 + weight * 16 + (seed % 4) * 2.4) * (seed % 2 === 0 ? 1 : -1);
  return {
    x: midX - (dy / length) * offset,
    y: midY + (dx / length) * offset,
  };
}

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function MobilityOSLandingMap() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 720, height: 560 });

  useEffect(() => {
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(360, rect.height),
      });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const routes = useMemo(
    () =>
      BASE_ROUTES.map((route, index) => {
        const riderFlow = 0.32 + ((index * 0.11) % 0.44);
        const parcelFlow = 0.14 + ((index * 0.07) % 0.26);
        const weight = riderFlow * 0.7 + parcelFlow * 0.3;
        return {
          ...route,
          riderFlow,
          parcelFlow,
          weight,
        };
      }),
    [],
  );

  useEffect(() => {
    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = size.width;
      const height = size.height;
      const compact = width < 480;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const panel = ctx.createLinearGradient(0, 0, 0, height);
      panel.addColorStop(0, '#09131f');
      panel.addColorStop(1, '#05101a');
      ctx.fillStyle = panel;
      ctx.fillRect(0, 0, width, height);

      const innerGlow = ctx.createRadialGradient(
        width * 0.2,
        height * 0.12,
        0,
        width * 0.2,
        height * 0.12,
        width * 0.44,
      );
      innerGlow.addColorStop(0, 'rgba(87,241,225,0.18)');
      innerGlow.addColorStop(1, 'rgba(87,241,225,0)');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, width, height);

      const land = ctx.createLinearGradient(0, 0, width * 0.5, height * 0.8);
      land.addColorStop(0, 'rgba(34,142,133,0.22)');
      land.addColorStop(1, 'rgba(8,22,34,0)');
      ctx.beginPath();
      ctx.moveTo(width * 0.03, height * 0.04);
      ctx.lineTo(width * 0.48, height * 0.04);
      ctx.lineTo(width * 0.45, height * 0.47);
      ctx.lineTo(width * 0.26, height * 0.98);
      ctx.lineTo(width * 0.03, height * 0.98);
      ctx.closePath();
      ctx.fillStyle = land;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width * 0.48, height * 0.04);
      ctx.lineTo(width * 0.45, height * 0.47);
      ctx.lineTo(width * 0.26, height * 0.98);
      ctx.strokeStyle = 'rgba(92, 250, 234, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.save();
      ctx.translate(width * 0.11, height * 0.12);
      const radarRadius = Math.min(width, height) * 0.105;
      const radarGradient = ctx.createRadialGradient(0, 0, radarRadius * 0.14, 0, 0, radarRadius);
      radarGradient.addColorStop(0, 'rgba(80,248,228,0.42)');
      radarGradient.addColorStop(1, 'rgba(5,16,26,0.96)');
      ctx.beginPath();
      ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = radarGradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,255,247,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const sweep = (time * 0.0012) % (Math.PI * 2);
      for (let i = 0; i < 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radarRadius * 0.9, sweep + i * 0.14, sweep + i * 0.14 + 0.45);
        ctx.closePath();
        const scan = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
        scan.addColorStop(0, 'rgba(99,255,238,0.32)');
        scan.addColorStop(1, 'rgba(99,255,238,0)');
        ctx.fillStyle = scan;
        ctx.fill();
      }

      const radarBlips = [
        { r: 0.2, angle: sweep + 0.9 },
        { r: 0.34, angle: sweep + 1.42 },
        { r: 0.48, angle: sweep + 2.2 },
      ];

      radarBlips.forEach(blip => {
        const x = Math.cos(blip.angle) * radarRadius * blip.r;
        const y = Math.sin(blip.angle) * radarRadius * blip.r;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(214,255,248,0.96)';
        ctx.shadowBlur = 14;
        ctx.shadowColor = withAlpha(FLOW, 0.7);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      ctx.beginPath();
      ctx.arc(width * 0.33, height * 0.22, Math.min(width, height) * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(65, 223, 196, 0.18)';
      ctx.fill();

      TOPO_LINES.forEach((line, index) => {
        ctx.beginPath();
        for (let step = 0; step <= 40; step += 1) {
          const x = width * (0.44 + (step / 40) * 0.46);
          const wave = Math.sin(step * 0.34 + line * 9 + time * 0.00024 + index * 0.4) * 4.5;
          const y = height * line + wave + index * 18;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(146, 212, 223, ${0.05 + index * 0.01})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      for (let i = 0; i < 7; i += 1) {
        const x = width * (0.39 + i * 0.075);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.14);
        ctx.lineTo(x + Math.sin(i * 0.8) * 12, height * 0.82);
        ctx.strokeStyle = 'rgba(157, 221, 230, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.045, height * 0.7);
      ctx.lineTo(width * 0.26, height * 0.7);
      ctx.lineTo(width * 0.16, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      for (let i = 0; i < 11; i += 1) {
        const y = height * (0.72 + i * 0.033);
        ctx.beginPath();
        ctx.moveTo(width * 0.06, y);
        ctx.lineTo(width * 0.32, y + i * 0.8);
        ctx.strokeStyle = 'rgba(111, 208, 219, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (let i = 0; i < 10; i += 1) {
        const x = width * (0.08 + i * 0.07);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.7);
        ctx.lineTo(x - width * 0.08, height);
        ctx.strokeStyle = 'rgba(111, 208, 219, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      ctx.beginPath();
      BORDER.forEach((point, index) => {
        const p = project(point.lat, point.lon, width, height);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.strokeStyle = 'rgba(112, 255, 236, 0.14)';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      routes.forEach((route, index) => {
        const from = project(CITIES[route.from].lat, CITIES[route.from].lon, width, height);
        const to = project(CITIES[route.to].lat, CITIES[route.to].lon, width, height);
        const control = getCurve(from, to, index, route.weight);

        ctx.beginPath();
        ctx.ellipse(
          (from.x + to.x) / 2,
          (from.y + to.y) / 2 + 8,
          Math.max(16, Math.abs(to.x - from.x) * 0.12),
          5,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = withAlpha(FLOW, 0.24 + route.riderFlow * 0.45);
        ctx.lineWidth = 1.4 + route.riderFlow * 2.4;
        ctx.shadowBlur = 16;
        ctx.shadowColor = withAlpha(FLOW, 0.42);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = withAlpha(GHOST, 0.34 + route.parcelFlow * 0.28);
        ctx.lineWidth = 1 + route.parcelFlow * 1.6;
        ctx.stroke();
        ctx.setLineDash([]);

        const riderCount = Math.max(2, Math.round(2 + route.riderFlow * 7));
        for (let i = 0; i < riderCount; i += 1) {
          const t = (time * 0.000055 * (1 + i * 0.08) + i / riderCount + index * 0.06) % 1;
          const point = pointOnCurve(from, control, to, t);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(231,255,253,0.98)';
          ctx.shadowBlur = 14;
          ctx.shadowColor = withAlpha(FLOW, 0.66);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        const parcelCount = Math.max(1, Math.round(1 + route.parcelFlow * 4));
        for (let i = 0; i < parcelCount; i += 1) {
          const t = 1 - ((time * 0.000038 * (1 + i * 0.08) + i / parcelCount + index * 0.05) % 1);
          const point = pointOnCurve(from, control, to, t);
          ctx.fillStyle = 'rgba(180,255,246,0.92)';
          ctx.shadowBlur = 10;
          ctx.shadowColor = withAlpha(PULSE, 0.48);
          ctx.fillRect(point.x - 1.8, point.y - 1.8, 3.6, 3.6);
          ctx.shadowBlur = 0;
        }
      });

      CITIES.forEach(city => {
        const point = project(city.lat, city.lon, width, height);
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.0022 + city.id * 0.9);
        const halo = city.hub ? 16 + pulse * 5 : 9 + pulse * 2.2;
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, halo);
        gradient.addColorStop(0, city.hub ? 'rgba(94,255,240,0.28)' : 'rgba(240,255,255,0.16)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, halo, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(point.x, point.y + 9, city.hub ? 14 : 10, city.hub ? 5 : 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, city.hub ? 6.4 : 4.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(227,255,252,0.98)';
        ctx.fill();
        ctx.strokeStyle = withAlpha(FLOW, 0.42);
        ctx.lineWidth = city.hub ? 1.8 : 1.2;
        ctx.stroke();

        if (
          city.name === 'Amman' ||
          city.name === 'Irbid' ||
          city.name === 'Jerash' ||
          city.name === 'Zarqa' ||
          city.name === 'Mafraq' ||
          city.name === 'Karak' ||
          city.name === 'Aqaba'
        ) {
          ctx.fillStyle =
            city.name === 'Amman' ? 'rgba(235,255,253,0.98)' : 'rgba(223,242,247,0.82)';
          ctx.textAlign = city.labelAlign ?? 'center';
          ctx.font =
            city.name === 'Amman'
              ? '700 16px Inter, system-ui, sans-serif'
              : '600 11px Inter, system-ui, sans-serif';
          ctx.fillText(city.name, point.x + (city.labelDx ?? 0), point.y + (city.labelDy ?? -12));
        }
      });

      if (!compact) {
        const liveTextX = width * 0.075;
        const liveTextY = height * 0.86;
        ctx.fillStyle = 'rgba(211,245,247,0.7)';
        ctx.font = '600 10px Inter, system-ui, sans-serif';
        ctx.fillText('Mobility OS live field', liveTextX, liveTextY);
        ctx.fillStyle = 'rgba(255,255,255,0.86)';
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        ctx.fillText('Mercator projection + weighted corridor arcs', liveTextX, liveTextY + 18);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [routes, size]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: size.width < 480 ? 460 : 520,
        borderRadius: 34,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(12, 23, 35, 0.94), rgba(5, 12, 19, 0.98))',
        border: '1px solid rgba(112, 255, 236, 0.12)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 14,
          borderRadius: 28,
          border: '1px solid rgba(97, 241, 222, 0.12)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: 'relative',
          zIndex: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: size.width < 480 ? 460 : 520,
        }}
      />
    </div>
  );
}
