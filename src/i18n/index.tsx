import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Locale = 'auto' | 'en' | 'cs';

type TranslationObject = Record<string, unknown>;

const LOCALE_KEY = 'odorik_locale';
const DEFAULT_LOCALE: Locale = 'auto';

function detectSystemLocale(): 'en' | 'cs' {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || navigator.languages?.[0] || '';
    if (lang.startsWith('cs')) return 'cs';
  }
  return 'en';
}

function resolveLocale(loc: Locale): 'en' | 'cs' {
  if (loc === 'auto') return detectSystemLocale();
  return loc;
}

interface I18nContextValue {
  locale: Locale;
  activeLocale: 'en' | 'cs';
  setLocale: (locale: Locale) => void;
  t: TranslationObject;
}

const I18nContext = createContext<I18nContextValue | null>(null);

async function loadTranslations(locale: 'en' | 'cs'): Promise<TranslationObject> {
  const response = await fetch(`/locales/${locale}.json`);
  return response.json();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [activeLocale, setActiveLocale] = useState<'en' | 'cs'>('en');
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
    const initialLocale = (saved === 'auto' || saved === 'en' || saved === 'cs') ? saved : DEFAULT_LOCALE;
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
  { code: 'en', name: 'English' },
];