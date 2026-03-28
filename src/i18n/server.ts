import { cookies } from 'next/headers';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './config';
import type enDict from './dictionaries/en.json';

export type Dictionary = typeof enDict;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en.json').then((m) => m.default),
  ko: () => import('./dictionaries/ko.json').then((m) => m.default),
  ja: () => import('./dictionaries/ja.json').then((m) => m.default),
  zh: () => import('./dictionaries/zh.json').then((m) => m.default),
  es: () => import('./dictionaries/es.json').then((m) => m.default),
};

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value && (locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return defaultLocale;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const l = locale ?? (await getLocale());
  return dictionaries[l]();
}
