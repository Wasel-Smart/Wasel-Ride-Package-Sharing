export type PublicLanguage = 'en' | 'ar';

export type PublicPageKey =
  | 'home'
  | 'how-it-works'
  | 'drivers'
  | 'passengers'
  | 'cities'
  | 'about'
  | 'contact'
  | 'login'
  | 'register'
  | 'privacy'
  | 'terms';

export type LocalizedText = Record<PublicLanguage, string>;

export const SUPPORT_PHONE_DISPLAY = '+962 79 000 0000';
export const WHATSAPP_NUMBER = '962790000000';
export const SUPPORT_EMAIL = 'support@wasel.jo';

export const routeLabels: Record<PublicPageKey, string> = {
  home: '/',
  'how-it-works': '/how-it-works',
  drivers: '/for-drivers',
  passengers: '/for-passengers',
  cities: '/cities',
  about: '/about',
  contact: '/contact',
  login: '/login',
  register: '/register',
  privacy: '/privacy-policy',
  terms: '/terms-and-conditions',
};

export const navItems: Array<{ key: PublicPageKey; label: LocalizedText }> = [
  { key: 'home', label: { en: 'Home', ar: 'الرئيسية' } },
  { key: 'how-it-works', label: { en: 'How it Works', ar: 'كيف يعمل' } },
  { key: 'drivers', label: { en: 'For Drivers', ar: 'للسائقين' } },
  { key: 'passengers', label: { en: 'For Passengers', ar: 'للركاب' } },
  { key: 'cities', label: { en: 'Cities', ar: 'المدن' } },
  { key: 'about', label: { en: 'About', ar: 'من نحن' } },
  { key: 'contact', label: { en: 'Contact', ar: 'تواصل' } },
];

export const socialLinks = [
  { href: 'https://facebook.com/wasel14', label: 'Facebook' },
  { href: 'https://instagram.com/wasel14', label: 'Instagram' },
  { href: 'https://x.com/wasel14', label: 'X' },
  { href: 'https://tiktok.com/@wasel14', label: 'TikTok' },
] as const;

export const siteCopy = {
  en: {
    dir: 'ltr',
    localeName: 'English',
    languageToggle: 'عربي',
    brandSubtitle: 'Jordan ride sharing',
    heroEyebrow: 'Built for Jordan',
    heroTitle: 'Share Rides. Split Costs. Travel Smarter Across Jordan.',
    heroSubtitle:
      'Wasel14 connects verified passengers and drivers on trusted city-to-city corridors so every empty seat becomes a safer, smarter, more affordable trip.',
    heroSecondary: 'شارك الرحلة. قسّم التكلفة. تنقّل بذكاء في الأردن.',
    login: 'Login',
    signup: 'Sign Up',
    comingSoon: 'Mobile apps coming soon',
    findRide: 'Find a Ride',
    offerRide: 'Offer a Ride',
    whatsapp: 'WhatsApp',
    searchTitle: 'Search popular rides',
    saveHint: 'Saved securely to Supabase when production keys are configured.',
    from: 'From',
    to: 'To',
    date: 'Date',
    name: 'Name',
    fullName: 'Full name',
    phone: 'Phone',
    email: 'Email',
    password: 'Password',
    message: 'Message',
    seats: 'Seats',
    passenger: 'Passenger',
    driver: 'Driver',
    saving: 'Saving...',
    send: 'Send',
    savedSearch: 'Search saved. Opening matching rides...',
    savedOffer: 'Ride offer saved. Our team can now review it.',
    savedMessage: 'Message saved. Support will follow up shortly.',
    authSuccessRegister: 'Check your email to confirm registration.',
    authSuccessLogin: 'Logged in successfully.',
    error: 'Could not save. Please check details and try again.',
    authError: 'Please check Supabase configuration and credentials.',
    routeBadgeOne: 'Verified driver',
    routeBadgeTwo: 'Split trip cost',
    stats: [
      ['12+', 'Jordan corridors prepared'],
      ['24/7', 'WhatsApp + phone support'],
      ['2 min', 'Average MVP ride request flow'],
    ],
    trustPills: ['Secure Payments', 'Verified Users', 'Safe Rides'],
    footerLine: 'Share rides and split costs across Jordan.',
    copyright: '© 2026 Wasel14.online. All rights reserved.',
  },
  ar: {
    dir: 'rtl',
    localeName: 'العربية',
    languageToggle: 'EN',
    brandSubtitle: 'مشاركة الرحلات في الأردن',
    heroEyebrow: 'مصمم للأردن',
    heroTitle: 'شارك الرحلة. قسّم التكلفة. تنقّل بذكاء في الأردن.',
    heroSubtitle:
      'واصل 14 يربط الركاب والسائقين الموثّقين على مسارات آمنة بين المدن لتصبح المقاعد الفارغة رحلة أوفر وأسهل وأكثر أماناً.',
    heroSecondary: 'Share Rides. Split Costs. Travel Smarter Across Jordan.',
    login: 'دخول',
    signup: 'تسجيل',
    comingSoon: 'تطبيقات الهاتف قريباً',
    findRide: 'ابحث عن رحلة',
    offerRide: 'اعرض رحلة',
    whatsapp: 'واتساب',
    searchTitle: 'ابحث في الرحلات الشائعة',
    saveHint: 'يتم الحفظ بأمان في Supabase عند ضبط مفاتيح الإنتاج.',
    from: 'من',
    to: 'إلى',
    date: 'التاريخ',
    name: 'الاسم',
    fullName: 'الاسم الكامل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    message: 'الرسالة',
    seats: 'المقاعد',
    passenger: 'راكب',
    driver: 'سائق',
    saving: 'جاري الحفظ...',
    send: 'إرسال',
    savedSearch: 'تم حفظ البحث. نفتح الرحلات المناسبة...',
    savedOffer: 'تم حفظ الرحلة وسيتم مراجعتها.',
    savedMessage: 'تم حفظ الرسالة وسيتابع فريق الدعم قريباً.',
    authSuccessRegister: 'تحقق من بريدك لتأكيد التسجيل.',
    authSuccessLogin: 'تم تسجيل الدخول بنجاح.',
    error: 'تعذر الحفظ. تحقق من البيانات وحاول مرة أخرى.',
    authError: 'تأكد من إعداد Supabase والبيانات.',
    routeBadgeOne: 'سائق موثّق',
    routeBadgeTwo: 'تقسيم التكلفة',
    stats: [
      ['+12', 'مساراً جاهزاً في الأردن'],
      ['24/7', 'دعم واتساب وهاتف'],
      ['دقيقتان', 'متوسط طلب الرحلة في النسخة الأولى'],
    ],
    trustPills: ['مدفوعات آمنة', 'مستخدمون موثّقون', 'رحلات آمنة'],
    footerLine: 'شارك الرحلات وقسّم التكلفة في الأردن.',
    copyright: '© 2026 Wasel14.online. جميع الحقوق محفوظة.',
  },
} as const;

