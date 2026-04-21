import { Bus, Clock, MapPin, Package, Search, User2, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';

type NavItem = {
  icon: typeof Search;
  id: string;
  label: string;
  labelAr: string;
  path: string;
  protected?: boolean;
};

const navItems: NavItem[] = [
  { icon: Search, id: 'find', label: 'Find', labelAr: 'ابحث', path: '/app/find-ride' },
  { icon: Bus, id: 'bus', label: 'Bus', labelAr: 'باص', path: '/app/bus' },
  { icon: Package, id: 'packages', label: 'Packages', labelAr: 'طرود', path: '/app/packages' },
  { icon: MapPin, id: 'mobility', label: 'Mobility', labelAr: 'الشبكة', path: '/app/mobility-os', protected: true },
  { icon: Clock, id: 'trips', label: 'Trips', labelAr: 'رحلاتي', path: '/app/my-trips', protected: true },
  { icon: Wallet, id: 'wallet', label: 'Wallet', labelAr: 'محفظة', path: '/app/wallet', protected: true },
  { icon: User2, id: 'profile', label: 'Profile', labelAr: 'حسابي', path: '/app/profile', protected: true },
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
