import { Outlet } from 'react-router';
import { Bus, Clock, Globe, MapPin, Moon, Package, Search, Settings, Sun } from 'lucide-react';
import { Button, LayoutContainer } from '../design-system/components';
import { AppHeader } from '../components/brand';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { APP_ROUTES } from '../router/paths';
import { buildAuthPagePath } from '../utils/authFlow';

const primaryNav = [
  { icon: <Search size={16} />, label: 'Find ride', path: APP_ROUTES.findRide.full },
  { icon: <Bus size={16} />, label: 'Bus services', path: APP_ROUTES.bus.full },
  { icon: <Package size={16} />, label: 'Packages', path: APP_ROUTES.packages.full },
  { icon: <MapPin size={16} />, label: 'Mobility OS', path: APP_ROUTES.mobilityOs.full },
  { icon: <Clock size={16} />, label: 'Trips', path: APP_ROUTES.myTrips.full },
  { icon: <Settings size={16} />, label: 'Settings', path: APP_ROUTES.settings.full },
] as const;

export default function WaselRoot() {
  const navigate = useIframeSafeNavigate();
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useLocalAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <div className="ds-app">
      <a className="ds-skip-link" href="#main-content">
        Skip to content
      </a>
      <AppHeader
        brandSize="lg"
        items={primaryNav}
        onBrandClick={() => navigate('/')}
        showMobileNav
        subtitle="LIVE MOBILITY NETWORK"
        surface={resolvedTheme === 'dark' ? 'dark' : 'light'}
        actions={
          <>
            <Button onClick={toggleTheme} variant="ghost">
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </Button>
            <Button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              variant="ghost"
            >
              <Globe size={16} />
              {language === 'ar' ? 'EN' : 'AR'}
            </Button>
            {user ? (
              <Button
                onClick={() => {
                  void signOut();
                  navigate('/');
                }}
                variant="secondary"
              >
                {user.name}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  navigate(buildAuthPagePath('signin', APP_ROUTES.findRide.full))
                }
              >
                Sign in
              </Button>
            )}
          </>
        }
      />

      <main className="ds-main" id="main-content" role="main">
        <Outlet />
      </main>

      <LayoutContainer width="wide">
        <footer className="ds-shell-footer">
          <p className="ds-footer-note">Wasel stays visible inside the corridor.</p>
          <div className="ds-shell-header__actions">
            <Button onClick={() => navigate(APP_ROUTES.privacy.full)} variant="ghost">
              Privacy
            </Button>
            <Button onClick={() => navigate(APP_ROUTES.terms.full)} variant="ghost">
              Terms
            </Button>
          </div>
        </footer>
      </LayoutContainer>
    </div>
  );
}
