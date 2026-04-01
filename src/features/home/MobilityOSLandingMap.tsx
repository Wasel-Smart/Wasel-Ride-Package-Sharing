import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, MapPinned } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

type City = {
  id: number;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
  hub?: boolean;
};

type Corridor = {
  id: string;
  from: number;
  to: number;
  distanceKm: number;
};

const PASSENGER = '#00C8E8';
const PACKAGE = '#F0A830';
const TEXT = '#EFF6FF';
const TEXT_MUTED = 'rgba(239,246,255,0.6)';
const BASE_ROUTES = [
  { id: 'amman-aqaba', from: 0, to: 1, distanceKm: 335 },
  { id: 'amman-irbid', from: 0, to: 2, distanceKm: 85 },
  { id: 'amman-zarqa', from: 0, to: 3, distanceKm: 25 },
  { id: 'zarqa-mafraq', from: 3, to: 4, distanceKm: 55 },
  { id: 'amman-jerash', from: 0, to: 5, distanceKm: 48 },
  { id: 'irbid-ajloun', from: 2, to: 6, distanceKm: 30 },
  { id: 'amman-madaba', from: 0, to: 7, distanceKm: 33 },
  { id: 'madaba-karak', from: 7, to: 8, distanceKm: 111 },
  { id: 'karak-tafila', from: 8, to: 9, distanceKm: 74 },
  { id: 'tafila-maan', from: 9, to: 10, distanceKm: 89 },
  { id: 'maan-aqaba', from: 10, to: 1, distanceKm: 114 },
  { id: 'irbid-zarqa', from: 2, to: 3, distanceKm: 79 },
  { id: 'amman-salt', from: 0, to: 11, distanceKm: 32 },
  { id: 'salt-jerash', from: 11, to: 5, distanceKm: 38 },
  { id: 'ajloun-jerash', from: 6, to: 5, distanceKm: 24 },
] as const satisfies readonly Corridor[];

const CITIES: readonly City[] = [
  { id: 0, name: 'Amman', nameAr: 'عمّان', lat: 31.9454, lon: 35.9284, hub: true },
  { id: 1, name: 'Aqaba', nameAr: 'العقبة', lat: 29.532, lon: 35.0063, hub: true },
  { id: 2, name: 'Irbid', nameAr: 'إربد', lat: 32.5556, lon: 35.85, hub: true },
  { id: 3, name: 'Zarqa', nameAr: 'الزرقاء', lat: 32.0728, lon: 36.088, hub: true },
  { id: 4, name: 'Mafraq', nameAr: 'المفرق', lat: 32.3406, lon: 36.208 },
  { id: 5, name: 'Jerash', nameAr: 'جرش', lat: 32.2803, lon: 35.8993 },
  { id: 6, name: 'Ajloun', nameAr: 'عجلون', lat: 32.3326, lon: 35.7519 },
  { id: 7, name: 'Madaba', nameAr: 'مادبا', lat: 31.7197, lon: 35.7936 },
  { id: 8, name: 'Karak', nameAr: 'الكرك', lat: 31.1853, lon: 35.7048 },
  { id: 9, name: 'Tafila', nameAr: 'الطفيلة', lat: 30.8375, lon: 35.6042 },
  { id: 10, name: "Ma'an", nameAr: 'معان', lat: 30.1962, lon: 35.736 },
  { id: 11, name: 'Salt', nameAr: 'السلط', lat: 32.0392, lon: 35.7272 },
] as const;

const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2, lon: 35.03 },
  { lat: 31.2, lon: 35.5 },
  { lat: 32.56, lon: 35.55 },
] as const;

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
  const px = width * 0.09;
  const py = height * 0.08;
  const x = px + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width - px * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = py + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (height - py * 2);
  return { x, y };
}

