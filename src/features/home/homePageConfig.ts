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
      description: ar ? 'رحلات حية' : 'Live matches',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(93,150,210,0.26)',
      path: '/find-ride',
    },
    {
      icon: Car,
      badge: 'O',
      title: ar ? 'اعرض رحلتك' : 'Offer a Ride',
      description: ar ? 'شارك المقاعد' : 'Share seats',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(168,214,20,0.28)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      badge: 'P',
      title: ar ? 'أرسل طرداً مع رحلة' : 'Send Package with Ride',
      description: ar ? 'طرد مع راكب' : 'Send with a rider',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(168,214,20,0.28)',
      path: '/packages',
    },
    {
      icon: Bus,
      badge: 'B',
      title: ar ? 'احجز باص' : 'Book a Bus',
      description: ar ? 'رحلات بين المدن' : 'Intercity trips',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(107,181,21,0.24)',
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
