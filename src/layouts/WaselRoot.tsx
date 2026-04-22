import { Outlet } from 'react-router';
import { Bus, Clock, Globe, MapPin, Moon, Package, Search, Settings, Sun } from 'lucide-react';
import { Button, LayoutContainer } from '../design-system/components';
import { AppHeader } from '../components/brand';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { buildAuthPagePath } from '../utils/authFlow';

const primaryNav = [
  { icon: <Search size={16} />, label: 'Find ride', path: '/app/find-ride' },
  { icon: <Bus size={16} />, label: 'Bus services', path: '/app/bus' },
  { icon: <Package size={16} />, label: 'Packages', path: '/app/packages' },
  { icon: <MapPin size={16} />, label: 'Mobility OS', path: '/app/mobility-os' },
  { icon: <Clock size={16} />, label: 'Trips', path: '/app/my-trips' },
  { icon: <Settings size={16} />, label: 'Settings', path: '/app/settings' },
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
              <Button onClick={() => navigate(buildAuthPagePath('signin', '/app/find-ride'))}>
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
            <Button onClick={() => navigate('/app/privacy')} variant="ghost">
              Privacy
            </Button>
            <Button onClick={() => navigate('/app/terms')} variant="ghost">
              Terms
            </Button>
          </div>
        </footer>
      </LayoutContainer>
    </div>
  );
}
