import { translations, type Language, type TranslationNode } from './translations';

let currentLang: Language = 'ar';

export function setCurrentLang(lang: Language): void {
  currentLang = lang;
}

export function getCurrentLang(): Language {
  return currentLang;
}

// Chunk objects (see ./chunks/*) are merged into a single flat table per
// language in translations.ts — the chunk name (e.g. "waselAuth", "common")
// is organisational only and is NOT a nesting level in the merged table.
// Call sites across the app still address strings as "namespace.key"
// (e.g. tx('waselAuth.one_identity'), tx('common.email')), so resolution
// must try both forms: a direct nested walk (in case a namespace is ever
// nested for real) and, as the primary path today, the flat lookup using
// just the final segment of the dotted key.
function lookup(key: string, lang: Language): string | undefined {
  const keys = key.split('.');

  let nested: TranslationNode | undefined = translations[lang];
  for (const k of keys) {
    nested = typeof nested === 'object' && nested !== null ? nested[k] : undefined;
  }
  if (typeof nested === 'string') return nested;

  if (keys.length > 1) {
    const flatTable = translations[lang];
    const tail = keys[keys.length - 1]!;
    const flatValue =
      typeof flatTable === 'object' && flatTable !== null ? flatTable[tail] : undefined;
    if (typeof flatValue === 'string') return flatValue;
  }

  return undefined;
}

export function tx(key: string, params?: Record<string, string | number>): string {
  const direct = lookup(key, currentLang);
  if (direct !== undefined) return interpolate(direct, params);

  const fallbackLang: Language = currentLang === 'en' ? 'ar' : 'en';
  const fallback = lookup(key, fallbackLang);
  return interpolate(fallback !== undefined ? fallback : key, params);
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (typeof template !== 'string' || !params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{{${name}}}`,
  );
}
