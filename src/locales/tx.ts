import { translations, type Language, type TranslationNode } from './translations';

let currentLang: Language = 'ar';

export function setCurrentLang(lang: Language): void {
  currentLang = lang;
}

export function getCurrentLang(): Language {
  return currentLang;
}

export function tx(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: TranslationNode | undefined = translations[currentLang];
  for (const k of keys) {
    value = typeof value === 'object' ? value[k] : undefined;
  }
  if (typeof value === 'string') return interpolate(value, params);

  const fallbackLang: Language = currentLang === 'en' ? 'ar' : 'en';
  let fallback: TranslationNode | undefined = translations[fallbackLang];
  for (const k of keys) {
    fallback = typeof fallback === 'object' ? fallback[k] : undefined;
  }
  return interpolate(typeof fallback === 'string' ? fallback : key, params);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`,
  );
}
