import { Home, Car, Plus, Package, Clock, Wallet } from 'lucide-react';
export const SUPER_APP_NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    labelAr: 'الرئيسية',
    path: '/app',
    accent: 'cyan',
    Icon: Home,
  },
  {
    id: 'ride',
    label: 'Ride',
    labelAr: 'رحلات',
    path: '/app/find-ride',
    accent: 'cyan',
    Icon: Car,
  },
  {
    id: 'offer',
    label: 'Drive',
    labelAr: 'قود',
    path: '/app/offer-ride',
    accent: 'gold',
    Icon: Plus,
  },
  {
    id: 'delivery',
    label: 'Delivery',
    labelAr: 'توصيل',
    path: '/app/packages',
    accent: 'gold',
    Icon: Package,
  },
  {
    id: 'activity',
    label: 'Activity',
    labelAr: 'نشاط',
    path: '/app/my-trips',
    accent: 'cyan',
    Icon: Clock,
  },
  {
    id: 'wallet',
    label: 'Wallet',
    labelAr: 'محفظة',
    path: '/app/wallet',
    accent: 'gold',
    Icon: Wallet,
  },
] as const;

export type SuperAppNavItem = (typeof SUPER_APP_NAV_ITEMS)[number];
