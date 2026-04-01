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
  { id: 'find', label: 'Find Ride', labelAr: 'ابحث عن رحلة', direct: true, path: '/find-ride', emoji: 'R', desc: 'Book verified intercity rides', descAr: 'احجز رحلات موثقة بين المدن', color: C.cyan, badge: null, items: [] },
  { id: 'offer', label: 'Offer Ride', labelAr: 'أضف رحلة', direct: true, path: '/offer-ride', emoji: '+', desc: 'Share seats and unlock package demand', descAr: 'شارك المقاعد وافتح طلب الطرود', color: C.blue, badge: null, items: [] },
  { id: 'packages', label: 'Packages', labelAr: 'الطرود', direct: true, path: '/packages', emoji: 'P', desc: 'Send and track deliveries on live routes', descAr: 'أرسل وتتبع الطرود على المسارات المباشرة', color: C.gold, badge: 'LIVE', items: [] },
  { id: 'my-trips', label: 'My Trips', labelAr: 'رحلاتي', direct: true, path: '/my-trips', emoji: 'T', desc: 'Manage active bookings and trip history', descAr: 'أدر حجوزاتك وسجل رحلاتك', color: C.cyan, badge: null, items: [] },
  { id: 'bus', label: 'Bus', labelAr: 'الحافلات', direct: true, path: '/bus', emoji: 'B', desc: 'Scheduled intercity coaches', descAr: 'حافلات جدولية بين المدن', color: C.green, badge: null, items: [] },
  { id: 'mobility-os', label: 'Mobility OS', labelAr: 'نظام الحركة', direct: true, path: '/mobility-os', emoji: 'M', desc: 'Live network intelligence and operations control', descAr: 'ذكاء الشبكة المباشر والتحكم التشغيلي', color: C.cyan, badge: 'LIVE', items: [] },
  { id: 'profile', label: 'Profile', labelAr: 'الملف الشخصي', direct: true, path: '/profile', emoji: 'U', desc: 'Verification, trust, and account settings', descAr: 'التحقق والثقة وإعدادات الحساب', color: C.cyan, badge: null, items: [] },
] as const;

export type NavGroup = (typeof PRODUCT_NAV_GROUPS)[number];

const HIDDEN_NAV_PATHS = new Set<string>();
const USER_ONLY_NAV_PATHS = new Set<string>(['/my-trips', '/profile']);

export function isVisibleNavGroup(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) {
    return !HIDDEN_NAV_PATHS.has(group.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(group.path));
  }
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.some((item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)));
}

export function getVisibleNavItems(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) return [];
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.filter((item) => !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)));
}
