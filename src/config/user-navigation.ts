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
    labelAr: 'احجز مشوار',
    path: '/app/find-ride',
    description: 'Search live shared rides by city, date, and price',
    descriptionAr: 'ابحث عن المشاوير المشتركة حسب المدينة والتاريخ والسعر',
    accent: 'cyan',
  },
  {
    id: 'post',
    label: 'Offer Ride',
    labelAr: 'اعرض مشوار',
    path: '/app/offer-ride',
    description: 'Post seats and package space on your route',
    descriptionAr: 'انشر المقاعد ومساحة الطرود على مسارك',
    accent: 'gold',
  },
  {
    id: 'packages',
    label: 'Packages',
    labelAr: 'الطرود',
    path: '/app/packages',
    description: 'Send, track, or return parcels on trusted routes',
    descriptionAr: 'أرسل الطرود أو تتبعها أو أعدها عبر مسارات موثوقة',
    accent: 'gold',
  },
  {
    id: 'trips',
    label: 'My Trips',
    labelAr: 'رحلاتي',
    path: '/app/my-trips',
    description: 'View your upcoming and past trips',
    descriptionAr: 'اطلع على رحلاتك القادمة والسابقة',
    accent: 'cyan',
  },
  {
    id: 'bus',
    label: 'Bus',
    labelAr: 'الحافلات',
    path: '/app/bus',
    description: 'Book scheduled bus departures across Jordan',
    descriptionAr: 'احجز رحلات الحافلات المجدولة في أنحاء الأردن',
    accent: 'cyan',
  },
];
