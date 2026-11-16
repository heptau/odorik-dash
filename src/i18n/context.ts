import { createContext, useContext } from 'react';

export type Locale = 'auto' | 'en' | 'cs' | 'es' | 'fr' | 'pt' | 'de' | 'sk' | 'it' | 'pl' | 'vi' | 'uk';

export type SupportedLocale = Exclude<Locale, 'auto'>;

export type TranslationObject = Record<string, unknown>;

export const LOCALE_KEY = 'odorik_locale';
export const DEFAULT_LOCALE: Locale = 'auto';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'cs', 'es', 'fr', 'pt', 'de', 'sk', 'it', 'pl', 'vi', 'uk'];

const isSupportedLocale = (code: string): code is SupportedLocale =>
  SUPPORTED_LOCALES.includes(code as SupportedLocale);

export const isLocale = (code: string | null): code is Locale =>
  code === 'auto' || (code !== null && isSupportedLocale(code));

// System languages in preference order, reduced to the ones the app supports.
function getSystemLocales(): SupportedLocale[] {
  if (typeof navigator === 'undefined') return [];
  const systemLangs = navigator.languages ? [...navigator.languages] : [];
  if (navigator.language && !systemLangs.includes(navigator.language)) {
    systemLangs.unshift(navigator.language);
  }

  const result: SupportedLocale[] = [];
  for (const lang of systemLangs) {
    const prefix = lang.split('-')[0].toLowerCase();
    if (isSupportedLocale(prefix) && !result.includes(prefix)) result.push(prefix);
  }
  return result;
}

export function resolveLocale(loc: Locale): SupportedLocale {
  if (loc === 'auto') return getSystemLocales()[0] ?? FALLBACK_LOCALE;
  return isSupportedLocale(loc) ? loc : FALLBACK_LOCALE;
}

export interface I18nContextValue {
  locale: Locale;
  activeLocale: SupportedLocale;
  setLocale: (locale: Locale) => void;
  t: TranslationObject;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT() {
  const { t } = useI18n();
  return (key: string): string => {
    const keys = key.split('.');
    let result: TranslationObject = t;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in (result as Record<string, unknown>)) {
        result = result[k] as TranslationObject;
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  };
}

const LOCALES_DATA: { code: Locale; name: string }[] = [
  { code: 'auto', name: 'Auto' },
  { code: 'cs', name: 'Čeština' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt', name: 'Português' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'uk', name: 'Українська' },
  { code: 'vi', name: 'Tiếng Việt' },
];

export const AVAILABLE_LOCALES = LOCALES_DATA;

export function getGroupedLocales(): { suggested: typeof LOCALES_DATA; other: typeof LOCALES_DATA } {
  const suggestedCodes: Locale[] = ['auto', ...getSystemLocales()];

  const suggested = suggestedCodes
    .map(code => LOCALES_DATA.find(l => l.code === code))
    .filter((l): l is typeof LOCALES_DATA[number] => l !== undefined);
  const other = LOCALES_DATA
    .filter(l => !suggestedCodes.includes(l.code))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { suggested, other };
}
