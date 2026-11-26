import { useEffect, useMemo, useRef, useState } from 'react';
import { C, R, SH } from '../../utils/wasel-ds';
import { tx } from '../../locales/tx';

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

interface MobilityOSLandingMapProps {
  focusRouteId?: string;
  focusOrigin?: string;
  focusDestination?: string;
  focusLabel?: string;
  showOverlay?: boolean;
  runtimeMode?: 'server' | 'fallback';
  demandPressure?: number;
  utilization?: number;
  preferredHeight?: number;
  minimalText?: boolean;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

/**
 * Accepts a hex (#rrggbb / #rgb) OR an rgb/rgba() string and returns an
 * rgba() string with the given alpha.  Handles the output of getComputedStyle
 * which may return either format depending on browser and theme.
 */
function withAlpha(color: string, alpha: number): string {
  const c = color.trim();

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${alpha})`;
  }

  // hex
  let hex = c.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  }
  const n = parseInt(hex, 16);
  if (isNaN(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Returns the transparent version of a colour (alpha=0), keeping the same
 *  RGB channels so gradient edges don't get a "black smear" on Safari. */
function transparent(color: string): string {
  return withAlpha(color, 0);
}

// ─── Static brand tokens (don't change between themes) ───────────────────────

const GHOST    = C.cyanDark;   // parcel stream colour
const PULSE    = C.blueLight;  // parcel particle glow
const BUS_GREEN = C.green;     // bus particle fill

// ─── Map data ─────────────────────────────────────────────────────────────────

const BASE_ROUTES = [
  { id: 'amman-aqaba',  from: 0, to: 1,  distanceKm: 335 },
  { id: 'amman-irbid',  from: 0, to: 2,  distanceKm: 85  },
  { id: 'amman-zarqa',  from: 0, to: 3,  distanceKm: 25  },
  { id: 'zarqa-mafraq', from: 3, to: 4,  distanceKm: 55  },
  { id: 'amman-jerash', from: 0, to: 5,  distanceKm: 48  },
  { id: 'jerash-irbid', from: 5, to: 2,  distanceKm: 42  },
  { id: 'irbid-ajloun', from: 2, to: 6,  distanceKm: 30  },
  { id: 'amman-madaba', from: 0, to: 7,  distanceKm: 33  },
  { id: 'madaba-karak', from: 7, to: 8,  distanceKm: 111 },
  { id: 'karak-tafila', from: 8, to: 9,  distanceKm: 74  },
  { id: 'tafila-maan',  from: 9, to: 10, distanceKm: 89  },
  { id: 'maan-aqaba',   from: 10, to: 1, distanceKm: 114 },
  { id: 'amman-maan',   from: 0, to: 10, distanceKm: 218 },
  { id: 'irbid-zarqa',  from: 2, to: 3,  distanceKm: 79  },
] as const satisfies readonly Corridor[];

const CITIES: readonly City[] = [
  { id: 0,  name: 'Amman',  lat: 31.9454, lon: 35.9284, hub: true,  labelDx: 10,  labelDy: -18 },
  { id: 1,  name: 'Aqaba',  lat: 29.532,  lon: 35.0063, hub: true,  labelDx: -4,  labelDy: -18 },
  { id: 2,  name: 'Irbid',  lat: 32.5556, lon: 35.85,   hub: true,  labelDx: -2,  labelDy: -18 },
  { id: 3,  name: 'Zarqa',  lat: 32.0728, lon: 36.088,  hub: true,  labelDx: 12,  labelDy: -14 },
  { id: 4,  name: 'Mafraq', lat: 32.3406, lon: 36.208,              labelDx: 14,  labelDy: -14 },
  { id: 5,  name: 'Jerash', lat: 32.2803, lon: 35.8993, hub: true,  labelDx: 10,  labelDy: -14 },
  { id: 6,  name: 'Ajloun', lat: 32.3326, lon: 35.7519 },
  { id: 7,  name: 'Madaba', lat: 31.7197, lon: 35.7936 },
  { id: 8,  name: 'Karak',  lat: 31.1853, lon: 35.7048,             labelDx: -6,  labelDy: -14 },
  { id: 9,  name: 'Tafila', lat: 30.8375, lon: 35.6042 },
  { id: 10, name: "Ma'an",  lat: 30.1962, lon: 35.736  },
];

const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2,  lon: 35.03 },
  { lat: 31.2,  lon: 35.5  },
  { lat: 32.56, lon: 35.55 },
] as const;

const TOPO_LINES = [0.18, 0.25, 0.33, 0.42, 0.52, 0.64, 0.78] as const;

// ─── Projection helpers ───────────────────────────────────────────────────────

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
  const px = width  * 0.12;
  const py = height * 0.1;
  const x  = px + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width  - px * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y    = py + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (height - py * 2);
  return { x, y };
}

function pointOnCurve(
  start:   { x: number; y: number },
  control: { x: number; y: number },
  end:     { x: number; y: number },
  t: number,
) {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function getCurve(
  from:   { x: number; y: number },
  to:     { x: number; y: number },
  seed:   number,
  weight: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const midX   = (from.x + to.x) / 2;
  const midY   = (from.y + to.y) / 2;
  const offset = (16 + weight * 16 + (seed % 4) * 2.4) * (seed % 2 === 0 ? 1 : -1);
  return {
    x: midX - (dy / length) * offset,
    y: midY + (dx / length) * offset,
  };
}

function normalizeToken(value?: string | null) {
  return (value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
}

function matchesFocusedRoute(
  route: Corridor,
  focusRouteId?: string,
  focusOrigin?: string,
  focusDestination?: string,
) {
  if (focusRouteId && route.id === focusRouteId) return true;
  if (!focusOrigin || !focusDestination) return false;
  const fromName = CITIES[route.from]?.name;
  const toName   = CITIES[route.to]?.name;
  return (
    normalizeToken(fromName) === normalizeToken(focusOrigin) &&
    normalizeToken(toName)   === normalizeToken(focusDestination)
  );
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── Resolved-colour cache (per component instance via ref) ───────────────────

interface ResolvedColors {
  bg:        string;
  fg:        string;
  primary:   string;
  isLight:   boolean;
}

function resolveColors(el: HTMLElement | null): ResolvedColors {
  if (!el) {
    return { bg: C.bg, fg: C.text, primary: C.blue, isLight: false };
  }
  const cs      = getComputedStyle(el);
  const bg      = cs.getPropertyValue('--background').trim() || C.bg;
  const fg      = cs.getPropertyValue('--foreground').trim() || C.text;
  const primary = cs.getPropertyValue('--primary').trim()    || C.blue;
  // Detect light mode via [data-theme] attribute on the nearest ancestor.
  const isLight = el.closest('[data-theme="light"]') !== null ||
                  document.documentElement.getAttribute('data-theme') === 'light';
  return { bg, fg, primary, isLight };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobilityOSLandingMap({
  focusRouteId,
  focusOrigin,
  focusDestination,
  focusLabel,
  showOverlay  = true,
  runtimeMode  = 'server',
  demandPressure,
  utilization,
  preferredHeight,
  minimalText  = false,
}: MobilityOSLandingMapProps = {}) {
  const wrapRef    = useRef<HTMLDivElement | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const frameRef   = useRef<number | null>(null);

  const focusStrengthRef       = useRef(0);
  const targetFocusStrengthRef = useRef(0);
  const sizeRef                = useRef({ width: 720, height: preferredHeight ?? 560 });
  const [size, setSize]        = useState(sizeRef.current);
  const visibleRef             = useRef(true);
  const renderRef              = useRef<(time: number) => void>(() => {});

  // Per-instance resolved colour cache — avoids getComputedStyle every frame.
  const colorsRef  = useRef<ResolvedColors>({ bg: C.bg, fg: C.text, primary: C.blue, isLight: false });

  // Overlay UI uses the cached primary (updated by the observer below).
  const uiFocusPrimary = colorsRef.current.primary;
  const uiFocusStroke  = runtimeMode === 'fallback' ? C.gold : uiFocusPrimary;
  const uiFocusStrength = Math.max(
    0.28,
    Math.min(
      1,
      clamp(utilization ?? 0.45, 0, 1) * 0.62 +
        ((clamp(demandPressure ?? 1, 0.85, 2.4) - 0.85) / 1.55) * 0.64,
    ),
  );

  // ── Resize + visibility observer ──────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = {
        width:  Math.max(320, rect.width),
        height: Math.max(preferredHeight ?? 360, rect.height),
      };
      sizeRef.current = next;
      setSize(next);
    };

    update();
    window.addEventListener('resize', update, { passive: true });

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visibleRef.current;
        visibleRef.current = entry?.isIntersecting ?? true;
        if (visibleRef.current && !wasVisible && frameRef.current === null) {
          frameRef.current = requestAnimationFrame(renderRef.current);
        }
      },
      { threshold: 0 },
    );
    if (wrapRef.current) io.observe(wrapRef.current);

    return () => {
      window.removeEventListener('resize', update);
      io.disconnect();
    };
  }, [preferredHeight]);

  // ── Theme-change observer — recompute resolved colours cheaply ────────────
  useEffect(() => {
    // Initial read
    colorsRef.current = resolveColors(wrapRef.current);

    // Watch [data-theme] attribute changes on <html> and the wrapper itself.
    const mo = new MutationObserver(() => {
      colorsRef.current = resolveColors(wrapRef.current);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (wrapRef.current) {
      mo.observe(wrapRef.current, { attributes: true, attributeFilter: ['data-theme'] });
    }
    return () => mo.disconnect();
  }, []);

  // ── Route memo ────────────────────────────────────────────────────────────
  const routes = useMemo(
    () =>
      BASE_ROUTES.map((route, index) => {
        const riderFlow  = 0.32 + ((index * 0.11) % 0.44);
        const parcelFlow = 0.14 + ((index * 0.07) % 0.26);
        const weight     = riderFlow * 0.7 + parcelFlow * 0.3;
        return {
          ...route,
          riderFlow,
          parcelFlow,
          weight,
          focused: matchesFocusedRoute(route, focusRouteId, focusOrigin, focusDestination),
        };
      }),
    [focusDestination, focusOrigin, focusRouteId],
  );

  useEffect(() => {
    targetFocusStrengthRef.current = routes.some(r => r.focused) ? 1 : 0;
  }, [routes]);

  // ── Render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (time: number) => {
      if (!visibleRef.current) { frameRef.current = null; return; }

      const canvas = canvasRef.current;
      if (!canvas) { frameRef.current = null; return; }

      // Cap DPR at 2 — 3× wastes GPU on a canvas never viewed at native res.
      const dpr      = Math.min(window.devicePixelRatio || 1, 2);
      const isMobile = sizeRef.current.width < 600;
      const { width, height } = sizeRef.current;

      // Pull cached resolved colours (updated by MutationObserver, not per-frame).
      const { bg, fg, primary, isLight } = colorsRef.current;

      focusStrengthRef.current +=
        (targetFocusStrengthRef.current - focusStrengthRef.current) * 0.04;
      const focusStrength  = focusStrengthRef.current;
      const focusedRoute   = routes.find(r => r.focused) ?? null;
      const focusStroke    = runtimeMode === 'fallback' ? C.gold    : primary;
      const focusGhost     = runtimeMode === 'fallback' ? withAlpha(C.gold, 0.58) : GHOST;
      const focusPressure  = clamp(demandPressure ?? 1, 0.85, 2.4);
      const focusUtil      = clamp(utilization    ?? 0.45, 0, 1);

      if (canvas.width  !== Math.round(width  * dpr) ||
          canvas.height !== Math.round(height * dpr)) {
        canvas.width  = Math.round(width  * dpr);
        canvas.height = Math.round(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) { frameRef.current = requestAnimationFrame(render); return; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // ── Background atmosphere ────────────────────────────────────────────
      const panel = ctx.createLinearGradient(0, 0, 0, height);
      if (isLight) {
        // Light mode: soft gradient from card-white to slightly tinted base.
        panel.addColorStop(0, bg);
        panel.addColorStop(1, withAlpha(primary, 0.06));
      } else {
        panel.addColorStop(0, bg || C.bg);
        panel.addColorStop(1, C.bgDeep);
      }
      ctx.fillStyle = panel;
      ctx.fillRect(0, 0, width, height);

      // Inner radial glow — lighter alpha in light mode so it doesn't overpower.
      const innerGlow = ctx.createRadialGradient(
        width * 0.2, height * 0.12, 0,
        width * 0.2, height * 0.12, width * 0.44,
      );
      innerGlow.addColorStop(0, withAlpha(primary, isLight ? 0.07 : 0.12));
      innerGlow.addColorStop(1, transparent(primary));
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, width, height);

      // Ambient network dots — higher alpha in light mode so they're visible.
      const dotAlphaBase = isLight ? 0.08 : 0.028;
      const dotAlphaVar  = isLight ? 0.06 : 0.045;
      for (let i = 0; i < (isMobile ? 0 : 24); i++) {
        const ax = width  * (0.1 + ((i * 0.037) % 0.8));
        const ay = height * (0.08 + ((i * 0.053) % 0.84)) + Math.sin(time * 0.00055 + i) * 1.6;
        const ar = 1.2 + ((i * 0.7) % 2.4) + Math.sin(time * 0.001 + i) * 0.35;
        ctx.beginPath();
        ctx.arc(ax, ay, ar, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(primary, dotAlphaBase + (0.5 + Math.sin(time * 0.0012 + i)) * dotAlphaVar);
        ctx.fill();
      }

      // ── Land mass ────────────────────────────────────────────────────────
      const landAlpha = isLight ? 0.32 : 0.18;
      const land = ctx.createLinearGradient(0, 0, width * 0.5, height * 0.8);
      land.addColorStop(0, withAlpha(C.green, landAlpha));
      land.addColorStop(1, transparent(C.green));
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
      ctx.strokeStyle = withAlpha(primary, isLight ? 0.22 : 0.14);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── Radar sweep ──────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(width * 0.11, height * 0.12);
      const radarRadius = Math.min(width, height) * 0.105;

      const radarGradient = ctx.createRadialGradient(0, 0, radarRadius * 0.14, 0, 0, radarRadius);
      radarGradient.addColorStop(0, withAlpha(primary, isLight ? 0.22 : 0.38));
      radarGradient.addColorStop(1, withAlpha(bg, 0.96));
      ctx.beginPath();
      ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
      ctx.fillStyle = radarGradient;
      ctx.fill();
      ctx.strokeStyle = withAlpha(fg, 0.06);
      ctx.lineWidth = 1;
      ctx.stroke();

      const sweep = (time * 0.0012) % (Math.PI * 2);
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radarRadius * 0.9, sweep + i * 0.14, sweep + i * 0.14 + 0.45);
        ctx.closePath();
        const scan = ctx.createRadialGradient(0, 0, 0, 0, 0, radarRadius);
        scan.addColorStop(0, withAlpha(primary, 0.28));
        scan.addColorStop(1, transparent(primary));
        ctx.fillStyle = scan;
        ctx.fill();
      }

      const radarBlips = [
        { r: 0.2,  angle: sweep + 0.9  },
        { r: 0.34, angle: sweep + 1.42 },
        { r: 0.48, angle: sweep + 2.2  },
      ];
      radarBlips.forEach(blip => {
        const bx = Math.cos(blip.angle) * radarRadius * blip.r;
        const by = Math.sin(blip.angle) * radarRadius * blip.r;
        ctx.beginPath();
        ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(fg, 0.9);
        ctx.shadowBlur  = 14;
        ctx.shadowColor = withAlpha(primary, 0.7);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      // Hub glow (behind Amman node)
      ctx.beginPath();
      ctx.arc(width * 0.33, height * 0.22, Math.min(width, height) * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(C.green, 0.14);
      ctx.fill();

      // ── Topographic waves (right side decoration) ─────────────────────────
      TOPO_LINES.forEach((line, index) => {
        ctx.beginPath();
        for (let step = 0; step <= 40; step++) {
          const x    = width * (0.44 + (step / 40) * 0.46);
          const wave = Math.sin(step * 0.34 + line * 9 + time * 0.00024 + index * 0.4) * 4.5;
          const y    = height * line + wave + index * 18;
          step === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = withAlpha(C.blueLight, (isLight ? 0.08 : 0.04) + index * 0.008);
        ctx.lineWidth   = 0.7;
        ctx.stroke();
      });

      // Vertical grid lines
      for (let i = 0; i < 7; i++) {
        const x = width * (0.39 + i * 0.075);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.14);
        ctx.lineTo(x + Math.sin(i * 0.8) * 12, height * 0.82);
        ctx.strokeStyle = withAlpha(C.blueLight, isLight ? 0.1 : 0.05);
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // ── Rail lines (bottom-left corner decoration) ─────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.045, height * 0.7);
      ctx.lineTo(width * 0.26,  height * 0.7);
      ctx.lineTo(width * 0.16,  height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      for (let i = 0; i < 11; i++) {
        const y = height * (0.72 + i * 0.033);
        ctx.beginPath();
        ctx.moveTo(width * 0.06, y);
        ctx.lineTo(width * 0.32, y + i * 0.8);
        ctx.strokeStyle = withAlpha(primary, isLight ? 0.1 : 0.06);
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const x = width * (0.08 + i * 0.07);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.7);
        ctx.lineTo(x - width * 0.08, height);
        ctx.strokeStyle = withAlpha(primary, isLight ? 0.07 : 0.04);
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
      ctx.restore();

      // ── Jordan border outline ─────────────────────────────────────────────
      ctx.beginPath();
      BORDER.forEach((pt, i) => {
        const p = project(pt.lat, pt.lon, width, height);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fillStyle   = withAlpha(fg, 0.015);
      ctx.strokeStyle = withAlpha(primary, isLight ? 0.2 : 0.12);
      ctx.lineWidth   = 1.2;
      ctx.fill();
      ctx.stroke();

      // ── Route connection layer ────────────────────────────────────────────
      routes.forEach((route, index) => {
        const fromCity = CITIES[route.from];
        const toCity   = CITIES[route.to];
        if (!fromCity || !toCity) return;

        const from    = project(fromCity.lat, fromCity.lon, width, height);
        const to      = project(toCity.lat,   toCity.lon,   width, height);
        const control = getCurve(from, to, index, route.weight);
        const isFocused  = route.focused;
        const muted      = focusedRoute && !isFocused;
        const routeAlpha = muted ? 0.22 : 1;
        const focusMid   = pointOnCurve(from, control, to, 0.5);

        const riderLineWidth = isFocused
          ? 4.1 + route.riderFlow * 3.2 + focusUtil * 2.4 + focusStrength * 1.2
          : 1.4 + route.riderFlow * 2.4;

        const riderStroke = isFocused
          ? withAlpha(focusStroke, 0.8 + focusUtil * 0.16)
          : withAlpha(primary, (0.24 + route.riderFlow * 0.45) * routeAlpha);

        const dashedStroke = isFocused
          ? withAlpha(focusGhost, 0.72)
          : withAlpha(GHOST, (0.34 + route.parcelFlow * 0.28) * routeAlpha);

        if (isFocused) {
          // Outer halo
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
          ctx.strokeStyle = withAlpha(focusStroke, 0.12 + focusStrength * 0.1);
          ctx.lineWidth   = riderLineWidth + 12 + focusStrength * 8;
          ctx.shadowBlur  = 40 + focusPressure * 12;
          ctx.shadowColor = withAlpha(focusStroke, 0.28 + focusStrength * 0.12);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Mid-route pulse
          const pulseRadius = 18 + Math.sin(time * 0.004 + index) * 3 + focusStrength * 8;
          const midGrad = ctx.createRadialGradient(
            focusMid.x, focusMid.y, pulseRadius * 0.1,
            focusMid.x, focusMid.y, pulseRadius,
          );
          midGrad.addColorStop(0, withAlpha(focusStroke, 0.26 + focusStrength * 0.16));
          midGrad.addColorStop(1, transparent(focusStroke));
          ctx.beginPath();
          ctx.arc(focusMid.x, focusMid.y, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = midGrad;
          ctx.fill();
        }

        // Route shadow ellipse
        ctx.beginPath();
        ctx.ellipse(
          (from.x + to.x) / 2,
          (from.y + to.y) / 2 + 8,
          Math.max(16, Math.abs(to.x - from.x) * 0.12),
          5, 0, 0, Math.PI * 2,
        );
        ctx.fillStyle = isFocused ? 'rgba(0,0,0,0.20)' : 'rgba(0,0,0,0.12)';
        ctx.fill();

        // Route rail (subtle underline)
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = isFocused ? withAlpha(focusStroke, 0.22) : withAlpha(fg, 0.04);
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Main route stroke
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.strokeStyle = riderStroke;
        ctx.lineWidth   = riderLineWidth;
        ctx.shadowBlur  = isFocused ? 24 + focusPressure * 8 : 16;
        ctx.shadowColor = isFocused
          ? withAlpha(focusStroke, 0.64)
          : withAlpha(primary, 0.38 * routeAlpha);
        ctx.stroke();
        ctx.shadowBlur = 0;

        if (isFocused) {
          // Travelling signal stream — clarifies direction of travel.
          const streamHead   = (time * 0.00017 + index * 0.19) % 1;
          const streamLength = 12;
          for (let trail = 0; trail < streamLength; trail++) {
            const trailProgress = clamp(streamHead - trail * 0.018, 0, 1);
            const pt        = pointOnCurve(from, control, to, trailProgress);
            const intensity = 1 - trail / streamLength;
            const radius    = 1.8 + intensity * (3.8 + focusStrength * 1.6);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fillStyle   = withAlpha(fg, 0.14 + intensity * 0.76);
            ctx.shadowBlur  = 10 + intensity * 18;
            ctx.shadowColor = withAlpha(focusStroke, 0.24 + intensity * 0.68);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }

        // Parcel dashed overlay
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = dashedStroke;
        ctx.lineWidth   = isFocused ? 1.8 + route.parcelFlow : 1 + route.parcelFlow * 1.6;
        ctx.stroke();
        ctx.setLineDash([]);

        // Rider particles
        const riderCount = Math.max(
          isMobile ? 1 : 2,
          Math.round(
            (isMobile ? 1 : 2) + route.riderFlow * (isMobile ? 4 : 7) +
            (isFocused ? focusPressure * 3 + focusUtil * 2 : 0),
          ),
        );
        for (let i = 0; i < riderCount; i++) {
          const t     = (time * 0.000085 * (1 + i * 0.08) + i / riderCount + index * 0.06) % 1;
          const pt    = pointOnCurve(from, control, to, t);
          const isBus = i % 3 === 0;
          ctx.beginPath();
          ctx.arc(
            pt.x, pt.y,
            isBus ? (isFocused ? 4.2 : 3.6) : (isFocused ? 2.9 : 2.4),
            0, Math.PI * 2,
          );
          ctx.fillStyle = isBus
            ? BUS_GREEN
            : isFocused ? C.gold : withAlpha(fg, 0.9);
          ctx.shadowBlur  = isMobile ? 0 : isBus ? (isFocused ? 22 : 16) : (isFocused ? 18 : 14);
          ctx.shadowColor = isBus
            ? withAlpha(BUS_GREEN, isFocused ? 0.88 : 0.68)
            : withAlpha(isFocused ? focusStroke : primary, isFocused ? 0.78 : 0.6);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Parcel particles (travel in reverse)
        const parcelCount = Math.max(
          1,
          Math.round(
            1 + route.parcelFlow * (isMobile ? 2 : 4) +
            (isFocused ? focusUtil * 3 + focusStrength * 1.4 : 0),
          ),
        );
        for (let i = 0; i < parcelCount; i++) {
          const t  = 1 - ((time * 0.000038 * (1 + i * 0.08) + i / parcelCount + index * 0.05) % 1);
          const pt = pointOnCurve(from, control, to, t);
          ctx.fillStyle   = isFocused ? C.gold : C.blue;
          ctx.shadowBlur  = isFocused ? 14 : 10;
          ctx.shadowColor = withAlpha(isFocused ? focusGhost : PULSE, isFocused ? 0.58 : 0.42);
          const ps = isFocused ? 4.4 : 3.6;
          ctx.fillRect(pt.x - ps / 2, pt.y - ps / 2, ps, ps);
          ctx.shadowBlur = 0;
        }

        // Mid-point connection node for focused route
        if (isFocused && focusStrength > 0.5) {
          const nodePulse  = 0.5 + 0.5 * Math.sin(time * 0.003 + index);
          const nodeRadius = 3.5 + nodePulse * 2 + focusStrength * 2;

          ctx.beginPath();
          ctx.arc(focusMid.x, focusMid.y, nodeRadius + 4, 0, Math.PI * 2);
          ctx.fillStyle = withAlpha(focusStroke, 0.08 + nodePulse * 0.06);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(focusMid.x, focusMid.y, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle   = withAlpha(focusStroke, 0.35 + nodePulse * 0.2);
          ctx.strokeStyle = withAlpha(focusStroke, 0.7);
          ctx.lineWidth   = 1.2;
          ctx.fill();
          ctx.stroke();
        }
      });

      // ── City nodes ────────────────────────────────────────────────────────
      CITIES.forEach(city => {
        const pt = project(city.lat, city.lon, width, height);
        const cityFocused =
          normalizeToken(city.name) === normalizeToken(focusOrigin) ||
          normalizeToken(city.name) === normalizeToken(focusDestination);

        const pulse = 0.5 + 0.5 * Math.sin(time * 0.0022 + city.id * 0.9);
        const halo  = cityFocused
          ? 22 + pulse * 8 + focusStrength * 10
          : city.hub ? 16 + pulse * 5 : 9 + pulse * 2.2;

        const haloGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, halo);
        haloGrad.addColorStop(
          0,
          cityFocused
            ? withAlpha(focusStroke, 0.32)
            : city.hub ? withAlpha(primary, 0.24) : withAlpha(fg, 0.14),
        );
        haloGrad.addColorStop(1, transparent(cityFocused ? focusStroke : primary));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, halo, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();

        // Shadow ellipse under label
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 9, city.hub ? 14 : 10, city.hub ? 5 : 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fill();

        // City dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, city.hub ? 6.4 : 4.8, 0, Math.PI * 2);
        ctx.fillStyle   = cityFocused ? C.gold : withAlpha(fg, 0.92);
        ctx.strokeStyle = withAlpha(cityFocused ? focusStroke : primary, cityFocused ? 0.78 : 0.42);
        ctx.lineWidth   = cityFocused ? 2.4 : city.hub ? 1.8 : 1.2;
        ctx.fill();
        ctx.stroke();

        // Focused city pulse ring
        if (cityFocused) {
          ctx.beginPath();
          ctx.arc(
            pt.x, pt.y,
            lerp(11, 18, focusStrength) + Math.sin(time * 0.004 + city.id) * 1.2,
            0, Math.PI * 2,
          );
          ctx.strokeStyle = withAlpha(focusStroke, 0.2 + focusStrength * 0.16);
          ctx.lineWidth   = 1.4;
          ctx.stroke();
        }

        // Hub indicator ring
        if (city.hub) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 9.5, 0, Math.PI * 2);
          ctx.strokeStyle = withAlpha(primary, 0.18);
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }

        // City name label — uses resolved foreground for contrast in both themes.
        const showLabel =
          city.name === 'Amman'  || city.name === 'Irbid'  || city.name === 'Jerash' ||
          city.name === 'Zarqa'  || city.name === 'Mafraq' || city.name === 'Karak'  ||
          city.name === 'Aqaba';

        if (showLabel) {
          ctx.fillStyle = fg;
          ctx.textAlign = city.labelAlign ?? 'center';
          ctx.font      = city.name === 'Amman'
            ? '700 16px Inter, system-ui, sans-serif'
            : '600 11px Inter, system-ui, sans-serif';
          ctx.fillText(city.name, pt.x + (city.labelDx ?? 0), pt.y + (city.labelDy ?? -12));
        }
      });

      // Reduced-motion: one static frame then stop.
      if (!prefersReducedMotion) {
        frameRef.current = requestAnimationFrame(render);
      } else {
        frameRef.current = null;
      }
    };

    renderRef.current = render;
    frameRef.current  = requestAnimationFrame(render);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [
    demandPressure,
    focusOrigin,
    focusRouteId,
    focusDestination,
    focusLabel,
    minimalText,
    preferredHeight,
    routes,
    runtimeMode,
    utilization,
  ]);

  const resolvedHeight = preferredHeight ?? (size.width < 480 ? 460 : 520);

  // ── Overlay UI (HTML on top of canvas) ────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      style={{
        position:   'relative',
        width:      '100%',
        minHeight:  resolvedHeight,
        borderRadius: R.xxl,
        overflow:   'hidden',
        background: 'var(--card, #0e2240)',
        border:     '1px solid var(--border)',
        boxShadow:  `${SH.xl}, inset 0 0 0 1px var(--border)`,
      }}
    >
      {showOverlay &&
        (focusLabel || runtimeMode || demandPressure !== undefined || utilization !== undefined) && (
        <div
          style={{
            position:       'absolute',
            top: 18, right: 18,
            zIndex:         2,
            display:        'grid',
            gap:            10,
            minWidth:       size.width < 540 ? 0 : 196,
            pointerEvents:  'none',
          }}
        >
          {(focusLabel || runtimeMode) && (
            <div
              style={{
                borderRadius:    R.xl,
                padding:         '10px 12px',
                background:      'var(--card)',
                border:          `1px solid ${runtimeMode === 'fallback' ? C.goldDim : 'var(--border)'}`,
                boxShadow:       SH.sm,
                backdropFilter:  'blur(12px)',
              }}
            >
              <div
                style={{
                  color:          runtimeMode === 'fallback' ? C.gold : 'var(--primary)',
                  fontSize:       '0.66rem',
                  letterSpacing:  '0.12em',
                  textTransform:  'uppercase',
                  fontWeight:     800,
                }}
              >
                {runtimeMode === 'fallback'
                  ? tx('mobilityOSLandingMap.fallback_focus')
                  : tx('mobilityOSLandingMap.live_corridor_focus')}
              </div>
              <div
                style={{
                  marginTop:  6,
                  color:      'var(--foreground)',
                  fontSize:   '0.92rem',
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                {focusLabel ?? tx('mobilityOSLandingMap.jordan_network')}
              </div>
              {focusLabel && (
                <div
                  style={{
                    marginTop:    6,
                    height:       5,
                    borderRadius: 999,
                    overflow:     'hidden',
                    background:   'var(--secondary)',
                  }}
                >
                  <div
                    style={{
                      width:        `${Math.round(46 + uiFocusStrength * 48)}%`,
                      height:       '100%',
                      borderRadius: 999,
                      background:   runtimeMode === 'fallback'
                        ? `linear-gradient(90deg, ${C.gold}, ${C.goldDim})`
                        : 'linear-gradient(90deg, var(--primary), #66E0FF)',
                      boxShadow: `0 0 18px ${withAlpha(uiFocusStroke, 0.42)}`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {(demandPressure !== undefined || utilization !== undefined) && (
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap:                 8,
              }}
            >
              {demandPressure !== undefined && (
                <div
                  style={{
                    borderRadius:   R.lg,
                    padding:        '9px 10px',
                    background:     'var(--card)',
                    border:         `1px solid ${runtimeMode === 'fallback' ? C.goldDim : 'var(--border)'}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      color:         'var(--muted-foreground)',
                      fontSize:      '0.6rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight:    800,
                    }}
                  >
                    {tx('mobilityOSLandingMap.pressure')}
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--foreground)', fontWeight: 900, fontSize: '0.82rem' }}>
                    {demandPressure.toFixed(2)}{tx('mobilityOSLandingMap.x')}
                  </div>
                </div>
              )}
              {utilization !== undefined && (
                <div
                  style={{
                    borderRadius:   R.lg,
                    padding:        '9px 10px',
                    background:     'var(--card)',
                    border:         `1px solid ${C.greenDim}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      color:         'var(--muted-foreground)',
                      fontSize:      '0.6rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      fontWeight:    800,
                    }}
                  >
                    {tx('mobilityOSLandingMap.utilization')}
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--foreground)', fontWeight: 900, fontSize: '0.82rem' }}>
                    {Math.round(utilization * 100)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inner border frame */}
      <div
        aria-hidden="true"
        style={{
          position:      'absolute',
          inset:         14,
          borderRadius:  R.xxl,
          border:        '1px solid var(--border)',
          pointerEvents: 'none',
          zIndex:        1,
        }}
      />

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={tx('mobilityOSLandingMap.network_visualization')}
        style={{
          position:  'relative',
          zIndex:    0,
          display:   'block',
          width:     '100%',
          height:    '100%',
          minHeight: resolvedHeight,
        }}
      />
    </div>
  );
}
