import type { RouteObject } from 'react-router';

export interface WaselRouteMeta {
  path: string;
  requiresAuth?: boolean;
  title?: string;
  titleAr?: string;
  analyticsKey?: string;
}

export const ROUTE_META: WaselRouteMeta[] = [
  { path: '/', title: 'Home', titleAr: 'الرئيسية', analyticsKey: 'home' },
  {
    path: '/app/find-ride',
    requiresAuth: true,
    title: 'Find Ride',
    titleAr: 'ابحث عن رحلة',
    analyticsKey: 'find_ride',
  },
  {
    path: '/app/offer-ride',
    requiresAuth: true,
    title: 'Offer Ride',
    titleAr: 'اعرض رحلة',
    analyticsKey: 'offer_ride',
  },
  {
    path: '/app/my-trips',
    requiresAuth: true,
    title: 'My Trips',
    titleAr: 'رحلاتي',
    analyticsKey: 'my_trips',
  },
  {
    path: '/app/live-trip',
    requiresAuth: true,
    title: 'Live Trip',
    titleAr: 'الرحلة المباشرة',
    analyticsKey: 'live_trip',
  },
  { path: '/app/bus', requiresAuth: true, title: 'Bus', titleAr: 'الباص', analyticsKey: 'bus' },
  {
    path: '/app/packages',
    requiresAuth: true,
    title: 'Packages',
    titleAr: 'الطرود',
    analyticsKey: 'packages',
  },
  {
    path: '/app/raje3',
    requiresAuth: true,
    title: 'Returns',
    titleAr: 'المرتجعات',
    analyticsKey: 'raje3',
  },
  {
    path: '/app/wallet',
    requiresAuth: true,
    title: 'Wallet',
    titleAr: 'المحفظة',
    analyticsKey: 'wallet',
  },
  {
    path: '/app/profile',
    requiresAuth: true,
    title: 'Profile',
    titleAr: 'الملف الشخصي',
    analyticsKey: 'profile',
  },
  {
    path: '/app/settings',
    requiresAuth: true,
    title: 'Settings',
    titleAr: 'الإعدادات',
    analyticsKey: 'settings',
  },
  {
    path: '/app/notifications',
    requiresAuth: true,
    title: 'Notifications',
    titleAr: 'الإشعارات',
    analyticsKey: 'notifications',
  },
  {
    path: '/app/trust',
    requiresAuth: true,
    title: 'Trust Center',
    titleAr: 'مركز الثقة',
    analyticsKey: 'trust',
  },
  {
    path: '/app/driver',
    requiresAuth: true,
    title: 'Driver',
    titleAr: 'السائق',
    analyticsKey: 'driver',
  },
  {
    path: '/app/safety',
    requiresAuth: true,
    title: 'Safety',
    titleAr: 'السلامة',
    analyticsKey: 'safety',
  },
  {
    path: '/app/plus',
    requiresAuth: true,
    title: 'Wasel Plus',
    titleAr: 'واصل بلس',
    analyticsKey: 'plus',
  },
  {
    path: '/app/privacy',
    title: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    analyticsKey: 'privacy',
  },
  { path: '/app/terms', title: 'Terms of Service', titleAr: 'شروط الخدمة', analyticsKey: 'terms' },
  { path: '/app/security', title: 'Security', titleAr: 'الأمان', analyticsKey: 'security' },
  {
    path: '/app/admin',
    requiresAuth: true,
    title: 'Admin',
    titleAr: 'الإدارة',
    analyticsKey: 'admin',
  },
];

export function getRouteMeta(pathname: string): WaselRouteMeta | undefined {
  return ROUTE_META.find(meta => pathname === meta.path || pathname.startsWith(meta.path + '/'));
}

export function isProtectedRoute(pathname: string): boolean {
  return ROUTE_META.some(meta => meta.requiresAuth && pathname === meta.path);
}

export type { RouteObject };
