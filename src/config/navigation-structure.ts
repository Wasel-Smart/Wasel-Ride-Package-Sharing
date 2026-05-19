/**
 * WASEL NAVIGATION STRUCTURE - 10/10 UX
 *
 * Based on best practices from:
 * - Uber: Simple 4-tab navigation
 * - Airbnb: Progressive disclosure
 * - WhatsApp: Context-aware features
 *
 * Principles:
 * 1. Maximum 4 main tabs (cognitive load limit)
 * 2. Progressive feature disclosure
 * 3. Context-aware navigation
 * 4. Smart defaults everywhere
 */

export type UserExperienceLevel = 'new' | 'beginner' | 'intermediate' | 'expert';

export interface NavigationItem {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  path: string;
  badge?: number;
  requiredLevel?: UserExperienceLevel;
  subItems?: NavigationItem[];
}

/**
 * MAIN NAVIGATION - 4 Tabs Only (Uber-style)
 * Simple, clear, always visible
 */
export const MAIN_NAVIGATION: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    labelAr: 'الرئيسية',
    icon: '🏠',
    path: '/app',
  },
  {
    id: 'rides',
    label: 'Rides',
    labelAr: 'الرحلات',
    icon: '🚗',
    path: '/app/rides',
    subItems: [
      {
        id: 'find-ride',
        label: 'Find Ride',
        labelAr: 'ابحث عن رحلة',
        icon: '🔍',
        path: '/app/rides/find',
      },
      {
        id: 'offer-ride',
        label: 'Offer Ride',
        labelAr: 'اعرض رحلة',
        icon: '➕',
        path: '/app/rides/offer',
      },
      {
        id: 'my-rides',
        label: 'My Rides',
        labelAr: 'رحلاتي',
        icon: '📋',
        path: '/app/rides/my-rides',
      },
    ],
  },
  {
    id: 'activity',
    label: 'Activity',
    labelAr: 'النشاط',
    icon: '📱',
    path: '/app/activity',
    subItems: [
      {
        id: 'trips',
        label: 'My Trips',
        labelAr: 'رحلاتي',
        icon: '🚗',
        path: '/app/activity/trips',
      },
      {
        id: 'packages',
        label: 'Packages',
        labelAr: 'الطرود',
        icon: '📦',
        path: '/app/activity/packages',
        requiredLevel: 'beginner', // Unlock after first ride
      },
      {
        id: 'wallet',
        label: 'Wallet',
        labelAr: 'المحفظة',
        icon: '💰',
        path: '/app/activity/wallet',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    labelAr: 'الحساب',
    icon: '👤',
    path: '/app/account',
    subItems: [
      {
        id: 'profile',
        label: 'Profile',
        labelAr: 'الملف الشخصي',
        icon: '👤',
        path: '/app/account/profile',
      },
      {
        id: 'settings',
        label: 'Settings',
        labelAr: 'الإعدادات',
        icon: '⚙️',
        path: '/app/account/settings',
      },
      {
        id: 'help',
        label: 'Help',
        labelAr: 'المساعدة',
        icon: '❓',
        path: '/app/account/help',
      },
    ],
  },
];

/**
 * QUICK ACTIONS - Context-aware shortcuts
 * Shown based on user behavior and location
 */
export interface QuickAction {
  id: string;
  label: string;
  labelAr: string;
  icon: string;
  action: string;
  priority: number;
  condition?: (user: any) => boolean;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'book-usual',
    label: 'Book usual route',
    labelAr: 'احجز مسارك المعتاد',
    icon: '⚡',
    action: 'book-frequent-route',
    priority: 1,
    condition: user => user?.frequentRoute !== null,
  },
  {
    id: 'amman-aqaba',
    label: 'Amman → Aqaba',
    labelAr: 'عمان ← العقبة',
    icon: '🚗',
    action: 'search-route:amman-aqaba',
    priority: 2,
  },
  {
    id: 'aqaba-amman',
    label: 'Aqaba → Amman',
    labelAr: 'العقبة ← عمان',
    icon: '🚗',
    action: 'search-route:aqaba-amman',
    priority: 3,
  },
  {
    id: 'post-route',
    label: "Post today's route",
    labelAr: 'انشر مسار اليوم',
    icon: '➕',
    action: 'quick-post-route',
    priority: 4,
    condition: user => user?.isDriver === true,
  },
  {
    id: 'send-package',
    label: 'Send package',
    labelAr: 'أرسل طرد',
    icon: '📦',
    action: 'send-package',
    priority: 5,
    condition: user => user?.experienceLevel !== 'new',
  },
];

/**
 * PROGRESSIVE FEATURE DISCLOSURE
 * Features unlock based on user experience level
 */
export interface FeatureGate {
  featureId: string;
  requiredLevel: UserExperienceLevel;
  unlockCondition?: {
    type: 'rides_completed' | 'days_active' | 'manual';
    threshold?: number;
  };
}

export const FEATURE_GATES: FeatureGate[] = [
  // New users see only basic ride finding
  {
    featureId: 'find-ride-basic',
    requiredLevel: 'new',
  },

  // After first ride, unlock packages
  {
    featureId: 'packages',
    requiredLevel: 'beginner',
    unlockCondition: {
      type: 'rides_completed',
      threshold: 1,
    },
  },

  // After 3 rides, unlock offering rides
  {
    featureId: 'offer-ride',
    requiredLevel: 'beginner',
    unlockCondition: {
      type: 'rides_completed',
      threshold: 3,
    },
  },

  // After 5 rides, unlock advanced features
  {
    featureId: 'advanced-search',
    requiredLevel: 'intermediate',
    unlockCondition: {
      type: 'rides_completed',
      threshold: 5,
    },
  },

  // After 10 rides, unlock driver console
  {
    featureId: 'driver-console',
    requiredLevel: 'intermediate',
    unlockCondition: {
      type: 'rides_completed',
      threshold: 10,
    },
  },

  // Expert features (analytics, mobility OS)
  {
    featureId: 'mobility-os',
    requiredLevel: 'expert',
    unlockCondition: {
      type: 'rides_completed',
      threshold: 20,
    },
  },
];

