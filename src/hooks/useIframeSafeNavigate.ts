import {
  useNavigate as useRouterNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from 'react-router';
import { APP_ROUTE_BARE_PREFIXES } from '../router/paths';

function normalizePathname(pathname: string): string {
  if (!pathname.startsWith('/') || pathname.startsWith('/app') || pathname.startsWith('//')) {
    return pathname;
  }

  const shouldPrefix = APP_ROUTE_BARE_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return shouldPrefix ? `/app${pathname}` : pathname;
}

function normalizeTo(to: To): To {
  if (typeof to === 'string') {
    return normalizePathname(to);
  }

  return {
    ...to,
    ...(to.pathname ? { pathname: normalizePathname(to.pathname) } : {}),
  };
}

/**
 * Normalizes legacy bare app routes like `/my-trips` to the mounted `/app/...`
 * namespace so older call sites continue to work after the route consolidation.
 */
export function useIframeSafeNavigate(): NavigateFunction {
  const navigate = useRouterNavigate();

  return ((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      navigate(to);
      return;
    }

    navigate(normalizeTo(to), options);
  }) as NavigateFunction;
}

export { useIframeSafeNavigate as useNavigate };
export default useIframeSafeNavigate;

export function isInsideIframe(): boolean {
  return false;
}
