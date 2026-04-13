/**
 * Wasel Mobile Bottom Navigation — v10 investor-ready polish
 */

import { Clock, Package, Search, User2, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';

const CYAN  = '#19E7BB';
const BLUE  = '#65E1FF';
const INACTIVE = 'rgba(160,188,196,0.52)';
const F = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

const ICONS = {
  find:     Search,
  trips:    Clock,
  packages: Package,
  wallet:   Wallet,
  profile:  User2,
} as const;

interface MobileBottomNavProps {
  language?: 'en' | 'ar';
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { language: contextLanguage } = useLanguage();
  const { user }  = useLocalAuth();
  const resolvedLanguage = language ?? contextLanguage;
  const isArabic = resolvedLanguage === 'ar';
  const navItems = CORE_NAV_ITEMS.filter((item) => !item.requiresAuth || Boolean(user));

  const isActive = (path: string) => {
    if (path === '/') {
      return (
        location.pathname === '/' ||
        location.pathname === '/app' ||
        location.pathname === '/app/'
      );
    }
    return (
      location.pathname.startsWith(path) ||
      location.pathname.startsWith('/app' + path)
    );
  };

  return (
    <>
      <style>{`
        .wasel-bottom-nav { display: none !important; }
        @media (max-width: 767px) {
          .wasel-bottom-nav { display: flex !important; }
          main.wasel-app-main { padding-bottom: 88px !important; }
        }
      `}</style>

      <nav
        className="wasel-bottom-nav"
        data-wasel-bottom-nav
        aria-label="Main navigation"
        dir={isArabic ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 600,
          background:
            'linear-gradient(180deg, rgba(9,15,26,0.98), rgba(5,9,18,0.99))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(25,231,187,0.12)',
          boxShadow:
            '0 -16px 48px rgba(0,0,0,0.40), 0 -1px 0 rgba(25,231,187,0.07)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {navItems.map((item) => {
          const active    = isActive(item.path);
          const Icon      = ICONS[item.id as keyof typeof ICONS];
          const itemColor = item.accent === 'gold' ? BLUE : CYAN;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.84 }}
              transition={{ duration: 0.08, type: 'spring', stiffness: 520, damping: 30 }}
              aria-label={isArabic ? item.labelAr : item.label}
              title={isArabic ? item.descriptionAr : item.description}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, minHeight: 58, minWidth: 44,
                padding: '8px 2px 6px',
                background: 'transparent', border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none', position: 'relative',
              }}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="nav-accent"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  style={{
                    position: 'absolute', top: 0,
                    left: '28%', right: '28%',
                    height: 2, borderRadius: '0 0 3px 3px',
                    background: itemColor,
                    boxShadow: `0 3px 14px ${itemColor}80`,
                  }}
                />
              )}

              {/* Icon wrapper with glow */}
              <div style={{
                position: 'relative', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {active && (
                  <span style={{
                    position: 'absolute', inset: -9,
                    borderRadius: 999, pointerEvents: 'none',
                    background: `radial-gradient(circle, ${itemColor}1e, transparent 70%)`,
                  }} />
                )}
                {Icon && (
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.4 : 1.7}
                    style={{
                      color: active ? itemColor : INACTIVE,
                      transition: 'color 0.16s ease, transform 0.16s ease',
                      transform: active ? 'scale(1.06)' : 'scale(1)',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? itemColor : INACTIVE,
                fontFamily: F,
                lineHeight: 1, whiteSpace: 'nowrap',
                transition: 'color 0.16s ease',
                letterSpacing: active ? '0.01em' : '0',
              }}>
                {isArabic ? item.labelAr : item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
