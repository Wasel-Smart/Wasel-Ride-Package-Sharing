import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { containsLikelyMojibake } from '@/utils/textEncoding';

function LanguageConsumer() {
  const { language, dir, t, toggleLanguage } = useLanguage();

  return (
    <div>
      <div data-testid="language">{language}</div>
      <div data-testid="dir">{dir}</div>
      <div data-testid="switch-label">{t('header.switchToArabic')}</div>
      <div data-testid="save-label">{t('common.save')}</div>
      <button type="button" onClick={toggleLanguage}>
        toggle
      </button>
    </div>
  );
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('dir');
    document.documentElement.removeAttribute('lang');
  });

  it('serves normalized translation copy without mojibake markers', () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    const label = screen.getByTestId('switch-label').textContent ?? '';

    expect(label).toBe('العربية');
    expect(containsLikelyMojibake(label)).toBe(false);
  });

  it('persists direction and language when toggled', async () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'toggle' }).click();
    });

    expect(screen.getByTestId('language')).toHaveTextContent('ar');
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
    expect(localStorage.getItem('wasel-language')).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
