import { describe, expect, it } from 'vitest';
import { rawTranslations } from '@/locales/translations';

type TranslationTree = Record<string, string | TranslationTree>;

function flattenKeys(tree: TranslationTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      return [nextKey];
    }
    return flattenKeys(value, nextKey);
  });
}

function readLeaf(tree: TranslationTree, dottedKey: string): string {
  const value = dottedKey
    .split('.')
    .reduce<string | TranslationTree>((current, key) => {
      if (typeof current === 'string') {
        return current;
      }
      return current[key] as string | TranslationTree;
    }, tree);

  return typeof value === 'string' ? value : '';
}

describe('translation completeness', () => {
  it('keeps English and Arabic translation keys in sync', () => {
    const englishKeys = flattenKeys(rawTranslations.en as TranslationTree).sort();
    const arabicKeys = flattenKeys(rawTranslations.ar as TranslationTree).sort();

    expect(arabicKeys).toEqual(englishKeys);
  });

  it('does not ship blank translation leaves', () => {
    const keys = flattenKeys(rawTranslations.en as TranslationTree);

    const blankLeaves = keys.flatMap((key) => {
      const english = readLeaf(rawTranslations.en as TranslationTree, key).trim();
      const arabic = readLeaf(rawTranslations.ar as TranslationTree, key).trim();
      return english && arabic ? [] : [key];
    });

    expect(blankLeaves).toEqual([]);
  });
});
