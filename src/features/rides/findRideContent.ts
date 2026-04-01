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
      pageSub: 'مسارات يومية بين المدن مع حجز واضح وتجربة مناسبة للأردن.',
      pageAction: 'اعرض رحلة',
      packageTitle: 'خدمة الطرود',
      packageSent: 'تم الإرسال',
      packageHint: 'نحن نطابق شحنتك مع رحلة موثوقة متجهة إلى',
      packageReset: 'إرسال شحنة أخرى',
      packageFlow: [
        { title: 'المرسل', desc: 'اختر المسار والوزن وأضف ملاحظات الشحنة.' },
        { title: 'المطابقة', desc: 'نربط الطلب مع رحلة فعلية على نفس المسار.' },
        { title: 'الاستلام', desc: 'يكتمل التسليم على نفس الخط مع متابعة واضحة.' },
      ],
      notifyMe: 'أخبرني عند توفر رحلة',
      noResultsIcon: 'لا توجد',
      packageIcon: 'طرد',
    };
  }

  return {
    tabRide: 'Find a Ride',
    tabPackage: 'Send Package',
    pageSub: '100+ daily intercity routes · Book a seat instantly',
    pageAction: 'Offer a Ride',
    packageTitle: 'Package Delivery',
    packageSent: 'Package request sent',
    packageHint: 'We are matching your package to a trusted ride headed to',
    packageReset: 'Send another package',
    packageFlow: [
      { title: 'Sender', desc: 'Choose the route, weight, and note.' },
      { title: 'Matching', desc: 'We pair the request with a real intercity ride.' },
      { title: 'Receiver', desc: 'Delivery closes out on the same corridor.' },
    ],
    notifyMe: 'Notify me when a ride opens',
    noResultsIcon: 'Empty',
    packageIcon: 'Package',
  };
}
