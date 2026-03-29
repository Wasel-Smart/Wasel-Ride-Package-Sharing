export interface CoreNavItem {
  id: string;
  label: string;
  labelAr: string;
  path: string;
  description: string;
  descriptionAr: string;
  accent: 'cyan' | 'gold';
}

export const CORE_NAV_ITEMS: CoreNavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    labelAr: 'الرئيسية',
    path: '/dashboard',
    description: 'Open your command center',
    descriptionAr: 'افتح مركز التحكم الخاص بك',
    accent: 'cyan',
  },
  {
    id: 'find',
    label: 'Find Ride',
    labelAr: 'ابحث عن رحلة',
    path: '/find-ride',
    description: 'Search active rides across the network',
    descriptionAr: 'ابحث عن الرحلات النشطة عبر الشبكة',
    accent: 'cyan',
  },
  {
    id: 'post',
    label: 'Offer Ride',
    labelAr: 'أضف رحلتك',
    path: '/offer-ride',
    description: 'Share seats and earn on your route',
    descriptionAr: 'شارك المقاعد واكسب من رحلتك',
    accent: 'gold',
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    path: '/packages',
    description: 'Send, track, and manage deliveries',
    descriptionAr: 'أرسل وتتبع وأدر الطرود',
    accent: 'gold',
  },
  {
    id: 'bus',
    label: 'Bus',
    labelAr: 'الحافلات',
    path: '/bus',
    description: 'Book fixed-price intercity coaches',
    descriptionAr: 'احجز الحافلات بين المدن بسعر ثابت',
    accent: 'cyan',
  },
];
