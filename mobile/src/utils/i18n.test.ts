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
    expect(t('trustCenter.remainingChecks', 'en', { remaining: '3' })).toBe('Complete 3 remaining checks and avoid any stuck state.');
  });

  it('returns Arabic placeholder replacement', () => {
    expect(t('trustCenter.remainingChecks', 'ar', { remaining: '٣' })).toBe('أكمل ٣ خطوات متبقية وتجنب أي حالة معلقة.');
  });

  it('getTranslations returns full dictionary', () => {
    const en = getTranslations('en') as Record<string, unknown>;
    expect((en.profile as Record<string, string>).title).toBe('My Account');
    const ar = getTranslations('ar') as Record<string, unknown>;
    expect((ar.profile as Record<string, string>).title).toBe('حسابي');
  });
});
