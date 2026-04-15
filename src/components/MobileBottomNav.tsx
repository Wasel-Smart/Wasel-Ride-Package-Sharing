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
const INACTIVE = 'var(--text-muted)';
const INACTIVE_BG = 'transparent';
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
        aria-label={isArabic ? 'التنقل السفلي' : 'Bottom navigation'}
        dir={isArabic ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 600,
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid var(--border)',
          boxShadow: 'var(--wasel-shadow-lg)',
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
              whileTap={{ scale: 0.82 }}
              transition={{ duration: 0.08, type: 'spring', stiffness: 520, damping: 30 }}
              aria-label={isArabic ? item.labelAr : item.label}
              title={isArabic ? item.descriptionAr : item.description}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, minHeight: 58, minWidth: 44,
                padding: '8px 2px 6px',
                background: active
                  ? `radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in srgb, ${itemColor} 14%, transparent), transparent)`
                  : INACTIVE_BG,
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none', position: 'relative',
                transition: 'background 0.22s ease',
              }}
            >
              {/* Active indicator bar */}
              {active && (
                <motion.div
                  layoutId="nav-accent"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  style={{
                    position: 'absolute', top: 0,
                    left: '20%', right: '20%',
                    height: 3, borderRadius: '0 0 4px 4px',
                    background: `linear-gradient(90deg, ${itemColor}, color-mix(in srgb, ${itemColor} 70%, white))`,
                    boxShadow: `0 2px 10px ${itemColor}90`,
                  }}
                />
              )}

              {/* Icon wrapper with glow */}
              <div style={{
                position: 'relative', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36,
                borderRadius: 12,
                background: active ? `color-mix(in srgb, ${itemColor} 14%, transparent)` : 'transparent',
                transition: 'background 0.2s ease',
              }}>
                {active && (
                  <span style={{
                    position: 'absolute', inset: -8,
                    borderRadius: 999, pointerEvents: 'none',
                    background: `radial-gradient(circle, ${itemColor}28, transparent 68%)`,
                  }} />
                )}
                {Icon && (
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{
                      color: active ? itemColor : INACTIVE,
                      transition: 'color 0.16s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 11,
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
