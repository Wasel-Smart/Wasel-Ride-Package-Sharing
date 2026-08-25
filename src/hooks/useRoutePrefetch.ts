import { useEffect } from 'react';

const PREFETCHED_ROUTES = new Set<string>();

export function useRoutePrefetch() {
  useEffect(() => {
    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!link?.href) return;

      try {
        const url = new URL(link.href);
        const pathname = url.pathname;

        if (PREFETCHED_ROUTES.has(pathname)) return;
        PREFETCHED_ROUTES.add(pathname);

        const prefetchMap: Record<string, () => void> = {
          '/app/find-ride': () => import('../features/rides/FindRidePage'),
          '/app/offer-ride': () => import('../features/rides/OfferRidePage'),
          '/app/my-trips': () => import('../features/trips/MyTripsPage'),
          '/app/wallet': () => import('../features/wallet'),
          '/app/profile': () => import('../features/profile/ProfilePage'),
          '/app/settings': () => import('../features/preferences/SettingsPage'),
          '/app/notifications': () => import('../features/notifications/NotificationsPage'),
          '/app/trust': () => import('../features/trust/TrustCenterPage'),
          '/app/bus': () => import('../features/bus/BusPage'),
          '/app/packages': () => import('../features/packages/PackagesPage'),
          '/app/raje3': () => import('../features/raje3/ReturnMatching'),
          '/app/plus': () => import('../features/plus/WaselPlusPage'),
        };

        const prefetchFn = prefetchMap[pathname];
        if (prefetchFn) {
          void prefetchFn();
        }
      } catch {
        // ignore invalid URLs
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, []);
}