function pointOnCurve(start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function getCurve(from: { x: number; y: number }, to: { x: number; y: number }, seed: number, weight: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const offset = (14 + weight * 18 + (seed % 4) * 3) * (seed % 2 === 0 ? 1 : -1);
  return {
    x: midX - (dy / length) * offset,
    y: midY + (dx / length) * offset,
  };
}

function topRouteLabel(routes: Array<{ id: string; total: number }>) {
  return [...routes].sort((a, b) => b.total - a.total)[0]?.id.replace(/-/g, ' -> ') ?? 'amman -> aqaba';
}

export function MobilityOSLandingMap() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 680, height: 520 });

  useEffect(() => {
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.max(320, rect.width), height: Math.max(360, rect.height) });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const routes = useMemo(() => {
    return BASE_ROUTES.map((route, index) => {
      const passengerFlow = 220 + ((index * 91) % 460);
      const packageFlow = 40 + ((index * 33) % 160);
      const congestion = Math.min(0.88, 0.18 + ((index * 0.09) % 0.48));
      const speedKph = Math.max(38, Math.round(112 - congestion * 56));
      return {
        ...route,
        passengerFlow,
        packageFlow,
        congestion,
        speedKph,
        total: passengerFlow + packageFlow,
      };
    });
  }, []);

  const topRoute = useMemo(() => [...routes].sort((a, b) => b.total - a.total)[0], [routes]);
  const analytics = useMemo(() => ({
    activePassengers: routes.reduce((sum, route) => sum + route.passengerFlow, 0),
    activePackages: routes.reduce((sum, route) => sum + route.packageFlow, 0),
    topCorridor: topRouteLabel(routes),
    recommendedPath: ar ? 'عمان -> العقبة' : 'Amman -> Aqaba',
  }), [ar, routes]);

  useEffect(() => {
    const render = (time: number) => {
      const canvas = canvasRef.current;
      const container = wrapRef.current;
      if (!canvas || !container) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const width = size.width;
      const height = size.height;
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

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#041221');
      bg.addColorStop(1, '#050b16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.2, height * 0.12, 0, width * 0.2, height * 0.12, width * 0.5);
      glow.addColorStop(0, 'rgba(0,200,232,0.12)');
      glow.addColorStop(1, 'rgba(0,200,232,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      BORDER.forEach((point, index) => {
        const p = project(point.lat, point.lon, width, height);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      routes.forEach((route, index) => {
        const fromCity = CITIES[route.from];
        const toCity = CITIES[route.to];
        const from = project(fromCity.lat, fromCity.lon, width, height);
        const to = project(toCity.lat, toCity.lon, width, height);
        const control = getCurve(from, to, index, route.total / 700);

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = `rgba(0,200,232,${0.22 + route.passengerFlow / 1600})`;
        ctx.lineWidth = 1.2 + route.passengerFlow / 520;
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(0,200,232,0.2)';
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.setLineDash([5, 8]);
        ctx.strokeStyle = `rgba(240,168,48,${0.18 + route.packageFlow / 900})`;
        ctx.lineWidth = 1 + route.packageFlow / 280;
        ctx.stroke();
        ctx.setLineDash([]);

        const passengerCount = Math.max(1, Math.round(route.passengerFlow / 220));
        for (let i = 0; i < passengerCount; i += 1) {
          const t = (time * 0.00005 * (1 + i * 0.08) + i / passengerCount + index * 0.07) % 1;
          const point = pointOnCurve(from, control, to, t);
          ctx.beginPath();
          ctx.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(198,252,255,0.95)';
          ctx.shadowBlur = 14;
          ctx.shadowColor = 'rgba(0,200,232,0.55)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        const packageCount = Math.max(1, Math.round(route.packageFlow / 90));
        for (let i = 0; i < packageCount; i += 1) {
          const t = 1 - ((time * 0.00004 * (1 + i * 0.05) + i / packageCount + index * 0.04) % 1);
          const point = pointOnCurve(from, control, to, t);
          ctx.fillStyle = 'rgba(255,214,122,0.92)';
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(240,168,48,0.45)';
          ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
          ctx.shadowBlur = 0;
        }
      });

      CITIES.forEach((city) => {
        const point = project(city.lat, city.lon, width, height);
        const halo = city.hub ? 18 : 11;
        const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, halo);
        gradient.addColorStop(0, city.hub ? 'rgba(0,200,232,0.22)' : 'rgba(255,255,255,0.14)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(point.x, point.y, halo, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, city.hub ? 5.5 : 4.2, 0, Math.PI * 2);
        ctx.fillStyle = city.hub ? 'rgba(255,255,255,0.98)' : 'rgba(239,246,255,0.86)';
        ctx.fill();

        ctx.font = `700 ${city.hub ? 12 : 11}px Inter, sans-serif`;
        ctx.fillStyle = city.hub ? TEXT : 'rgba(239,246,255,0.88)';
        ctx.textAlign = 'center';
        ctx.fillText(ar ? city.nameAr : city.name, point.x, point.y - 12);
      });

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [ar, routes, size]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: 'min(100%, 500px)',
        minHeight: 520,
        padding: 18,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        boxShadow: '0 18px 46px rgba(0,0,0,0.26)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 28,
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
            'radial-gradient(circle at 58% 34%, rgba(85,233,255,0.12), transparent 26%), radial-gradient(circle at 74% 18%, rgba(245,177,30,0.14), transparent 18%), radial-gradient(circle at 82% 56%, rgba(51,232,95,0.12), transparent 18%), radial-gradient(circle at 18% 68%, rgba(30,161,255,0.10), transparent 20%)',
        }}
      />

      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'grid', gap: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.68)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Activity size={14} color={PASSENGER} />
          <span style={{ fontSize: '0.76rem', fontWeight: 800, color: TEXT }}>Mobility OS live map</span>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: TEXT_MUTED }}>
            {ar ? 'الممر الأبرز' : 'Top corridor'}
          </div>
          <div style={{ marginTop: 4, color: TEXT, fontWeight: 800, fontSize: '0.8rem' }}>
            {analytics?.topCorridor || topRoute?.id.replace(/-/g, ' -> ')}
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, display: 'grid', gap: 8 }}>
        <div style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 140 }}>
          <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: TEXT_MUTED }}>
            {ar ? 'الركاب النشطون' : 'Active passengers'}
          </div>
          <div style={{ marginTop: 4, color: PASSENGER, fontWeight: 900, fontSize: '1rem' }}>
            {analytics?.activePassengers ?? routes.reduce((sum, route) => sum + route.passengerFlow, 0)}
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 140 }}>
          <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: TEXT_MUTED }}>
            {ar ? 'الطرود النشطة' : 'Active parcels'}
          </div>
          <div style={{ marginTop: 4, color: PACKAGE, fontWeight: 900, fontSize: '1rem' }}>
            {analytics?.activePackages ?? routes.reduce((sum, route) => sum + route.packageFlow, 0)}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'block',
          minHeight: 484,
          borderRadius: 22,
          filter: 'saturate(1.2) contrast(1.06) brightness(1.03)',
        }}
      />

      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ padding: '9px 12px', borderRadius: 999, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 0, borderTop: `3px solid ${PASSENGER}`, display: 'inline-block' }} />
          {ar ? 'تدفق الركاب' : 'Passenger flow'}
        </div>
        <div style={{ padding: '9px 12px', borderRadius: 999, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 0, borderTop: `3px dashed ${PACKAGE}`, display: 'inline-block' }} />
          {ar ? 'تدفق الطرود' : 'Parcel flow'}
        </div>
        <div style={{ padding: '9px 12px', borderRadius: 999, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', color: TEXT_MUTED, fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MapPinned size={14} color={PASSENGER} />
          {analytics?.recommendedPath || (ar ? 'توصية تشغيلية مباشرة' : 'Live operating recommendation')}
        </div>
      </div>
    </div>
  );
}
