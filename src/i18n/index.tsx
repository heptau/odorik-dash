import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Locale = 'auto' | 'en' | 'cs' | 'es' | 'fr' | 'pt' | 'de' | 'sk' | 'it' | 'pl' | 'vi' | 'uk';

type TranslationObject = Record<string, unknown>;

const LOCALE_KEY = 'odorik_locale';
const DEFAULT_LOCALE: Locale = 'auto';

type SupportedLocale = 'en' | 'cs' | 'es' | 'fr' | 'pt' | 'de' | 'sk' | 'it' | 'pl' | 'vi' | 'uk';

const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'cs', 'es', 'fr', 'pt', 'de', 'sk', 'it', 'pl', 'vi', 'uk'];

function detectSystemLocale(): SupportedLocale {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || navigator.languages?.[0] || '';
    const prefix = lang.split('-')[0];
    if (SUPPORTED_LOCALES.includes(prefix as SupportedLocale)) {
      return prefix as SupportedLocale;
    }
    if (lang.startsWith('cs')) return 'cs';
  }
  return 'en';
}

function resolveLocale(loc: Locale): SupportedLocale {
  if (loc === 'auto') return detectSystemLocale();
  if (SUPPORTED_LOCALES.includes(loc as SupportedLocale)) {
    return loc as SupportedLocale;
  }
  return 'en';
}

interface I18nContextValue {
  locale: Locale;
  activeLocale: SupportedLocale;
  setLocale: (locale: Locale) => void;
  t: TranslationObject;
}

const I18nContext = createContext<I18nContextValue | null>(null);

async function loadTranslations(locale: SupportedLocale): Promise<TranslationObject> {
  const response = await fetch(`/locales/${locale}.json`);
  return response.json();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');
  const [translations, setTranslations] = useState<TranslationObject>({});
  const [ready, setReady] = useState(false);

  const setLocale = (newLocale: Locale) => {
    const resolved = resolveLocale(newLocale);
    setLocaleState(newLocale);
    setActiveLocale(resolved);
    localStorage.setItem(LOCALE_KEY, newLocale);
    loadTranslations(resolved).then(t => {
      setTranslations(t);
      setReady(true);
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    const initialLocale = (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) ? saved : DEFAULT_LOCALE;
    const resolved = resolveLocale(initialLocale);
    setLocaleState(initialLocale);
    setActiveLocale(resolved);
    loadTranslations(resolved).then(t => {
      setTranslations(t);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, activeLocale, setLocale, t: translations }}>
      {children}
    </I18nContext.Provider>
  );
}

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

export const AVAILABLE_LOCALES: { code: Locale; name: string }[] = [
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