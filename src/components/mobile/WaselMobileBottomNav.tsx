import { useCallback } from 'react';
import { motion } from 'motion/react';
import { Package, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { APP_ROUTES } from '../../router/paths';

const BG = 'var(--surface-glass)';
const CYAN = '#47B7E6';
const GOLD = '#A8D614';
const INACTIVE = 'var(--text-muted)';
const BORDER = 'var(--border)';
const F = "'Plus Jakarta Sans','Cairo','Tajawal',sans-serif";

type NavItem = {
  accent: 'cyan' | 'gold';
  icon: typeof Search;
  id: string;
  label: string;
  labelAr: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    accent: 'cyan',
    icon: Search,
    id: 'ride',
    label: 'Ride',
    labelAr: 'رحلة',
    path: APP_ROUTES.findRide.full,
  },
  {
    accent: 'gold',
    icon: Package,
    id: 'package',
    label: 'Package',
    labelAr: 'طرد',
    path: APP_ROUTES.packages.full,
  },
];

interface WaselMobileBottomNavProps {
  language?: 'en' | 'ar';
  showFAB?: boolean;
}

export function WaselMobileBottomNav({ language: langProp }: WaselMobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language: ctxLang } = useLanguage();
  const { user } = useLocalAuth();
  const lang = langProp ?? ctxLang;
  const isAr = lang === 'ar';

  const isActive = useCallback(
    (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname],
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <style>{`
        .wmbn-root { display: none !important; }
        @media (max-width: 899px) {
          .wmbn-root { display: flex !important; }
          .wmbn-content { padding-bottom: 80px !important; }
        }
      `}</style>

      <nav
        className="wmbn-root"
        dir={isAr ? 'rtl' : 'ltr'}
        aria-label={isAr ? 'التنقل الرئيسي' : 'Main navigation'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 600,
          background: BG,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: `1px solid ${BORDER}`,
          boxShadow: 'var(--wasel-shadow-lg)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'stretch',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const accent = item.accent === 'gold' ? GOLD : CYAN;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.08, type: 'spring', stiffness: 600, damping: 28 }}
              aria-current={active ? 'page' : undefined}
              aria-label={isAr ? item.labelAr : item.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
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
              {active ? (
                <motion.div
                  layoutId="wmbn-accent"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '22%',
                    right: '22%',
                    height: 2,
                    borderRadius: '0 0 2px 2px',
                    background: accent,
                    boxShadow: `0 3px 10px ${accent}80`,
                  }}
                />
              ) : null}

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
