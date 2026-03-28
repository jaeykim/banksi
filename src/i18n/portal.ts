import type { Locale } from './config';
import type enPortal from './portal/en.json';

export type PortalDictionary = typeof enPortal;

const dictionaries: Record<Locale, () => Promise<PortalDictionary>> = {
  en: () => import('./portal/en.json').then((m) => m.default),
  ko: () => import('./portal/ko.json').then((m) => m.default),
  ja: () => import('./portal/ja.json').then((m) => m.default),
  zh: () => import('./portal/zh.json').then((m) => m.default),
  es: () => import('./portal/es.json').then((m) => m.default),
};

export async function getPortalDictionary(locale: Locale): Promise<PortalDictionary> {
  return dictionaries[locale]();
}
