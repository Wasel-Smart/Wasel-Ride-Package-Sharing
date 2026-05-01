/**
 * Mobile Bottom Navigation
 * Shared with the app's core navigation model for consistent UX.
 */

import { Bus, Clock, Search, PlusCircle, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router';
import { CORE_NAV_ITEMS } from '../config/user-navigation';

const BG = 'rgba(17,19,22,0.97)';
const CYAN = '#F4EFE8';
const GOLD = '#B88A52';
const INACTIVE = 'rgba(223,215,205,0.48)';
const BORDER = 'rgba(244,239,232,0.10)';
const F = "'Plus Jakarta Sans','Inter','Cairo',sans-serif";

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

export function MobileBottomNav({ language = 'en' }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isArabic = language === 'ar';

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
          boxShadow: '0 -8px 32px rgba(0,0,0,0.56), 0 -1px 0 rgba(244,239,232,0.06)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {CORE_NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = ICONS[item.id as keyof typeof ICONS];
          const isPost = item.id === 'post';
          const itemColor = item.accent === 'gold' ? GOLD : CYAN;

          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.86 }}
              transition={{ duration: 0.09, type: 'spring', stiffness: 500, damping: 30 }}
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
              }}
            >
              {active && !isPost && (
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
                      ? `linear-gradient(135deg,${GOLD},#8D6842)`
                      : 'linear-gradient(135deg,rgba(184,138,82,0.24),rgba(141,104,66,0.18))',
                    border: `1.5px solid ${active ? GOLD : 'rgba(184,138,82,0.35)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: active
                      ? '0 4px 20px rgba(184,138,82,0.42)'
                      : '0 2px 12px rgba(184,138,82,0.16)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} color={active ? '#111316' : GOLD} />
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Icon && (
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.5 : 1.8}
                      style={{
                        color: active ? itemColor : INACTIVE,
                        transition: 'color 0.18s ease, transform 0.18s ease',
                        transform: active ? 'scale(1.05)' : 'scale(1)',
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
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}
