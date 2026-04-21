"use client";

import { ReactNode } from "react";
import { CountryProvider } from "@/context/CountryContext";
import { LocaleProvider } from "@/context/LocaleContext";
import { ThemeProvider } from "@/context/ThemeContext";
import type { ThemeMode } from "@/context/ThemeContext";
import { Country, Locale } from "@/lib/types";

interface ProvidersProps {
  children: ReactNode;
  initialCountry?: Country;
  initialLocale?: Locale;
  initialTheme?: ThemeMode;
}

export function Providers({ children, initialCountry, initialLocale, initialTheme }: ProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <LocaleProvider initialLocale={initialLocale}>
        <CountryProvider initialCountry={initialCountry}>{children}</CountryProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
