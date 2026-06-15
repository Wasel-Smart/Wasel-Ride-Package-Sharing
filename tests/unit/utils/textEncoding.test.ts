import { describe, expect, it } from 'vitest';
import { containsLikelyMojibake, normalizeTextTree, repairLikelyMojibake } from '../../../src/utils/textEncoding';

const brokenSeparator = 'Live \u00c2\u00b7 Active';

describe('textEncoding', () => {
  it('detects mojibake markers in broken strings', () => {
    expect(containsLikelyMojibake(brokenSeparator)).toBe(true);
  });

  it('repairs common mojibake separators', () => {
    expect(repairLikelyMojibake(brokenSeparator)).toBe('Live \u00b7 Active');
  });

  it('normalizes nested objects and arrays', () => {
    const normalized = normalizeTextTree({
      title: brokenSeparator,
      items: [brokenSeparator],
    });

    expect(normalized).toEqual({
      title: 'Live \u00b7 Active',
      items: ['Live \u00b7 Active'],
    });
  });
});
