import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FindRidePage } from '../FindRidePage';

// Mock dependencies
vi.mock('../../../services/rideLifecycle', () => ({
  createRideBooking: vi.fn(),
  getRideBookings: vi.fn(() => []),
}));

vi.mock('../../../services/walletApi', () => ({
  walletApi: {
    getBalance: vi.fn(() => Promise.resolve(10)),
  },
}));

vi.mock('../../../services/movementPricing', () => ({
  getMovementPriceQuote: vi.fn(() => Promise.resolve({ priceJod: 2.5 })),
}));

vi.mock('leaflet', () => ({}));
vi.mock('../../../components/MapWrapper', () => ({
  MapWrapper: () => <div data-testid="map-wrapper" />,
}));

vi.mock('../../../contexts/LanguageContext', () => {
  const translations: Record<string, string> = {
    'findRidePage.book_a_ride': 'Book a ride',
  };
  return {
    useLanguage: () => ({
      language: 'en',
      dir: 'ltr',
      t: (key: string) => translations[key] ?? key,
    }),
  };
});

vi.mock('../../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ search: '' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('../../../hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => vi.fn(),
}));

vi.mock('../../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ permission: 'granted' }),
}));

vi.mock('../../../services/demandCapture', () => ({
  createDemandAlert: vi.fn(),
  getDemandStats: vi.fn(() => ({ active: 0, rides: 0, buses: 0, packages: 0 })),
  hydrateDemandAlerts: vi.fn(),
}));

vi.mock('../../../services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('../../../services/journeyLogistics', () => ({
  getConnectedRides: vi.fn(() => []),
}));

vi.mock('../../../services/movementMembership', () => ({
  recordMovementActivity: vi.fn(),
}));

vi.mock('../../../services/movementRetention', () => ({
  createReminderFromSuggestion: vi.fn(),
  formatRouteReminderSchedule: vi.fn(() => ''),
  getRecurringRouteSuggestions: vi.fn(() => []),
  getRouteReminderForCorridor: vi.fn(() => null),
  getRouteReminders: vi.fn(() => []),
  syncRouteReminders: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../services/notifications.js', () => ({
  notificationsAPI: {},
}));

vi.mock('../../../services/rideRealtime', () => ({
  subscribeToRideBookingRealtime: vi.fn(() => () => {}),
}));

vi.mock('../../../services/routeDemandIntelligence', () => {
  const stableSnapshot = {
    updatedAt: '2026-01-01T00:00:00.000Z',
    selectedSignal: null,
    featuredSignals: [] as unknown[],
    allSignals: [] as unknown[],
    membership: null,
  };
  return {
    getLiveCorridorSignal: vi.fn(),
    useLiveRouteIntelligence: () => stableSnapshot,
  };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: null,
    loading: false,
    isBackendConnected: false,
    updateProfile: vi.fn(),
  }),
}));

vi.mock('../../../services/directSupabase', () => ({
  searchDirectTrips: vi.fn(() => Promise.resolve([])),
}));

describe('FindRidePage', () => {
  it('renders successfully', async () => {
    render(<FindRidePage />);
    const heading = await screen.findByText(/book a ride/i, {}, { timeout: 15000 });
    expect(heading).toBeDefined();
  }, 20_000);
});
