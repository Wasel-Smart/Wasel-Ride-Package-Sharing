import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  API_URL: '',
  fetchWithRetry: vi.fn(),
  getAuthDetails: vi.fn(),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  getDirectCommunicationPreferences: vi.fn(async () => null),
  getDirectCommunicationDeliveries: vi.fn(async () => []),
  queueDirectCommunicationDeliveries: vi.fn(async (_userId: string, rows: unknown[]) => rows),
  upsertDirectCommunicationPreferences: vi.fn(async (_userId: string, updates: unknown) => updates),
}));

import {
  buildDeliveryPlan,
  defaultCommunicationPreferences,
  getCommunicationCapabilities,
  getCommunicationPreferences,
  queueCommunicationDeliveries,
  resolveNotificationTopic,
  updateCommunicationPreferences,
} from '../../../src/services/communicationPreferences';

describe('communicationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      localStorage: memoryStorage,
      Notification: class NotificationMock {},
    } as any);
    memoryStorage.clear();
  });

  it('maps notification types to delivery topics', () => {
    expect(resolveNotificationTopic('promo_offer')).toBe('promotions');
    expect(resolveNotificationTopic('security_login')).toBe('critical_alerts');
    expect(resolveNotificationTopic('trip_update')).toBe('trip_updates');
  });

  it('detects available communication capabilities from contact data', () => {
    const capabilities = getCommunicationCapabilities({
      email: 'user@example.com',
      phone: '+962790000000',
    });

    expect(capabilities.email).toBe(true);
    expect(capabilities.sms).toBe(true);
    expect(capabilities.push).toBe(true);
  });

  it('builds a delivery plan using explicit channel requests and prefs', () => {
    const channels = buildDeliveryPlan({
      type: 'booking',
      preferences: defaultCommunicationPreferences,
      capabilities: {
        inApp: true,
        push: true,
        email: true,
        sms: false,
        whatsapp: false,
      },
      explicitChannels: ['email', 'sms', 'in_app'],
    });

    expect(channels).toEqual(['email', 'in_app']);
  });

  it('stores preferences locally and returns queued fallback records', async () => {
    const updated = await updateCommunicationPreferences('user-123', {
      whatsapp: true,
      preferredLanguage: 'ar',
    });

    expect(updated.whatsapp).toBe(true);
    expect(updated.preferredLanguage).toBe('ar');

    const loaded = await getCommunicationPreferences('user-123');
    expect(loaded.whatsapp).toBe(true);

    const queued = await queueCommunicationDeliveries({
      userId: 'user-123',
      notificationId: 'notif-1',
      requests: [{
        channel: 'email',
        destination: 'user@example.com',
        subject: 'Subject',
        body: 'Body',
      }],
    });

    expect(queued.queued).toBe(1);
  });
});
