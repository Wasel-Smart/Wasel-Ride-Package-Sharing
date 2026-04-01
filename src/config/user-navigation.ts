export interface CoreNavItem {
  id: string;
  label: string;
  labelAr: string;
  path: string;
  description: string;
  descriptionAr: string;
  accent: 'cyan' | 'gold';
}

export const CORE_NAV_ITEMS: CoreNavItem[] = [
  {
    id: 'find',
    label: 'Route',
    labelAr: 'Route',
    path: '/find-ride',
    description: 'Search shared corridors and auto-grouped rides',
    descriptionAr: 'Search shared corridors and auto-grouped rides',
    accent: 'cyan',
  },
  {
    id: 'post',
    label: 'Supply',
    labelAr: 'Supply',
    path: '/offer-ride',
    description: 'Publish route capacity for people and goods',
    descriptionAr: 'Publish route capacity for people and goods',
    accent: 'gold',
  },
  {
    id: 'packages',
    label: 'Goods',
    labelAr: 'Goods',
    path: '/packages',
    description: 'Move parcels and returns on the same route graph',
    descriptionAr: 'Move parcels and returns on the same route graph',
    accent: 'gold',
  },
  {
    id: 'bus',
    label: 'Fixed',
    labelAr: 'Fixed',
    path: '/bus',
    description: 'Open scheduled corridor departures',
    descriptionAr: 'Open scheduled corridor departures',
    accent: 'cyan',
  },
];
