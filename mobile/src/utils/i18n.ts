import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

const translations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
    },
    home: {
      title: 'Home',
      greeting: 'Good day',
      tagline: 'Where are you heading today?',
      services: 'Services',
      availableNow: 'Available now',
      seeAll: 'See all',
      noRides: 'No rides right now',
      pullToRefresh: 'Pull to refresh or offer your own route',
    },
    rides: {
      findRide: 'Find Ride',
      offerRide: 'Offer Ride',
      from: 'From',
      to: 'To',
      date: 'Date',
      time: 'Time',
      seats: 'Seats',
      price: 'Price',
      book: 'Book',
      cancel: 'Cancel',
      driver: 'Driver',
      verified: 'Verified',
      rating: 'Rating',
    },
    wallet: {
      title: 'Wallet',
      balance: 'Balance',
      addFunds: 'Add Funds',
      withdraw: 'Withdraw',
      transactions: 'Transactions',
    },
    profile: {
      title: 'Profile',
      editProfile: 'Edit Profile',
      settings: 'Settings',
      logout: 'Logout',
      language: 'Language',
      notifications: 'Notifications',
      privacy: 'Privacy',
      terms: 'Terms of Service',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: 'Already have an account?',
    },
    errors: {
      networkError: 'No internet connection',
      serverError: 'Server error. Please try again.',
      authError: 'Authentication failed',
      notFound: 'Not found',
      unknown: 'Something went wrong',
    },
  },
  ar: {
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      retry: 'إعادة المحاولة',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ',
      delete: 'حذف',
      edit: 'تعديل',
      back: 'رجوع',
      next: 'التالي',
      done: 'تم',
      search: 'بحث',
      filter: 'تصفية',
      sort: 'ترتيب',
      refresh: 'تحديث',
    },
    home: {
      title: 'الرئيسية',
      greeting: 'يوم سعيد',
      tagline: 'إلى أين تتجه اليوم؟',
      services: 'الخدمات',
      availableNow: 'متاح الآن',
      seeAll: 'عرض الكل',
      noRides: 'لا توجد رحلات الآن',
      pullToRefresh: 'اسحب للتحديث أو قدم مسارك الخاص',
    },
    rides: {
      findRide: 'ابحث عن رحلة',
      offerRide: 'قدم رحلة',
      from: 'من',
      to: 'إلى',
      date: 'التاريخ',
      time: 'الوقت',
      seats: 'المقاعد',
      price: 'السعر',
      book: 'احجز',
      cancel: 'إلغاء',
      driver: 'السائق',
      verified: 'موثق',
      rating: 'التقييم',
    },
    wallet: {
      title: 'المحفظة',
      balance: 'الرصيد',
      addFunds: 'إضافة أموال',
      withdraw: 'سحب',
      transactions: 'المعاملات',
    },
    profile: {
      title: 'الملف الشخصي',
      editProfile: 'تعديل الملف',
      settings: 'الإعدادات',
      logout: 'تسجيل الخروج',
      language: 'اللغة',
      notifications: 'الإشعارات',
      privacy: 'الخصوصية',
      terms: 'شروط الخدمة',
    },
    auth: {
      signIn: 'تسجيل الدخول',
      signUp: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      forgotPassword: 'نسيت كلمة المرور؟',
      dontHaveAccount: 'ليس لديك حساب؟',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
    },
    errors: {
      networkError: 'لا يوجد اتصال بالإنترنت',
      serverError: 'خطأ في الخادم. يرجى المحاولة مرة أخرى.',
      authError: 'فشل المصادقة',
      notFound: 'غير موجود',
      unknown: 'حدث خطأ ما',
    },
  },
};

const i18n = new I18n(translations);
i18n.locale = Localization.locale;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function t(key: string, options?: any): string {
  return i18n.t(key, options);
}

export function setLocale(locale: 'en' | 'ar') {
  i18n.locale = locale;
  const isRTL = locale === 'ar';
  I18nManager.forceRTL(isRTL);
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

export function isRTL(): boolean {
  return I18nManager.isRTL;
}

export { i18n };
