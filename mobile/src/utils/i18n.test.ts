/**
 * @jest-environment node
 */

import { t, getTranslations } from './i18n';

describe('i18n', () => {
  it('returns English strings by default', () => {
    expect(t('profile.title', 'en')).toBe('My Account');
  });

  it('returns Arabic strings when requested', () => {
    expect(t('profile.title', 'ar')).toBe('حسابي');
  });

  it('falls back to key when translation missing', () => {
    expect(t('missing.deep.key', 'en')).toBe('missing.deep.key');
  });

  it('replaces placeholders', () => {
    expect(t('trustCenter.remainingChecks', 'en', { remaining: '3' })).toBe('3 checks remaining');
  });

  it('returns Arabic placeholder replacement', () => {
    expect(t('trustCenter.remainingChecks', 'ar', { remaining: '٣' })).toBe('٣ فحوصات متبقية');
  });

  it('getTranslations returns full dictionary', () => {
    const en = getTranslations('en');
    expect(en.profile.title).toBe('My Account');
    const ar = getTranslations('ar');
    expect(ar.profile.title).toBe('حسابي');
  });
});
