import type { PostedRide } from '../services/journeyLogistics';

export interface Ride {
  id: string;
  ownerId?: string;
  routeMode?: 'live_post' | 'network_inventory';
  driver: {
    name: string;
    nameAr: string;
    rating: number;
    verified: boolean;
    trips: number;
    phone: string;
    avatar: string;
  };
  from: string;
  fromAr: string;
  fromPoint?: string;
  to: string;
  toAr: string;
  toPoint?: string;
  date: string;
  time: string;
  seatsAvailable: number;
  totalSeats: number;
  pricePerSeat: number;
  distance: number;
  duration: string;
  genderPref: 'mixed' | 'women_only' | 'family_only';
  amenities: string[];
  prayerStops: boolean;
  ramadan?: boolean;
  car: string;
  carColor?: string;
  pkgCapacity: 'none' | 'small' | 'medium' | 'large';
  conversationLevel: 'quiet' | 'normal' | 'talkative';
  intermediateStops?: string[];
  reviews?: { name: string; rating: number; text: string }[];
}

export const ALL_RIDES: Ride[] = [
  {
    id: 'r1',
    driver: { name: 'Ahmad Hassan', nameAr: 'أحمد حسن', rating: 4.9, verified: true, trips: 1240, phone: '+962790000001', avatar: 'AH' },
    from: 'Amman',
    fromAr: 'عمّان',
    fromPoint: '8th Circle',
    to: 'Aqaba',
    toAr: 'العقبة',
    toPoint: 'City Center',
    date: '2026-03-25',
    time: '07:00',
    seatsAvailable: 2,
    totalSeats: 4,
    pricePerSeat: 8,
    distance: 330,
    duration: '4h',
    genderPref: 'mixed',
    amenities: ['A/C', 'Wi-Fi', 'Charger'],
    prayerStops: true,
    ramadan: true,
    car: 'Toyota Camry 2024',
    carColor: '#C0C0C0',
    pkgCapacity: 'medium',
    conversationLevel: 'normal',
    intermediateStops: ['Karak (brief stop)'],
    reviews: [{ name: 'Khalid N.', rating: 5, text: 'Very professional driver, on time and clean car.' }],
  },
  {
    id: 'r2',
    driver: { name: 'Sara Al-Khalidi', nameAr: 'سارة الخالدي', rating: 4.8, verified: true, trips: 876, phone: '+962790000002', avatar: 'SK' },
    from: 'Amman',
    fromAr: 'عمّان',
    fromPoint: 'Abdali Terminal',
    to: 'Irbid',
    toAr: 'إربد',
    toPoint: 'University District',
    date: '2026-03-25',
    time: '08:30',
    seatsAvailable: 3,
    totalSeats: 3,
    pricePerSeat: 4,
    distance: 85,
    duration: '1.5h',
    genderPref: 'women_only',
    amenities: ['A/C', 'Quiet ride'],
    prayerStops: false,
    car: 'Honda Civic 2023',
    carColor: '#FFFFFF',
    pkgCapacity: 'small',
    conversationLevel: 'quiet',
    reviews: [{ name: 'Hana M.', rating: 5, text: 'Great driver, felt very safe. Will use again!' }],
  },
  {
    id: 'r3',
    driver: { name: 'Khalid Nabulsi', nameAr: 'خالد النابلسي', rating: 4.7, verified: true, trips: 543, phone: '+962790000003', avatar: 'KN' },
    from: 'Amman',
    fromAr: 'عمّان',
    fromPoint: 'Sweifieh',
    to: 'Dead Sea',
    toAr: 'البحر الميت',
    toPoint: 'Zara Resort',
    date: '2026-03-25',
    time: '09:00',
    seatsAvailable: 1,
    totalSeats: 4,
    pricePerSeat: 7,
    distance: 60,
    duration: '1h',
    genderPref: 'mixed',
    amenities: ['A/C', 'Music', 'Large trunk'],
    prayerStops: false,
    car: 'Kia Sportage 2022',
    carColor: '#1a3a6a',
    pkgCapacity: 'large',
    conversationLevel: 'talkative',
  },
  {
    id: 'r4',
    driver: { name: 'Lina Al-Masri', nameAr: 'لينا المصري', rating: 5.0, verified: true, trips: 320, phone: '+962790000004', avatar: 'LM' },
    from: 'Amman',
    fromAr: 'عمّان',
    fromPoint: 'Gardens',
    to: 'Petra',
    toAr: 'البتراء',
    toPoint: 'Visitor Center',
    date: '2026-03-26',
    time: '06:30',
    seatsAvailable: 2,
    totalSeats: 4,
    pricePerSeat: 12,
    distance: 215,
    duration: '3h',
    genderPref: 'family_only',
    amenities: ['A/C', 'Family friendly', 'Booster seat'],
    prayerStops: true,
    car: 'Hyundai Tucson 2024',
    carColor: '#1a1a1a',
    pkgCapacity: 'medium',
    conversationLevel: 'normal',
  },
  {
    id: 'r5',
    driver: { name: 'Omar Zaid', nameAr: 'عمر زيد', rating: 4.6, verified: true, trips: 189, phone: '+962790000005', avatar: 'OZ' },
    from: 'Irbid',
    fromAr: 'إربد',
    fromPoint: 'University Gate',
    to: 'Amman',
    toAr: 'عمّان',
    toPoint: '7th Circle',
    date: '2026-03-25',
    time: '14:00',
    seatsAvailable: 3,
    totalSeats: 4,
    pricePerSeat: 4,
    distance: 85,
    duration: '1.5h',
    genderPref: 'mixed',
    amenities: ['A/C'],
    prayerStops: false,
    car: 'Hyundai Elantra 2021',
    carColor: '#333',
    pkgCapacity: 'small',
    conversationLevel: 'normal',
  },
  {
    id: 'r6',
    driver: { name: 'Nour Awamleh', nameAr: 'نور العواملة', rating: 4.9, verified: true, trips: 710, phone: '+962790000006', avatar: 'NA' },
    from: 'Amman',
    fromAr: 'عمّان',
    fromPoint: 'Mecca Mall',
    to: 'Aqaba',
    toAr: 'العقبة',
    toPoint: 'South Beach',
    date: '2026-03-25',
    time: '06:00',
    seatsAvailable: 1,
    totalSeats: 3,
    pricePerSeat: 9,
    distance: 330,
    duration: '4h',
    genderPref: 'women_only',
    amenities: ['A/C', 'Prayer stop', 'Charger'],
    prayerStops: true,
    ramadan: true,
    car: 'Toyota Corolla 2023',
    carColor: '#FFFFFF',
    pkgCapacity: 'medium',
    conversationLevel: 'quiet',
  },
];

