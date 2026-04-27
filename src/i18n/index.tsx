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
  let systemLangs: string[] = [];
  if (typeof navigator !== 'undefined') {
    systemLangs = navigator.languages ? [...navigator.languages] : [];
    if (navigator.language && !systemLangs.includes(navigator.language)) {
      systemLangs.unshift(navigator.language);
    }
  }
  
  const supportedCodes = LOCALES_DATA.filter(l => l.code !== 'auto').map(l => l.code);
  
  const systemSupported: SupportedLocale[] = [];
  for (const lang of systemLangs) {
    const prefix = lang.split('-')[0];
    if (prefix === 'cs' || (prefix !== 'auto' && supportedCodes.includes(prefix as Locale))) {
      const code: SupportedLocale = prefix === 'cs' ? 'cs' : (prefix as SupportedLocale);
      if (!systemSupported.includes(code)) {
        systemSupported.push(code);
      }
    }
  }
  
  const suggestedCodes = ['auto' as Locale, ...systemSupported];
  
  const otherCodes: Locale[] = LOCALES_DATA
    .filter(l => l.code !== 'auto' && !suggestedCodes.includes(l.code))
    .map(l => l.code)
    .sort((a, b) => {
      const nameA = LOCALES_DATA.find(l => l.code === a)?.name || '';
      const nameB = LOCALES_DATA.find(l => l.code === b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  
  const suggested = suggestedCodes.map(code => LOCALES_DATA.find(l => l.code === code)).filter((l): l is typeof LOCALES_DATA[number] => l !== undefined);
  const other = otherCodes.map(code => LOCALES_DATA.find(l => l.code === code)).filter((l): l is typeof LOCALES_DATA[number] => l !== undefined);
  
  return { suggested, other };
}