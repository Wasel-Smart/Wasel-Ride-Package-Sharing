import { repairLikelyMojibake } from './textEncoding';

export type LocalizedCopy = Readonly<{
  ar: string;
  en: string;
}>;

export function getLocalizedCopy(language: 'ar' | 'en', copy: LocalizedCopy): string {
  return repairLikelyMojibake(copy[language]);
}
