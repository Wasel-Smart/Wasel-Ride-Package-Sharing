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
    id: 'mobility-os',
    label: 'Mobility OS',
    labelAr: 'Mobility OS',
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
export const DESKTOP_PRIMARY_NAV_IDS = ['find', 'mobility-os', 'my-trips', 'profile'] as const;

const HIDDEN_NAV_PATHS = new Set<string>();
const USER_ONLY_NAV_PATHS = new Set<string>(['/my-trips', '/profile']);

function doesPathMatch(pathname: string, path: string) {
  const normalizedPath = path.startsWith('/app') ? path : `/app${path}`;
  return (
    pathname === path ||
    pathname.startsWith(`${path}/`) ||
    pathname === normalizedPath ||
    pathname.startsWith(`${normalizedPath}/`)
  );
}

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

export function getNavGroupPrimaryPath(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) return group.path;
  return getVisibleNavItems(group, isAuthenticated)[0]?.path ?? null;
}

export function isNavGroupActive(group: NavGroup, pathname: string, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) {
    return doesPathMatch(pathname, group.path);
  }

  return getVisibleNavItems(group, isAuthenticated).some((item) => doesPathMatch(pathname, item.path));
}