/**
 * ONBOARDING FLOW - 3 Steps Maximum
 * Based on Duolingo's successful onboarding
 */
export interface OnboardingStep {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action: string;
  actionLabel: string;
  actionLabelAr: string;
  skippable: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Wasel',
    titleAr: 'مرحباً بك في واصل',
    description: 'Share rides, save money, travel together',
    descriptionAr: 'شارك الرحلات، وفر المال، سافر معاً',
    action: 'show-popular-routes',
    actionLabel: 'Show me rides',
    actionLabelAr: 'أرني الرحلات',
    skippable: false,
  },
  {
    id: 'first-search',
    title: 'Find your first ride',
    titleAr: 'ابحث عن رحلتك الأولى',
    description: 'We found rides going your way',
    descriptionAr: 'وجدنا رحلات في طريقك',
    action: 'search-rides',
    actionLabel: 'Search rides',
    actionLabelAr: 'ابحث عن رحلات',
    skippable: true,
  },
  {
    id: 'create-account',
    title: 'Save your trips',
    titleAr: 'احفظ رحلاتك',
    description: 'Create account to book and track rides',
    descriptionAr: 'أنشئ حساب لحجز وتتبع الرحلات',
    action: 'signup',
    actionLabel: 'Create account',
    actionLabelAr: 'إنشاء حساب',
    skippable: true,
  },
];

/**
 * SMART DEFAULTS - Reduce user decisions
 * Based on Netflix's recommendation engine approach
 */
export interface SmartDefault {
  context: string;
  defaultValue: any;
  reason: string;
}

export const SMART_DEFAULTS = {
  search: {
    sortBy: 'best_match', // Instead of making user choose
    timeWindow: 'next_2_hours',
    priceRange: 'market_average',
  },
  offer: {
    price: 'suggested', // Auto-calculate based on route
    seats: 3,
    time: 'optimal', // Based on traffic data
  },
  notifications: {
    bookingUpdates: true,
    priceAlerts: false, // Don't overwhelm new users
    promotions: false,
  },
};

/**
 * CONTEXTUAL HELP - Show help when needed
 * Based on Slack's contextual tooltips
 */
export interface ContextualHelp {
  triggerId: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  showOnce: boolean;
}

export const CONTEXTUAL_HELP: ContextualHelp[] = [
  {
    triggerId: 'first-ride-search',
    title: 'How ride search works',
    titleAr: 'كيف يعمل البحث عن الرحلات',
    message: 'We show you rides going your way. Tap any ride to see details and book.',
    messageAr: 'نعرض لك الرحلات في طريقك. اضغط على أي رحلة لرؤية التفاصيل والحجز.',
    showOnce: true,
  },
  {
    triggerId: 'first-offer-ride',
    title: 'Earn money on your trips',
    titleAr: 'اكسب المال من رحلاتك',
    message: "Post routes you're already taking and earn money from empty seats.",
    messageAr: 'انشر المسارات التي تسلكها بالفعل واكسب المال من المقاعد الفارغة.',
    showOnce: true,
  },
  {
    triggerId: 'wallet-first-view',
    title: 'Your Wasel wallet',
    titleAr: 'محفظة واصل الخاصة بك',
    message: 'Add money to book rides faster. Earnings from rides go here automatically.',
    messageAr: 'أضف المال لحجز الرحلات بشكل أسرع. الأرباح من الرحلات تذهب هنا تلقائياً.',
    showOnce: true,
  },
];

/**
 * USER EXPERIENCE LEVEL DETECTION
 * Automatically upgrade users based on behavior
 */
export const getUserExperienceLevel = (user: any): UserExperienceLevel => {
  if (!user) return 'new';

  const ridesCompleted = user.stats?.ridesCompleted || 0;

  if (ridesCompleted === 0) return 'new';
  if (ridesCompleted < 5) return 'beginner';
  if (ridesCompleted < 20) return 'intermediate';
  return 'expert';
};

/**
 * FEATURE VISIBILITY RULES
 * Determine what features to show based on user level
 */
export const getVisibleFeatures = (level: UserExperienceLevel) => {
  const features = {
    new: ['home', 'find-ride-basic', 'profile-basic', 'settings-language'],
    beginner: [
      'home',
      'find-ride-basic',
      'find-ride-advanced',
      'offer-ride-simple',
      'packages-send',
      'wallet-basic',
      'profile',
      'settings',
    ],
    intermediate: [
      'home',
      'find-ride-all',
      'offer-ride-all',
      'packages-all',
      'wallet-all',
      'driver-console-basic',
      'analytics-basic',
      'profile-all',
      'settings-all',
    ],
    expert: [
      'all', // Everything unlocked
    ],
  };

  return features[level];
};

export default {
  MAIN_NAVIGATION,
  QUICK_ACTIONS,
  FEATURE_GATES,
  ONBOARDING_STEPS,
  SMART_DEFAULTS,
  CONTEXTUAL_HELP,
  getUserExperienceLevel,
  getVisibleFeatures,
};
