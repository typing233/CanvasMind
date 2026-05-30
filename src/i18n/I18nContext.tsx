import React, { createContext, useContext, useState, useCallback } from 'react';
import { Locale, I18nContextValue, I18nDictionary } from './types';
import { en } from './en';
import { zh } from './zh';

const dictionaries: Record<Locale, I18nDictionary> = { en, zh };

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

const LOCALE_STORAGE_KEY = 'canvasmind-locale';

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {}
  const lang = navigator.language;
  if (lang.startsWith('zh')) return 'zh';
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let str = dictionaries[locale][key] ?? dictionaries['en'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useT() {
  return useContext(I18nContext);
}
