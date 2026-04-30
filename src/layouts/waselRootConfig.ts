import { isCoreFeatureEnabled, type CoreFeatureKey } from '../features/core/featureFlags';
import { APP_ROUTES, stripAppRoutePrefix } from '../router/paths';
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
    id: 'ride',
    label: 'Ride',
    labelAr: 'الرحلة',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.findRide.full),
    emoji: '🛣️',
    desc: 'Book a ride or offer a ride.',
    descAr: 'احجز رحلة أو اعرض رحلتك.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'package',
    label: 'Package',
    labelAr: 'الطرد',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.packages.full),
    emoji: '📦',
    desc: 'Send a package and track delivery.',
    descAr: 'أرسل طرداً وتابع التسليم.',
    color: C.gold,
    badge: null,
    items: [],
  },
  {
    id: 'bus',
    label: 'Bus service',
    labelAr: 'خدمة الحافلات',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.bus.full),
    emoji: '🚌',
    desc: 'Open bus corridors, seats, and departures.',
    descAr: 'افتح مسارات الحافلات والمقاعد والانطلاقات.',
    color: C.green,
    badge: null,
    items: [],
  },
  {
    id: 'mobilityOs',
    label: 'Mobility OS',
    labelAr: 'نظام التنقل',
    direct: true,
    path: stripAppRoutePrefix(APP_ROUTES.mobilityOs.full),
    emoji: '🎛️',
    desc: 'Watch the live operating view across the network.',
    descAr: 'راقب العرض التشغيلي الحي عبر الشبكة.',
    color: C.cyan,
    badge: null,
    items: [],
  },
];

export const DESKTOP_PRIMARY_NAV_IDS = ['ride', 'package', 'bus', 'mobilityOs'] as const;

const NAV_GROUP_FEATURES: Partial<Record<NavGroup['id'], CoreFeatureKey>> = {
  ride: 'rides',
  package: 'packages',
  bus: 'bus',
};

const HIDDEN_NAV_PATHS = new Set<string>();
const USER_ONLY_NAV_PATHS = new Set<string>([
  stripAppRoutePrefix(APP_ROUTES.myTrips.full),
  stripAppRoutePrefix(APP_ROUTES.wallet.full),
]);

export function isDirectNavGroup(group: NavGroup): group is DirectNavGroup {
  return group.direct === true;
}

export function isNavGroupFeatureEnabled(group: NavGroup) {
  const feature = NAV_GROUP_FEATURES[group.id];
  return feature ? isCoreFeatureEnabled(feature) : true;
}

export function getEnabledNavGroups() {
  return PRODUCT_NAV_GROUPS.filter((group) => isNavGroupFeatureEnabled(group));
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
  if (!isNavGroupFeatureEnabled(group)) {
    return false;
  }

  if (isDirectNavGroup(group)) {
    return !HIDDEN_NAV_PATHS.has(group.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(group.path));
  }

  return group.items.some(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getVisibleNavItems(group: NavGroup, isAuthenticated: boolean) {
  if (isDirectNavGroup(group)) {
    return [];
  }

  return group.items.filter(
    (item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getNavGroupPrimaryPath(group: NavGroup, isAuthenticated: boolean) {
  if (isDirectNavGroup(group)) {
    return group.path;
  }

  return getVisibleNavItems(group, isAuthenticated)[0]?.path ?? null;
}

export function isNavGroupActive(group: NavGroup, pathname: string, isAuthenticated: boolean) {
  if (!isNavGroupFeatureEnabled(group)) {
    return false;
  }

  if (isDirectNavGroup(group)) {
    return doesPathMatch(pathname, group.path);
  }

  return getVisibleNavItems(group, isAuthenticated).some((item) => doesPathMatch(pathname, item.path));
}
