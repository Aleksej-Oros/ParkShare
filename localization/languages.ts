/**
 * Language constants and helpers for i18n.
 * Language depends ONLY on user preference and device locale (never GPS).
 */

export const DEFAULT_LANGUAGE = 'en' as const;

/** Supported language codes. Normalized form (e.g. sr-RS → sr). */
export type LanguageCode = 'en' | 'sr';

export const LOCALE_STORAGE_KEY = 'app_locale';

export interface SupportedLanguage {
  code: LanguageCode;
  labelEn: string;
  labelSr: string;
}

/** List of languages the app supports. */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', labelEn: 'English', labelSr: 'English' },
  { code: 'sr', labelEn: 'Serbian', labelSr: 'Srpski' },
];

/** Alias for backward compatibility. */
export const SUPPORTED_LOCALES = SUPPORTED_LANGUAGES;

const SUPPORTED_CODES: Set<string> = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Returns the list of supported languages (for pickers / settings).
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Returns true if the given code is a supported app language.
 */
export function isSupportedLanguage(code: string): code is LanguageCode {
  return SUPPORTED_CODES.has(code);
}

/**
 * Normalize a locale tag to a supported language code (e.g. sr-RS → sr, en-US → en).
 */
export function normalizeLocaleToLanguage(tag: string): LanguageCode | null {
  const base = tag.split(/[-_]/)[0]?.toLowerCase() ?? '';
  if (SUPPORTED_CODES.has(base)) {
    return base as LanguageCode;
  }
  return null;
}

/**
 * Get display label for a language code in the given current language.
 */
export function getLocaleLabel(code: LanguageCode, currentLanguage: LanguageCode): string {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  if (!found) return code;
  return currentLanguage === 'sr' ? found.labelSr : found.labelEn;
}
