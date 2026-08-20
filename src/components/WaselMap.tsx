/**
 * WaselMap — Interactive map for Wasel | واصل
 *
 * ✅ Leaflet + OpenStreetMap/CartoDB (NO API key required)
 * ✅ Dark theme via CartoDB Dark Matter tiles
 * ✅ Live GPS tracking with animated pulse ring
 * ✅ Mosque markers via Overpass API (free, no key) + pre-defined fallback
 * ✅ Speed camera / radar markers across Jordan highways
 * ✅ Route drawing with OSRM free routing + Polyline fallback
 * ✅ Map type switcher: Standard / Satellite / Terrain
 * ✅ Fullscreen mode
 * ✅ Custom zoom controls
 * ✅ Live speed / accuracy HUD
 * ✅ POI info panels (mosque details, radar alerts)
 * ✅ Bilingual EN / AR tooltips
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  MapPin,
} from 'lucide-react';

import { MapControls, type MapType } from './MapControls';
import { MapOverlays } from './MapOverlays';
import { WaselLogo } from './wasel-ui/WaselLogo';
import { tx } from '../locales/tx';
import { sanitizeHtml, sanitizeLogMessage } from '../utils/sanitization';
import { colors, typography, radii, shadows, effects } from '../styles/design-tokens';
import { JORDAN_RADARS, FALLBACK_MOSQUES, TILE_CONFIGS } from './MapConfig';
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Layer as LeafletLayer,
  Circle as LeafletCircle,
  Polyline as LeafletPolyline,
  MapOptions as LeafletMapOptions,
} from 'leaflet';
import type * as LeafletNS from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LeafletNamespace = typeof LeafletNS;

interface OverpassElement {
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

/* ─── Inject Leaflet CSS (once, dynamically) ─────────────────────────── */
function ensureLeafletCSS() {
  if (!document.querySelector('#wasel-leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'wasel-leaflet-css';
    link.rel = 'stylesheet';
    link.href = new URL('leaflet/dist/leaflet.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  if (!document.querySelector('#wasel-leaflet-theme')) {
    const style = document.createElement('style');
    style.id = 'wasel-leaflet-theme';
    style.textContent = `
      .leaflet-container {
        background: ${colors.background.dark} !important;
        font-family: ${typography.font.body};
        width: 100% !important;
        height: 100% !important;
      }

      .leaflet-popup-content-wrapper,
      .leaflet-popup-tip {
        background: ${colors.background.glass} !important;
        color: ${colors.text.light} !important;
        border: 1px solid ${colors.border.secondary};
        box-shadow: ${shadows.xl};
        backdrop-filter: ${effects.backdropFilterLg};
      }

      .leaflet-popup-content {
        margin: 12px 14px !important;
        font-size: ${typography.size.base};
        line-height: 1.45;
      }

      .leaflet-tooltip {
        background: ${colors.background.panel} !important;
        color: ${colors.text.light} !important;
        border: 1px solid ${colors.border.secondary} !important;
        border-radius: ${radii.lg}px !important;
        box-shadow: ${shadows.md};
        padding: 8px 10px !important;
      }

      .leaflet-tooltip-top:before,
      .leaflet-tooltip-bottom:before,
      .leaflet-tooltip-left:before,
      .leaflet-tooltip-right:before {
        border-top-color: ${colors.background.panel} !important;
        border-bottom-color: ${colors.background.panel} !important;
        border-left-color: ${colors.background.panel} !important;
        border-right-color: ${colors.background.panel} !important;
      }

      .leaflet-control-attribution {
        background: ${colors.background.glass} !important;
        color: ${colors.text.brandMuted} !important;
        border-radius: ${radii.lg}px 0 0 0 !important;
        padding: 4px 8px !important;
        border-top: 1px solid ${colors.border.primary};
        border-left: 1px solid ${colors.border.primary};
      }

      .leaflet-control-attribution a {
        color: #147fe4 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/* ─── Singleton Leaflet loader ───────────────────────────────────────── */
let _leafletPromise: Promise<LeafletNamespace> | null = null;
function loadLeaflet(): Promise<LeafletNamespace> {
  if (!_leafletPromise) {
    ensureLeafletCSS();
    _leafletPromise = import('leaflet').then(mod => mod.default ?? mod);
  }
  return _leafletPromise;
}

/* ─── Tile layer configs ─────────────────────────────────────────────── */
const TILES = TILE_CONFIGS;

/* ─── Pre-defined data ───────────────────────────────────────────────── */
/* ─── SVG icon strings ───────────────────────────────────────────────── */
const SVG = {
  mosque: `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="#147fe4" stroke="white" stroke-width="2"/>
    <path d="M20 8 C14 8 9 13 9 19 C9 25 13.5 30 20 31 C24 29.5 27 26.5 27.5 24 C25.5 24.5 23.5 23.5 22 21.5 C19 17.5 20.5 12 24 9.5 C22.8 8.7 21.5 8 20 8Z" fill="white"/>
    <circle cx="27" cy="11.5" r="3" fill="white"/>
    <rect x="18" y="3" width="4" height="6" rx="2" fill="white" opacity="0.8"/>
    <rect x="7"  y="3" width="3" height="8" rx="1.5" fill="white" opacity="0.8"/>
    <rect x="30" y="3" width="3" height="8" rx="1.5" fill="white" opacity="0.8"/>
  </svg>`,

  radar: `<svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="36" height="36" rx="9" fill="#DC2626" stroke="white" stroke-width="1.5"/>
    <circle cx="19" cy="19" r="11" fill="none" stroke="white" stroke-width="2.5" stroke-dasharray="4 2"/>
    <circle cx="19" cy="19" r="6"  fill="none" stroke="white" stroke-width="2"/>
    <circle cx="19" cy="19" r="2.5" fill="white"/>
    <rect x="24" y="5"  width="7" height="4" rx="2" fill="white"/>
    <rect x="27" y="3"  width="2" height="4" fill="white"/>
    <line x1="19" y1="8" x2="22" y2="14" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  accident: `<svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
    <polygon points="19,2 36,34 2,34" fill="#F59E0B" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <rect x="17.5" y="14" width="3" height="10" rx="1.5" fill="white"/>
    <circle cx="19" cy="28.5" r="2" fill="white"/>
  </svg>`,

  police: `<svg width="38" height="38" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
    <circle cx="19" cy="19" r="17" fill="#3B82F6" stroke="white" stroke-width="2"/>
    <rect x="17" y="9"  width="4" height="20" rx="2" fill="white"/>
    <rect x="9"  y="17" width="20" height="4"  rx="2" fill="white"/>
  </svg>`,

  pinGreen: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="#5a6b08" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="#5a6b08"/>
  </svg>`,

  pinOrange: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="#ff8a0b" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="#ff8a0b"/>
  </svg>`,

  pinTeal: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="#147fe4" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="#147fe4"/>
  </svg>`,

  live: `<div style="width:52px;height:52px;position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(4,173,191,0.15);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(4,173,191,0.25);"></div>
    <div style="position:absolute;inset:13px;border-radius:50%;background:#147fe4;"></div>
    <div style="position:absolute;inset:19px;border-radius:50%;background:white;"></div>
  </div>`,
};

/* ─── Leaflet divIcon factory ────────────────────────────────────────── */
function makeDivIcon(
  L: LeafletNamespace,
  html: string,
  w: number,
  h: number,
  anchorX: number,
  anchorY: number,
) {
  return L.divIcon({
    html,
    className: '',
    iconSize: [w, h],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY],
  });
}

/** Safe wrapper — guards against Leaflet _initIcon crash when pane isn't ready yet */
function safeAddTo(marker: LeafletLayer, map: LeafletMap): LeafletLayer {
  const panes = (map as { _panes?: Record<string, unknown> })._panes;
  // Pre-check: Leaflet deletes map._panes on map.remove() — guard before calling addTo
  if (!panes || !panes['markerPane']) return marker;
  try {
    return marker.addTo(map);
  } catch {
    // Swallow silently — already guarded above, this is a last-resort safety net
    return marker;
  }
}

/** Returns true if the Leaflet map instance is alive and has its panes intact */
function isMapAlive(map: LeafletMap | null): boolean {
  const panes = (map as { _panes?: Record<string, unknown> } | null)?._panes;
  return !!(map && panes && panes['markerPane']);
}

/* ─── Types ──────────────────────────────────────────────────────────── */
export interface WaselMapRoute {
  lat: number;
  lng: number;
  label?: string;
}

export interface WaselMapMarker {
  lat: number;
  lng: number;
  label?: string;
  type?: 'pickup' | 'dropoff' | 'waypoint' | 'default';
}

export interface WaselMapHazard {
  lat: number;
  lng: number;
  type: 'accident' | 'police' | 'radar';
  name: string;
}

export interface WaselMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string | number;
  className?: string;
  showTraffic?: boolean;
  showMosques?: boolean;
  showRadars?: boolean;
  autoTrack?: boolean;
  route?: WaselMapRoute[];
  markers?: WaselMapMarker[];
  extraHazards?: WaselMapHazard[];
  onLocationUpdate?: (loc: { lat: number; lng: number; speed?: number | null }) => void;
  compact?: boolean;
}

interface POI {
  name: string;
  type: 'mosque' | 'radar' | 'accident' | 'police';
  vicinity?: string;
  info?: string;
}

/* ─── Component ──────────────────────────────────────────────────────── */
function WaselMapCompact({
  center,
  height,
  className,
  route,
  markers,
}: Pick<WaselMapProps, 'center' | 'height' | 'className' | 'route' | 'markers'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<LeafletNamespace | null>(null);
  const drawnLayersRef = useRef<LeafletLayer[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const [fallbackSvg, setFallbackSvg] = useState(false);

  const cssHeight = typeof height === 'number' ? `${height}px` : (height ?? '500px');

  const pts = [
    ...(route ?? []).map(p => ({ lat: p.lat, lng: p.lng })),
    ...(markers ?? []).map(m => ({ lat: m.lat, lng: m.lng })),
    ...(center ? [{ lat: center.lat, lng: center.lng }] : []),
  ];

  const bounds = pts.reduce(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.lat),
      maxLat: Math.max(acc.maxLat, p.lat),
      minLng: Math.min(acc.minLng, p.lng),
      maxLng: Math.max(acc.maxLng, p.lng),
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    },
  );

  const hasBounds =
    Number.isFinite(bounds.minLat) &&
    Number.isFinite(bounds.maxLat) &&
    Number.isFinite(bounds.minLng) &&
    Number.isFinite(bounds.maxLng);

  const invalidate = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
  }, []);

  // Initialize a lightweight Leaflet map for compact previews (no OSRM, no Overpass, no controls).
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    loadLeaflet()
      .then(L => {
        if (!mapDivRef.current || mapRef.current) return;
        LRef.current = L;

        const c = center ?? { lat: 31.9539, lng: 35.9106 };
        const mapOptions = {
          center: [c.lat, c.lng],
          zoom: 10,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false,
          touchZoom: false,
        } as LeafletMapOptions;
        const map = L.map(mapDivRef.current, mapOptions);
        mapRef.current = map;

        L.tileLayer(TILES.roadmap.url, {
          maxZoom: TILES.roadmap.maxZoom,
          subdomains: 'abcd',
        }).addTo(map);

        L.control
          .attribution({ position: 'bottomright', prefix: false })
          .addAttribution('© OpenStreetMap contributors © CARTO')
          .addTo(map);

        if (containerRef.current && !roRef.current) {
          roRef.current = new ResizeObserver(() => invalidate());
          roRef.current.observe(containerRef.current);
        }

        requestAnimationFrame(() => invalidate());
      })
      .catch(err => {
        console.error('[WaselMapCompact] Failed to load Leaflet:', sanitizeLogMessage(err));
        setFallbackSvg(true);
      });

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      drawnLayersRef.current = [];
    };
  }, []);

  // Draw route/markers whenever inputs change.
  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    drawnLayersRef.current.forEach(l => {
      try {
        l.remove();
      } catch {
        /* ignore */
      }
    });
    drawnLayersRef.current = [];

    const rPts = (route ?? []).filter(Boolean);
    const mPts = (markers ?? []).filter(Boolean);

    if (rPts.length >= 2) {
      const latlngs = rPts.map(p => [p.lat, p.lng] as [number, number]);
      const shadow = L.polyline(latlngs, {
        color: 'rgba(0,0,0,0.35)',
        weight: 8,
        opacity: 1,
        lineCap: 'round',
      }).addTo(map);
      const line = L.polyline(latlngs, {
        color: '#147fe4',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);
      drawnLayersRef.current.push(shadow, line);

      const start = rPts[0];
      const end = rPts[rPts.length - 1];
      if (start && end) {
        const startM = L.circleMarker([start.lat, start.lng], {
          radius: 6,
          color: '#72c70d',
          weight: 2,
          fillColor: '#72c70d',
          fillOpacity: 1,
        }).addTo(map);
        const endM = L.circleMarker([end.lat, end.lng], {
          radius: 6,
          color: '#F0A830',
          weight: 2,
          fillColor: '#F0A830',
          fillOpacity: 1,
        }).addTo(map);
        drawnLayersRef.current.push(startM, endM);
      }
    }

    mPts.forEach(m => {
      const cm = L.circleMarker([m.lat, m.lng], {
        radius: 5,
        color: '#147fe4',
        weight: 2,
        fillColor: '#147fe4',
        fillOpacity: 0.8,
      }).addTo(map);
      drawnLayersRef.current.push(cm);
    });

    if (hasBounds) {
      const sw = L.latLng(bounds.minLat, bounds.minLng);
      const ne = L.latLng(bounds.maxLat, bounds.maxLng);
      map.fitBounds(L.latLngBounds(sw, ne).pad(0.15), { animate: false, maxZoom: 12 });
    } else if (center) {
      map.setView([center.lat, center.lng], 10, { animate: false });
    }

    invalidate();
  }, [
    bounds.maxLat,
    bounds.maxLng,
    bounds.minLat,
    bounds.minLng,
    center,
    hasBounds,
    invalidate,
    markers,
    route,
  ]);

  // SVG fallback stays available if Leaflet fails to load (CSP/offline/tests).
  if (fallbackSvg) {
    const pad = 20;
    const w = 600;
    const h = 360;
    const spanLng = Math.max(0.0001, bounds.maxLng - bounds.minLng);
    const spanLat = Math.max(0.0001, bounds.maxLat - bounds.minLat);
    const scaleX = (w - pad * 2) / spanLng;
    const scaleY = (h - pad * 2) / spanLat;

    const project = (lat: number, lng: number) => {
      const x = pad + (lng - bounds.minLng) * scaleX;
      const y = h - pad - (lat - bounds.minLat) * scaleY;
      return { x, y };
    };

    const routePts = (route ?? []).map(p => project(p.lat, p.lng));
    const firstRoutePoint = routePts[0];
    const pathD =
      routePts.length >= 2 && firstRoutePoint
        ? `M ${firstRoutePoint.x} ${firstRoutePoint.y} ` +
          routePts
            .slice(1)
            .map(p => `L ${p.x} ${p.y}`)
            .join(' ')
        : '';

    const start = routePts[0];
    const end = routePts[routePts.length - 1];

    return (
      <div
        className={`select-none ${className ?? ''}`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: radii['2xl'],
          height: cssHeight,
          background:
            'radial-gradient(120% 160% at 30% 15%, rgba(0,200,232,0.14), rgba(4,12,24,0.92) 55%, rgba(4,12,24,0.98) 100%)',
          border: `1px solid ${colors.border.primary}`,
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="waselRoute" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.secondary.green} stopOpacity="0.95" />
              <stop offset="55%" stopColor={colors.primary.brand} stopOpacity="0.95" />
              <stop offset="100%" stopColor={colors.secondary.orange} stopOpacity="0.95" />
            </linearGradient>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke={colors.background.light}
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect x="0" y="0" width={w} height={h} fill="url(#grid)" opacity="0.85" />

          {pathD && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="url(#waselRoute)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </>
          )}

          {start && (
            <g>
              <circle cx={start.x} cy={start.y} r="9" fill="rgba(0,0,0,0.35)" />
              <circle cx={start.x} cy={start.y} r="6" fill={colors.secondary.green} />
            </g>
          )}
          {end && (
            <g>
              <circle cx={end.x} cy={end.y} r="9" fill="rgba(0,0,0,0.35)" />
              <circle cx={end.x} cy={end.y} r="6" fill={colors.secondary.orange} />
            </g>
          )}
        </svg>

        <div
          className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: colors.background.overlay, border: `1px solid ${colors.border.primary}` }}
        >
          <WaselLogo size={20} theme="light" variant="full" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`select-none ${className ?? ''}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radii['2xl'],
        height: cssHeight,
        background: colors.background.dark,
        border: `1px solid ${colors.border.primary}`,
      }}
    >
      <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: colors.background.overlay, border: `1px solid ${colors.border.primary}` }}
      >
        <WaselLogo size={20} theme="light" variant="full" />
      </div>
    </div>
  );
}

