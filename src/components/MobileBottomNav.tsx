/**
 * Mobile Bottom Navigation
 * Shared with the app's core navigation model for consistent UX.
 */

import { Car, Clock, Home, Package, Plus, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { SUPER_APP_NAV_ITEMS } from '../config/super-app-nav';
import { useLanguage } from '../contexts/LanguageContext';
import { C, F, GRAD } from '../utils/wasel-ds';

const BG = 'rgba(6,19,31,0.96)';
const INACTIVE = C.textDim;
const BORDER = C.border;

const ICONS = {
  home: Home,
  ride: Car,
  offer: Plus,
  delivery: Package,
  activity: Clock,
  wallet: Wallet,
} as const;

export function MobileBottomNav({ language }: { language?: 'en' | 'ar' }) {
  const { language: activeLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedLanguage = language ?? activeLanguage;
  const isArabic = resolvedLanguage === 'ar';

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app' || location.pathname === '/app/';
    if (path === '/app/my-trips') return location.pathname.startsWith('/app/my-trips');
    if (path === '/app/wallet') return location.pathname.startsWith('/app/wallet');
    if (path === '/app/find-ride') return location.pathname.startsWith('/app/find-ride');
    if (path === '/app/offer-ride') return location.pathname.startsWith('/app/offer-ride');
    if (path === '/app/packages') return location.pathname.startsWith('/app/packages');
    return false;
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
        {SUPER_APP_NAV_ITEMS.map(item => {
          const active = isActive(item.path);
          const accent = item.accent === 'gold' ? C.gold : C.cyan;
          const isOffer = item.id === 'offer';

          const IconComponent = ICONS[item.id];

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
              {active && !isOffer && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: accent,
                    boxShadow: `0 2px 8px ${accent}80`,
                  }}
                />
              )}

              {isOffer ? (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: active ? GRAD : 'linear-gradient(135deg,rgba(88,221,255,0.2),rgba(71,214,158,0.16))',
                    border: `1.5px solid ${active ? C.cyan : 'rgba(88,221,255,0.34)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: active ? '0 10px 24px rgba(88,221,255,0.28)' : '0 4px 14px rgba(88,221,255,0.14)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {IconComponent && <IconComponent size={22} strokeWidth={active ? 2.5 : 2} color={active ? '#111316' : C.cyan} />}
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
                  {IconComponent && (
                    <IconComponent
                      size={22}
                      strokeWidth={active ? 2.5 : 1.8}
                      style={{
                        color: active ? accent : INACTIVE,
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
                  color: active ? accent : INACTIVE,
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
