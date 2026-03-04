/**
 * Locale/language constants for global app language selection.
 */
export const LOCALE_STORAGE_KEY = 'app_locale';

export type LocaleCode = 'en' | 'sr';

export const SUPPORTED_LOCALES: { code: LocaleCode; labelEn: string; labelSr: string }[] = [
  { code: 'en', labelEn: 'English', labelSr: 'English' },
  { code: 'sr', labelEn: 'Serbian', labelSr: 'Srpski' },
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

export function getLocaleLabel(code: LocaleCode, currentLocale: LocaleCode): string {
  const found = SUPPORTED_LOCALES.find((l) => l.code === code);
  if (!found) return code;
  return currentLocale === 'sr' ? found.labelSr : found.labelEn;
}
