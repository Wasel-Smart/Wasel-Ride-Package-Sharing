import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FindRidePage } from '../FindRidePage';

// Every value a mocked hook or service hands back is created ONCE here. The real
// hooks return referentially stable values, and FindRidePage puts several of them
// (t, navigate, user, location, route reminders...) in effect dependency arrays.
// A mock that builds a fresh object or function on every call changes those
// dependencies on every render, which re-fires effects that set state, which
// renders again: an unbounded passive-effect loop that blocks the test runner
// until it is killed instead of failing.
const stable = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'findRidePage.book_a_ride': 'Book a ride',
  };
  const t = (key: string) => translations[key] ?? key;
  const noop = () => undefined;
  const emptyList: never[] = [];
  return {
    noop,
    emptyList,
    language: { language: 'en', dir: 'ltr', t },
    localAuth: { user: { id: 'user-1', name: 'Test User' } },
    auth: {
      user: { id: 'user-1' },
      profile: null,
      loading: false,
      isBackendConnected: false,
      updateProfile: noop,
    },
    location: { pathname: '/app/find-ride', search: '', hash: '', state: null, key: 'default' },
    navigate: noop,
    push: { permission: 'granted' },
    demandStats: { active: 0, rides: 0, buses: 0, packages: 0 },
    routeIntelligence: {
      updatedAt: '2026-01-01T00:00:00.000Z',
      selectedSignal: null,
      featuredSignals: [] as unknown[],
      allSignals: [] as unknown[],
      membership: null,
    },
  };
});

// Mock dependencies
vi.mock('../../../services/rideLifecycle', () => ({
  createRideBooking: vi.fn(),
  getRideBookings: vi.fn(() => stable.emptyList),
  updateRideBooking: vi.fn(),
}));

// FindRidePage imports the wallet client from services/wallet/walletApi.
vi.mock('../../../services/wallet/walletApi', () => ({
  walletApi: {
    getBalance: vi.fn(() => Promise.resolve(10)),
    getWalletData: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../../../services/movementPricing', () => ({
  getMovementPriceQuote: vi.fn(() => Promise.resolve({ priceJod: 2.5 })),
}));

vi.mock('leaflet', () => ({}));
vi.mock('../../../components/MapWrapper', () => ({
  MapWrapper: () => <div data-testid="map-wrapper" />,
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => stable.language,
}));

vi.mock('../../../contexts/LocalAuth', () => ({
  useLocalAuth: () => stable.localAuth,
}));

vi.mock('react-router', () => ({
  useLocation: () => stable.location,
  useNavigate: () => stable.navigate,
}));

vi.mock('../../../hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => stable.navigate,
}));

vi.mock('../../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => stable.push,
}));

vi.mock('../../../services/demandCapture', () => ({
  createDemandAlert: vi.fn(),
  getDemandStats: vi.fn(() => stable.demandStats),
  hydrateDemandAlerts: vi.fn(),
}));

vi.mock('../../../services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('../../../services/journeyLogistics', () => ({
  getConnectedRides: vi.fn(() => stable.emptyList),
}));

vi.mock('../../../services/movementMembership', () => ({
  recordMovementActivity: vi.fn(),
}));

vi.mock('../../../services/movementRetention', () => ({
  areRouteRemindersEqual: vi.fn(() => false),
  createReminderFromSuggestion: vi.fn(),
  formatRouteReminderSchedule: vi.fn(() => ''),
  getRecurringRouteSuggestions: vi.fn(() => stable.emptyList),
  getRouteReminderForCorridor: vi.fn(() => null),
  getRouteReminders: vi.fn(() => stable.emptyList),
  syncRouteReminders: vi.fn(() => Promise.resolve(stable.emptyList)),
}));

vi.mock('../../../services/notifications.js', () => ({
  notificationsAPI: {},
}));

vi.mock('../../../services/rideRealtime', () => ({
  subscribeToRideBookingRealtime: vi.fn(() => stable.noop),
}));

vi.mock('../../../services/routeDemandIntelligence', () => ({
  getLiveCorridorSignal: vi.fn(),
  useLiveRouteIntelligence: () => stable.routeIntelligence,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => stable.auth,
}));

// useRideInventory imports searchDirectTrips from the trips module directly, and
// other callers use the barrel; mock both so no test ever reaches the network.
vi.mock('../../../services/directSupabase/trips', () => ({
  searchDirectTrips: vi.fn(() => Promise.resolve(stable.emptyList)),
}));

vi.mock('../../../services/directSupabase', () => ({
  searchDirectTrips: vi.fn(() => Promise.resolve(stable.emptyList)),
}));

describe('FindRidePage', () => {
  it('renders successfully', async () => {
    render(<FindRidePage />);
    const heading = await screen.findByText(/book a ride/i, {}, { timeout: 15000 });
    expect(heading).toBeDefined();
  }, 20_000);
});