export const CITIES = ['Amman', 'Aqaba', 'Irbid', 'Zarqa', 'Dead Sea', 'Karak', 'Madaba', 'Petra', 'Jerash', 'Mafraq', 'Salt'];

export const RIDE_BOOKINGS_KEY = 'wasel-find-ride-bookings';
export const RIDE_SEARCHES_KEY = 'wasel-find-ride-searches';
export const OFFER_RIDE_DRAFT_KEY = 'wasel-offer-ride-draft';

export function createGenderMeta(theme: { cyan: string; gold: string }) {
  return {
    mixed: { label: 'Mixed', labelAr: 'مختلط', emoji: '👥', color: theme.cyan },
    women_only: { label: 'Women Only', labelAr: 'نساء فقط', emoji: '🚺', color: '#FF69B4' },
    family_only: { label: 'Family Only', labelAr: 'عائلة', emoji: '👨‍👩‍👧', color: theme.gold },
  } as const;
}

export function buildRideFromPostedRide(ride: PostedRide): Ride {
  const capacityLabel = ride.packageCapacity === 'large'
    ? 'Large trunk'
    : ride.packageCapacity === 'small'
      ? 'Compact package lane'
      : 'Package lane ready';

  return {
    id: `live-${ride.id}`,
    ownerId: ride.ownerId,
    routeMode: 'live_post',
    driver: {
      name: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      nameAr: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
      rating: 4.8,
      verified: true,
      trips: 0,
      phone: '+962790000000',
      avatar: (ride.carModel || 'Wasel').slice(0, 2).toUpperCase(),
    },
    from: ride.from,
    fromAr: ride.from,
    fromPoint: 'Shared pickup point',
    to: ride.to,
    toAr: ride.to,
    toPoint: 'Shared dropoff point',
    date: ride.date || new Date().toISOString().slice(0, 10),
    time: ride.time || 'Flexible',
    seatsAvailable: Math.max(1, ride.seats),
    totalSeats: Math.max(1, ride.seats),
    pricePerSeat: Math.max(0, ride.price),
    distance: 0,
    duration: 'Live route',
    genderPref: ride.gender === 'women_only' ? 'women_only' : ride.gender === 'family_only' ? 'family_only' : 'mixed',
    amenities: ['Live post', ride.carModel || 'Private vehicle', capacityLabel],
    prayerStops: ride.prayer,
    car: ride.carModel || 'Private vehicle',
    pkgCapacity: ride.acceptsPackages ? ride.packageCapacity : 'none',
    conversationLevel: 'normal',
    reviews: ride.note ? [{ name: 'Route note', rating: 5, text: ride.note }] : undefined,
  };
}
