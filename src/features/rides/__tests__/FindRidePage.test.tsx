import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FindRidePage } from '../FindRidePage';

// Mock dependencies
vi.mock('../../services/rideLifecycle', () => ({
  createRideBooking: vi.fn(),
  getRideBookings: vi.fn(() => []),
}));

vi.mock('../../services/walletApi', () => ({
  walletApi: {
    getBalance: vi.fn(() => Promise.resolve(10)),
  },
}));

vi.mock('../../services/movementPricing', () => ({
  getMovementPriceQuote: vi.fn(() => Promise.resolve({ priceJod: 2.5 })),
}));

vi.mock('leaflet', () => ({}));
vi.mock('../../components/MapWrapper', () => ({
  MapWrapper: () => <div data-testid="map-wrapper" />,
}));

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => key,
  }),
}));

vi.mock('../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

vi.mock('react-router', () => ({
  useLocation: () => ({ search: '' }),
}));

vi.mock('../../hooks/useIframeSafeNavigate', () => ({
  useIframeSafeNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ permission: 'granted' }),
}));

vi.mock('../../services/demandCapture', () => ({
  createDemandAlert: vi.fn(),
  getDemandStats: vi.fn(),
  hydrateDemandAlerts: vi.fn(),
}));

vi.mock('../../services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('../../services/journeyLogistics', () => ({
  getConnectedRides: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../services/movementMembership', () => ({
  recordMovementActivity: vi.fn(),
}));

vi.mock('../../services/movementRetention', () => ({
  createReminderFromSuggestion: vi.fn(),
  formatRouteReminderSchedule: vi.fn(),
  getRecurringRouteSuggestions: vi.fn(),
  getRouteReminderForCorridor: vi.fn(),
  getRouteReminders: vi.fn(),
  syncRouteReminders: vi.fn(),
}));

vi.mock('../../services/notifications.js', () => ({
  notificationsAPI: {},
}));

vi.mock('../../services/rideRealtime', () => ({
  subscribeToRideBookingRealtime: vi.fn(() => () => {}),
}));

vi.mock('../../services/routeDemandIntelligence', () => ({
  getLiveCorridorSignal: vi.fn(),
  useLiveRouteIntelligence: () => ({ corridors: [] }),
}));

describe('FindRidePage', () => {
  it('renders successfully', () => {
    render(<FindRidePage />);
    // Verify some text or component from the page is present
    const heading = screen.getByRole('heading', { name: /find/i }) || screen.getByText(/search/i);
    expect(heading).toBeDefined();
  });
});
