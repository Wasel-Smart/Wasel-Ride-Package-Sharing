import { APP_ROUTES, stripAppRoutePrefix } from '../router/paths';

export interface CoreNavItem {
  id: string;
  label: string;
  labelAr: string;
  path: string;
  description: string;
  descriptionAr: string;
  accent: 'cyan' | 'gold';
  requiresAuth?: boolean;
}

export const CORE_NAV_ITEMS: CoreNavItem[] = [
  {
    id: 'find',
    label: 'Find',
    labelAr: 'ابحث',
    path: stripAppRoutePrefix(APP_ROUTES.findRide.full),
    description: 'Search routes and book the best shared ride',
    descriptionAr: 'ابحث في المسارات واحجز أفضل رحلة مشتركة',
    accent: 'cyan',
  },
  {
    id: 'trips',
    label: 'Trips',
    labelAr: 'رحلاتي',
    path: stripAppRoutePrefix(APP_ROUTES.myTrips.full),
    description: 'Track booked rides and active trips',
    descriptionAr: 'تابع الرحلات المحجوزة والنشطة',
    accent: 'gold',
    requiresAuth: true,
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    path: stripAppRoutePrefix(APP_ROUTES.packages.full),
    description: 'Send and track packages on live corridors',
    descriptionAr: 'أرسل الطرود وتتبعها على الممرات الحية',
    accent: 'gold',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    labelAr: 'المحفظة',
    path: stripAppRoutePrefix(APP_ROUTES.wallet.full),
    description: 'Top up, send money, and review activity',
    descriptionAr: 'اشحن الرصيد وأرسل المال وراجع النشاط',
    accent: 'cyan',
    requiresAuth: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف',
    path: stripAppRoutePrefix(APP_ROUTES.profile.full),
    description: 'Manage your account, verification, and preferences',
    descriptionAr: 'أدر حسابك والتحقق والتفضيلات',
    accent: 'gold',
    requiresAuth: true,
  },
];
