/**
 * @deprecated Use @/localization/i18n and @/localization/languages instead.
 * This file re-exports from the new localization layer for backward compatibility.
 */
export {
  getSupportedLanguages,
  getLocaleLabel,
  DEFAULT_LANGUAGE as DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/localization/languages';
export type { LanguageCode as LocaleCode } from '@/localization/languages';
