/**
 * i18next + react-i18next setup.
 * Language resolution: User preference (AsyncStorage) → Device locale → "en".
 * Never bound to GPS; only user preference and device locale.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import {
  DEFAULT_LANGUAGE,
  LOCALE_STORAGE_KEY,
  isSupportedLanguage,
  normalizeLocaleToLanguage,
  type LanguageCode,
} from './languages';

const DEFAULT_NS = 'common';

const resources = {
  en: {
    [DEFAULT_NS]: require('./locales/en/common.json'),
  },
  sr: {
    [DEFAULT_NS]: require('./locales/sr/common.json'),
  },
};

/**
 * Resolves the app language in priority order:
 * 1. User manually selected language (stored in AsyncStorage)
 * 2. Device locale (from expo-localization), normalized and if supported
 * 3. Fallback to "en"
 */
export async function resolveAppLanguage(): Promise<LanguageCode> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored != null && stored.trim() !== '') {
      const trimmed = stored.trim().toLowerCase();
      if (isSupportedLanguage(trimmed)) {
        return trimmed;
      }
    }
  } catch {
    // ignore
  }

  try {
    const locales = getLocales();
    const first = locales[0];
    const tag = first?.languageTag ?? first?.languageCode ?? '';
    const normalized = normalizeLocaleToLanguage(tag);
    if (normalized) {
      return normalized;
    }
  } catch {
    // ignore
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Initialize i18n with the resolved language.
 * Call this once on app bootstrap, after await resolveAppLanguage().
 */
export function initI18n(lng: LanguageCode): void {
  i18n.use(initReactI18next).init({
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NS,
    ns: [DEFAULT_NS],
    resources,
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
    compatibilityJSON: 'v4',
  });
}

/**
 * Change app language and persist to AsyncStorage.
 * Use this when the user selects a new language in Profile (or elsewhere).
 * Triggers re-renders via react-i18next.
 */
export async function setAppLanguage(lng: LanguageCode): Promise<void> {
  if (!isSupportedLanguage(lng)) return;
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, lng);
}

export { i18n };
export type { LanguageCode } from './languages';
export {
  getSupportedLanguages,
  getLocaleLabel,
  DEFAULT_LANGUAGE,
  LOCALE_STORAGE_KEY,
} from './languages';
