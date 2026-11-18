import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Legal and security pages are read by users deciding whether to trust the product, and by
// regulators. Placeholder contact details, broken characters and certification claims nobody
// can back up are product defects, so they are guarded here rather than caught by eye.
const LEGAL_PAGES = [
  'src/features/legal/PrivacyPolicy.tsx',
  'src/features/legal/TermsOfService.tsx',
  'src/features/legal/SecurityPage.tsx',
] as const;

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('legal page content integrity', () => {
  it.each(LEGAL_PAGES)('%s has no replacement characters from broken encoding', page => {
    expect(read(page)).not.toContain('\uFFFD');
  });

  it.each(LEGAL_PAGES)('%s has no placeholder phone numbers', page => {
    // e.g. "+962 79 000 0000" — a run of zeros is never a real subscriber number.
    expect(read(page)).not.toMatch(/\+?\d[\d\s-]*\b0{3}[\s-]?0{4}\b/);
  });

  it('privacy policy makes no unverifiable regulator certification claims', () => {
    const source = read('src/features/legal/PrivacyPolicy.tsx');
    expect(source).not.toMatch(/Telecommunications Regulatory Commission Certified/i);
    expect(source).not.toContain('معتمد من هيئة تنظيم قطاع الاتصالات');
  });

  it('privacy policy does not promise two-factor authentication for drivers', () => {
    const source = read('src/features/legal/PrivacyPolicy.tsx');
    expect(source).not.toContain('Two-factor authentication for driver accounts');
    expect(source).not.toContain('مصادقة ثنائية لحسابات السائقين');
  });
});
