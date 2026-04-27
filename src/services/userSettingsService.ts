import type { Language } from '../locales/translations';
import { apiGateway } from './apiGateway';
import {
  defaultCommunicationPreferences,
  type CommunicationPreferences,
} from './communicationPreferences';
import { sanitizeThemePreference, type ThemePreference } from '../utils/theme';

export interface PrivacySettings {
  dataAnalytics: boolean;
  hidePhoto: boolean;
  shareLocation: boolean;
  showProfile: boolean;
}

export interface DisplaySettings {
  currency: string;
  direction: 'ltr' | 'rtl';
  language: Language;
  theme: ThemePreference;
}

export interface UserSettings {
  display: DisplaySettings;
  notifications: CommunicationPreferences;
  privacy: PrivacySettings;
}

export const defaultPrivacySettings: PrivacySettings = {
  dataAnalytics: false,
  hidePhoto: false,
  shareLocation: true,
  showProfile: true,
};

export const defaultDisplaySettings: DisplaySettings = {
  currency: 'JOD',
  direction: 'ltr',
  language: 'en',
  theme: 'dark',
};

export const defaultUserSettings: UserSettings = {
  display: defaultDisplaySettings,
  notifications: defaultCommunicationPreferences,
  privacy: defaultPrivacySettings,
};

function normalizeLanguage(value: unknown): Language {
  return value === 'ar' ? 'ar' : 'en';
}

function normalizeDirection(value: unknown, language: Language): 'ltr' | 'rtl' {
  return value === 'rtl' || (value !== 'ltr' && language === 'ar') ? 'rtl' : 'ltr';
}

function normalizeNotifications(
  value: Partial<CommunicationPreferences> | null | undefined,
): CommunicationPreferences {
  return {
    ...defaultCommunicationPreferences,
    ...value,
    preferredLanguage: normalizeLanguage(value?.preferredLanguage),
  };
}

function normalizePrivacy(value: Partial<PrivacySettings> | null | undefined): PrivacySettings {
  return {
    ...defaultPrivacySettings,
    ...value,
  };
}

function normalizeDisplay(value: Partial<DisplaySettings> | null | undefined): DisplaySettings {
  const language = normalizeLanguage(value?.language);
  return {
    ...defaultDisplaySettings,
    ...value,
    currency: typeof value?.currency === 'string' && value.currency.trim() ? value.currency : 'JOD',
    direction: normalizeDirection(value?.direction, language),
    language,
    theme: sanitizeThemePreference(value?.theme),
  };
}

function normalizeUserSettings(value: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    display: normalizeDisplay(value?.display),
    notifications: normalizeNotifications(value?.notifications),
    privacy: normalizePrivacy(value?.privacy),
  };
}

export const userSettingsService = {
  async getUserSettings(): Promise<UserSettings> {
    const response = await apiGateway.get<{
      settings?: Partial<UserSettings> | null;
    }>('/user/settings');
    return normalizeUserSettings(response.settings);
  },

  async updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    const response = await apiGateway.put<{
      settings?: Partial<UserSettings> | null;
    }>('/user/settings', patch);
    return normalizeUserSettings(response.settings);
  },
};
