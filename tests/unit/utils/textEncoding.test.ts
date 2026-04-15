import { describe, expect, it } from 'vitest';
import {
  containsLikelyMojibake,
  normalizeTextTree,
  repairLikelyMojibake,
} from '../../../src/utils/textEncoding';

describe('textEncoding', () => {
  it('detects common mojibake sequences', () => {
    expect(containsLikelyMojibake('Live Â· Active')).toBe(true);
    expect(containsLikelyMojibake('تم')).toBe(false);
  });

  it('repairs latin punctuation and Arabic text', () => {
    expect(repairLikelyMojibake('Live Â· Active')).toBe('Live · Active');
    expect(repairLikelyMojibake('Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø®Ø±ÙŠØ·Ø©...')).toBe('جاري تحميل الخريطة...');
  });

  it('normalizes nested object graphs without changing clean values', () => {
    expect(
      normalizeTextTree({
        title: 'Wasel Â· Innovation Hub',
        items: ['ØªÙ…', 'Clean text'],
      }),
    ).toEqual({
      title: 'Wasel · Innovation Hub',
      items: ['تم', 'Clean text'],
    });
  });
});
