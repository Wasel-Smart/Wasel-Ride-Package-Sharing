/**
 * Mobile Bottom Navigation
 * Shared with the app's core navigation model for consistent UX.
 */

import { Clock, Package, Search, User2, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';

const BG = 'linear-gradient(180deg, rgba(12,20,30,0.98), rgba(8,14,22,0.98))';
const CYAN = '#F4C651';
const GOLD = '#FFF0C1';
const INACTIVE = 'rgba(228,214,180,0.56)';
const BORDER = 'rgba(244,198,81,0.16)';
const F = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

const ICONS = {
  find: Search,
  trips: Clock,
  packages: Package,
  wallet: Wallet,
  profile: User2,
} as const;

interface MobileBottomNavProps {
  language?: 'en' | 'ar';
}

export function MobileBottomNav({ language }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language: contextLanguage } = useLanguage();
  const { user } = useLocalAuth();
  const resolvedLanguage = language ?? contextLanguage;
  const isArabic = resolvedLanguage === 'ar';
  const navItems = CORE_NAV_ITEMS.filter((item) => !item.requiresAuth || Boolean(user));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/app' || location.pathname === '/app/';
    return location.pathname.startsWith(path) || location.pathname.startsWith('/app' + path);
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
        aria-label="Main navigation"
        dir={isArabic ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 600,
          background: BG,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: `1px solid ${BORDER}`,
          boxShadow: '0 -14px 40px rgba(1,10,18,0.38), 0 -1px 0 rgba(244,198,81,0.08)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = ICONS[item.id as keyof typeof ICONS];
          const itemColor = item.accent === 'gold' ? GOLD : CYAN;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.86 }}
              transition={{ duration: 0.09, type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={isArabic ? item.labelAr : item.label}
              title={isArabic ? item.descriptionAr : item.description}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                minHeight: 58,
                minWidth: 44,
                padding: '8px 2px 6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                position: 'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="nav-accent"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: itemColor,
                     boxShadow: `0 3px 12px ${itemColor}80`,
                  }}
                />
              )}

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: 999,
                        background:
                          item.accent === 'gold'
                            ? 'radial-gradient(circle, rgba(255,240,193,0.2), rgba(255,240,193,0))'
                            : 'radial-gradient(circle, rgba(244,198,81,0.22), rgba(244,198,81,0))',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {Icon && (
                    <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    style={{
                      color: active ? itemColor : INACTIVE,
                      transition: 'color 0.18s ease, transform 0.18s ease',
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />
                )}
              </div>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? itemColor : INACTIVE,
                  fontFamily: F,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  transition: 'color 0.18s ease',
                  letterSpacing: active ? '0.01em' : '0',
                }}
              >
                {isArabic ? item.labelAr : item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
