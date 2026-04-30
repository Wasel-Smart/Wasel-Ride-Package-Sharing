import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { APP_ROUTES } from '@/router/paths';

const { mockCreateBrowserRouter, mockUseRouteError } = vi.hoisted(() => ({
  mockCreateBrowserRouter: vi.fn((routes: unknown) => ({ routes })),
  mockUseRouteError: vi.fn(() => null),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
    createBrowserRouter: (...args: unknown[]) => mockCreateBrowserRouter(...args),
    useRouteError: () => mockUseRouteError(),
    isRouteErrorResponse: vi.fn(() => false),
  };
});

vi.mock('../../../src/contexts/LocalAuth', () => ({
  useLocalAuth: () => ({ user: null, loading: false }),
}));

vi.mock('../../../src/layouts/WaselRoot', () => ({
  default: () => <div data-testid="wasel-root" />,
}));

vi.mock('../../../src/app/pages/AppSurfaces', () => ({
  LandingPage: () => <div data-testid="landing-page" />,
  NotFoundPage: () => <div data-testid="not-found-page" />,
  PrivacyPage: () => <div data-testid="privacy-page" />,
  RouteErrorPage: ({ message }: { message?: string }) => (
    <div data-testid="route-error-page">{message}</div>
  ),
  TermsPage: () => <div data-testid="terms-page" />,
}));

vi.mock('../../../src/utils/authFlow', () => ({
  buildAuthPagePath: vi.fn(() => '/app/auth?mode=signin'),
}));

describe('wasel-routes contract', () => {
  it('builds the app route tree with payments, wallet, and bus access', async () => {
    const module = await import('../../../src/wasel-routes');

    expect(module.waselRouter).toBeDefined();
    expect(mockCreateBrowserRouter).toHaveBeenCalledTimes(1);

    const routeTree = mockCreateBrowserRouter.mock.calls[0][0] as Array<Record<string, unknown>>;
    const appRoute = routeTree.find((route) => route.path === '/app') as { children: Array<Record<string, unknown>> };

    expect(routeTree.some((route) => route.path === '/')).toBe(true);
    expect(routeTree.some((route) => route.path === '/payments')).toBe(true);
    expect(appRoute).toBeDefined();
    expect(
      appRoute.children.some(
        (child) => child.index === true && typeof child.lazy === 'function',
      ),
    ).toBe(true);
    expect(appRoute.children.some((child) => child.path === 'payments')).toBe(true);
    expect(appRoute.children.some((child) => child.path === 'wallet')).toBe(true);
    expect(appRoute.children.some((child) => child.path === 'bus')).toBe(true);
    expect(appRoute.children.some((child) => child.path === 'dashboard')).toBe(true);
    expect(appRoute.children.some((child) => child.path === APP_ROUTES.tripsLegacy.child)).toBe(true);

    const homeRedirect = appRoute.children.find(
      (child) => child.path === APP_ROUTES.home.child,
    ) as { Component: () => React.ReactElement };

    expect(homeRedirect.Component().props.to).toBe(APP_ROUTES.root.full);
  });
});
