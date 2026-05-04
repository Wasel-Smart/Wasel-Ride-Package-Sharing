import type { Language } from '../locales/translations';

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
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(storageKeyFor(userId));
    if (!raw) return fallback;
    return normalizeAccountSettings(JSON.parse(raw) as Partial<AccountSettings>, fallback);
  } catch {
    return fallback;
  }
}

function writeStoredAccountSettings(userId: string | null | undefined, settings: AccountSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(settings));
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
  return readStoredAccountSettings(userId, fallback);
}

export async function updateAccountSettings(
  userId: string | null | undefined,
  updates: Partial<AccountSettings>,
  fallback: AccountSettings = getDefaultAccountSettings(),
): Promise<AccountSettings> {
  const current = readStoredAccountSettings(userId, fallback);
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
  return next;
}
