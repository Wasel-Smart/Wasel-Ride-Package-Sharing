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
    path: '/find-ride',
    description: 'Search routes and book the best shared ride',
    descriptionAr: 'ابحث في المسارات واحجز أفضل رحلة مشتركة',
    accent: 'cyan',
  },
  {
    id: 'trips',
    label: 'Trips',
    labelAr: 'رحلاتي',
    path: '/my-trips',
    description: 'Track booked rides and active trips',
    descriptionAr: 'تابع الرحلات المحجوزة والنشطة',
    accent: 'gold',
    requiresAuth: true,
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    path: '/packages',
    description: 'Send and track packages on live corridors',
    descriptionAr: 'أرسل الطرود وتتبعها على الممرات الحية',
    accent: 'gold',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    labelAr: 'المحفظة',
    path: '/wallet',
    description: 'Top up, send money, and review activity',
    descriptionAr: 'اشحن الرصيد وأرسل المال وراجع النشاط',
    accent: 'cyan',
    requiresAuth: true,
  },
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف',
    path: '/profile',
    description: 'Manage your account, verification, and preferences',
    descriptionAr: 'أدر حسابك والتحقق والتفضيلات',
    accent: 'gold',
    requiresAuth: true,
  },
];
