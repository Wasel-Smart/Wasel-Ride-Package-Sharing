import { C } from '../utils/wasel-ds';
import { APP_ROUTES, stripAppRoutePrefix } from '../router/paths';

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

type NavGroupBase = {
  id: string;
  label: string;
  labelAr: string;
  desc: string;
  descAr: string;
  color: string;
  badge?: string | null;
};

export type DirectNavGroup = NavGroupBase & {
  direct: true;
  path: string;
  emoji: string;
  items?: readonly NavItem[];
};

export type NestedNavGroup = NavGroupBase & {
  direct?: false;
  items: readonly NavItem[];
};

export type NavGroup = DirectNavGroup | NestedNavGroup;

export const PRODUCT_NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'find',
    label: 'Find Ride',
    labelAr: 'ابحث عن رحلة',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.findRide.full),
    emoji: '🛣️',
    desc: 'Find and book a ride fast.',
    descAr: 'ابحث في المسارات، وقارن أوقات الانطلاق، واحجز أوضح رحلة.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'trips',
    label: 'Trips',
    labelAr: 'رحلاتي',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.myTrips.full),
    emoji: '🎫',
    desc: 'Open your active journeys.',
    descAr: 'تابع الرحلات النشطة والحجوزات والتحركات الأخيرة.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'bus',
    label: 'Bus',
    labelAr: 'الباص',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.bus.full),
    emoji: '🚌',
    desc: 'Book intercity bus seats.',
    descAr: 'تصفح جداول الباصات الرسمية واحجز مقعدك بين المدن.',
    color: C.green,
    badge: 'NEW',
    items: [],
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.packages.full),
    emoji: '📦',
    desc: 'Send and track packages.',
    descAr: 'أرسل الطرود وتتبعها وأدرها على الممرات الحية.',
    color: C.gold,
    items: [],
  },
  {
    id: 'wallet',
    label: 'Wallet',
    labelAr: 'المحفظة',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.wallet.full),
    emoji: '💳',
    desc: 'Balance and money actions.',
    descAr: 'اشحن الرصيد، وأرسل المال، وراجع آخر المعاملات.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف الشخصي',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.profile.full),
    emoji: '👤',
    desc: 'Account and preferences.',
    descAr: 'أدر بيانات الحساب والتحقق والتفضيلات.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'mobility-os',
    label: 'Network',
    labelAr: 'الشبكة',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.mobilityOs.full),
    emoji: '📡',
    desc: 'Live corridor view.',
    descAr: 'اطلع على ذكاء الممرات وضغط المسارات واتجاهات الشبكة.',
    color: C.cyan,
    badge: 'LIVE',
    items: [],
  },
];
export const DESKTOP_PRIMARY_NAV_IDS = ['find', 'trips', 'bus', 'packages', 'wallet'] as const;

const HIDDEN_NAV_PATHS = new Set<string>();
const USER_ONLY_NAV_PATHS = new Set<string>([
  stripAppRoutePrefix(APP_ROUTES.myTrips.full),
  stripAppRoutePrefix(APP_ROUTES.wallet.full),
  stripAppRoutePrefix(APP_ROUTES.profile.full),
]);

export function isDirectNavGroup(group: NavGroup): group is DirectNavGroup {
  return group.direct === true;
}

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
  if (isDirectNavGroup(group)) {
    return !HIDDEN_NAV_PATHS.has(group.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(group.path));
  }
  const items = group.items;
  return items.some(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getVisibleNavItems(group: NavGroup, isAuthenticated: boolean) {
  if (isDirectNavGroup(group)) return [];
  const items = group.items;
  return items.filter(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getNavGroupPrimaryPath(group: NavGroup, isAuthenticated: boolean) {
  if (isDirectNavGroup(group)) return group.path;
  return getVisibleNavItems(group, isAuthenticated)[0]?.path ?? null;
}

export function isNavGroupActive(group: NavGroup, pathname: string, isAuthenticated: boolean) {
  if (isDirectNavGroup(group)) {
    return doesPathMatch(pathname, group.path);
  }

  return getVisibleNavItems(group, isAuthenticated).some((item) => doesPathMatch(pathname, item.path));
}
