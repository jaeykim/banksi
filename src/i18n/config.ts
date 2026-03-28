export const defaultLocale = 'en';
export const locales = ['en', 'ko', 'ja', 'zh', 'es'] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  es: 'Español',
};
