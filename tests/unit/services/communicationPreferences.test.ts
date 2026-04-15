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
import {
  queueDirectCommunicationDeliveries,
  upsertDirectCommunicationPreferences,
} from '../../../src/services/directSupabase';
import { NetworkError } from '../../../src/utils/errors';

const mockedQueueDirectCommunicationDeliveries = vi.mocked(queueDirectCommunicationDeliveries);
const mockedUpsertDirectCommunicationPreferences = vi.mocked(upsertDirectCommunicationPreferences);

describe('communicationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_APP_ENV', 'test');
    vi.stubEnv('VITE_ENABLE_DEMO_DATA', 'false');
    vi.stubEnv('VITE_ENABLE_SYNTHETIC_TRIPS', 'false');
    vi.stubEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', 'true');
    vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'true');
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

  it('keeps authenticated preferences off local storage when local fallback is disabled', async () => {
    vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'false');
    mockedUpsertDirectCommunicationPreferences.mockResolvedValueOnce({
      in_app_enabled: true,
      push_enabled: true,
      email_enabled: true,
      sms_enabled: true,
      whatsapp_enabled: true,
      trip_updates_enabled: true,
      booking_requests_enabled: true,
      messages_enabled: true,
      promotions_enabled: false,
      prayer_reminders_enabled: true,
      critical_alerts_enabled: true,
      preferred_language: 'ar',
    });

    const updated = await updateCommunicationPreferences('user-123', {
      whatsapp: true,
      preferredLanguage: 'ar',
    });

    expect(updated.whatsapp).toBe(true);
    expect(mockedUpsertDirectCommunicationPreferences).toHaveBeenCalledTimes(1);
    expect(memoryStorage.getItem('wasel.communication.preferences:user-123')).toBeNull();
  });

  it('fails closed for queued deliveries when both direct and local fallbacks are disabled', async () => {
    vi.stubEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', 'false');
    vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'false');

    await expect(
      queueCommunicationDeliveries({
        userId: 'user-123',
        notificationId: 'notif-2',
        requests: [{
          channel: 'email',
          destination: 'user@example.com',
          subject: 'Subject',
          body: 'Body',
        }],
      }),
    ).rejects.toBeInstanceOf(NetworkError);

    expect(mockedQueueDirectCommunicationDeliveries).not.toHaveBeenCalled();
    expect(memoryStorage.getItem('wasel.communication.outbox')).toBeNull();
  });
});
