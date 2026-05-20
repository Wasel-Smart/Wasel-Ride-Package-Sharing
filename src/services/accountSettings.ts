import type { Language } from '../locales/translations';
import { getDirectUserSettings, upsertDirectUserSettings } from './directSupabase';
import { flushPendingSyncQueue, upsertPendingSyncRecord } from './pendingSyncBuffer';
import { readRuntimeState, writeRuntimeState } from '../utils/runtimeStore';

export type AccountPrivacySettings = {
  showProfile: boolean;
  hidePhoto: boolean;
  shareLocation: boolean;
  dataAnalytics: boolean;
};

export type AccountDisplaySettings = {
  language: Language;
  currency: string;
  theme: string;
  direction: 'ltr' | 'rtl';
};

export type AccountSettings = {
  privacy: AccountPrivacySettings;
  display: AccountDisplaySettings;
};

const ACCOUNT_SETTINGS_KEY = 'wasel.account.settings';
const ACCOUNT_SETTINGS_SYNC_QUEUE = 'account-settings';

function storageKeyFor(userId?: string | null) {
  return `${ACCOUNT_SETTINGS_KEY}:${userId || 'guest'}`;
}

function normalizeAccountSettings(
  value: Partial<AccountSettings> | null | undefined,
  fallback: AccountSettings,
): AccountSettings {
  return {
    privacy: {
      ...fallback.privacy,
      ...(value?.privacy ?? {}),
    },
    display: {
      ...fallback.display,
      ...(value?.display ?? {}),
      language: value?.display?.language === 'ar' ? 'ar' : fallback.display.language,
      direction: value?.display?.direction === 'rtl' ? 'rtl' : 'ltr',
    },
  };
}

function readStoredAccountSettings(
  userId: string | null | undefined,
  fallback: AccountSettings,
): AccountSettings {
  return normalizeAccountSettings(
    readRuntimeState<Partial<AccountSettings> | null>(storageKeyFor(userId), fallback),
    fallback,
  );
}

function writeStoredAccountSettings(userId: string | null | undefined, settings: AccountSettings) {
  writeRuntimeState(storageKeyFor(userId), settings);
}

function mapDirectSettingsToAccountSettings(
  row: Record<string, unknown> | null,
  fallback: AccountSettings,
): AccountSettings {
  if (!row) {
    return fallback;
  }

  return normalizeAccountSettings(
    {
      privacy: {
        showProfile: row.profile_visible !== false,
        hidePhoto: row.photo_hidden === true,
        shareLocation: row.location_sharing_enabled !== false,
        dataAnalytics: row.analytics_enabled !== false,
      },
      display: {
        language: row.locale === 'ar' ? 'ar' : fallback.display.language,
        currency:
          typeof row.currency === 'string' && row.currency.trim().length > 0
            ? row.currency.trim().toUpperCase()
            : fallback.display.currency,
        theme:
          typeof row.theme === 'string' && row.theme.trim().length > 0
            ? row.theme.trim()
            : fallback.display.theme,
        direction: row.locale === 'ar' ? 'rtl' : fallback.display.direction,
      },
    },
    fallback,
  );
}

function mapAccountSettingsToDirectRow(settings: AccountSettings) {
  return {
    locale: settings.display.language,
    currency: settings.display.currency,
    theme: settings.display.theme,
    profile_visible: settings.privacy.showProfile,
    photo_hidden: settings.privacy.hidePhoto,
    location_sharing_enabled: settings.privacy.shareLocation,
    analytics_enabled: settings.privacy.dataAnalytics,
  };
}

async function flushPendingAccountSettings(): Promise<void> {
  await flushPendingSyncQueue<{ userId: string; settings: AccountSettings }>(
    ACCOUNT_SETTINGS_SYNC_QUEUE,
    async record => {
      await upsertDirectUserSettings(
        record.payload.userId,
        mapAccountSettingsToDirectRow(record.payload.settings),
      );
    },
  ).catch(() => {});
}

export function getDefaultAccountSettings(
  language: Language = 'en',
  direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr',
): AccountSettings {
  return {
    privacy: {
      showProfile: true,
      hidePhoto: false,
      shareLocation: true,
      dataAnalytics: true,
    },
    display: {
      language,
      currency: 'JOD',
      theme: 'dark',
      direction,
    },
  };
}

export async function getAccountSettings(
  userId?: string | null,
  fallback: AccountSettings = getDefaultAccountSettings(),
): Promise<AccountSettings> {
  const cached = readStoredAccountSettings(userId, fallback);
  if (!userId) {
    return cached;
  }

  try {
    await flushPendingAccountSettings();
    const direct = await getDirectUserSettings(userId);
    const next = mapDirectSettingsToAccountSettings(
      direct as Record<string, unknown> | null,
      fallback,
    );
    writeStoredAccountSettings(userId, next);
    return next;
  } catch {
    return cached;
  }
}

export async function updateAccountSettings(
  userId: string | null | undefined,
  updates: Partial<AccountSettings>,
  fallback: AccountSettings = getDefaultAccountSettings(),
): Promise<AccountSettings> {
  const current = await getAccountSettings(userId, fallback);
  const next = normalizeAccountSettings(
    {
      privacy: {
        ...current.privacy,
        ...(updates.privacy ?? {}),
      },
      display: {
        ...current.display,
        ...(updates.display ?? {}),
      },
    },
    fallback,
  );

  writeStoredAccountSettings(userId, next);
  if (!userId) {
    return next;
  }

  try {
    await upsertDirectUserSettings(userId, mapAccountSettingsToDirectRow(next));
  } catch {
    upsertPendingSyncRecord(
      ACCOUNT_SETTINGS_SYNC_QUEUE,
      { userId, settings: next },
      record => record.payload.userId === userId,
    );
  }

  return next;
}
