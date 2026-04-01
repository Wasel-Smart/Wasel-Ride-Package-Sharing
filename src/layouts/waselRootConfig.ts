import { C } from '../utils/wasel-ds';

export type NavItem = {
  emoji: string;
  label: string;
  labelAr: string;
  desc: string;
  descAr: string;
  path: string;
  color: string;
  badge: string | null;
};

export const PRODUCT_NAV_GROUPS = [
  {
    id: 'find',
    label: 'Find Route',
    labelAr: 'Find Route',
    direct: true,
    path: '/find-ride',
    emoji: 'R',
    desc: 'Discover shared corridors with Wasel Brain guidance.',
    descAr: 'Discover shared corridors with Wasel Brain guidance.',
    color: C.cyan,
    badge: 'AI',
    items: [],
  },
  {
    id: 'offer',
    label: 'Route Supply',
    labelAr: 'Route Supply',
    direct: true,
    path: '/offer-ride',
    emoji: '+',
    desc: 'Open seats, package space, and route capacity in one post.',
    descAr: 'Open seats, package space, and route capacity in one post.',
    color: C.blue,
    badge: null,
    items: [],
  },
  {
    id: 'packages',
    label: 'Goods Network',
    labelAr: 'Goods Network',
    direct: true,
    path: '/packages',
    emoji: 'P',
    desc: 'Move packages, returns, and commerce on live corridors.',
    descAr: 'Move packages, returns, and commerce on live corridors.',
    color: C.gold,
    badge: 'LIVE',
    items: [],
  },
  {
    id: 'my-trips',
    label: 'My Movement',
    labelAr: 'My Movement',
    direct: true,
    path: '/my-trips',
    emoji: 'T',
    desc: 'Track bookings, passes, daily routes, and movement history.',
    descAr: 'Track bookings, passes, daily routes, and movement history.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'bus',
    label: 'Fixed Corridors',
    labelAr: 'Fixed Corridors',
    direct: true,
    path: '/bus',
    emoji: 'B',
    desc: 'Use scheduled corridor capacity when demand is predictable.',
    descAr: 'Use scheduled corridor capacity when demand is predictable.',
    color: C.green,
    badge: null,
    items: [],
  },
  {
    id: 'mobility-os',
    label: 'Movement OS',
    labelAr: 'Movement OS',
    direct: true,
    path: '/mobility-os',
    emoji: 'M',
    desc: 'See route intelligence, network density, and command decisions.',
    descAr: 'See route intelligence, network density, and command decisions.',
    color: C.cyan,
    badge: 'LIVE',
    items: [],
  },
  {
    id: 'profile',
    label: 'Identity',
    labelAr: 'Identity',
    direct: true,
    path: '/profile',
    emoji: 'U',
    desc: 'Manage trust, verification, and your movement profile.',
    descAr: 'Manage trust, verification, and your movement profile.',
    color: C.cyan,
    badge: null,
    items: [],
  },
] as const;

export type NavGroup = (typeof PRODUCT_NAV_GROUPS)[number];

const HIDDEN_NAV_PATHS = new Set<string>();
const USER_ONLY_NAV_PATHS = new Set<string>(['/my-trips', '/profile']);

export function isVisibleNavGroup(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) {
    return !HIDDEN_NAV_PATHS.has(group.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(group.path));
  }
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.some(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getVisibleNavItems(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) return [];
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.filter(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}
