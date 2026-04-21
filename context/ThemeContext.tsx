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

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<ThemeMode>>;
}

const STORAGE_KEY = "bankyour-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeMode;
}

function setThemeCookie(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `bankyour-theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.remove("theme-light", "theme-dark");
  root.classList.add(resolved === "dark" ? "theme-dark" : "theme-light");
  root.dataset.theme = resolved;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme ?? "system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    initialTheme === "dark" ? "dark" : "light"
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const next =
      saved === "light" || saved === "dark" || saved === "system"
        ? (saved as ThemeMode)
        : initialTheme ?? "system";
    setTheme(next);
  }, [initialTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
    setThemeCookie(theme);

    const resolveAndApply = () => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(resolved);
      applyThemeClass(theme);
    };

    resolveAndApply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (theme === "system") {
        resolveAndApply();
      }
    };
    media.addEventListener("change", listener);
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

