import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const {
  mockProbeBackendHealth,
  mockStartAvailabilityPolling,
  mockWarmUpServer,
  mockRouterState,
} = vi.hoisted(() => ({
  mockProbeBackendHealth: vi.fn().mockResolvedValue(undefined),
  mockStartAvailabilityPolling: vi.fn().mockReturnValue(vi.fn()),
  mockWarmUpServer: vi.fn().mockResolvedValue(undefined),
  mockRouterState: {
    shouldThrow: false,
  },
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    RouterProvider: ({ router }: { router: unknown }) => {
      if (mockRouterState.shouldThrow) {
        throw new Error('Router render failure');
      }

      return <div data-testid="router-provider">{JSON.stringify(router)}</div>;
    },
  };
});

vi.mock('../../../src/router', () => ({
  waselRouter: { id: 'wasel-router' },
}));

vi.mock('../../../src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ resolvedTheme: 'light' as const }),
}));

vi.mock('../../../src/contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/contexts/LocalAuth', () => ({
  LocalAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../src/components/PrivacyConsentBanner', () => ({
  PrivacyConsentBanner: () => <div data-testid="privacy-banner" />,
}));

vi.mock('../../../src/components/wasel-ds/WaselLogo', () => ({
  WaselLogo: () => <div data-testid="wasel-logo" />,
}));

vi.mock('../../../src/services/core', () => ({
  probeBackendHealth: (...args: unknown[]) => mockProbeBackendHealth(...args),
  startAvailabilityPolling: (...args: unknown[]) => mockStartAvailabilityPolling(...args),
  warmUpServer: (...args: unknown[]) => mockWarmUpServer(...args),
}));

vi.mock('../../../src/utils/runtimeScheduling', () => ({
  scheduleDeferredTask: (task: () => void | Promise<void>) => {
    void Promise.resolve().then(task);
    return () => {};
  },
}));

vi.mock('../../../src/utils/locale', () => ({
  getInitialLanguage: () => 'en' as const,
}));

vi.mock('../../../src/utils/consent', () => ({
  CONSENT_DECISION_EVENT: 'wasel-consent',
  hasTelemetryConsent: () => false,
}));

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

import App from '../../../src/App';

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterState.shouldThrow = false;
  });

  it('renders the router shell, banner, and runtime coordinator', async () => {
    render(<App />);

    expect(screen.getByTestId('router-provider')).toHaveTextContent('wasel-router');
    expect(screen.getByTestId('privacy-banner')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockStartAvailabilityPolling).toHaveBeenCalledWith(120000);
      expect(mockWarmUpServer).toHaveBeenCalledTimes(1);
      expect(mockProbeBackendHealth).toHaveBeenCalled();
    });
  });

  it('shows the recovery boundary when the router crashes during render', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockRouterState.shouldThrow = true;

    render(<App />);

    expect(await screen.findByText('Something interrupted this screen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Wasel' })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
