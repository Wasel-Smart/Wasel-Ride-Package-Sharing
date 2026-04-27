import { useEffect, useMemo } from 'react';
import { Outlet, useNavigation } from 'react-router';
import { Globe, Moon, Package, Search, Sun } from 'lucide-react';
import { RouteLoadingFallback } from '../components/app/RouteLoadingFallback';
import { Button, LayoutContainer } from '../design-system/components';
import { AppHeader } from '../components/brand';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { APP_ROUTES } from '../router/paths';
import { prefetchRouteModule, prefetchRouteModules } from '../router/prefetch';
import { buildAuthPagePath } from '../utils/authFlow';
import { scheduleDeferredTask } from '../utils/runtimeScheduling';

export default function WaselRoot() {
  const navigate = useIframeSafeNavigate();
  const navigation = useNavigation();
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useLocalAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const signInPath = buildAuthPagePath('signin', APP_ROUTES.findRide.full);

  const primaryNav = useMemo(() => [
    {
      icon: <Search size={16} />,
      label: 'Ride',
      onFocus: () => {
        void prefetchRouteModule('findRide');
      },
      onPointerEnter: () => {
        void prefetchRouteModule('findRide');
      },
      path: APP_ROUTES.findRide.full,
    },
    {
      icon: <Package size={16} />,
      label: 'Package',
      onFocus: () => {
        void prefetchRouteModule('packages');
      },
      onPointerEnter: () => {
        void prefetchRouteModule('packages');
      },
      path: APP_ROUTES.packages.full,
    },
  ] as const, []);

  useEffect(() => {
    const cancelPrefetch = scheduleDeferredTask(async () => {
      await prefetchRouteModules(
        user
          ? ['findRide', 'packages', 'wallet', 'payments', 'settings']
          : ['auth', 'findRide', 'packages', 'offerRide'],
      );
    }, 1_800);

    return cancelPrefetch;
  }, [user]);

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
        subtitle="Book a ride or send a package"
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
                onClick={() => navigate(signInPath)}
                onFocus={() => {
                  void prefetchRouteModule('auth');
                }}
                onPointerEnter={() => {
                  void prefetchRouteModule('auth');
                }}
              >
                Sign in
              </Button>
            )}
          </>
        }
      />

      <main className="ds-main" id="main-content" role="main">
        {navigation.state !== 'idle' ? (
          <div className="ds-main__pending">
            <RouteLoadingFallback />
          </div>
        ) : null}
        <Outlet />
      </main>

      <LayoutContainer width="wide">
        <footer className="ds-shell-footer">
          <p className="ds-footer-note">Book a ride, offer a ride, or send a package.</p>
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
