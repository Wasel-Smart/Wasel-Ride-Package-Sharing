/**
 * Mobile Bottom Navigation
 * Shared with the app's core navigation model for consistent UX.
 */

import { Bus, Clock, Network, Package, PlusCircle, Search } from 'lucide-react';
import { useLocation } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate, type SafeNavigate } from '../hooks/useIframeSafeNavigate';
import { C,  F, GRAD_GOLD, TYPE, Z  } from '../utils/wasel-ds';

const BG = 'rgba(8,29,57,0.96)';
const CYAN = C.cyan;
const GOLD = C.gold;
const INACTIVE = C.textDim;
const BORDER = C.border;

const ICONS = {
  find: Search,
  post: PlusCircle,
  packages: Package,
  'mobility-os': Network,
  trips: Clock,
  bus: Bus,
} as const;

interface MobileBottomNavProps {
  language?: 'en' | 'ar';
}

function NavItem({ item, isActive, isArabic, navigate }: {
  item: typeof CORE_NAV_ITEMS[number];
  isActive: boolean;
  isArabic: boolean;
  // MUST be the /app-normalising navigate, not react-router's raw one: the nav
  // config stores legacy bare paths ('/bus', '/find-ride') that only resolve
  // once mapped into the mounted '/app/...' namespace. Raw navigate() sent every
  // tap to a route that does not exist, so the user landed on the 404 screen.
  navigate: SafeNavigate;
}) {
  const Icon = ICONS[item.id as keyof typeof ICONS];
  const isPost = item.id === 'post';
  const itemColor = item.accent === 'gold' ? GOLD : CYAN;

  return (
    <button
      type="button"
      onClick={() => { void navigate(item.path); }}
      aria-label={isArabic ? item.labelAr : item.label}
      aria-current={isActive ? 'page' : undefined}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        minHeight: 56,
        minWidth: 44,
        padding: '8px 4px 6px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      {isActive && !isPost && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 2,
            borderRadius: '0 0 3px 3px',
            background: `linear-gradient(90deg, transparent, ${itemColor}, transparent)`,
            boxShadow: `0 2px 10px ${itemColor}90`,
          }}
        />
      )}

      {isPost ? (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: isActive
              ? GRAD_GOLD
              : 'linear-gradient(135deg,rgba(255,190,92,0.2),rgba(255,147,106,0.16))',
            border: `1.5px solid ${isActive ? GOLD : 'rgba(255,190,92,0.34)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isActive
              ? '0 10px 24px rgba(255,190,92,0.28)'
              : '0 4px 14px rgba(255,190,92,0.14)',
            transition: 'all 0.2s ease',
          }}
        >
          <Icon
            size={22}
            strokeWidth={isActive ? 2.5 : 2}
            color={isActive ? C.bgDeep : GOLD}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {Icon && (
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{
                color: isActive ? itemColor : INACTIVE,
                transition: 'color 0.18s ease',
              }}
            />
          )}
        </div>
      )}

      <span
        style={{
          fontSize: TYPE.size.xs,
          fontWeight: isActive ? TYPE.weight.bold : TYPE.weight.medium,
          color: isActive ? (isPost ? GOLD : itemColor) : INACTIVE,
          fontFamily: F,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'color 0.18s ease',
          letterSpacing: isActive ? '0.01em' : '0',
        }}
      >
        {isArabic ? item.labelAr : item.id === 'mobility-os' ? 'Network' : item.label}
      </span>
    </button>
  );
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const { language: activeLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useIframeSafeNavigate();
  const resolvedLanguage = language ?? activeLanguage;
  const isArabic = resolvedLanguage === 'ar';

  const isActive = (path: string) => {
    if (path === '/')
      {return (
        location.pathname === '/' || location.pathname === '/app' || location.pathname === '/app/'
      );}
    return location.pathname.startsWith(path) || location.pathname.startsWith('/app' + path);
  };

  return (
    <>
      <style>{`
        .wasel-bottom-nav { display: flex; }
        @media (min-width: 900px) {
          .wasel-bottom-nav { display: none !important; }
        }
      `}</style>

      <nav
        className="wasel-bottom-nav"
        aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: Z.sticky,
          background: BG,
          borderTop: `1px solid ${BORDER}`,
          boxShadow: '0 -12px 36px rgba(8,29,57,0.5), 0 -1px 0 rgba(0,229,255,0.1)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {CORE_NAV_ITEMS.map(item => (
          <NavItem key={item.id} item={item} isActive={isActive(item.path)} isArabic={isArabic} navigate={navigate} />
        ))}
      </nav>
    </>
  );
}

