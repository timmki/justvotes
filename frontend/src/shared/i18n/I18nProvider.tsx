import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { messages, type Locale, type TranslationKey } from './translations';
import { browserStorage } from '../storage';

const localeStorageKey = 'justvotes-locale';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function storedLocale(): Locale {
  const value = browserStorage()?.getItem(localeStorageKey);
  return value === 'en' ? 'en' : 'de';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(storedLocale);

  useEffect(() => {
    browserStorage()?.setItem(localeStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: TranslationKey) => {
    const [namespace, name] = key.split('.') as [keyof typeof messages.de, string];
    return messages[locale][namespace][name as never] ?? key;
  };

  return <I18nContext value={{ locale, setLocale, t }}>{children}</I18nContext>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