function WaselMapFull(props: WaselMapProps) {
  const {
    center = { lat: 31.9539, lng: 35.9106 }, // Amman
    zoom = 13,
    height = 500,
    className = '',
    showMosques = true,
    showRadars = true,
    autoTrack = false,
    route = [],
    markers = [],
    extraHazards = [],
    onLocationUpdate,
    compact = false,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletLayer | null>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const liveMarkerRef = useRef<LeafletMarker | null>(null);
  const liveCircleRef = useRef<LeafletCircle | null>(null);
  const mosqueLayerRef = useRef<LeafletLayer[]>([]);
  const radarLayerRef = useRef<LeafletLayer[]>([]);
  const routeMarkersRef = useRef<LeafletLayer[]>([]);
  const customMarkersRef = useRef<LeafletLayer[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const initDone = useRef(false);
  const LRef = useRef<LeafletNamespace | null>(null); // Leaflet instance
  const moveEndDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<MapType>('roadmap');
  const [mosquesOn, setMosquesOn] = useState(showMosques);
  const [radarsOn, setRadarsOn] = useState(showRadars);
  const [isTracking, setIsTracking] = useState(false);
  const [liveLocation, setLiveLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number | null;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);

  // Leaflet often renders blank space if its container size changes after mount
  // (tabs, responsive layout, fullscreen). Keep it always correct.
  useEffect(() => {
    if (!isLoaded || !containerRef.current || !mapRef.current) return;

    const el = containerRef.current;
    let raf: number | null = null;
    const invalidate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        mapRef.current?.invalidateSize({ pan: false });
      });
    };

    invalidate();

    const ro = new ResizeObserver(() => invalidate());
    ro.observe(el);

    const onVis = () => {
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isLoaded, height, isFullscreen]);

  /* ── Mosque markers via Overpass API ── */
  const loadMosques = useCallback(async (mapInstance: LeafletMap) => {
    if (!LRef.current) return;
    const L = LRef.current;

    // Clear existing
    mosqueLayerRef.current.forEach(m => m.remove());
    mosqueLayerRef.current = [];

    const mapCenter = mapInstance.getCenter();
    const lat = mapCenter.lat;
    const lng = mapCenter.lng;

    let mosquesToShow = FALLBACK_MOSQUES;

    try {
      const query = `[out:json][timeout:10];node["amenity"="place_of_worship"]["religion"="muslim"](around:8000,${lat},${lng});out 20;`;
      const res = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.elements?.length > 0) {
          mosquesToShow = data.elements.map((el: OverpassElement) => ({
            lat: el.lat,
            lng: el.lon,
            name: sanitizeHtml(el.tags?.name || el.tags?.['name:ar'] || 'Mosque | مسجد'),
          }));
        }
      }
    } catch {
      // Use fallback silently
    }

    // After the async await, the map may have been destroyed by StrictMode cleanup —
    // check _panes before touching any Leaflet layer.
    if (!isMapAlive(mapInstance)) return;

    const icon = makeDivIcon(L, SVG.mosque, 40, 40, 20, 20);
    mosquesToShow.forEach(m => {
      try {
        const marker = safeAddTo(L.marker([m.lat, m.lng], { icon }), mapInstance).on('click', () =>
          setSelectedPOI({ type: 'mosque', name: m.name }),
        );
        mosqueLayerRef.current.push(marker);
      } catch {
        /* skip if pane not ready */
      }
    });
  }, []);

  /* ── Radar markers ── */
  const loadRadars = useCallback(
    (mapInstance: LeafletMap) => {
      if (!LRef.current) return;
      const L = LRef.current;

      radarLayerRef.current.forEach(m => m.remove());
      radarLayerRef.current = [];

      const radarIcon = makeDivIcon(L, SVG.radar, 38, 38, 19, 19);
      JORDAN_RADARS.forEach(r => {
        try {
          const marker = safeAddTo(L.marker([r.lat, r.lng], { icon: radarIcon }), mapInstance).on(
            'click',
            () =>
              setSelectedPOI({
                type: 'radar',
                name: r.name,
                info: `Speed limit: ${r.limit} km/h | الحد المسموح: ${r.limit} كم/س`,
              }),
          );
          radarLayerRef.current.push(marker);
        } catch {
          /* skip */
        }
      });

      // Extra hazards
      extraHazards.forEach(h => {
        try {
          const svg =
            h.type === 'accident' ? SVG.accident : h.type === 'police' ? SVG.police : SVG.radar;
          const icon = makeDivIcon(L, svg, 38, 38, 19, 19);
          const marker = safeAddTo(L.marker([h.lat, h.lng], { icon }), mapInstance).on(
            'click',
            () => setSelectedPOI({ type: h.type, name: sanitizeHtml(h.name) }),
          );
          radarLayerRef.current.push(marker);
        } catch {
          /* skip */
        }
      });
    },
    [extraHazards],
  );

  /* ── Draw route ── */
  const drawRoute = useCallback(
    async (mapInstance: LeafletMap) => {
      if (!LRef.current || route.length < 2) return;
      const L = LRef.current;

      // Clear old
      routeMarkersRef.current.forEach(m => m.remove());
      routeMarkersRef.current = [];
      routeLineRef.current?.remove();
      routeLineRef.current = null;

      // Place endpoint markers
      route.forEach((pt, i) => {
        const isFirst = i === 0;
        const isLast = i === route.length - 1;
        const svg = isFirst ? SVG.pinGreen : isLast ? SVG.pinOrange : SVG.pinTeal;
        const icon = makeDivIcon(L, svg, 30, 42, 15, 42);
        try {
          const m = safeAddTo(L.marker([pt.lat, pt.lng], { icon }), mapInstance);
          if (pt.label) m.bindTooltip(sanitizeHtml(pt.label), { permanent: false, direction: 'top' });
          routeMarkersRef.current.push(m);
        } catch {
          /* skip */
        }
      });

      // Try OSRM for road-following route
      let latlngs: [number, number][] = route.map(p => [p.lat, p.lng]);
      try {
        const coords = route.map(p => `${p.lng},${p.lat}`).join(';');
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (res.ok) {
          const data = await res.json();
          const coords2 = data.routes?.[0]?.geometry?.coordinates;
          if (coords2?.length) {
            latlngs = coords2.map(([lng, lat]: [number, number]) => [lat, lng]);
          }
        }
      } catch {
        // Use straight-line polyline fallback
      }

      // After the async OSRM await, the map may have been destroyed — guard before drawing
      if (!isMapAlive(mapInstance)) return;

      routeLineRef.current = L.polyline(latlngs, {
        color: '#147fe4',
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapInstance);

      // Fit bounds
      const bounds = L.latLngBounds(route.map(p => [p.lat, p.lng]));
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
    },
    [route],
  );

  /* ── Custom prop markers ── */
  const drawCustomMarkers = useCallback(
    (mapInstance: LeafletMap) => {
      if (!LRef.current) return;
      const L = LRef.current;

      customMarkersRef.current.forEach(m => m.remove());
      customMarkersRef.current = [];

      markers.forEach(mk => {
        const svg =
          mk.type === 'pickup' ? SVG.pinGreen : mk.type === 'dropoff' ? SVG.pinOrange : SVG.pinTeal;
        const icon = makeDivIcon(L, svg, 30, 42, 15, 42);
        try {
          const m = safeAddTo(L.marker([mk.lat, mk.lng], { icon }), mapInstance);
          if (mk.label) m.bindTooltip(sanitizeHtml(mk.label), { permanent: false, direction: 'top' });
          customMarkersRef.current.push(m);
        } catch {
          /* skip */
        }
      });
    },
    [markers],
  );

  /* ── GPS tracking ── */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      return;
    }
    setLocationError(null);

    const id = navigator.geolocation.watchPosition(
      pos => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
        };
        setLiveLocation(loc);
        setIsTracking(true);

        if (LRef.current && mapRef.current) {
          const L = LRef.current;
          const latlng: [number, number] = [loc.lat, loc.lng];

          if (!liveMarkerRef.current) {
            const icon = makeDivIcon(L, SVG.live, 52, 52, 26, 26);
            liveMarkerRef.current = L.marker(latlng, { icon, zIndexOffset: 9999 }).addTo(
              mapRef.current,
            );
            liveCircleRef.current = L.circle(latlng, {
              radius: loc.accuracy || 20,
              color: '#147fe4',
              fillColor: '#147fe4',
              fillOpacity: 0.08,
              weight: 1,
              opacity: 0.35,
            }).addTo(mapRef.current);
          } else {
            liveMarkerRef.current.setLatLng(latlng);
            liveCircleRef.current?.setLatLng(latlng).setRadius(loc.accuracy || 20);
          }

          mapRef.current.panTo(latlng);
        }

        onLocationUpdate?.({ lat: loc.lat, lng: loc.lng, speed: loc.speed });
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Location access denied. Enable it in browser settings | تم رفض الوصول للموقع',
          2: 'Location unavailable | الموقع غير متاح',
          3: 'Location request timed out | انتهت مهلة طلب الموقع',
        };
        setLocationError(msgs[err.code] ?? 'Location error');
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    watchIdRef.current = id;
  }, [onLocationUpdate]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setLiveLocation(null);
    liveMarkerRef.current?.remove();
    liveMarkerRef.current = null;
    liveCircleRef.current?.remove();
    liveCircleRef.current = null;
  }, []);

  /* ── Map initialization ── */
  useEffect(() => {
    if (initDone.current || !mapDivRef.current) return;
    initDone.current = true;

    loadLeaflet()
      .then(L => {
        if (!mapDivRef.current || mapRef.current) return;
        LRef.current = L;

        const map = L.map(mapDivRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: false,
        });
        mapRef.current = map;

        // Force Leaflet to measure container dimensions before adding any layers
        map.invalidateSize();

        // Dark tile layer (CartoDB)
        tileLayerRef.current = L.tileLayer(TILES.roadmap.url, {
          maxZoom: TILES.roadmap.maxZoom,
          subdomains: 'abcd',
        }).addTo(map);

        // Attribution (small, bottom-right)
        L.control
          .attribution({ position: 'bottomright', prefix: false })
          .addAttribution('© OpenStreetMap contributors © CARTO')
          .addTo(map);

        // Reload mosques when map moves significantly
        map.on('moveend', () => {
          if (moveEndDebounceRef.current !== null) {
            clearTimeout(moveEndDebounceRef.current);
          }
          moveEndDebounceRef.current = setTimeout(() => {
            moveEndDebounceRef.current = null;
            if (mosquesOn) loadMosques(map);
          }, 1000);
        });

        setIsLoaded(true);
        if (autoTrack) startTracking();

        // Use map.whenReady() + rAF so Leaflet panes are fully in the DOM
        // and sized before any marker .addTo() fires.
        // IMPORTANT: always read mapRef.current inside the callback — never use
        // the closure-captured `map` which may be stale after StrictMode cleanup.
        map.whenReady(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const m = mapRef.current;
              if (!m) return;
              // Guard: ensure markerPane DOM node exists
              if (!m.getPane('markerPane')) return;
              if (radarsOn) loadRadars(m);
              if (mosquesOn) loadMosques(m);
              if (route.length >= 2) drawRoute(m);
              if (markers.length > 0) drawCustomMarkers(m);
            });
          });
        });
      })
      .catch(err => {
        console.error('[WaselMap] Failed to load Leaflet:', sanitizeLogMessage(err));
        setLoadError('Could not load map library.');
      });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      initDone.current = false;
      if (moveEndDebounceRef.current !== null) {
        clearTimeout(moveEndDebounceRef.current);
        moveEndDebounceRef.current = null;
      }
    };
  }, []);

  /* ── Map type switcher ── */
