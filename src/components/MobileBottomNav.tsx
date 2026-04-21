/**
 * MobileBottomNav — unified design system
 */

import { Clock, Package, Search, User2, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

const navItems = [
  { id: 'find', path: '/', label: 'Find', labelAr: 'ابحث', Icon: Search },
  { id: 'trips', path: '/app/my-trips', label: 'Trips', labelAr: 'رحلاتي', Icon: Clock },
  { id: 'packages', path: '/app/packages', label: 'Packages', labelAr: 'طرود', Icon: Package },
  { id: 'wallet', path: '/app/wallet', label: 'Wallet', labelAr: 'محفظة', Icon: Wallet },
  { id: 'profile', path: '/app/profile', label: 'Profile', labelAr: 'حسابي', Icon: User2 },
];

interface MobileBottomNavProps {
  language?: 'en' | 'ar';
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isArabic = language === 'ar';

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <style>{`
        .wasel-bottom-nav { display: none; }
        @media (max-width: 767px) {
          .wasel-bottom-nav { display: flex; }
        }
      `}</style>
      <nav
        className="wasel-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          padding: '8px 4px 24px',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        {navItems.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <item.Icon
                size={22}
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {isArabic ? item.labelAr : item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
