import { Bus, Clock, MapPin, Package, Search, User2, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { APP_ROUTES } from '../router/paths';

type NavItem = {
  icon: typeof Search;
  id: string;
  label: string;
  labelAr: string;
  path: string;
  protected?: boolean;
};

const navItems: NavItem[] = [
  { icon: Search, id: 'find', label: 'Find', labelAr: 'ابحث', path: APP_ROUTES.findRide.full },
  { icon: Bus, id: 'bus', label: 'Bus', labelAr: 'باص', path: APP_ROUTES.bus.full },
  { icon: Package, id: 'packages', label: 'Packages', labelAr: 'طرود', path: APP_ROUTES.packages.full },
  { icon: MapPin, id: 'mobility', label: 'Mobility', labelAr: 'الشبكة', path: APP_ROUTES.mobilityOs.full, protected: true },
  { icon: Clock, id: 'trips', label: 'Trips', labelAr: 'رحلاتي', path: APP_ROUTES.myTrips.full, protected: true },
  { icon: Wallet, id: 'wallet', label: 'Wallet', labelAr: 'محفظة', path: APP_ROUTES.wallet.full, protected: true },
  { icon: User2, id: 'profile', label: 'Profile', labelAr: 'حسابي', path: APP_ROUTES.profile.full, protected: true },
];

interface MobileBottomNavProps {
  language?: 'ar' | 'en';
}

function normalizePath(pathname: string) {
  if (pathname.startsWith('/app/')) {
    return pathname;
  }

  return pathname === '/' ? '/app/find-ride' : `/app${pathname}`;
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language: contextLanguage } = useLanguage();
  const { user } = useLocalAuth();
  const activeLanguage = language ?? contextLanguage;
  const pathname = normalizePath(location.pathname);
  const visibleItems = navItems.filter((item) => (item.protected ? Boolean(user) : true));

  return (
    <nav aria-label="Mobile navigation" className="ds-mobile-bottom-nav">
      {visibleItems.map((item) => {
        const active = pathname === item.path || pathname.startsWith(`${item.path}/`);

        return (
          <button
            className="ds-mobile-bottom-nav__item"
            data-active={active}
            key={item.id}
            onClick={() => navigate(item.path)}
            type="button"
          >
            <item.icon aria-hidden="true" className="ds-mobile-bottom-nav__icon" size={18} />
            <span>{activeLanguage === 'ar' ? item.labelAr : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
