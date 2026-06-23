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
    label: 'Ride',
    labelAr: 'الرحلات',
    direct: true,
    path: '/find-ride',
    emoji: '',
    desc: 'Search live shared rides with clear pickup points and pricing.',
    descAr: 'ابحث عن رحلات مشتركة مباشرة مع نقاط التقاط واضحة وتسعير مفهوم.',
    color: C.cyan,
    badge: 'LIVE',
    items: [],
  },
  {
    id: 'offer',
    label: 'Drive',
    labelAr: 'قد السيارة',
    direct: true,
    path: '/offer-ride',
    emoji: '',
    desc: 'Offer seats, parcel space, and route availability in one step.',
    descAr: 'اعرض المقاعد ومساحة الطرود وتوفر المسار في خطوة واحدة.',
    color: C.blue,
    badge: null,
    items: [],
  },
  {
    id: 'packages',
    label: 'Send',
    labelAr: 'الطرود',
    direct: true,
    path: '/packages',
    emoji: '',
    desc: 'Send parcels and returns through trusted live corridors.',
    descAr: 'أرسل الطرود والمرتجعات عبر ممرات مباشرة وموثوقة.',
    color: C.gold,
    badge: 'LIVE',
    items: [],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    labelAr: 'الجدولة',
    direct: true,
    path: '/schedule',
    emoji: '',
    desc: 'Plan rides and deliveries for future dates.',
    descAr: 'خطط للرحلات والتوصيلات في تواريخ مستقبلية.',
    color: C.blue,
    badge: 'NEW',
    items: [],
  },
  {
    id: 'my-trips',
    label: 'Activity',
    labelAr: 'نشاطي',
    direct: true,
    path: '/my-trips',
    emoji: '',
    desc: 'Track bookings, passes, and your recent movement history.',
    descAr: 'تابع الحجوزات والاشتراكات وسجل تنقلاتك الأخيرة.',
    color: C.cyan,
    badge: null,
    items: [],
  },
  {
    id: 'bus',
    label: 'Bus',
    labelAr: 'الحافلات',
    direct: true,
    path: '/bus',
    emoji: '',
    desc: 'Use scheduled corridors when your route and timing are fixed.',
    descAr: 'استخدم الممرات المجدولة عندما يكون مسارك ووقتك ثابتين.',
    color: C.green,
    badge: null,
    items: [],
  },
  {
    id: 'mobility-os',
    label: 'Network',
    labelAr: 'الشبكة',
    direct: true,
    path: '/mobility-os',
    emoji: '',
    desc: 'See live network intelligence, corridor pressure, and routing signals.',
    descAr: 'اطلع على ذكاء الشبكة المباشر وضغط الممرات وإشارات التوجيه.',
    color: C.cyan,
    badge: 'LIVE',
    items: [],
  },
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف',
    direct: true,
    path: '/profile',
    emoji: '',
    desc: 'Manage trust, verification, and your Wasel profile.',
    descAr: 'أدر الثقة والتحقق وملفك الشخصي في واصل.',
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
    return (
      !HIDDEN_NAV_PATHS.has(group.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(group.path))
    );
  }
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.some(
    item =>
      !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}

export function getVisibleNavItems(group: NavGroup, isAuthenticated: boolean) {
  if ('direct' in group && group.direct) return [];
  const items = ('items' in group ? group.items : []) as unknown as readonly NavItem[];
  return items.filter(
    item =>
      !HIDDEN_NAV_PATHS.has(item.path) && (isAuthenticated || !USER_ONLY_NAV_PATHS.has(item.path)),
  );
}
