import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  I18nContext,
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_KEY,
  isLocale,
  resolveLocale,
  type Locale,
  type SupportedLocale,
  type TranslationObject,
} from './context';

async function fetchTranslations(locale: SupportedLocale): Promise<TranslationObject> {
  const response = await fetch(`/locales/${locale}.json`);
  if (!response.ok) throw new Error(`Failed to load locale ${locale}: HTTP ${response.status}`);
  return response.json();
}

// Never rejects: falls back to English, then to bare keys, so a failed
// download can't leave the app stuck on the loading spinner.
async function loadTranslations(locale: SupportedLocale): Promise<TranslationObject> {
  try {
    return await fetchTranslations(locale);
  } catch (err) {
    console.error(err);
    if (locale === FALLBACK_LOCALE) return {};
    return fetchTranslations(FALLBACK_LOCALE).catch(() => ({}));
  }
}

function loadSavedLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadSavedLocale);
  const [translations, setTranslations] = useState<TranslationObject | null>(null);
  const activeLocale = resolveLocale(locale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
  }, []);

  useEffect(() => {
    // Ignore a slower, older request when the language is switched quickly.
    let cancelled = false;
    loadTranslations(activeLocale).then(t => {
      if (!cancelled) setTranslations(t);
    });
    return () => {
      cancelled = true;
    };
  }, [activeLocale]);

  if (!translations) {
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
