"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { UI_TEXT, UiTextShape } from "@/data/i18n";
import { LanguageCode, Locale } from "@/lib/types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  revision: number;
}

const STORAGE_KEY = "bankyour-locale";
const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

function detectLocale(initialLocale?: Locale): Locale {
  if (typeof window === "undefined") {
    return initialLocale ?? "ru";
  }

  const savedLocale = window.localStorage.getItem(STORAGE_KEY);
  const allowedLocales: LanguageCode[] = [
    "ru",
    "en",
    "hy",
    "be",
    "kk",
    "ka",
    "az",
    "ar",
    "tr"
  ];

  if (savedLocale && allowedLocales.includes(savedLocale as LanguageCode)) {
    return savedLocale as Locale;
  }

  if (initialLocale) {
    return initialLocale;
  }

  const language = window.navigator.language.toLowerCase();
  if (language.startsWith("ru")) return "ru";
  if (language.startsWith("hy")) return "hy";
  if (language.startsWith("be")) return "be";
  if (language.startsWith("kk")) return "kk";
  if (language.startsWith("ka")) return "ka";
  if (language.startsWith("az")) return "az";
  if (language.startsWith("ar")) return "ar";
  if (language.startsWith("tr")) return "tr";
  if (language.startsWith("en")) {
    return "en";
  }

  return "en";
}

function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `bankyour-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? "ru");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const detected = detectLocale(initialLocale);
    setLocale(detected);
    setLocaleCookie(detected);
  }, [initialLocale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, locale);
    setLocaleCookie(locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (locale === "ru" || locale === "en") {
      return;
    }

    let cancelled = false;
    const storageKey = `bankyour-ui-copy-${locale}`;

    function applyTranslations(text: UiTextShape) {
      UI_TEXT[locale] = {
        ...UI_TEXT[locale],
        ...text
      };
      setRevision((prev) => prev + 1);
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        applyTranslations(JSON.parse(saved) as UiTextShape);
      } catch {
        // Ignore invalid local cache.
      }
    }

    async function loadTranslations() {
      try {
        const response = await fetch(`/api/i18n?lang=${locale}`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { text?: UiTextShape };
        if (cancelled || !payload.text) {
          return;
        }

        applyTranslations(payload.text);
        window.localStorage.setItem(storageKey, JSON.stringify(payload.text));
      } catch {
        // Keep EN fallback in case translation service fails.
      }
    }

    void loadTranslations();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      revision
    }),
    [locale, revision]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