export const popularRoutes = [
  {
    ar: 'عمّان → الزرقاء',
    demand: { en: 'Daily commuter lane', ar: 'مسار يومي للموظفين والطلاب' },
    en: 'Amman → Zarqa',
    time: '35–50 min',
  },
  {
    ar: 'عمّان → إربد',
    demand: { en: 'University + weekend trips', ar: 'رحلات جامعات ونهاية الأسبوع' },
    en: 'Amman → Irbid',
    time: '75–95 min',
  },
  {
    ar: 'عمّان → البحر الميت',
    demand: { en: 'Leisure corridor', ar: 'مسار سياحي وترفيهي' },
    en: 'Amman → Dead Sea',
    time: '50–70 min',
  },
  {
    ar: 'عمّان → المطار',
    demand: { en: 'Airport transfers', ar: 'تنقلات المطار' },
    en: 'Amman → Airport',
    time: '30–45 min',
  },
  {
    ar: 'عمّان → العقبة',
    demand: { en: 'Long-distance sharing', ar: 'مشاركة الرحلات الطويلة' },
    en: 'Amman → Aqaba',
    time: '4 hr',
  },
  {
    ar: 'السلط → عمّان',
    demand: { en: 'Workday rides', ar: 'رحلات أيام العمل' },
    en: 'Salt → Amman',
    time: '35–55 min',
  },
] as const;

export const howItWorksSteps = {
  en: [
    ['Choose your route', 'Pick origin, destination, and date.'],
    ['Compare rides', 'Review price, rating, timing, and seats.'],
    ['Book safely', 'Confirm details with a verified driver.'],
    ['Ride and rate', 'Share feedback to strengthen trust.'],
  ],
  ar: [
    ['اختر المسار', 'حدد نقطة الانطلاق والوصول والتاريخ.'],
    ['قارن الرحلات', 'راجع السعر والتقييم والمقاعد المتاحة.'],
    ['احجز بأمان', 'تواصل مع السائق واحصل على تأكيد واضح.'],
    ['انطلق وقيّم', 'شارك تجربتك لبناء مجتمع موثوق.'],
  ],
} as const;

