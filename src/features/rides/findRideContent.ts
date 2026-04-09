export const FIND_RIDE_PACKAGE_WEIGHTS = ['<1 kg', '1-3 kg', '3-5 kg', '5-10 kg'] as const;

export type FindRideStaticCopy = {
  tabRide: string;
  tabPackage: string;
  pageSub: string;
  pageAction: string;
  packageTitle: string;
  packageSent: string;
  packageHint: string;
  packageReset: string;
  packageFlow: Array<{ title: string; desc: string }>;
  notifyMe: string;
  noResultsIcon: string;
  packageIcon: string;
};

export function getFindRideStaticCopy(ar: boolean): FindRideStaticCopy {
  if (ar) {
    return {
      tabRide: 'ابحث عن رحلة',
      tabPackage: 'أرسل طرد',
      pageSub: 'رحلات بين المدن بسرعة.',
      pageAction: 'اعرض رحلة',
      packageTitle: 'خدمة الطرود',
      packageSent: 'تم الإرسال',
      packageHint: 'نطابق شحنتك مع رحلة إلى',
      packageReset: 'إرسال شحنة أخرى',
      packageFlow: [
        { title: 'المرسل', desc: 'اختر المسار والوزن.' },
        { title: 'المطابقة', desc: 'نربطها مع رحلة.' },
        { title: 'الاستلام', desc: 'متابعة حتى التسليم.' },
      ],
      notifyMe: 'أخبرني عند توفر رحلة',
      noResultsIcon: 'لا توجد',
      packageIcon: 'طرد',
    };
  }

  return {
    tabRide: 'Find a Ride',
    tabPackage: 'Send Package',
    pageSub: 'Intercity rides, quickly.',
    pageAction: 'Offer a Ride',
    packageTitle: 'Package Delivery',
    packageSent: 'Package request sent',
    packageHint: 'Matching your package to a ride for',
    packageReset: 'Send another package',
    packageFlow: [
      { title: 'Sender', desc: 'Choose the route and weight.' },
      { title: 'Matching', desc: 'We pair it with a ride.' },
      { title: 'Receiver', desc: 'Track it to delivery.' },
    ],
    notifyMe: 'Notify me when a ride opens',
    noResultsIcon: 'Empty',
    packageIcon: 'Package',
  };
}
