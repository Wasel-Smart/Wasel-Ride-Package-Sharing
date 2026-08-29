export const OFFER_RIDE_SUMMARY_METRICS = [
  { label: 'Posted rides', detail: 'Connected across the app', colorKey: 'cyan' },
  { label: 'Package-ready rides', detail: 'Visible to package search', colorKey: 'gold' },
  { label: 'Packages matched', detail: 'Matched through ride routes', colorKey: 'green' },
  { label: 'Network activity', detail: 'Tracked requests created', colorKey: 'blue' },
] as const;

export const OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS = ['small', 'medium', 'large'] as const;

const CITY_LABELS_AR: Record<string, string> = {
  Amman: 'عمّان',
  Aqaba: 'العقبة',
  Irbid: 'إربد',
  Zarqa: 'الزرقاء',
  'Dead Sea': 'البحر الميت',
  Karak: 'الكرك',
  Madaba: 'مادبا',
  Petra: 'البتراء',
  Jerash: 'جرش',
  Mafraq: 'المفرق',
  Salt: 'السلط',
};

const CAPACITY_LABELS_AR: Record<(typeof OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS)[number], string> = {
  small: 'صغير',
  medium: 'متوسط',
  large: 'كبير',
};

export function cityLabel(city: string, language: 'ar' | 'en'): string {
  return language === 'ar' ? CITY_LABELS_AR[city] ?? city : city;
}

export function packageCapacityLabel(
  capacity: (typeof OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS)[number] | string,
  language: 'ar' | 'en',
): string {
  return language === 'ar'
    ? CAPACITY_LABELS_AR[capacity as keyof typeof CAPACITY_LABELS_AR] ?? capacity
    : capacity;
}
