import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusPage } from '../BusPage';

vi.mock('../../services/bus', () => ({
  fetchBusRoutes: vi.fn(() => Promise.resolve([])),
  getOfficialBusRoutes: vi.fn(() => []),
  createBusBooking: vi.fn(),
}));

vi.mock('../../services/supportInbox', () => ({
  createSupportTicket: vi.fn(),
}));

vi.mock('../../services/notifications', () => ({
  notificationsAPI: {
    requestBookingNotificationPermission: vi.fn(),
  },
}));

vi.mock('../../../contexts/LocalAuth', () => ({
  useLocalAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
  }),
}));

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string) => key,
  }),
}));

vi.mock('../../shared/pageShared', () => ({
  CITIES: ['Amman', 'Aqaba'],
  CoreExperienceBanner: () => <div data-testid="core-banner" />,
  DS: {},
  midpoint: () => [0, 0],
  PageShell: ({ children }: { children: React.ReactNode }) => <div data-testid="page-shell">{children}</div>,
  Protected: ({ children }: { children: React.ReactNode }) => <div data-testid="protected">{children}</div>,
  r: (value: number) => `${value}px`,
  resolveCityCoord: () => [0, 0],
  SectionHead: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

vi.mock('../../shared/ServiceFlowPlaybook', () => ({
  ServiceFlowPlaybook: () => <div data-testid="playbook" />,
}));

vi.mock('../../utils/wasel-ds', () => ({
  C: {},
  SH: {},
}));

vi.mock('../components', () => ({
  BusBookingForm: () => <div data-testid="booking-form" />,
  BusMap: () => <div data-testid="bus-map" />,
  BusRouteList: () => <div data-testid="route-list" />,
  BusSchedule: () => <div data-testid="schedule" />,
}));

describe('BusPage', () => {
  it('renders without crashing', () => {
    render(<BusPage />);
    expect(screen.getByTestId('page-shell')).toBeTruthy();
  });

  it('renders protected wrapper', () => {
    render(<BusPage />);
    expect(screen.getByTestId('protected')).toBeTruthy();
  });

});