/* ── Layer toggles ── */
  const changeMapType = useCallback((type: MapType) => {
    if (!mapRef.current || !LRef.current) return;

    const L = LRef.current;
    tileLayerRef.current?.remove();
    tileLayerRef.current = L.tileLayer(TILES[type].url, {
      maxZoom: TILES[type].maxZoom,
      subdomains: type === 'roadmap' ? 'abcd' : 'abc',
    }).addTo(mapRef.current);
    setMapType(type);
  }, []);

  const toggleMosques = useCallback(() => {
    const next = !mosquesOn;
    setMosquesOn(next);
    if (next && mapRef.current) {
      loadMosques(mapRef.current);
    } else {
      mosqueLayerRef.current.forEach(m => m.remove());
      mosqueLayerRef.current = [];
    }
  }, [mosquesOn, loadMosques]);

  const toggleRadars = useCallback(() => {
    const next = !radarsOn;
    setRadarsOn(next);
    if (next && mapRef.current) {
      loadRadars(mapRef.current);
    } else {
      radarLayerRef.current.forEach(m => m.remove());
      radarLayerRef.current = [];
    }
  }, [radarsOn, loadRadars]);

  /* ── Zoom ── */
  const zoomIn = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) + 1);
  const zoomOut = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) - 1);

  /* ── Center on live location ── */
  const centerOnMe = () => {
    if (liveLocation && mapRef.current) {
      mapRef.current.setView([liveLocation.lat, liveLocation.lng], 17);
    } else {
      startTracking();
    }
  };

  /* ── Fullscreen ── */
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen(f => !f));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => setIsFullscreen(f => !f));
    }
  };

  const cssHeight = typeof height === 'number' ? `${height}px` : height;

  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className={`select-none ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radii['2xl'],
        height: isFullscreen ? '100dvh' : cssHeight,
        background: colors.background.dark,
      }}
    >
      {/* ── Leaflet map container ── */}
      <div ref={mapDivRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* Ping animation for live marker */}
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>

      {/* ── Loading overlay ── */}
      <AnimatePresence>
        {!isLoaded && !loadError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
            style={{ background: colors.background.dark }}
          >
            <div className="relative w-20 h-20">
              <svg
                viewBox="0 0 80 80"
                className="w-full h-full animate-spin"
                style={{ animationDuration: '2s' }}
              >
                <circle cx="40" cy="40" r="34" fill="none" stroke={colors.background.panel} strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={colors.primary.brandLight}
                  strokeWidth="6"
                  strokeDasharray="80 134"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="w-7 h-7" style={{ color: colors.primary.brandLight }} />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-base" style={{ color: colors.text.light }}>{tx('waselMap.loading_map')}</p>
              <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>جاري تحميل الخريطة...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error overlay ── */}
      {loadError && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 p-6"
          style={{ background: colors.background.dark }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(220, 38, 38, 0.15)' }}
          >
            <AlertTriangle className="w-8 h-8" style={{ color: colors.status.error }} />
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: colors.text.light }}>{tx('waselMap.map_failed_to_load')}</p>
            <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>{loadError}</p>
          </div>
        </div>
      )}

      {/* ── Controls (only when loaded) ── */}
      {isLoaded && (
        <>

          <MapControls
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            mapType={mapType}
            changeMapType={changeMapType}
            mosquesOn={mosquesOn}
            toggleMosques={toggleMosques}
            radarsOn={radarsOn}
            toggleRadars={toggleRadars}
            isTracking={isTracking}
            startTracking={startTracking}
            stopTracking={stopTracking}
            centerOnMe={centerOnMe}
            compact={compact}
            tx={tx}
          />

          <MapOverlays
            isTracking={isTracking}
            liveLocation={liveLocation}
            selectedPOI={selectedPOI}
            locationError={locationError}
            onClosePOI={() => setSelectedPOI(null)}
            onCloseError={() => setLocationError(null)}
          />
          {/* ── Wasel watermark ── */}
          <div
            className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: colors.background.overlay }}
          >
            <WaselLogo size={20} theme="light" variant="full" />
          </div>
        </>
      )}
    </div>
  );
}

export function WaselMap(props: WaselMapProps) {
  if (props.compact) {
    return (
      <WaselMapCompact
        center={props.center}
        height={props.height}
        className={props.className}
        route={props.route}
        markers={props.markers}
      />
    );
  }

  return <WaselMapFull {...props} />;
}

/* ─── Convenience re-export so old imports keep working ──────────────── */
export type { WaselMapProps as GoogleMapComponentProps };
