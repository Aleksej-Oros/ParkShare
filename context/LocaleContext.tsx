/**
 * Locale context: bridge to react-i18next.
 * Exposes t, locale, setLocale so existing components can keep using useLocale().
 * Language is resolved and initialized in app _layout before first render.
 */
import React, { createContext, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type LanguageCode } from '@/localization/i18n';

type LocaleContextValue = {
  locale: LanguageCode;
  setLocale: (code: LanguageCode) => void;
  t: (key: string) => string;
  isLoading: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as LanguageCode;
  const setLocale = useCallback((code: LanguageCode) => {
    setAppLanguage(code);
  }, []);

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t,
    isLoading: false,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}

/** Optional hook: returns null if outside provider. */
export function useLocaleOptional(): LocaleContextValue | null {
  return useContext(LocaleContext);
}
