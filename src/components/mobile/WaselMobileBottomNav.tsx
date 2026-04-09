/**
 * WaselMobileBottomNav — Enhanced mobile bottom navigation
 *
 * Upgrades over the original MobileBottomNav:
 * - Badge system (unread count, new-feature dot, live-trip indicator)
 * - Floating center FAB for primary CTA (Book / Offer ride)
 * - Haptic feedback on tap
 * - Animated icon scale on active
 * - Safe-area aware (notch + gesture-bar phones)
 * - RTL direction aware
 * - Accessibility: aria-current, aria-label with count
 *
 * Drop-in replacement for MobileBottomNav — same props signature.
 */

import { useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Clock,
  Package,
  Wallet,
  User2,
  Plus,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useNotifications } from '../../hooks/useNotifications';

const BG       = 'rgba(5,17,30,0.97)';
const CYAN     = '#47B7E6';
const GOLD     = '#A8D614';
const INACTIVE = 'rgba(142,178,210,0.50)';
const BORDER   = 'rgba(71,183,230,0.13)';
const F        = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";

/* ─── Haptic ──────────────────────────────────────────────────────────────── */
function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* noop */ }
}

/* ─── Badge dot ───────────────────────────────────────────────────────────── */
function BadgeDot({ count, color = '#FF646A' }: { count?: number; color?: string }) {
  if (!count && count !== 0) return null;
  if (count === 0) return null;
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 2,
        right: '18%',
        minWidth: count > 9 ? 16 : 8,
        height: count > 9 ? 16 : 8,
        padding: count > 9 ? '0 3px' : 0,
        borderRadius: 999,
        background: color,
        border: '1.5px solid rgba(5,17,30,0.97)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 800,
        color: '#fff',
        fontFamily: F,
      }}
    >
      {count > 9 ? '9+' : count > 0 ? null : null}
    </div>
  );
}

/* ─── Live trip pulse ─────────────────────────────────────────────────────── */
function LivePulse() {
  return (
    <div style={{ position: 'absolute', top: 2, right: '18%' }}>
      <motion.div
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        style={{
          width: 8, height: 8, borderRadius: 4,
          background: GOLD,
          border: '1.5px solid rgba(5,17,30,0.97)',
        }}
      />
    </div>
  );
}

/* ─── Nav item config ─────────────────────────────────────────────────────── */
interface NavItem {
  id: string;
  path: string;
  icon: React.ElementType;
  label: string;
  labelAr: string;
  accent: 'cyan' | 'gold';
  /** badge type */
  badge?: 'notifications' | 'live' | null;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'find',     path: '/app/find-ride',  icon: Search,  label: 'Rides',    labelAr: 'الرحلات',  accent: 'cyan' },
  { id: 'trips',    path: '/app/trips',      icon: Clock,   label: 'History',  labelAr: 'رحلاتي',   accent: 'cyan', badge: 'live' },
  { id: 'packages', path: '/app/packages',   icon: Package, label: 'Packages', labelAr: 'الطرود',   accent: 'gold' },
  { id: 'wallet',   path: '/app/wallet',     icon: Wallet,  label: 'Wallet',   labelAr: 'المحفظة',  accent: 'gold' },
  { id: 'profile',  path: '/app/profile',    icon: User2,   label: 'Profile',  labelAr: 'حسابي',    accent: 'cyan', badge: 'notifications' },
];

interface WaselMobileBottomNavProps {
  language?: 'en' | 'ar';
  /** Show floating FAB for offer-ride; defaults to true */
  showFAB?: boolean;
}

export function WaselMobileBottomNav({ language: langProp, showFAB = true }: WaselMobileBottomNavProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { language: ctxLang } = useLanguage();
  const { user }  = useLocalAuth();
  const { unreadCount } = useNotifications();
  const lang = langProp ?? ctxLang;
  const isAr = lang === 'ar';

  const isActive = useCallback((path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path) || location.pathname.startsWith('/app' + path.replace('/app', ''));
  }, [location.pathname]);

  const go = useCallback((path: string) => {
    haptic(12);
    navigate(path);
  }, [navigate]);

  const goOffer = useCallback(() => {
    haptic([20, 10, 20]);
    navigate('/app/offer-ride');
  }, [navigate]);

  if (!user) return null; // Only show when authenticated

  return (
    <>
      <style>{`
        .wmbn-root { display: none !important; }
        @media (max-width: 899px) {
          .wmbn-root  { display: flex !important; }
          .wmbn-content { padding-bottom: 80px !important; }
        }
      `}</style>

      {/* ── Floating Action Button (Offer Ride) ─────────────────────── */}
      {showFAB && (
        <motion.button
          type="button"
          onClick={goOffer}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="wmbn-root"
          aria-label={isAr ? 'اعرض رحلة' : 'Offer a ride'}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 8px) + 68px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 601,
            width: 52,
            height: 52,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${CYAN}, #1597FF)`,
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: `0 8px 28px rgba(71,183,230,0.5), 0 2px 8px rgba(0,0,0,0.4)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Plus size={22} color="#032033" strokeWidth={2.8} />
        </motion.button>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <nav
        className="wmbn-root"
        dir={isAr ? 'rtl' : 'ltr'}
        aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 600,
          background: BG,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: `1px solid ${BORDER}`,
          boxShadow: '0 -12px 40px rgba(0,8,20,0.36), 0 -1px 0 rgba(93,150,210,0.07)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon   = item.icon;
          const accent = item.accent === 'gold' ? GOLD : CYAN;
          const showNotifBadge = item.badge === 'notifications' && unreadCount > 0;
          const isMidItem = item.id === 'packages'; // center slot — leaves space for FAB

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => go(item.path)}
              whileTap={{ scale: 0.84 }}
              transition={{ duration: 0.08, type: 'spring', stiffness: 600, damping: 28 }}
              aria-current={active ? 'page' : undefined}
              aria-label={`${isAr ? item.labelAr : item.label}${showNotifBadge ? ` — ${unreadCount} ${isAr ? 'إشعارات' : 'notifications'}` : ''}`}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                minHeight: 58,
                minWidth: 44,
                padding: isMidItem ? '8px 2px 20px' : '8px 2px 6px', // extra bottom padding in center for FAB
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                position: 'relative',
              }}
            >
              {/* Active top indicator */}
              {active && (
                <motion.div
                  layoutId="wmbn-accent"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '22%', right: '22%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: accent,
                    boxShadow: `0 3px 10px ${accent}80`,
                  }}
                />
              )}

              {/* Icon wrapper */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Active glow */}
                {active && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: -10,
                      borderRadius: 999,
                      background: item.accent === 'gold'
                        ? 'radial-gradient(circle, rgba(168,214,20,0.22), transparent)'
                        : 'radial-gradient(circle, rgba(71,183,230,0.24), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                <motion.div
                  animate={{ scale: active ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.4 : 1.7}
                    color={active ? accent : INACTIVE}
                  />
                </motion.div>

                {/* Notification badge */}
                {showNotifBadge && <BadgeDot count={unreadCount} />}
                {/* Live trip pulse */}
                {item.badge === 'live' && active && <LivePulse />}
              </div>

              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: active ? 700 : 500,
                  color: active ? accent : INACTIVE,
                  fontFamily: F,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  letterSpacing: active ? '0.01em' : '0',
                  transition: 'color 0.15s',
                }}
              >
                {isAr ? item.labelAr : item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
}

export default WaselMobileBottomNav;
