/**
 * WaselMap - Interactive map for Wasel | واصل
 *
 * âœ… Leaflet + OpenStreetMap/CartoDB (NO API key required)
 * âœ… Dark theme via CartoDB Dark Matter tiles
 * âœ… Live GPS tracking with animated pulse ring
 * âœ… Mosque markers via Overpass API (free, no key) + pre-defined fallback
 * âœ… Speed camera / radar markers across Jordan highways
 * âœ… Route drawing with OSRM free routing + Polyline fallback
 * âœ… Map type switcher: Standard / Satellite / Terrain
 * âœ… Fullscreen mode
 * âœ… Custom zoom controls
 * âœ… Live speed / accuracy HUD
 * âœ… POI info panels (mosque details, radar alerts)
 * âœ… Bilingual EN / AR tooltips
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type * as LeafletNamespace from 'leaflet';
import type {
  Circle as LeafletCircle,
  DivIcon as LeafletDivIcon,
  Layer as LeafletLayer,
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
  TileLayer as LeafletTileLayer,
} from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import {
  Locate,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Radio,
  AlertTriangle,
  X,
  Navigation2,
  Wifi,
  WifiOff,
  MapPin,
  Map,
  Satellite,
  Mountain,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { omitUndefined } from '../utils/object';
import { normalizeTextTree, repairLikelyMojibake } from '../utils/textEncoding';

/* â”€â”€â”€ Inject Leaflet CSS (once, dynamically) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ensureLeafletCSS() {
  if (!document.querySelector('#wasel-leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'wasel-leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }

  if (!document.querySelector('#wasel-leaflet-theme')) {
    const style = document.createElement('style');
    style.id = 'wasel-leaflet-theme';
    style.textContent = `
      .leaflet-container {
        background: var(--surface-strong) !important;
        font-family: var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif);
        width: 100% !important;
        height: 100% !important;
      }

      .leaflet-popup-content-wrapper,
      .leaflet-popup-tip {
        background: color-mix(in srgb, var(--surface-strong) 98%, transparent) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border);
        box-shadow: var(--wasel-shadow-md);
        backdrop-filter: blur(16px);
      }

      .leaflet-popup-content {
        margin: 12px 14px !important;
        font-size: 12px;
        line-height: 1.45;
      }

      .leaflet-tooltip {
        background: color-mix(in srgb, var(--surface-strong) 96%, transparent) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border) !important;
        border-radius: 12px !important;
        box-shadow: var(--wasel-shadow-sm);
        padding: 8px 10px !important;
      }

      .leaflet-tooltip-top:before,
      .leaflet-tooltip-bottom:before,
      .leaflet-tooltip-left:before,
      .leaflet-tooltip-right:before {
        border-top-color: color-mix(in srgb, var(--surface-strong) 96%, transparent) !important;
        border-bottom-color: color-mix(in srgb, var(--surface-strong) 96%, transparent) !important;
        border-left-color: color-mix(in srgb, var(--surface-strong) 96%, transparent) !important;
        border-right-color: color-mix(in srgb, var(--surface-strong) 96%, transparent) !important;
      }

      .leaflet-control-attribution {
        background: color-mix(in srgb, var(--surface-glass) 92%, transparent) !important;
        color: var(--text-secondary) !important;
        border-radius: 12px 0 0 0 !important;
        padding: 4px 8px !important;
        border-top: 1px solid var(--border);
        border-left: 1px solid var(--border);
      }

      .leaflet-control-attribution a {
        color: #19e7bb !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/* â”€â”€â”€ Singleton Leaflet loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type LeafletModule = typeof LeafletNamespace;
type LeafletImportModule = LeafletModule & { default?: LeafletModule };
type LeafletMapWithPanes = LeafletMap & { _panes?: Record<string, unknown> };
type OverpassResponse = {
  elements?: Array<{
    lat: number;
    lon: number;
    tags?: Record<string, string | undefined>;
  }>;
};
type OsrmRouteResponse = {
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
};

let _leafletPromise: Promise<LeafletModule> | null = null;
function loadLeaflet(): Promise<LeafletModule> {
  if (!_leafletPromise) {
    ensureLeafletCSS();
    _leafletPromise = import('leaflet').then(mod => {
      const leafletModule = mod as LeafletImportModule;
      return leafletModule.default ?? mod;
    });
  }
  return _leafletPromise;
}

/* â”€â”€â”€ Tile layer configs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type MapTileKind = 'roadmap' | 'satellite' | 'terrain';
type MapTheme = 'light' | 'dark';

const ROADMAP_TILES = normalizeTextTree({
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
  },
} as const);

const SATELLITE_TILE = normalizeTextTree({
  // Use Google Maps satellite tiles when key is available, else Esri fallback
  url: (() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (key) return `https://maps.googleapis.com/maps/vt?lyrs=s&x={x}&y={y}&z={z}&key=${key}`;
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  })(),
  attribution: '© Google Maps | © Esri, DigitalGlobe',
  maxZoom: 21,
  subdomains: 'abc',
} as const);

const TERRAIN_TILE = normalizeTextTree({
  url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors, SRTM © OpenTopoMap (CC-BY-SA)',
  maxZoom: 17,
  subdomains: 'abc',
} as const);

function getTileConfig(type: MapTileKind, theme: MapTheme) {
  if (type === 'roadmap') {
    return ROADMAP_TILES[theme];
  }

  if (type === 'satellite') {
    return SATELLITE_TILE;
  }

  return TERRAIN_TILE;
}

/* â”€â”€â”€ Pre-defined data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const JORDAN_RADARS = normalizeTextTree([
  { lat: 31.9539, lng: 35.9106, name: 'Radar â€“ Amman 7th Circle', limit: 60 },
  { lat: 31.9786, lng: 35.8444, name: 'Radar â€“ Queen Alia Airport Rd', limit: 80 },
  { lat: 31.7854, lng: 35.9771, name: 'Radar â€“ Madaba Highway', limit: 80 },
  { lat: 31.45, lng: 35.98, name: 'Radar â€“ Desert Hwy km 110', limit: 100 },
  { lat: 31.2001, lng: 35.9311, name: 'Radar â€“ Desert Hwy km 200', limit: 110 },
  { lat: 30.85, lng: 35.7, name: 'Radar â€“ Desert Hwy km 270', limit: 110 },
  { lat: 30.5284, lng: 35.4078, name: 'Radar â€“ Desert Hwy km 330', limit: 110 },
  { lat: 29.5321, lng: 35.006, name: 'Radar â€“ Aqaba Entry', limit: 60 },
  { lat: 32.5568, lng: 35.8486, name: 'Radar â€“ Irbid South', limit: 80 },
  { lat: 32.0408, lng: 36.0899, name: 'Radar â€“ Zarqa Highway', limit: 80 },
  { lat: 32.61, lng: 35.99, name: 'Radar â€“ Ramtha Border', limit: 60 },
  { lat: 31.87, lng: 35.94, name: 'Radar â€“ South Amman Ring Rd', limit: 80 },
]);

const FALLBACK_MOSQUES = normalizeTextTree([
  {
    lat: 31.9554,
    lng: 35.91,
    name: 'King Abdullah I Mosque | مسجد الملك عبدالله الأول',
  },
  { lat: 31.9515, lng: 35.9219, name: 'Al-Hussein Mosque | مسجد الحسين' },
  { lat: 31.9609, lng: 35.8895, name: 'Abu Darwish Mosque | مسجد أبو درويش' },
  { lat: 31.9657, lng: 35.8982, name: 'Al-Kalouti Mosque | مسجد الكالوتي' },
  { lat: 31.95, lng: 35.8952, name: 'Al-Thaqafeh Mosque | مسجد الثقافة' },
  { lat: 31.944, lng: 35.921, name: 'Al-Manar Mosque | مسجد المنار' },
  { lat: 32.5568, lng: 35.8486, name: 'Irbid Grand Mosque | مسجد إربد الكبير' },
  { lat: 29.5321, lng: 35.006, name: 'Aqaba Central Mosque | مسجد العقبة' },
  { lat: 31.7167, lng: 35.95, name: 'Madaba Mosque | مسجد مادبا' },
  { lat: 31.22, lng: 35.93, name: "Ma'an Mosque | مسجد معان" },
  { lat: 31.0, lng: 35.5, name: 'Shoubak Rest Stop Mosque | مسجد استراحة الشوبك' },
  { lat: 30.3, lng: 35.2, name: 'Wadi Rum Mosque | مسجد وادي رم' },
]);

const MAP_PRIMARY = '#19E7BB';
const MAP_PRIMARY_SOFT = '#A2FFE7';
const MAP_MINT = '#DCFFF8';

/* â”€â”€â”€ SVG icon strings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SVG = {
  mosque: `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="18" fill="${MAP_PRIMARY}" stroke="white" stroke-width="2"/>
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
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="${MAP_PRIMARY_SOFT}" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="${MAP_PRIMARY_SOFT}"/>
  </svg>`,

  pinOrange: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="${MAP_MINT}" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="${MAP_MINT}"/>
  </svg>`,

  pinTeal: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0 C6.7 0 0 6.7 0 15 C0 26 15 42 15 42 C15 42 30 26 30 15 C30 6.7 23.3 0 15 0Z" fill="${MAP_PRIMARY}" stroke="white" stroke-width="2"/>
    <circle cx="15" cy="15" r="7" fill="white"/>
    <circle cx="15" cy="15" r="4.5" fill="${MAP_PRIMARY}"/>
  </svg>`,

  live: `<div style="width:52px;height:52px;position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(25,231,187,0.16);animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="position:absolute;inset:6px;border-radius:50%;background:rgba(25,231,187,0.28);"></div>
    <div style="position:absolute;inset:13px;border-radius:50%;background:${MAP_PRIMARY};"></div>
    <div style="position:absolute;inset:19px;border-radius:50%;background:white;"></div>
  </div>`,
};

const CONTROL_PANEL_STYLE = {
  background: 'color-mix(in srgb, var(--surface-strong) 94%, transparent)',
  backdropFilter: 'blur(18px) saturate(180%)',
  WebkitBackdropFilter: 'blur(18px) saturate(180%)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--wasel-shadow-md)',
} as const;

const CONTROL_BUTTON_BASE = {
  appearance: 'none' as const,
  border: 'none',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 180ms ease',
  color: 'var(--text-primary)',
  background: 'transparent',
} as const;

function mapTypeButtonStyle(active: boolean) {
  return {
    ...CONTROL_BUTTON_BASE,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    minHeight: 40,
    padding: '0 14px',
    justifyContent: 'flex-start',
    fontSize: '0.74rem',
    fontWeight: 800,
    letterSpacing: '0.02em',
    color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
    background: active
      ? 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 52%, #65E1FF 100%)'
      : 'var(--surface-muted)',
    boxShadow: active ? 'var(--wasel-shadow-teal)' : 'none',
  } as const;
}

function compactControlButtonStyle(active = false) {
  return {
    ...CONTROL_BUTTON_BASE,
    width: 40,
    height: 40,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active
      ? 'linear-gradient(135deg, rgba(220,255,248,0.95), rgba(25,231,187,0.95), rgba(101,225,255,0.95))'
      : 'var(--surface-muted)',
    border: active ? '1px solid var(--border-strong)' : '1px solid var(--border)',
    color: active ? 'var(--text-inverse)' : 'var(--text-primary)',
    boxShadow: active ? 'var(--wasel-shadow-teal)' : 'var(--wasel-shadow-sm)',
  } as const;
}

function wideControlButtonStyle(active = false) {
  return {
    ...CONTROL_BUTTON_BASE,
    minHeight: 40,
    padding: '0 14px',
    borderRadius: 14,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: active
      ? 'linear-gradient(135deg, rgba(220,255,248,0.95), rgba(25,231,187,0.95), rgba(101,225,255,0.95))'
      : 'var(--surface-muted)',
    border: active ? '1px solid var(--border-strong)' : '1px solid var(--border)',
    color: active ? 'var(--text-inverse)' : 'var(--text-primary)',
    boxShadow: active ? 'var(--wasel-shadow-teal)' : 'var(--wasel-shadow-sm)',
    fontSize: '0.72rem',
    fontWeight: 800,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap' as const,
  } as const;
}

/* â”€â”€â”€ Leaflet divIcon factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function makeDivIcon(
  L: Pick<LeafletModule, 'divIcon'>,
  html: string,
  w: number,
  h: number,
  anchorX: number,
  anchorY: number,
): LeafletDivIcon {
  return L.divIcon({
    html,
    className: '',
    iconSize: [w, h],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -anchorY],
  });
}

/** Safe wrapper â€” guards against Leaflet _initIcon crash when pane isn't ready yet */
function safeAddTo<T extends { addTo(map: LeafletMap): T }>(
  marker: T,
  map: LeafletMapWithPanes,
): T {
  // Pre-check: Leaflet deletes map._panes on map.remove() â€” guard before calling addTo
  if (!map || !map._panes || !map._panes['markerPane']) return marker;
  try {
    return marker.addTo(map);
  } catch {
    // Swallow silently â€” already guarded above, this is a last-resort safety net
    return marker;
  }
}

