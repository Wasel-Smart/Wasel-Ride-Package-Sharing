import { Package, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../contexts/LanguageContext';
import { APP_ROUTES } from '../router/paths';

type NavItem = {
  icon: typeof Search;
  id: string;
  label: string;
  labelAr: string;
  path: string;
};

const navItems: NavItem[] = [
  { icon: Search, id: 'ride', label: 'Ride', labelAr: 'رحلة', path: APP_ROUTES.findRide.full },
  { icon: Package, id: 'package', label: 'Package', labelAr: 'طرد', path: APP_ROUTES.packages.full },
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
  const activeLanguage = language ?? contextLanguage;
  const pathname = normalizePath(location.pathname);

  return (
    <nav aria-label="Mobile navigation" className="ds-mobile-bottom-nav">
      {navItems.map((item) => {
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
