/**
 * Jordan Mobility Network - 12 Core Routes
 * Pre-configured routes with coordinates, distances, and pricing.
 */

export interface JordanRoute {
  id: string;
  origin: string;
  destination: string;
  originAr: string;
  destinationAr: string;
  distance: number;
  duration: number;
  baseFare: number;
  coordinates: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  };
  popularity: 'high' | 'medium' | 'low';
  category: 'intercity' | 'regional' | 'local';
}

export const JORDAN_MOBILITY_NETWORK: JordanRoute[] = [
  {
    id: 'amman-irbid',
    origin: 'Amman',
    destination: 'Irbid',
    originAr: 'عمّان',
    destinationAr: 'إربد',
    distance: 85,
    duration: 70,
    baseFare: 6.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 32.5556, lng: 35.85 },
    },
    popularity: 'high',
    category: 'intercity',
  },
  {
    id: 'amman-zarqa',
    origin: 'Amman',
    destination: 'Zarqa',
    originAr: 'عمّان',
    destinationAr: 'الزرقاء',
    distance: 25,
    duration: 30,
    baseFare: 3.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 32.0728, lng: 36.0882 },
    },
    popularity: 'high',
    category: 'regional',
  },
  {
    id: 'amman-aqaba',
    origin: 'Amman',
    destination: 'Aqaba',
    originAr: 'عمّان',
    destinationAr: 'العقبة',
    distance: 330,
    duration: 240,
    baseFare: 25.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 29.5267, lng: 35.0081 },
    },
    popularity: 'high',
    category: 'intercity',
  },
  {
    id: 'amman-jerash',
    origin: 'Amman',
    destination: 'Jerash',
    originAr: 'عمّان',
    destinationAr: 'جرش',
    distance: 48,
    duration: 45,
    baseFare: 4.5,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 32.2718, lng: 35.8965 },
    },
    popularity: 'medium',
    category: 'regional',
  },
  {
    id: 'amman-ajloun',
    origin: 'Amman',
    destination: 'Ajloun',
    originAr: 'عمّان',
    destinationAr: 'عجلون',
    distance: 73,
    duration: 65,
    baseFare: 5.5,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 32.3326, lng: 35.7519 },
    },
    popularity: 'medium',
    category: 'regional',
  },
  {
    id: 'amman-madaba',
    origin: 'Amman',
    destination: 'Madaba',
    originAr: 'عمّان',
    destinationAr: 'مادبا',
    distance: 33,
    duration: 35,
    baseFare: 3.5,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 31.7197, lng: 35.7936 },
    },
    popularity: 'high',
    category: 'regional',
  },
  {
    id: 'amman-karak',
    origin: 'Amman',
    destination: 'Karak',
    originAr: 'عمّان',
    destinationAr: 'الكرك',
    distance: 120,
    duration: 90,
    baseFare: 9.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 31.1853, lng: 35.7048 },
    },
    popularity: 'medium',
    category: 'intercity',
  },
  {
    id: 'amman-tafila',
    origin: 'Amman',
    destination: 'Tafila',
    originAr: 'عمّان',
    destinationAr: 'الطفيلة',
    distance: 183,
    duration: 135,
    baseFare: 14.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 30.8375, lng: 35.6042 },
    },
    popularity: 'low',
    category: 'intercity',
  },
  {
    id: 'amman-maan',
    origin: 'Amman',
    destination: "Ma'an",
    originAr: 'عمّان',
    destinationAr: 'معان',
    distance: 218,
    duration: 165,
    baseFare: 16.0,
    coordinates: {
      origin: { lat: 31.9454, lng: 35.9284 },
      destination: { lat: 30.1962, lng: 35.736 },
    },
    popularity: 'medium',
    category: 'intercity',
  },
  {
    id: 'irbid-zarqa',
    origin: 'Irbid',
    destination: 'Zarqa',
    originAr: 'إربد',
    destinationAr: 'الزرقاء',
    distance: 78,
    duration: 60,
    baseFare: 6.0,
    coordinates: {
      origin: { lat: 32.5556, lng: 35.85 },
      destination: { lat: 32.0728, lng: 36.0882 },
    },
    popularity: 'medium',
    category: 'regional',
  },
  {
    id: 'irbid-ajloun',
    origin: 'Irbid',
    destination: 'Ajloun',
    originAr: 'إربد',
    destinationAr: 'عجلون',
    distance: 28,
    duration: 30,
    baseFare: 3.0,
    coordinates: {
      origin: { lat: 32.5556, lng: 35.85 },
      destination: { lat: 32.3326, lng: 35.7519 },
    },
    popularity: 'high',
    category: 'local',
  },
  {
    id: 'zarqa-mafraq',
    origin: 'Zarqa',
    destination: 'Mafraq',
    originAr: 'الزرقاء',
    destinationAr: 'المفرق',
    distance: 55,
    duration: 50,
    baseFare: 4.5,
    coordinates: {
      origin: { lat: 32.0728, lng: 36.0882 },
      destination: { lat: 32.3406, lng: 36.2074 },
    },
    popularity: 'medium',
    category: 'regional',
  },
];

export function getRoute(routeId: string): JordanRoute | undefined {
  return JORDAN_MOBILITY_NETWORK.find(route => route.id === routeId);
}

export function getRoutesFrom(city: string): JordanRoute[] {
  return JORDAN_MOBILITY_NETWORK.filter(route => route.origin.toLowerCase() === city.toLowerCase());
}

export function getRoutesTo(city: string): JordanRoute[] {
  return JORDAN_MOBILITY_NETWORK.filter(
    route => route.destination.toLowerCase() === city.toLowerCase(),
  );
}

export function getRouteBetween(city1: string, city2: string): JordanRoute | undefined {
  const c1 = city1.toLowerCase();
  const c2 = city2.toLowerCase();

  return JORDAN_MOBILITY_NETWORK.find(
    route =>
      (route.origin.toLowerCase() === c1 && route.destination.toLowerCase() === c2) ||
      (route.origin.toLowerCase() === c2 && route.destination.toLowerCase() === c1),
  );
}

export function getAllCities(): string[] {
  const cities = new Set<string>();
  JORDAN_MOBILITY_NETWORK.forEach(route => {
    cities.add(route.origin);
    cities.add(route.destination);
  });
  return Array.from(cities).sort();
}

export function getPopularRoutes(): JordanRoute[] {
  return JORDAN_MOBILITY_NETWORK.filter(route => route.popularity === 'high');
}

export function calculateFare(
  distance: number,
  passengers: number = 1,
  mode: 'carpooling' | 'on-demand' = 'carpooling',
): number {
  if (mode === 'carpooling') {
    const fuelCost = distance * 0.072;
    const buffer = 1.2;
    return Math.ceil((fuelCost * buffer) / passengers);
  }

  const baseFare = distance * 0.5 + 2.0;
  return Math.ceil(baseFare);
}