/** Returns true if the Leaflet map instance is alive and has its panes intact */
function isMapAlive(map: LeafletMapWithPanes | null | undefined): map is LeafletMapWithPanes {
  return !!(map && map._panes && map._panes['markerPane']);
}

/* â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

type MapPoint = { lat: number; lng: number };

interface POI {
  name: string;
  type: 'mosque' | 'radar' | 'accident' | 'police';
  vicinity?: string;
  info?: string;
}

function getMapContentPoints(
  center: MapPoint,
  route: readonly WaselMapRoute[],
  markers: readonly WaselMapMarker[],
  liveLocation?: MapPoint | null,
) {
  return [
    ...route.map(point => ({ lat: point.lat, lng: point.lng })),
    ...markers.map(point => ({ lat: point.lat, lng: point.lng })),
    ...(liveLocation ? [{ lat: liveLocation.lat, lng: liveLocation.lng }] : []),
    { lat: center.lat, lng: center.lng },
  ];
}

function fitMapToPoints(
  mapInstance: LeafletMap,
  L: Pick<LeafletModule, 'latLngBounds'>,
  points: readonly MapPoint[],
  fallbackCenter: MapPoint,
  fallbackZoom: number,
  options?: { maxZoom?: number; singlePointZoom?: number; animate?: boolean },
) {
  if (!points.length) {
    mapInstance.setView([fallbackCenter.lat, fallbackCenter.lng], fallbackZoom, {
      animate: options?.animate ?? false,
    });
    return;
  }

  const uniquePoints = points.filter(
    (point, index, all) =>
      all.findIndex(candidate => candidate.lat === point.lat && candidate.lng === point.lng) ===
      index,
  );

  if (uniquePoints.length === 1) {
    const only = uniquePoints[0];
    mapInstance.setView([only.lat, only.lng], options?.singlePointZoom ?? fallbackZoom, {
      animate: options?.animate ?? false,
    });
    return;
  }

  const bounds = L.latLngBounds(uniquePoints.map(point => [point.lat, point.lng]));
  mapInstance.fitBounds(bounds.pad(0.15), {
    animate: options?.animate ?? false,
    maxZoom: options?.maxZoom ?? Math.max(fallbackZoom + 1, 15),
    padding: [42, 42],
  });
}

/* â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function WaselMapCompact({
  center,
  height,
  className,
  route,
  markers,
}: Pick<WaselMapProps, 'center' | 'height' | 'className' | 'route' | 'markers'>) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const LRef = useRef<LeafletModule | null>(null);
  const drawnLayersRef = useRef<LeafletLayer[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const [fallbackSvg, setFallbackSvg] = useState(false);

  const cssHeight = typeof height === 'number' ? `${height}px` : (height ?? '500px');

  const fallbackCenter = useMemo(() => center ?? { lat: 31.9539, lng: 35.9106 }, [center]);
  const pts = getMapContentPoints(fallbackCenter, route ?? [], markers ?? []);

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

  const invalidate = useCallback((): void => {
    const m = mapRef.current;
    if (!m) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      mapRef.current?.invalidateSize({ pan: false });
    });
  }, []);

  const applyRoadmapTile = useCallback(() => {
    if (!mapRef.current || !LRef.current) return;

    const tile = getTileConfig('roadmap', resolvedTheme);
    tileLayerRef.current?.remove();
    tileLayerRef.current = LRef.current.tileLayer(tile.url, {
      maxZoom: tile.maxZoom,
      subdomains: tile.subdomains,
    }).addTo(mapRef.current);
  }, [resolvedTheme]);

  // Initialize a lightweight Leaflet map for compact previews (no OSRM, no Overpass, no controls).
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    loadLeaflet()
      .then(L => {
        if (!mapDivRef.current || mapRef.current) return;
        LRef.current = L;

        const c = fallbackCenter;
        const map = L.map(mapDivRef.current, {
          center: [c.lat, c.lng],
          zoom: 10,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
        });
        mapRef.current = map;

        applyRoadmapTile();

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
        console.error('[WaselMapCompact] Failed to load Leaflet:', err);
        setFallbackSvg(true);
      });

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      drawnLayersRef.current = [];
    };
  }, [applyRoadmapTile, fallbackCenter, invalidate]);

  useEffect(() => {
    applyRoadmapTile();
  }, [applyRoadmapTile]);

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
        color: MAP_PRIMARY,
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(map);
      drawnLayersRef.current.push(shadow, line);

      const start = rPts[0];
      const end = rPts[rPts.length - 1];
      const startM = L.circleMarker([start.lat, start.lng], {
        radius: 6,
        color: MAP_PRIMARY_SOFT,
        weight: 2,
        fillColor: MAP_PRIMARY_SOFT,
        fillOpacity: 1,
      }).addTo(map);
      const endM = L.circleMarker([end.lat, end.lng], {
        radius: 6,
        color: MAP_MINT,
        weight: 2,
        fillColor: MAP_MINT,
        fillOpacity: 1,
      }).addTo(map);
      drawnLayersRef.current.push(startM, endM);
    }

    mPts.forEach(m => {
      const cm = L.circleMarker([m.lat, m.lng], {
        radius: 5,
        color: MAP_PRIMARY,
        weight: 2,
        fillColor: MAP_PRIMARY,
        fillOpacity: 0.8,
      }).addTo(map);
      drawnLayersRef.current.push(cm);
    });

    fitMapToPoints(map, L, pts, fallbackCenter, 10, {
      animate: false,
      maxZoom: 12,
      singlePointZoom: 12,
    });

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
    pts,
    route,
    fallbackCenter,
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
    const pathD =
      routePts.length >= 2
        ? `M ${routePts[0].x} ${routePts[0].y} ` +
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
          borderRadius: 16,
          height: cssHeight,
          background:
            'radial-gradient(120% 160% at 30% 15%, rgba(25,231,187,0.16), rgba(4,12,24,0.92) 55%, rgba(4,12,24,0.98) 100%)',
          border: '1px solid rgba(93,150,210,0.16)',
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
              <stop offset="0%" stopColor={MAP_PRIMARY_SOFT} stopOpacity="0.95" />
              <stop offset="55%" stopColor={MAP_PRIMARY} stopOpacity="0.95" />
              <stop offset="100%" stopColor={MAP_MINT} stopOpacity="0.95" />
            </linearGradient>
            <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
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
              <circle cx={start.x} cy={start.y} r="6" fill={MAP_PRIMARY_SOFT} />
            </g>
          )}
          {end && (
            <g>
              <circle cx={end.x} cy={end.y} r="9" fill="rgba(0,0,0,0.35)" />
              <circle cx={end.x} cy={end.y} r="6" fill={MAP_MINT} />
            </g>
          )}
        </svg>

        <div
          className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
          style={{ background: 'color-mix(in srgb, var(--surface-glass) 88%, transparent)', border: '1px solid var(--border)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: MAP_PRIMARY }} />
          <span className="text-[10px] font-bold tracking-wider" style={{ color: MAP_PRIMARY }}>
            WASEL
          </span>
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
        borderRadius: 16,
        height: cssHeight,
        background: 'var(--surface-strong)',
        border: '1px solid var(--border)',
      }}
    >
      <div ref={mapDivRef} style={{ position: 'absolute', inset: 0 }} />
      <div
        className="absolute bottom-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
        style={{ background: 'color-mix(in srgb, var(--surface-glass) 88%, transparent)', border: '1px solid var(--border)' }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: MAP_PRIMARY }} />
        <span className="text-[10px] font-bold tracking-wider" style={{ color: MAP_PRIMARY }}>
          WASEL
        </span>
      </div>
    </div>
  );
}

function WaselMapFull(props: WaselMapProps) {
  const { resolvedTheme } = useTheme();
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
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const routeLineRef = useRef<LeafletPolyline | null>(null);
  const liveMarkerRef = useRef<LeafletMarker | null>(null);
  const liveCircleRef = useRef<LeafletCircle | null>(null);
  const mosqueLayerRef = useRef<LeafletMarker[]>([]);
  const radarLayerRef = useRef<LeafletMarker[]>([]);
  const routeMarkersRef = useRef<LeafletMarker[]>([]);
  const customMarkersRef = useRef<LeafletMarker[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const initDone = useRef(false);
  const LRef = useRef<LeafletModule | null>(null); // Leaflet instance

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
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

  const applyTileLayer = useCallback((type: MapTileKind) => {
    if (!mapRef.current || !LRef.current) return;

    const tile = getTileConfig(type, resolvedTheme);
    tileLayerRef.current?.remove();
    tileLayerRef.current = LRef.current.tileLayer(tile.url, {
      maxZoom: tile.maxZoom,
      subdomains: tile.subdomains,
    }).addTo(mapRef.current);
  }, [resolvedTheme]);

  const fitCurrentView = useCallback(() => {
    if (!mapRef.current || !LRef.current) return;
    fitMapToPoints(
      mapRef.current,
      LRef.current,
      getMapContentPoints(center, route, markers, liveLocation),
      center,
      zoom,
      { animate: true, maxZoom: Math.max(zoom + 2, 16), singlePointZoom: Math.max(zoom, 16) },
    );
  }, [center, liveLocation, markers, route, zoom]);

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

  /* â”€â”€ Mosque markers via Overpass API â”€â”€ */
  const loadMosques = useCallback(async (mapInstance: LeafletMapWithPanes) => {
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
        const data = (await res.json()) as OverpassResponse;
        const elements = data.elements ?? [];
        if (elements.length > 0) {
          mosquesToShow = elements.map(el => ({
            lat: el.lat,
            lng: el.lon,
            name: el.tags?.name || el.tags?.['name:ar'] || 'Mosque | مسجد',
          }));
        }
      }
    } catch {
      // Use fallback silently
    }

    // After the async await, the map may have been destroyed by StrictMode cleanup â€”
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

  /* â”€â”€ Radar markers â”€â”€ */
  const loadRadars = useCallback(
    (mapInstance: LeafletMapWithPanes) => {
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
            () => setSelectedPOI({ type: h.type, name: h.name }),
          );
          radarLayerRef.current.push(marker);
        } catch {
          /* skip */
        }
      });
    },
    [extraHazards],
  );

  /* â”€â”€ Draw route â”€â”€ */
  const drawRoute = useCallback(
    async (mapInstance: LeafletMapWithPanes) => {
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
          if (pt.label) m.bindTooltip(pt.label, { permanent: false, direction: 'top' });
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
          const data = (await res.json()) as OsrmRouteResponse;
          const coords2 = data.routes?.[0]?.geometry?.coordinates;
          if (coords2?.length) {
            latlngs = coords2.map(([lng, lat]: [number, number]) => [lat, lng]);
          }
        }
      } catch {
        // Use straight-line polyline fallback
      }

      // After the async OSRM await, the map may have been destroyed â€” guard before drawing
      if (!isMapAlive(mapInstance)) return;

      routeLineRef.current = L.polyline(latlngs, {
        color: MAP_PRIMARY,
        weight: 5,
        opacity: 0.85,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(mapInstance);

      // Fit bounds
      fitMapToPoints(
        mapInstance,
        L,
        getMapContentPoints(center, route, markers, liveLocation),
        center,
        zoom,
        { animate: true, maxZoom: Math.max(zoom + 2, 16), singlePointZoom: Math.max(zoom, 16) },
      );
    },
    [center, liveLocation, markers, route, zoom],
  );

  /* â”€â”€ Custom prop markers â”€â”€ */
  const drawCustomMarkers = useCallback(
    (mapInstance: LeafletMapWithPanes) => {
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
          if (mk.label) m.bindTooltip(mk.label, { permanent: false, direction: 'top' });
          customMarkersRef.current.push(m);
        } catch {
          /* skip */
        }
      });
    },
    [markers],
  );

  useEffect(() => {
    setMosquesOn(showMosques);
  }, [showMosques]);

  useEffect(() => {
    setRadarsOn(showRadars);
  }, [showRadars]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (route.length >= 2) {
      void drawRoute(mapRef.current);
    } else {
      routeMarkersRef.current.forEach(marker => marker.remove());
      routeMarkersRef.current = [];
      routeLineRef.current?.remove();
      routeLineRef.current = null;
      fitCurrentView();
    }
  }, [drawRoute, fitCurrentView, isLoaded, route]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    drawCustomMarkers(mapRef.current);
    if (route.length < 2) {
      fitCurrentView();
    }
  }, [drawCustomMarkers, fitCurrentView, isLoaded, markers, route.length]);

  /* â”€â”€ GPS tracking â”€â”€ */
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
              color: MAP_PRIMARY,
              fillColor: MAP_PRIMARY,
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
        setLocationError(repairLikelyMojibake(msgs[err.code] ?? 'Location error'));
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

  /* â”€â”€ Map initialization â”€â”€ */
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

        applyTileLayer('roadmap');

        // Attribution (small, bottom-right)
        L.control
          .attribution({ position: 'bottomright', prefix: false })
          .addAttribution('© OpenStreetMap contributors © CARTO')
          .addTo(map);

        // Reload mosques when map moves significantly
        let debounceTimer: ReturnType<typeof setTimeout>;
        map.on('moveend', () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (mosquesOn) loadMosques(map);
          }, 1000);
        });

        setIsLoaded(true);
        if (autoTrack) startTracking();

        // Use map.whenReady() + rAF so Leaflet panes are fully in the DOM
        // and sized before any marker .addTo() fires.
        // IMPORTANT: always read mapRef.current inside the callback â€” never use
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
              if (route.length >= 2) {
                void drawRoute(m);
              } else {
                fitCurrentView();
              }
              if (markers.length > 0) drawCustomMarkers(m);
            });
          });
        });
      })
      .catch(err => {
        console.error('[WaselMap] Failed to load Leaflet:', err);
        setLoadError('Could not load map library.');
      });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      initDone.current = false;
    };
  }, [
    applyTileLayer,
    autoTrack,
    center.lat,
    center.lng,
    drawCustomMarkers,
    drawRoute,
    fitCurrentView,
    loadMosques,
    loadRadars,
    markers.length,
    mosquesOn,
    radarsOn,
    route.length,
    startTracking,
    zoom,
  ]);

  /* â”€â”€ Map type switcher â”€â”€ */
  const changeMapType = useCallback((t: 'roadmap' | 'satellite' | 'terrain') => {
    setMapType(t);
    applyTileLayer(t);
  }, [applyTileLayer]);

  useEffect(() => {
    applyTileLayer(mapType);
  }, [applyTileLayer, mapType]);

  /* â”€â”€ Layer toggles â”€â”€ */
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

  /* â”€â”€ Zoom â”€â”€ */
  const zoomIn = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) + 1);
  const zoomOut = () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 13) - 1);

  /* â”€â”€ Center on live location â”€â”€ */
  const centerOnMe = () => {
    if (liveLocation && mapRef.current) {
      mapRef.current.setView([liveLocation.lat, liveLocation.lng], 17);
    } else {
      startTracking();
    }
  };

  /* â”€â”€ Fullscreen â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div
      ref={containerRef}
      className={`select-none ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        height: isFullscreen ? '100dvh' : cssHeight,
        background: 'var(--surface-strong)',
      }}
    >
      {/* â”€â”€ Leaflet map container â”€â”€ */}
      <div ref={mapDivRef} className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* Ping animation for live marker */}
      <style>{`@keyframes ping{75%,100%{transform:scale(2);opacity:0}}`}</style>

      {/* â”€â”€ Loading overlay â”€â”€ */}
      <AnimatePresence>
        {!isLoaded && !loadError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5"
            style={{ background: 'var(--surface-strong)' }}
          >
            <div className="relative w-20 h-20">
              <svg
                viewBox="0 0 80 80"
                className="w-full h-full animate-spin"
                style={{ animationDuration: '2s' }}
              >
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={MAP_PRIMARY}
                  strokeWidth="6"
                  strokeDasharray="80 134"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="w-7 h-7" style={{ color: MAP_PRIMARY }} />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Loading Map</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                {repairLikelyMojibake('جاري تحميل الخريطة...')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Error overlay â”€â”€ */}
      {loadError && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 p-6"
          style={{ background: 'var(--surface-strong)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Map failed to load</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{loadError}</p>
          </div>
        </div>
      )}

      {/* â”€â”€ Controls (only when loaded) â”€â”€ */}
      {isLoaded && (
        <>
          {/* -- Top-right: Map type + Zoom + Fullscreen -- */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            {/* Map type */}
            <div className="flex flex-col overflow-hidden rounded-2xl" style={CONTROL_PANEL_STYLE}>
              {(['roadmap', 'satellite', 'terrain'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => changeMapType(t)}
                  style={mapTypeButtonStyle(mapType === t)}
                >
                  {t === 'roadmap' ? (
                    <Map className="w-3.5 h-3.5" />
                  ) : t === 'satellite' ? (
                    <Satellite className="w-3.5 h-3.5" />
                  ) : (
                    <Mountain className="w-3.5 h-3.5" />
                  )}
                  <span>{t === 'roadmap' ? 'City' : t === 'satellite' ? 'Aerial' : 'Terrain'}</span>
                </button>
              ))}
            </div>

            {/* Zoom */}
            <div className="flex flex-col overflow-hidden rounded-2xl" style={CONTROL_PANEL_STYLE}>
              <button onClick={zoomIn} style={compactControlButtonStyle()}>
                <ZoomIn className="w-4 h-4" />
              </button>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <button onClick={zoomOut} style={compactControlButtonStyle()}>
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} style={compactControlButtonStyle(isFullscreen)}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={fitCurrentView}
              style={compactControlButtonStyle()}
              title="Fit map to trip"
            >
              <Navigation2 className="w-4 h-4" />
            </button>
          </div>

          {/* -- Top-left: Live HUD -- */}
          <AnimatePresence>
            {isTracking && liveLocation && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute top-3 left-3 z-20 rounded-2xl border shadow-xl"
                style={{
                  background: 'var(--wasel-glass-xl)',
                  backdropFilter: 'blur(12px)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ background: MAP_PRIMARY }}
                    />
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: MAP_PRIMARY }}
                    >
                      Live
                    </span>
                    <Wifi className="w-3 h-3" style={{ color: MAP_PRIMARY }} />
                  </div>
                  {liveLocation.speed !== null && liveLocation.speed !== undefined && (
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>
                        {Math.round((liveLocation.speed ?? 0) * 3.6)}
                      </span>
                      <span className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>km/h</span>
                    </div>
                  )}
                  {liveLocation.accuracy !== null && liveLocation.accuracy !== undefined && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      ±{Math.round(liveLocation.accuracy)}m accuracy
                    </p>
                  )}
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {liveLocation.lat.toFixed(5)}, {liveLocation.lng.toFixed(5)}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Center-top: Selected POI panel â”€â”€ */}
          <AnimatePresence>
            {selectedPOI && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[300px] max-w-[calc(100%-80px)] rounded-2xl border shadow-2xl"
                style={{
                  background: 'var(--wasel-glass-xl)',
                  backdropFilter: 'blur(16px)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 shrink-0 rounded-xl p-2" style={{ border: '1px solid var(--border)', background: 'var(--surface-muted)', color: 'var(--text-primary)' }}>
                    {selectedPOI.type === 'mosque' ? (
                      <MapPin className="h-5 w-5" />
                    ) : selectedPOI.type === 'radar' ? (
                      <Radio className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {repairLikelyMojibake(selectedPOI.name)}
                    </p>
                    {selectedPOI.vicinity && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {repairLikelyMojibake(selectedPOI.vicinity)}
                      </p>
                    )}
                    {selectedPOI.info && (
                      <p className="text-xs mt-1 font-medium" style={{ color: MAP_PRIMARY }}>
                        {repairLikelyMojibake(selectedPOI.info)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPOI(null)}
                    className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* â”€â”€ Location error â”€â”€ */}
          <AnimatePresence>
            {locationError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-28 left-3 right-3 z-20 rounded-xl border border-red-500/30 px-4 py-2.5"
                style={{ background: 'rgba(127,29,29,0.9)', backdropFilter: 'blur(8px)' }}
              >
                <div className="flex items-start gap-2">
                  <WifiOff className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                  <p className="text-red-200 text-xs">{repairLikelyMojibake(locationError)}</p>
                  <button
                    onClick={() => setLocationError(null)}
                    className="ml-auto shrink-0 text-red-400 hover:text-red-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -- Bottom: Layer controls -- */}
          {!compact && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20">
              <div
                className="flex items-center gap-1 rounded-2xl px-3 py-2"
                style={CONTROL_PANEL_STYLE}
              >
                <button
                  onClick={toggleMosques}
                  style={wideControlButtonStyle(mosquesOn)}
                  title="Mosques"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Mosques</span>
                </button>
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                <button
                  onClick={toggleRadars}
                  style={wideControlButtonStyle(radarsOn)}
                  title="Radars"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Radars</span>
                </button>
              </div>
            </div>
          )}
          {/* -- Bottom: GPS controls -- */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {isTracking && (
              <button
                onClick={centerOnMe}
                style={compactControlButtonStyle()}
                title="Center on my location"
              >
                <Navigation2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={isTracking ? stopTracking : startTracking}
              style={
                isTracking
                  ? {
                      ...CONTROL_BUTTON_BASE,
                      minHeight: 44,
                      padding: '0 18px',
                      borderRadius: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      color: 'var(--text-inverse)',
                      background: 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 52%, #65E1FF 100%)',
                      border: '1px solid var(--border-strong)',
                      boxShadow: 'var(--wasel-shadow-teal)',
                    }
                  : {
                      ...CONTROL_BUTTON_BASE,
                      minHeight: 44,
                      padding: '0 18px',
                      borderRadius: 18,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      background: 'color-mix(in srgb, var(--surface-strong) 94%, transparent)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--wasel-shadow-sm)',
                    }
              }
            >
              {isTracking ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <Locate className="w-4 h-4" />
                  <span>Live · Active</span>
                </>
              ) : (
                <>
                  <Locate className="w-4 h-4" />
                  <span>Share My Location</span>
                </>
              )}
            </button>
          </div>

          {/* â”€â”€ Wasel watermark â”€â”€ */}
          <div
            className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: 'color-mix(in srgb, var(--surface-glass) 88%, transparent)', border: '1px solid var(--border)' }}
          >
            <div className="w-3 h-3 rounded-full" style={{ background: MAP_PRIMARY }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: MAP_PRIMARY }}>
              WASEL
            </span>
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
        {...omitUndefined({
          center: props.center,
          height: props.height,
          className: props.className,
          route: props.route,
          markers: props.markers,
        })}
      />
    );
  }

  return <WaselMapFull {...props} />;
}

/* â”€â”€â”€ Convenience re-export so old imports keep working â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export type { WaselMapProps as GoogleMapComponentProps };
