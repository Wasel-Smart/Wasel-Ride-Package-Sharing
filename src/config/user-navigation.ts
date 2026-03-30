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
    id: 'find',
    label: 'Find Ride',
    labelAr: 'ابحث عن رحلة',
    path: '/find-ride',
    description: 'Search verified intercity rides',
    descriptionAr: 'ابحث عن رحلات موثقة بين المدن',
    accent: 'cyan',
  },
  {
    id: 'post',
    label: 'Offer Ride',
    labelAr: 'أضف رحلتك',
    path: '/offer-ride',
    description: 'Share seats and accept package handoff',
    descriptionAr: 'شارك المقاعد واسمح بحمل الطرود مع الرحلة',
    accent: 'gold',
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    path: '/packages',
    description: 'Send parcels with riders on the same route',
    descriptionAr: 'أرسل الطرود مع مسافرين على نفس الطريق',
    accent: 'gold',
  },
  {
    id: 'bus',
    label: 'Bus',
    labelAr: 'الباصات',
    path: '/bus',
    description: 'Book scheduled intercity buses',
    descriptionAr: 'احجز باصات بين المدن بمواعيد ثابتة',
    accent: 'cyan',
  },
];
