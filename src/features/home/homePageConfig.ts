import {
  ArrowRight,
  Bus,
  Car,
  CheckCircle,
  Moon,
  Package,
  Repeat,
  Search,
  Shield,
  Star,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { C } from './HomePageShared';

export interface HomeQuickAction {
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  color: string;
  dim: string;
  border: string;
  path: string;
}

export interface HomeStatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}

export interface HomeFeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

export interface HomeHeroHighlight {
  title: string;
  description: string;
  color: string;
}

export interface HomeServicePillar {
  icon: LucideIcon;
  title: string;
  description: string;
  metric: string;
  color: string;
  dim: string;
  border: string;
  path: string;
}

export interface HomeTripModeOption {
  key: 'one-way' | 'round';
  title: string;
  description: string;
  accent: string;
  icon: LucideIcon;
  path: string;
}

export function buildQuickActions(ar: boolean): HomeQuickAction[] {
  return [
    {
      icon: Search,
      badge: 'R',
      title: ar ? 'ابحث عن رحلة' : 'Find a Ride',
      description: ar ? 'رحلات حية' : 'Matches',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(25,231,187,0.24)',
      path: '/find-ride',
    },
    {
      icon: Car,
      badge: 'O',
      title: ar ? 'اعرض رحلتك' : 'Offer a Ride',
      description: ar ? 'شارك المقاعد' : 'Seats',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(72,207,255,0.24)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      badge: 'P',
      title: ar ? 'أرسل طرداً مع رحلة' : 'Packages',
      description: ar ? 'طرد مع راكب' : 'Delivery',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(72,207,255,0.24)',
      path: '/packages',
    },
    {
      icon: Bus,
      badge: 'B',
      title: ar ? 'احجز باص' : 'Bus',
      description: ar ? 'رحلات بين المدن' : 'Intercity',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(162,255,231,0.24)',
      path: '/bus',
    },
  ];
}

export function buildStatsData(
  ar: boolean,
  liveStats: {
    totalTrips?: number | null;
    totalSaved?: number | null;
    rating?: number | null;
    pkgsDelivered?: number | null;
  } | null | undefined,
  formatFromJOD: (value: number) => string,
): HomeStatItem[] {
  return [
    {
      icon: Car,
      label: ar ? 'الرحلات' : 'Trips',
      value: liveStats?.totalTrips?.toString() ?? '...',
      color: C.cyan,
    },
    {
      icon: TrendingUp,
      label: ar ? 'التوفير' : 'Saved',
      value: liveStats ? formatFromJOD(liveStats.totalSaved ?? 0) : '...',
      color: C.green,
    },
    {
      icon: Star,
      label: ar ? 'التقييم' : 'Rating',
      value:
        liveStats?.rating !== null && liveStats?.rating !== undefined
          ? String(liveStats.rating)
          : '...',
      color: C.gold,
    },
    {
      icon: Package,
      label: ar ? 'الطرود' : 'Packages',
      value: liveStats?.pkgsDelivered?.toString() ?? '...',
      color: C.purple,
    },
  ];
}

export function buildFeatureItems(ar: boolean): HomeFeatureItem[] {
  return [
    {
      icon: CheckCircle,
      title: ar ? 'مستخدمون موثقون' : 'Verified Users',
      description: ar ? 'تحقق قبل الحجز' : 'Verified before booking',
      color: C.cyan,
    },
    {
      icon: Moon,
      title: ar ? 'مراعاة أوقات الصلاة' : 'Prayer Stops',
      description: ar ? 'مواقيت واضحة' : 'Clear prayer timing',
      color: C.gold,
    },
    {
      icon: TrendingUp,
      title: ar ? 'وفّر حتى 70%' : 'Save 70%',
      description: ar ? 'أقل من التاكسي' : 'Lower than taxis',
      color: C.green,
    },
    {
      icon: Shield,
      title: ar ? 'آمن وموثوق' : 'Safe & Secure',
      description: ar ? 'SOS ودعم' : 'SOS and support',
      color: C.purple,
    },
  ];
}

export function buildHeroHighlights(ar: boolean): HomeHeroHighlight[] {
  return [
    {
      title: ar ? 'رحلات ومشاوير' : 'Shared rides',
      description: ar ? 'مطابقة حيّة بين المدن والداخلية.' : 'Live matching for city and corridor trips.',
      color: C.cyan,
    },
    {
      title: ar ? 'طرود مع الرحلة' : 'Packages on the move',
      description: ar ? 'تسليم أسرع عبر المسارات القائمة.' : 'Faster delivery through existing routes.',
      color: C.gold,
    },
    {
      title: ar ? 'ثقة وتشغيل' : 'Trust and operations',
      description: ar ? 'دعم، تتبع، ومؤشرات تشغيل في مكان واحد.' : 'Support, tracking, and live operations in one place.',
      color: C.green,
    },
  ];
}

export function buildServicePillars(ar: boolean): HomeServicePillar[] {
  return [
    {
      icon: Search,
      title: ar ? 'ابحث واحجز' : 'Find and book',
      description: ar ? 'رحلات سريعة داخل المدن وبينها.' : 'Fast bookings across city and corridor routes.',
      metric: ar ? 'رحلات حيّة' : 'Live ride supply',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(25,231,187,0.24)',
      path: '/find-ride',
    },
    {
      icon: Package,
      title: ar ? 'أرسل طرداً' : 'Send packages',
      description: ar ? 'اربط الطرود مع رحلات موثوقة.' : 'Attach package delivery to verified trips.',
      metric: ar ? 'تسليم مرن' : 'Flexible delivery',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(72,207,255,0.24)',
      path: '/packages',
    },
    {
      icon: Bus,
      title: ar ? 'خطوط مجدولة' : 'Scheduled mobility',
      description: ar ? 'باصات ومسارات متكررة للحركة اليومية.' : 'Buses and recurring corridors for daily movement.',
      metric: ar ? 'تغطية وطنية' : 'National coverage',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(162,255,231,0.24)',
      path: '/bus',
    },
  ];
}

export function buildTripModeOptions(ar: boolean): HomeTripModeOption[] {
  return [
    {
      key: 'one-way',
      title: ar ? 'ذهاب فقط' : 'One Way',
      description: ar ? 'اتجاه واحد' : 'One way',
      accent: C.cyan,
      icon: ArrowRight,
      path: '/find-ride',
    },
    {
      key: 'round',
      title: ar ? 'ذهاب وعودة' : 'Round Trip',
      description: ar ? 'ذهاب وعودة' : 'Round trip',
      accent: C.green,
      icon: Repeat,
      path: '/find-ride?mode=round',
    },
  ];
}
