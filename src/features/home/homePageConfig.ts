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
      description: ar ? 'اكتشف المطابقات اليومية على المسارات الحيوية' : 'Live matches on daily corridors',
      color: C.cyan,
      dim: C.cyanDim,
      border: 'rgba(73,190,242,0.26)',
      path: '/find-ride',
    },
    {
      icon: Car,
      badge: 'O',
      title: ar ? 'اعرض رحلتك' : 'Offer a Ride',
      description: ar ? 'شارك المقاعد وخفف تكلفة الرحلة' : 'Share seats and lower your trip cost',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(199,255,26,0.28)',
      path: '/offer-ride',
    },
    {
      icon: Package,
      badge: 'P',
      title: ar ? 'أرسل طرداً مع رحلة' : 'Send Package with Ride',
      description: ar ? 'حرّك الطرود مع راكب موثوق على نفس المسار' : 'Move parcels with a trusted rider on the same route',
      color: C.gold,
      dim: C.goldDim,
      border: 'rgba(199,255,26,0.28)',
      path: '/packages',
    },
    {
      icon: Bus,
      badge: 'B',
      title: ar ? 'احجز باص' : 'Book a Bus',
      description: ar ? 'مغادرات بين المدن بجداول واضحة' : 'Fixed intercity departures with clear schedules',
      color: C.green,
      dim: C.greenDim,
      border: 'rgba(96,197,54,0.24)',
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
      label: ar ? 'إجمالي الرحلات' : 'Total Trips',
      value: liveStats?.totalTrips?.toString() ?? '...',
      color: C.cyan,
    },
    {
      icon: TrendingUp,
      label: ar ? 'إجمالي التوفير' : 'Total Savings',
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
      label: ar ? 'الطرود المسلّمة' : 'Pkgs Delivered',
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
      description: ar ? 'كل مستخدم يمر بإشارات ثقة قبل الحجز' : 'All users verified via Sanad',
      color: C.cyan,
    },
    {
      icon: Moon,
      title: ar ? 'مراعاة أوقات الصلاة' : 'Prayer Stops',
      description: ar ? 'خطط الرحلة بمحطات توقف مناسبة ثقافياً' : 'Plan trips around prayer times',
      color: C.gold,
    },
    {
      icon: TrendingUp,
      title: ar ? 'وفّر حتى 70%' : 'Save 70%',
      description: ar ? 'مقارنة بخيارات النقل الفردي التقليدية' : 'Vs traditional taxis',
      color: C.green,
    },
    {
      icon: Shield,
      title: ar ? 'آمن وموثوق' : 'Safe & Secure',
      description: ar ? 'زر طوارئ حقيقي ودعم مستمر وإشارات أمان واضحة' : 'Real SOS + 24/7 support + insurance',
      color: C.purple,
    },
  ];
}

export function buildTripModeOptions(ar: boolean): HomeTripModeOption[] {
  return [
    {
      key: 'one-way',
      title: ar ? 'ذهاب فقط' : 'One Way',
      description: ar ? 'رحلة باتجاه واحد' : 'One-way trip',
      accent: C.cyan,
      icon: ArrowRight,
      path: '/find-ride',
    },
    {
      key: 'round',
      title: ar ? 'ذهاب وعودة' : 'Round Trip',
      description: ar ? 'رحلة مكتملة الاتجاهين' : 'Round trip',
      accent: C.green,
      icon: Repeat,
      path: '/find-ride?mode=round',
    },
  ];
}