export const benefits = {
  passengers: {
    en: {
      kicker: 'For passengers',
      title: 'Travel with lower costs and higher confidence.',
      items: [
        ['Lower trip costs', 'Split road costs with people on the same corridor.'],
        ['More route options', 'Find daily rides across Amman, Zarqa, Irbid, and beyond.'],
        ['Confidence first', 'Verified profiles, ratings, and direct support.'],
      ],
    },
    ar: {
      kicker: 'للركاب',
      title: 'تنقّل بتكلفة أقل وثقة أعلى.',
      items: [
        ['تكلفة أقل', 'قسّم تكلفة الطريق مع أشخاص على نفس المسار.'],
        ['خيارات أكثر', 'اكتشف مسارات يومية بين عمّان والزرقاء وإربد وغيرها.'],
        ['رحلات مطمئنة', 'ملفات موثقة وتقييمات ودعم مباشر.'],
      ],
    },
  },
  drivers: {
    en: {
      kicker: 'For drivers',
      title: 'Drive safely and earn more from trips you already take.',
      items: [
        ['Earn from empty seats', 'Turn daily travel into additional income.'],
        ['Stay in control', 'Choose price, seats, pickup points, and timing.'],
        ['Verified passengers', 'Review ratings before accepting requests.'],
      ],
    },
    ar: {
      kicker: 'للسائقين',
      title: 'قد بأمان واكسب أكثر من رحلاتك.',
      items: [
        ['اربح من المقاعد الفارغة', 'حوّل مشاويرك اليومية إلى دخل إضافي.'],
        ['تحكم كامل', 'اختر السعر والمقاعد ونقطة الالتقاء.'],
        ['ركاب موثّقون', 'اطلع على التقييمات قبل قبول الطلب.'],
      ],
    },
  },
} as const;

export const safetyCards = {
  en: [
    ['User verification', 'Basic registration and identity readiness before trips.'],
    ['Ratings', 'Reputation signals help riders and drivers choose confidently.'],
    ['Emergency support', 'Floating WhatsApp and clear contact options.'],
    ['Secure payments', 'Prepared for safe payment integration in the next release.'],
  ],
  ar: [
    ['توثيق المستخدمين', 'تسجيل وتحقق أساسي قبل الرحلات.'],
    ['التقييمات', 'نظام تقييم يساعد على اختيار الشريك المناسب.'],
    ['طوارئ ودعم', 'زر واتساب عائم ومعلومات اتصال واضحة.'],
    ['مدفوعات آمنة', 'جاهزية لربط المدفوعات الآمنة في النسخة التالية.'],
  ],
} as const;

export const testimonials = {
  en: [
    ['Sara from Amman', 'The idea saved my Irbid travel cost and made everything clear before the trip.'],
    ['Ahmad, daily driver', 'I can publish my ride quickly and know passengers before leaving.'],
    ['Layan from Zarqa', 'Support and WhatsApp gave me more confidence to try it.'],
  ],
  ar: [
    ['سارة من عمّان', 'الفكرة وفرت عليّ تكلفة الذهاب إلى إربد وشعرت أن كل شيء واضح قبل الرحلة.'],
    ['أحمد، سائق يومي', 'أستطيع نشر رحلتي بسرعة ومعرفة الركاب قبل الانطلاق.'],
    ['ليان من الزرقاء', 'وجود الدعم وواتساب أعطاني ثقة أكبر للتجربة.'],
  ],
} as const;

export const faqs = {
  en: [
    ['Is Wasel available now?', 'The website is MVP-ready for requests and lead capture while the mobile app is prepared.'],
    ['Are payments secure?', 'The platform is designed for secure payments and can start with direct confirmation.'],
    ['How do I contact support?', `WhatsApp ${SUPPORT_PHONE_DISPLAY}, phone ${SUPPORT_PHONE_DISPLAY}, or email ${SUPPORT_EMAIL}.`],
  ],
  ar: [
    ['هل واصل متاح الآن؟', 'الموقع جاهز لتجربة MVP وجمع الطلبات، والتطبيق قادم لاحقاً.'],
    ['هل الدفع آمن؟', 'تم تصميم المنصة لتدعم المدفوعات الآمنة، ويمكن بدء التشغيل بالتأكيد المباشر.'],
    ['كيف أتواصل؟', `واتساب ${SUPPORT_PHONE_DISPLAY} أو الهاتف ${SUPPORT_PHONE_DISPLAY} أو البريد ${SUPPORT_EMAIL}.`],
  ],
} as const;
