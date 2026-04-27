export type LocalizedCatalog = Record<string, { ar?: string; en?: string }>;

export interface TranslationCompletenessReport {
  complete: boolean;
  missingArabic: string[];
  missingEnglish: string[];
  totalKeys: number;
}

export function buildTranslationCompletenessReport(
  catalog: LocalizedCatalog,
): TranslationCompletenessReport {
  const missingArabic: string[] = [];
  const missingEnglish: string[] = [];

  for (const [key, entry] of Object.entries(catalog)) {
    if (!entry.en?.trim()) {
      missingEnglish.push(key);
    }
    if (!entry.ar?.trim()) {
      missingArabic.push(key);
    }
  }

  return {
    complete: missingArabic.length === 0 && missingEnglish.length === 0,
    missingArabic,
    missingEnglish,
    totalKeys: Object.keys(catalog).length,
  };
}
