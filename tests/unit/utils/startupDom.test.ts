import { describe, expect, it } from 'vitest';
import {
  installNonBlockingFonts,
  renderStartupConfigurationError,
} from '../../../src/utils/startupDom';

describe('installNonBlockingFonts()', () => {
  it('adds a stylesheet link after the preload loads', () => {
    document.head.innerHTML = `
      <link
        data-wasel-font-preload="true"
        rel="preload"
        as="style"
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      />
    `;

    installNonBlockingFonts(document);

    const preload = document.querySelector('link[data-wasel-font-preload="true"]');
    preload?.dispatchEvent(new Event('load'));

    const stylesheet = document.querySelector('link[data-wasel-font-stylesheet="true"]');
    expect(stylesheet).not.toBeNull();
    expect(stylesheet?.getAttribute('rel')).toBe('stylesheet');
  });

  it('does not duplicate the stylesheet if it already exists', () => {
    document.head.innerHTML = `
      <link data-wasel-font-stylesheet="true" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@500&display=swap" />
    `;

    installNonBlockingFonts(document);

    expect(document.querySelectorAll('link[data-wasel-font-stylesheet="true"]')).toHaveLength(1);
  });
});

describe('renderStartupConfigurationError()', () => {
  it('renders message content as text instead of HTML', () => {
    document.body.innerHTML = '<div id="existing">old</div>';

    renderStartupConfigurationError({
      direction: 'ltr',
      isArabic: false,
      themePreference: 'dark',
      title: 'Configuration Error',
      body: '<img src=x onerror=alert(1)>',
      help: 'Check configuration',
    });

    expect(document.querySelector('#existing')).toBeNull();
    expect(document.body.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(document.body.querySelector('img')).toBeNull();
  });

  it('applies rtl direction for Arabic errors', () => {
    renderStartupConfigurationError({
      direction: 'rtl',
      isArabic: true,
      themePreference: 'light',
      title: 'خطأ',
      body: 'تفاصيل',
      help: 'مساعدة',
    });

    expect(document.body.firstElementChild).toHaveAttribute('dir', 'rtl');
  });
});
