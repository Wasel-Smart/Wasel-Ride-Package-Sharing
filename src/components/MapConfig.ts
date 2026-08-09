export const MAP_CENTER: [number, number] = [31.9454, 35.9284];
export const DEFAULT_ZOOM = 12;
export const MAP_STYLES = {
  standard: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
} as const;

export type MapStyle = keyof typeof MAP_STYLES;

export interface MapConfig {
  center: [number, number];
  zoom: number;
  style: MapStyle;
  fullscreen: boolean;
}

export const TILE_CONFIGS = {
  roadmap: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri, DigitalGlobe',
    maxZoom: 21,
  },
  terrain: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, SRTM © OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
} as const;

export const JORDAN_RADARS = [
  { lat: 31.9539, lng: 35.9106, name: 'Radar – Amman 7th Circle', limit: 60 },
  { lat: 31.9786, lng: 35.8444, name: 'Radar – Queen Alia Airport Rd', limit: 80 },
  { lat: 31.7854, lng: 35.9771, name: 'Radar – Madaba Highway', limit: 80 },
  { lat: 31.45, lng: 35.98, name: 'Radar – Desert Hwy km 110', limit: 100 },
  { lat: 31.2001, lng: 35.9311, name: 'Radar – Desert Hwy km 200', limit: 110 },
  { lat: 30.85, lng: 35.7, name: 'Radar – Desert Hwy km 270', limit: 110 },
  { lat: 30.5284, lng: 35.4078, name: 'Radar – Desert Hwy km 330', limit: 110 },
  { lat: 29.5321, lng: 35.006, name: 'Radar – Aqaba Entry', limit: 60 },
  { lat: 32.5568, lng: 35.8486, name: 'Radar – Irbid South', limit: 80 },
  { lat: 32.0408, lng: 36.0899, name: 'Radar – Zarqa Highway', limit: 80 },
  { lat: 32.61, lng: 35.99, name: 'Radar – Ramtha Border', limit: 60 },
  { lat: 31.87, lng: 35.94, name: 'Radar – South Amman Ring Rd', limit: 80 },
] as const;

export const FALLBACK_MOSQUES = [
  { lat: 31.9554, lng: 35.91, name: 'King Abdullah I Mosque | مسجد الملك عبدالله الأول' },
  { lat: 31.9515, lng: 35.9219, name: 'Al-Hussein Mosque | مسجد الحسين' },
  { lat: 31.9609, lng: 35.8895, name: 'Abu Darwish Mosque | مسجد أبو درويش' },
  { lat: 31.9657, lng: 35.8982, name: 'Al-Kalouti Mosque | مسجد الكلوتي' },
  { lat: 31.95, lng: 35.8952, name: 'Al-Thaqafeh Mosque | مسجد الثقافة' },
  { lat: 31.944, lng: 35.921, name: 'Al-Manar Mosque | مسجد المنار' },
  { lat: 32.5568, lng: 35.8486, name: 'Irbid Grand Mosque | مسجد إربد الكبير' },
  { lat: 29.5321, lng: 35.006, name: 'Aqaba Central Mosque | مسجد العقبة' },
  { lat: 31.7167, lng: 35.95, name: 'Madaba Mosque | مسجد مأدبا' },
  { lat: 31.22, lng: 35.93, name: "Ma'an Mosque | مسجد معان" },
  { lat: 31.0, lng: 35.5, name: 'Shoubak Rest Stop Mosque | مسجد استراحة الشوبك' },
  { lat: 30.3, lng: 35.2, name: 'Wadi Rum Mosque | مسجد وادي رم' },
] as const;
