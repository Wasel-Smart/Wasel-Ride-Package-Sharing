import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchWithRetry = vi.fn();
const mockGetAuthDetails = vi.fn();
const mockGetCommunicationPreferences = vi.fn();
const mockQueueCommunicationDeliveries = vi.fn();
const mockGetCommunicationCapabilities = vi.fn();
const memoryStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://test.supabase.co/functions/v1/server',
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
}));

vi.mock('../../../src/services/communicationPreferences', () => ({
  getCommunicationPreferences: (...args: any[]) => mockGetCommunicationPreferences(...args),
  queueCommunicationDeliveries: (...args: any[]) => mockQueueCommunicationDeliveries(...args),
  getCommunicationCapabilities: (...args: any[]) => mockGetCommunicationCapabilities(...args),
  buildDeliveryPlan: ({ explicitChannels }: any) => explicitChannels ?? ['in_app', 'email', 'sms'],
}));

import { notificationsAPI } from '../../../src/services/notifications';

function response(data: any, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

describe('notificationsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage: memoryStorage } as any);
    memoryStorage.clear();
    mockGetCommunicationPreferences.mockResolvedValue({
      inApp: true,
      push: true,
      email: true,
      sms: true,
      whatsapp: false,
      tripUpdates: true,
      bookingRequests: true,
      messages: true,
      promotions: false,
      prayerReminders: true,
      criticalAlerts: true,
      preferredLanguage: 'en',
    });
    mockQueueCommunicationDeliveries.mockResolvedValue({ queued: 2, source: 'server' });
    mockGetCommunicationCapabilities.mockReturnValue({
      inApp: true,
      push: true,
      email: true,
      sms: true,
      whatsapp: false,
    });
  });

  it('stores a local fallback notification when auth is unavailable', async () => {
    mockGetAuthDetails.mockRejectedValue(new Error('no session'));

    const result = await notificationsAPI.createNotification({
      title: 'Ride posted',
      message: 'Your ride is live',
      type: 'booking',
    });

    expect(result.source).toBe('local');
    expect(JSON.parse(window.localStorage.getItem('wasel-local-notifications') || '[]')).toHaveLength(1);
  });

  it('returns local notifications when the server list is unavailable', async () => {
    window.localStorage.setItem(
      'wasel-local-notifications',
      JSON.stringify([{ id: 'local-1', title: 'Saved', message: 'Offline', source: 'local' }]),
    );
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockFetchWithRetry.mockResolvedValue(response({}, false));

    const result = await notificationsAPI.getNotifications();

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].title).toBe('Saved');
  });

  it('persists server push notifications to the local queue for continuity', async () => {
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockFetchWithRetry.mockResolvedValue(
      response({ notification: { id: 'notif-1' } })
    );

    const result = await notificationsAPI.createNotification({
      title: 'Package matched',
      message: 'A ride accepted your parcel',
      type: 'booking',
      priority: 'high',
    });

    expect(result.source).toBe('server');
    expect(JSON.parse(window.localStorage.getItem('wasel-local-notifications') || '[]')[0].id).toBe('notif-1');
  });

  it('queues secondary communication deliveries when contact details are available', async () => {
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockFetchWithRetry.mockResolvedValue(response({ notification: { id: 'notif-2' } }));

    const result = await notificationsAPI.createNotification({
      title: 'Security alert',
      message: 'A new login was detected',
      type: 'security',
      channels: ['email', 'sms'],
      contact: {
        email: 'user@example.com',
        phone: '+962790000000',
      },
    });

    expect(result.deliveriesQueued).toBe(2);
    expect(mockQueueCommunicationDeliveries).toHaveBeenCalledWith({
      userId: 'user-123',
      notificationId: 'notif-2',
      requests: [
        expect.objectContaining({ channel: 'email', destination: 'user@example.com' }),
        expect.objectContaining({ channel: 'sms', destination: '+962790000000' }),
      ],
    });
  });
});
