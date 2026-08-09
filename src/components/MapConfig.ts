export const MAP_CENTER: [number, number] = [31.9454, 35.9284];
export const DEFAULT_ZOOM = 12;
export const MAP_STYLES = {
  standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
} as const;

export type MapStyle = keyof typeof MAP_STYLES;

export interface MapConfig {
  center: [number, number];
  zoom: number;
  style: MapStyle;
  fullscreen: boolean;
}
