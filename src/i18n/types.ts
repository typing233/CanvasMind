export type Locale = 'en' | 'zh';

export interface I18nDictionary {
  [key: string]: string;
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}
