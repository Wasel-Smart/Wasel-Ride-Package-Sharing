/**
 * Mobile Bottom Navigation
 * Shared with the app's core navigation model for consistent UX.
 */

import { Bus, Clock, Package, PlusCircle, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { C, F, GRAD_GOLD } from '../utils/wasel-ds';

const BG = 'rgba(6,19,31,0.96)';
const CYAN = C.cyan;
const GOLD = C.gold;
const INACTIVE = C.textDim;
const BORDER = C.border;

const ICONS = {
  find: Search,
  post: PlusCircle,
  packages: Package,
  trips: Clock,
  bus: Bus,
} as const;

interface MobileBottomNavProps {
  language?: 'en' | 'ar';
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const { language: activeLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedLanguage = language ?? activeLanguage;
  const isArabic = resolvedLanguage === 'ar';

  const isActive = (path: string) => {
    if (path === '/app' || path === '/')
      return (
        location.pathname === '/'
        || location.pathname === '/app'
        || location.pathname === '/app/'
      );
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <style>{`
        .wasel-bottom-nav { display: none !important; }
        @media (max-width: 899px) {
          .wasel-bottom-nav { display: flex !important; }
          .wasel-main-content { padding-bottom: 80px !important; }
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
          zIndex: 600,
          background: BG,
          borderTop: `1px solid ${BORDER}`,
          boxShadow: '0 -12px 36px rgba(0,0,0,0.42), 0 -1px 0 rgba(88,221,255,0.08)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        {CORE_NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const Icon = ICONS[item.id as keyof typeof ICONS];
          const isPost = item.id === 'post';
          const itemColor = item.accent === 'gold' ? GOLD : CYAN;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={isArabic ? item.labelAr : item.label}
              aria-current={active ? 'page' : undefined}
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
                outline: 'none',
                position: 'relative',
                transform: active ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.15s ease',
              }}
            >
              {active && !isPost && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: itemColor,
                    boxShadow: `0 2px 8px ${itemColor}80`,
                  }}
                />
              )}

              {isPost ? (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: active
                      ? GRAD_GOLD
                      : 'linear-gradient(135deg,rgba(255,190,92,0.2),rgba(255,147,106,0.16))',
                    border: `1.5px solid ${active ? GOLD : 'rgba(255,190,92,0.34)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: active
                      ? '0 10px 24px rgba(255,190,92,0.28)'
                      : '0 4px 14px rgba(255,190,92,0.14)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.5 : 2}
                    color={active ? '#111316' : GOLD}
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
                      strokeWidth={active ? 2.5 : 1.8}
                      style={{
                        color: active ? itemColor : INACTIVE,
                        transition: 'color 0.18s ease',
                      }}
                    />
                  )}
                </div>
              )}

              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? (isPost ? GOLD : itemColor) : INACTIVE,
                  fontFamily: F,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.18s ease',
                  letterSpacing: active ? '0.01em' : '0',
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
