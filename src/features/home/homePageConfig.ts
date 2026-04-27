import {
  ArrowRight,
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
      title: ar ? 'احجز رحلة' : 'Book a ride',
      description: ar ? 'الرحلات المتاحة' : 'Available rides',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(25,231,187,0.24)',
      path: '/find-ride',
    },
    {
      icon: Car,
      badge: 'O',
      title: ar ? 'اعرض رحلتك' : 'Offer a ride',
      description: ar ? 'شارك المقاعد' : 'Share seats',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(72,207,255,0.24)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      badge: 'P',
      title: ar ? 'أرسل طرداً' : 'Send a package',
      description: ar ? 'تسليم سريع' : 'Track delivery',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(162,255,231,0.24)',
      path: '/packages',
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
      title: ar ? 'مستخدمون موثّقون' : 'Verified users',
      description: ar ? 'تحقق قبل الحجز' : 'Verified before booking',
      color: C.cyan,
    },
    {
      icon: Moon,
      title: ar ? 'مواقف الصلاة' : 'Prayer stops',
      description: ar ? 'مواقيت واضحة' : 'Clear timing on the road',
      color: C.gold,
    },
    {
      icon: Shield,
      title: ar ? 'دعم واضح' : 'Clear support',
      description: ar ? 'مساعدة عندما تحتاجها' : 'Help when you need it',
      color: C.green,
    },
  ];
}

export function buildHeroHighlights(ar: boolean): HomeHeroHighlight[] {
  return [
    {
      title: ar ? 'احجز رحلة' : 'Book a ride',
      description: ar ? 'ابحث عن رحلات حيّة بين المدن.' : 'Find live rides for your route.',
      color: C.cyan,
    },
    {
      title: ar ? 'اعرض رحلتك' : 'Offer a ride',
      description: ar ? 'شارك المقاعد مع المسافرين.' : 'Share seats on your trip.',
      color: C.gold,
    },
    {
      title: ar ? 'أرسل طرداً' : 'Send a package',
      description: ar ? 'أرسل طردك عبر رحلة متاحة.' : 'Track package delivery on an active route.',
      color: C.green,
    },
  ];
}

export function buildServicePillars(ar: boolean): HomeServicePillar[] {
  return [
    {
      icon: Search,
      title: ar ? 'احجز رحلة' : 'Book a ride',
      description: ar ? 'اختر رحلة مناسبة لك.' : 'Choose a ride that fits your trip.',
      metric: ar ? 'رحلات متاحة' : 'Live ride matches',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(25,231,187,0.24)',
      path: '/find-ride',
    },
    {
      icon: Car,
      title: ar ? 'اعرض رحلتك' : 'Offer a ride',
      description: ar ? 'أضف المقاعد المتاحة للركاب.' : 'Share open seats on your route.',
      metric: ar ? 'أضف رحلة' : 'Post your trip',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(72,207,255,0.24)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      title: ar ? 'أرسل طرداً' : 'Send a package',
      description: ar ? 'رتّب الإرسال وتابع التسليم.' : 'Send and track a package.',
      metric: ar ? 'تتبع مباشر' : 'Delivery updates',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(162,255,231,0.24)',
      path: '/packages',
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
