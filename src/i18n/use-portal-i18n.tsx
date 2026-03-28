'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LOCALE_COOKIE, locales, defaultLocale, type Locale } from './config';
import type { PortalDictionary } from './portal';

const PortalI18nContext = createContext<PortalDictionary | null>(null);

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
  const val = match?.[1];
  if (val && (locales as readonly string[]).includes(val)) return val as Locale;
  return defaultLocale;
}

const cache: Partial<Record<Locale, PortalDictionary>> = {};

async function loadDict(locale: Locale): Promise<PortalDictionary> {
  if (cache[locale]) return cache[locale]!;
  const loaders: Record<Locale, () => Promise<PortalDictionary>> = {
    en: () => import('./portal/en.json').then((m) => m.default),
    ko: () => import('./portal/ko.json').then((m) => m.default),
    ja: () => import('./portal/ja.json').then((m) => m.default),
    zh: () => import('./portal/zh.json').then((m) => m.default),
    es: () => import('./portal/es.json').then((m) => m.default),
  };
  const dict = await loaders[locale]();
  cache[locale] = dict;
  return dict;
}

export function PortalI18nProvider({ children }: { children: ReactNode }) {
  const [dict, setDict] = useState<PortalDictionary | null>(null);

  useEffect(() => {
    const locale = getLocaleFromCookie();
    loadDict(locale).then(setDict);
  }, []);

  if (!dict) return null; // Brief flash while loading dict
  return <PortalI18nContext.Provider value={dict}>{children}</PortalI18nContext.Provider>;
}

export function usePortalI18n(): PortalDictionary {
  const ctx = useContext(PortalI18nContext);
  if (!ctx) throw new Error('usePortalI18n must be used within PortalI18nProvider');
  return ctx;
}
