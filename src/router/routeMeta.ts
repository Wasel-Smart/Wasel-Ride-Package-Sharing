import type { RouteObject } from 'react-router';

export interface WaselRouteMeta {
  path: string;
  requiresAuth?: boolean;
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  analyticsKey?: string;
}

export const ROUTE_META: WaselRouteMeta[] = [
  { path: '/', title: 'Home', titleAr: 'الرئيسية', description: 'Wasel connects riders and drivers through shared routes to reduce cost.', descriptionAr: 'واصل يربط الركاب والسائقين عبر مسارات مشتركة لتخفيض التكلفة.', analyticsKey: 'home' },
  {
    path: '/app/find-ride',
    requiresAuth: true,
    title: 'Find Ride',
    titleAr: 'ابحث عن رحلة',
    description: 'Book a shared ride across Jordan with Wasel.',
    descriptionAr: 'احجز رحلة مشتركة في الأردن مع واصل.',
    analyticsKey: 'find_ride',
  },
  {
    path: '/app/offer-ride',
    requiresAuth: true,
    title: 'Offer Ride',
    titleAr: 'اعرض رحلة',
    description: 'Offer your empty seats and split travel costs.',
    descriptionAr: 'اعرض مقاعدك الفارغة وشارك تكلفة الرحلة.',
    analyticsKey: 'offer_ride',
  },
  {
    path: '/app/my-trips',
    requiresAuth: true,
    title: 'My Trips',
    titleAr: 'رحلاتي',
    description: 'Manage your upcoming and past trips.',
    descriptionAr: 'أدر رحلاتك القادمة والسابقة.',
    analyticsKey: 'my_trips',
  },
  {
    path: '/app/live-trip',
    requiresAuth: true,
    title: 'Live Trip',
    titleAr: 'الرحلة المباشرة',
    description: 'Track your live trip in real time.',
    descriptionAr: 'تتبع رحلتك المباشرة في الوقت الفعلي.',
    analyticsKey: 'live_trip',
  },
  { path: '/app/bus', requiresAuth: true, title: 'Bus', titleAr: 'الباص', description: 'Book bus tickets across Jordan.', descriptionAr: 'احجز تذاكر باص في الأردن.', analyticsKey: 'bus' },
  {
    path: '/app/packages',
    requiresAuth: true,
    title: 'Packages',
    titleAr: 'الطرود',
    description: 'Send packages with trusted travelers.',
    descriptionAr: 'أرسل طروداً مع مسافرين موثوقين.',
    analyticsKey: 'packages',
  },
  {
    path: '/app/raje3',
    requiresAuth: true,
    title: 'Returns',
    titleAr: 'المرتجعات',
    description: 'E-commerce returns via trusted travelers.',
    descriptionAr: 'مرتجعات التجارة الإلكترونية عبر مسافرين موثوقين.',
    analyticsKey: 'raje3',
  },
  {
    path: '/app/wallet',
    requiresAuth: true,
    title: 'Wallet',
    titleAr: 'المحفظة',
    description: 'Manage your Wasel wallet and transactions.',
    descriptionAr: 'أدر محفظة واصل والمعاملات.',
    analyticsKey: 'wallet',
  },
  {
    path: '/app/profile',
    requiresAuth: true,
    title: 'Profile',
    titleAr: 'الملف الشخصي',
    description: 'View and edit your Wasel profile.',
    descriptionAr: 'عرض وتعديل ملفك الشخصي في واصل.',
    analyticsKey: 'profile',
  },
  {
    path: '/app/settings',
    requiresAuth: true,
    title: 'Settings',
    titleAr: 'الإعدادات',
    description: 'Manage your account settings and preferences.',
    descriptionAr: 'أدر إعدادات حسابك وتفضيلاتك.',
    analyticsKey: 'settings',
  },
  {
    path: '/app/notifications',
    requiresAuth: true,
    title: 'Notifications',
    titleAr: 'الإشعارات',
    description: 'View your Wasel notifications.',
    descriptionAr: 'عرض إشعارات واصل.',
    analyticsKey: 'notifications',
  },
  {
    path: '/app/trust',
    requiresAuth: true,
    title: 'Trust Center',
    titleAr: 'مركز الثقة',
    description: 'Verify your identity and build trust.',
    descriptionAr: 'وثق هويتك وابنِ ثقتك.',
    analyticsKey: 'trust',
  },
  {
    path: '/app/driver',
    requiresAuth: true,
    title: 'Driver',
    titleAr: 'السائق',
    description: 'Driver dashboard and earnings.',
    descriptionAr: 'لوحة تحكم السائق والأرباح.',
    analyticsKey: 'driver',
  },
  {
    path: '/app/safety',
    requiresAuth: true,
    title: 'Safety',
    titleAr: 'السلامة',
    description: 'Safety features and emergency contacts.',
    descriptionAr: 'ميزات السلامة وجهات الاتصال الطارئة.',
    analyticsKey: 'safety',
  },
  {
    path: '/app/plus',
    requiresAuth: true,
    title: 'Wasel Plus',
    titleAr: 'واصل بلس',
    description: 'Wasel Plus subscription benefits.',
    descriptionAr: 'مزايا اشتراك واصل بلس.',
    analyticsKey: 'plus',
  },
  {
    path: '/app/privacy',
    title: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    description: 'Wasel privacy policy and data protection.',
    descriptionAr: 'سياسة خصوصية واصل وحماية البيانات.',
    analyticsKey: 'privacy',
  },
  { path: '/app/terms', title: 'Terms of Service', titleAr: 'شروط الخدمة', description: 'Wasel terms of service.', descriptionAr: 'شروط خدمة واصل.', analyticsKey: 'terms' },
  { path: '/app/security', title: 'Security', titleAr: 'الأمان', description: 'Wasel security and trust controls.', descriptionAr: 'ضوابط أمان وثقة واصل.', analyticsKey: 'security' },
  {
    path: '/app/support',
    title: 'Support',
    titleAr: 'الدعم',
    description: 'Wasel customer support and contact channels.',
    descriptionAr: 'دعم عملاء واصل وقنوات التواصل.',
    analyticsKey: 'support',
  },
  {
    path: '/trust',
    title: 'Trust Center',
    titleAr: 'مركز الثقة',
    description: 'Wasel security posture, compliance, data handling, and incident response transparency.',
    descriptionAr: 'وضع أمان واصل، الامتثال، معالجة البيانات، وشفافية استجابة الحوادث.',
    analyticsKey: 'trust_center',
  },
  {
    path: '/app/admin',
    requiresAuth: true,
    title: 'Admin',
    titleAr: 'الإدارة',
    description: 'Wasel admin dashboard.',
    descriptionAr: 'لوحة تحكم إدارة واصل.',
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
